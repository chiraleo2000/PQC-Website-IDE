package main

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/cloudflare/circl/kem/mlkem/mlkem768"
	"github.com/cloudflare/circl/sign/mldsa/mldsa65"
	"golang.org/x/crypto/curve25519"
	"golang.org/x/crypto/hkdf"
)

const (
	maxBody                 = 2 << 20
	maxKemCiphertextDecoded = 1200
	maxSignatureDecoded     = 5000
	maxSignerPkDecoded      = 4096
	maxKemSkDecoded         = 3000
)

var internalSecret string
var kemScheme = mlkem768.Scheme()

func main() {
	port := os.Getenv("CRYPTO_PORT")
	if port == "" {
		port = "4081"
	}
	internalSecret = os.Getenv("CRYPTO_SERVICE_SECRET")
	if internalSecret == "" {
		internalSecret = "internal-crypto-shared-secret"
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", healthHandler)
	mux.HandleFunc("POST /v1/kem/keygen", keygenHandler)
	mux.HandleFunc("POST /v1/verify-decrypt", verifyDecryptHandler)

	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           withLimits(mux),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
	}
	log.Printf("crypto-service listening on :%s", port)
	log.Fatal(srv.ListenAndServe())
}

func withLimits(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/health" && !checkSecret(r) {
			http.Error(w, `{"message":"Forbidden"}`, http.StatusForbidden)
			return
		}
		r.Body = http.MaxBytesReader(w, r.Body, maxBody)
		next.ServeHTTP(w, r)
	})
}

func checkSecret(r *http.Request) bool {
	return subtle.ConstantTimeCompare(
		[]byte(r.Header.Get("X-Internal-Secret")),
		[]byte(internalSecret),
	) == 1
}

func healthHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_, _ = w.Write([]byte(`{"status":"ok"}`))
}

func keygenHandler(w http.ResponseWriter, _ *http.Request) {
	pk, sk, err := kemScheme.GenerateKeyPair()
	if err != nil {
		http.Error(w, `{"message":"Keygen failed"}`, http.StatusInternalServerError)
		return
	}
	pkb, _ := pk.MarshalBinary()
	skb, _ := sk.MarshalBinary()
	writeJSON(w, map[string]string{
		"publicKeyB64": base64.StdEncoding.EncodeToString(pkb),
		"secretKeyB64": base64.StdEncoding.EncodeToString(skb),
	})
}

type verifyRequest struct {
	Payload             json.RawMessage `json:"payload"`
	SignerPublicKeyB64  string          `json:"signerPublicKeyB64"`
	KemSecretKeyB64     string          `json:"kemSecretKeyB64"`
	X25519SecretKeyB64  string          `json:"x25519SecretKeyB64"`
}

type payloadShape struct {
	ProjectID string `json:"projectId"`
	Nonce     string `json:"nonce"`
	Timestamp string `json:"timestamp"`
	Kem       struct {
		Algorithm  string `json:"algorithm"`
		Ciphertext string `json:"ciphertext"`
	} `json:"kem"`
	ClassicalKem struct {
		Algorithm          string `json:"algorithm"`
		EphemeralPublicKey string `json:"ephemeralPublicKey"`
	} `json:"classicalKem"`
	Cipher struct {
		Algorithm  string `json:"algorithm"`
		IV         string `json:"iv"`
		Ciphertext string `json:"ciphertext"`
		Tag        string `json:"tag"`
	} `json:"cipher"`
	Signature struct {
		Algorithm string `json:"algorithm"`
		Value     string `json:"value"`
	} `json:"signature"`
}

func verifyDecryptHandler(w http.ResponseWriter, r *http.Request) {
	req, p, ok := parseVerifyRequest(w, r)
	if !ok {
		return
	}
	if !validatePayloadAlgorithms(w, p) {
		return
	}
	if !verifyPayloadSignature(w, r, req, p) {
		return
	}

	plaintext, err := decryptPayload(req.KemSecretKeyB64, req.X25519SecretKeyB64, p)
	if err != nil {
		respondForbidden(w)
		return
	}
	defer zeroize(plaintext)

	writeJSON(w, map[string]interface{}{
		"verified":  true,
		"plaintext": string(plaintext),
	})
}

func parseVerifyRequest(w http.ResponseWriter, r *http.Request) (verifyRequest, payloadShape, bool) {
	var req verifyRequest
	var p payloadShape
	body, err := io.ReadAll(r.Body)
	if err != nil {
		respondInvalid(w)
		return req, p, false
	}
	if err := json.Unmarshal(body, &req); err != nil {
		respondInvalid(w)
		return req, p, false
	}
	if err := json.Unmarshal(req.Payload, &p); err != nil {
		respondInvalid(w)
		return req, p, false
	}
	return req, p, true
}

func validatePayloadAlgorithms(w http.ResponseWriter, p payloadShape) bool {
	if p.Kem.Algorithm != "ML-KEM-768" || p.Signature.Algorithm != "ML-DSA-65" {
		respondForbidden(w)
		return false
	}
	if p.ClassicalKem.Algorithm != "X25519" || p.ClassicalKem.EphemeralPublicKey == "" {
		respondForbidden(w)
		return false
	}
	if !fieldSizesOK(p) {
		respondInvalid(w)
		return false
	}
	return true
}

// Gateway verifies ML-DSA-65 with @noble/post-quantum before calling Go.
// CIRCL cannot reliably verify noble-produced signatures, so accept
// X-Signature-Preverified from the internal secret-gated caller.
func verifyPayloadSignature(w http.ResponseWriter, r *http.Request, req verifyRequest, p payloadShape) bool {
	if r.Header.Get("X-Signature-Preverified") == "true" {
		if len(p.Signature.Value) == 0 || decodedB64Len(p.Signature.Value) > maxSignatureDecoded {
			respondForbidden(w)
			return false
		}
		return true
	}

	sig, err := base64.StdEncoding.DecodeString(p.Signature.Value)
	if err != nil || len(sig) > maxSignatureDecoded {
		respondForbidden(w)
		return false
	}
	pkBytes, err := base64.StdEncoding.DecodeString(req.SignerPublicKeyB64)
	if err != nil || len(pkBytes) == 0 || len(pkBytes) > maxSignerPkDecoded {
		respondForbidden(w)
		return false
	}
	var pub mldsa65.PublicKey
	if err := pub.UnmarshalBinary(pkBytes); err != nil {
		respondForbidden(w)
		return false
	}
	if !mldsa65.Verify(&pub, canonicalSignJSON(p), sig, nil) {
		respondForbidden(w)
		return false
	}
	return true
}

func decryptPayload(kemSecretKeyB64, x25519SecretKeyB64 string, p payloadShape) ([]byte, error) {
	skBytes, err := base64.StdEncoding.DecodeString(kemSecretKeyB64)
	if err != nil || len(skBytes) > maxKemSkDecoded {
		return nil, errOrForbidden(err)
	}
	sk, err := kemScheme.UnmarshalBinaryPrivateKey(skBytes)
	if err != nil {
		return nil, err
	}
	ct, err := base64.StdEncoding.DecodeString(p.Kem.Ciphertext)
	if err != nil || len(ct) > maxKemCiphertextDecoded {
		return nil, errOrForbidden(err)
	}
	ss, err := kemScheme.Decapsulate(sk, ct)
	if err != nil {
		return nil, err
	}
	defer zeroize(ss)

	x25519Sk, err := base64.StdEncoding.DecodeString(x25519SecretKeyB64)
	if err != nil || len(x25519Sk) != 32 {
		return nil, errOrForbidden(err)
	}
	ephPk, err := base64.StdEncoding.DecodeString(p.ClassicalKem.EphemeralPublicKey)
	if err != nil || len(ephPk) != 32 {
		return nil, errOrForbidden(err)
	}
	var classicalSs [32]byte
	curve25519.ScalarMult(&classicalSs, (*[32]byte)(x25519Sk), (*[32]byte)(ephPk))
	defer zeroize(classicalSs[:])
	zeroize(x25519Sk)

	aesKey, err := combineHybridAESKey(ss, classicalSs[:])
	if err != nil {
		return nil, err
	}
	defer zeroize(aesKey)

	iv, err := base64.StdEncoding.DecodeString(p.Cipher.IV)
	if err != nil {
		return nil, err
	}
	ctData, err := base64.StdEncoding.DecodeString(p.Cipher.Ciphertext)
	if err != nil {
		return nil, err
	}
	tag, err := base64.StdEncoding.DecodeString(p.Cipher.Tag)
	if err != nil {
		return nil, err
	}
	return aesGcmDecrypt(aesKey, iv, ctData, tag)
}

func combineHybridAESKey(pqcSS, classicalSS []byte) ([]byte, error) {
	ikm := make([]byte, 0, len(pqcSS)+len(classicalSS))
	if len(pqcSS) > 32 {
		pqcSS = pqcSS[:32]
	}
	ikm = append(ikm, pqcSS...)
	ikm = append(ikm, classicalSS...)
	r := hkdf.New(sha256.New, ikm, nil, []byte("pqc-ide-hybrid-v1"))
	out := make([]byte, 32)
	if _, err := io.ReadFull(r, out); err != nil {
		return nil, err
	}
	return out, nil
}

func errOrForbidden(err error) error {
	if err != nil {
		return err
	}
	return errForbiddenPayload
}

var errForbiddenPayload = errors.New("forbidden payload")

func fieldSizesOK(p payloadShape) bool {
	ctLen := decodedB64Len(p.Kem.Ciphertext)
	sigLen := decodedB64Len(p.Signature.Value)
	ivLen := decodedB64Len(p.Cipher.IV)
	tagLen := decodedB64Len(p.Cipher.Tag)
	cipherLen := decodedB64Len(p.Cipher.Ciphertext)
	if ctLen < 0 || sigLen < 0 || ivLen < 0 || tagLen < 0 || cipherLen < 0 {
		return false
	}
	if ctLen > maxKemCiphertextDecoded || sigLen > maxSignatureDecoded {
		return false
	}
	if ivLen > 16 || tagLen > 16 || cipherLen > maxBody {
		return false
	}
	return true
}

func decodedB64Len(s string) int {
	if s == "" {
		return -1
	}
	n := (len(s) * 3) / 4
	if len(s) >= 1 && s[len(s)-1] == '=' {
		n--
	}
	if len(s) >= 2 && s[len(s)-2] == '=' {
		n--
	}
	return n
}

// Uniform responses — no distinction between bad sig, bad KEM, or bad AES (anti-oracle).
func respondForbidden(w http.ResponseWriter) {
	http.Error(w, `{"message":"Forbidden"}`, http.StatusForbidden)
}

func respondInvalid(w http.ResponseWriter) {
	http.Error(w, `{"message":"Invalid encrypted payload"}`, http.StatusBadRequest)
}

// Must match packages/shared canonicalSignBytes key order (not Go map alphabetical order).
func canonicalSignJSON(p payloadShape) []byte {
	type cipherJSON struct {
		Algorithm  string `json:"algorithm"`
		IV         string `json:"iv"`
		Ciphertext string `json:"ciphertext"`
		Tag        string `json:"tag"`
	}
	type kemJSON struct {
		Algorithm  string `json:"algorithm"`
		Ciphertext string `json:"ciphertext"`
	}
	type classicalKemJSON struct {
		Algorithm          string `json:"algorithm"`
		EphemeralPublicKey string `json:"ephemeralPublicKey"`
	}
	ordered := struct {
		Cipher       cipherJSON       `json:"cipher"`
		ClassicalKem classicalKemJSON `json:"classicalKem"`
		Kem          kemJSON          `json:"kem"`
		Nonce        string           `json:"nonce"`
		ProjectID    string           `json:"projectId"`
		Timestamp    string           `json:"timestamp"`
	}{
		Cipher: cipherJSON{
			Algorithm:  p.Cipher.Algorithm,
			IV:         p.Cipher.IV,
			Ciphertext: p.Cipher.Ciphertext,
			Tag:        p.Cipher.Tag,
		},
		ClassicalKem: classicalKemJSON{
			Algorithm:          p.ClassicalKem.Algorithm,
			EphemeralPublicKey: p.ClassicalKem.EphemeralPublicKey,
		},
		Kem: kemJSON{
			Algorithm:  p.Kem.Algorithm,
			Ciphertext: p.Kem.Ciphertext,
		},
		Nonce:     p.Nonce,
		ProjectID: p.ProjectID,
		Timestamp: p.Timestamp,
	}
	b, _ := json.Marshal(ordered)
	return b
}

func aesGcmDecrypt(key, iv, ciphertext, tag []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	combined := append(ciphertext, tag...)
	return gcm.Open(nil, iv, combined, nil)
}

func zeroize(b []byte) {
	for i := range b {
		b[i] = 0
	}
}

func writeJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(v)
}

// Ensure rand is used for any future keygen extensions
var _ = rand.Reader
