/**
 * Hybrid PQC primitives for the Web Worker:
 * ML-KEM-768 + X25519 (HKDF combine) + AES-256-GCM + ML-DSA-65.
 */
import { ml_kem768 } from "@noble/post-quantum/ml-kem.js";
import { ml_dsa65 as mldsa } from "@noble/post-quantum/ml-dsa.js";
import {
  PQC_ALGORITHMS,
  canonicalIntentSignBytes,
  canonicalSignBytes,
  combineHybridAesKey,
  countNodes,
  generateX25519Keypair,
  toBase64,
  x25519SharedSecret,
  type AstNode,
  type EncryptedAstPayload,
  type SignableIntentFields,
  type SignablePayloadFields,
  type StateMutatingIntent,
} from "@pqc/shared";

/** Overwrite sensitive bytes: zero, random-fill, zero again (limits cold-memory leakage). */
export function secureZero(buf: Uint8Array): void {
  buf.fill(0);
  crypto.getRandomValues(buf);
  buf.fill(0);
}

/** Generate an ML-KEM-768 keypair (FIPS 203). */
export function generateMlKemKeypair(): {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
  publicKeyB64: string;
} {
  const seed = crypto.getRandomValues(new Uint8Array(64));
  const keys = ml_kem768.keygen(seed);
  secureZero(seed);
  return {
    publicKey: keys.publicKey,
    secretKey: keys.secretKey,
    publicKeyB64: toBase64(keys.publicKey),
  };
}

/** Generate an ML-DSA-65 signing keypair (FIPS 204). */
export function generateMlDsaKeypair(): {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
  publicKeyB64: string;
} {
  const seed = crypto.getRandomValues(new Uint8Array(32));
  const keys = mldsa.keygen(seed);
  secureZero(seed);
  return {
    publicKey: keys.publicKey,
    secretKey: keys.secretKey,
    publicKeyB64: toBase64(keys.publicKey),
  };
}

/**
 * Hybrid encapsulate: ML-KEM shared secret + X25519 ECDH → HKDF → AES-256 key.
 * Caller MUST secureZero(aesKey) when encryption is finished.
 */
export function encapsulateHybridAesKey(
  serverKemPublicKey: Uint8Array,
  serverX25519PublicKey: Uint8Array
): {
  kemCiphertext: Uint8Array;
  classicalEphemeralPublicKey: Uint8Array;
  aesKey: Uint8Array;
} {
  const { cipherText: kemCiphertext, sharedSecret: pqcSs } =
    ml_kem768.encapsulate(serverKemPublicKey);
  const eph = generateX25519Keypair();
  const classicalSs = x25519SharedSecret(eph.secretKey, serverX25519PublicKey);
  const aesKey = combineHybridAesKey(pqcSs.slice(0, 32), classicalSs);
  secureZero(pqcSs);
  secureZero(classicalSs);
  secureZero(eph.secretKey);
  return {
    kemCiphertext,
    classicalEphemeralPublicKey: eph.publicKey,
    aesKey,
  };
}

export async function aes256GcmEncrypt(
  aesKey: Uint8Array,
  plaintext: Uint8Array
): Promise<{ iv: Uint8Array; ciphertext: Uint8Array; tag: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const keyBytes = aesKey.buffer.slice(aesKey.byteOffset, aesKey.byteOffset + aesKey.byteLength) as ArrayBuffer;
  const plainBytes = plaintext.buffer.slice(
    plaintext.byteOffset,
    plaintext.byteOffset + plaintext.byteLength
  ) as ArrayBuffer;
  const cryptoKey = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, tagLength: 128 },
    cryptoKey,
    plainBytes
  );
  const combined = new Uint8Array(ct);
  const tagLen = 16;
  return {
    iv,
    ciphertext: combined.subarray(0, combined.length - tagLen),
    tag: combined.subarray(combined.length - tagLen),
  };
}

/** Sign the canonical encrypted payload fields with ML-DSA-65. */
export function signMlDsaPayload(
  signerSecretKey: Uint8Array,
  fields: SignablePayloadFields
): Uint8Array {
  const signBytes = canonicalSignBytes(fields);
  return mldsa.sign(signerSecretKey, signBytes);
}

/** Sign a state-mutating publish intent with ML-DSA-65. */
export function signMlDsaIntent(
  signerSecretKey: Uint8Array,
  fields: SignableIntentFields
): Uint8Array {
  return mldsa.sign(signerSecretKey, canonicalIntentSignBytes(fields));
}

export function signPublishIntentPayload(params: {
  projectId: string;
  signerSecretKey: Uint8Array;
  signerPublicKeyId: string;
}): StateMutatingIntent {
  const fields: SignableIntentFields = {
    projectId: params.projectId,
    action: "publish",
    nonce: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  const sig = signMlDsaIntent(params.signerSecretKey, fields);
  return {
    ...fields,
    signature: { algorithm: PQC_ALGORITHMS.SIGN as "ML-DSA-65", value: toBase64(sig) },
    signerPublicKeyId: params.signerPublicKeyId,
  };
}

export type EncryptAndSignParams = {
  astJson: string;
  projectId: string;
  signerSecretKey: Uint8Array;
  signerPublicKeyId: string;
  serverKemPublicKey: Uint8Array;
  serverX25519PublicKey: Uint8Array;
};

/** Full save pipeline: hybrid KEM → AES-GCM → ML-DSA sign. */
export async function encryptAndSignAstPayload(
  params: EncryptAndSignParams
): Promise<EncryptedAstPayload> {
  let aesKey: Uint8Array | null = null;
  let plaintext: Uint8Array | null = null;

  try {
    const { kemCiphertext, classicalEphemeralPublicKey, aesKey: key } = encapsulateHybridAesKey(
      params.serverKemPublicKey,
      params.serverX25519PublicKey
    );
    aesKey = key;
    plaintext = new TextEncoder().encode(params.astJson);

    const { iv, ciphertext, tag } = await aes256GcmEncrypt(aesKey, plaintext);

    const nonce = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const ast = JSON.parse(params.astJson) as {
      root: AstNode;
      pages?: Array<{ root: AstNode }>;
    };
    const astNodeCount = ast.pages?.length
      ? ast.pages.reduce((n, p) => n + countNodes(p.root), 0)
      : countNodes(ast.root);

    const kem = {
      algorithm: PQC_ALGORITHMS.KEM as "ML-KEM-768",
      ciphertext: toBase64(kemCiphertext),
    };
    const classicalKem = {
      algorithm: PQC_ALGORITHMS.CLASSICAL_KEM as "X25519",
      ephemeralPublicKey: toBase64(classicalEphemeralPublicKey),
    };
    const cipher = {
      algorithm: "AES-256-GCM" as const,
      iv: toBase64(iv),
      ciphertext: toBase64(ciphertext),
      tag: toBase64(tag),
    };

    const signFields: SignablePayloadFields = {
      projectId: params.projectId,
      nonce,
      timestamp,
      kem,
      classicalKem,
      cipher,
    };

    const sig = signMlDsaPayload(params.signerSecretKey, signFields);

    return {
      version: 2,
      ...signFields,
      plaintextMeta: { astNodeCount, schemaVersion: 1 },
      signature: { algorithm: PQC_ALGORITHMS.SIGN as "ML-DSA-65", value: toBase64(sig) },
      signerPublicKeyId: params.signerPublicKeyId,
    };
  } finally {
    if (aesKey) secureZero(aesKey);
    if (plaintext) secureZero(plaintext);
  }
}
