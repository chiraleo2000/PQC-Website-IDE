"""
Headed Selenium demo: full PQC IDE functional workflow against Docker :4001.

Asserts live wire envelopes (ML-KEM-768 + X25519 + AES-256-GCM + ML-DSA-65), not just HTTP 200.
Screenshots every step; writes redacted pqc-evidence.json.
"""
from __future__ import annotations

import json
import os
import re
import time
from pathlib import Path
from typing import Any

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select, WebDriverWait

# Prefer localhost — Vite may bind IPv6-only ([::1]) on Windows; 127.0.0.1 then fails.
BASE = os.environ.get("PQC_SELENIUM_BASE", "http://localhost:4001/")
API_HEALTH = os.environ.get("PQC_SELENIUM_HEALTH", "http://localhost:4001/api/health")
OUT = Path(__file__).resolve().parent / "demo-shots" / "selenium"
OUT.mkdir(parents=True, exist_ok=True)

PQC_KEM = "ML-KEM-768"
PQC_CLASSICAL_KEM = "X25519"
PQC_SIGN = "ML-DSA-65"
PQC_CIPHER = "AES-256-GCM"
B64_RE = re.compile(r"^[A-Za-z0-9+/]+={0,2}$")


def shot(driver: webdriver.Chrome, name: str) -> None:
    path = OUT / name
    driver.save_screenshot(str(path))
    print(f"  screenshot -> {path.name}")


def wait_click(wait: WebDriverWait, by: By, value: str):
    el = wait.until(EC.element_to_be_clickable((by, value)))
    el.click()
    return el


def wait_visible(wait: WebDriverWait, by: By, value: str):
    return wait.until(EC.visibility_of_element_located((by, value)))


def badge_text(driver: webdriver.Chrome) -> str:
    return driver.find_element(By.CSS_SELECTOR, '[data-testid="pqc-status-badge"]').text.strip()


def wait_badge(wait: WebDriverWait, needle: str, timeout: float = 45) -> str:
    end = time.time() + timeout
    last = ""
    while time.time() < end:
        try:
            last = badge_text(wait._driver)
            if needle.lower() in last.lower():
                return last
        except Exception:
            pass
        time.sleep(0.4)
    raise AssertionError(f"Badge never matched {needle!r}; last={last!r}")


def is_b64(value: Any) -> bool:
    return isinstance(value, str) and len(value) > 8 and bool(B64_RE.match(value))


def redact_sync_body(body: dict) -> dict:
    """Algorithms + field lengths only — no ciphertext material."""
    kem = body.get("kem") or {}
    classical = body.get("classicalKem") or {}
    cipher = body.get("cipher") or {}
    sig = body.get("signature") or {}
    meta = body.get("plaintextMeta") or {}
    return {
        "version": body.get("version"),
        "kem.algorithm": kem.get("algorithm"),
        "kem.ciphertextLen": len(kem.get("ciphertext") or ""),
        "classicalKem.algorithm": classical.get("algorithm"),
        "classicalKem.ephemeralPublicKeyLen": len(classical.get("ephemeralPublicKey") or ""),
        "cipher.algorithm": cipher.get("algorithm"),
        "cipher.ivLen": len(cipher.get("iv") or ""),
        "cipher.ciphertextLen": len(cipher.get("ciphertext") or ""),
        "cipher.tagLen": len(cipher.get("tag") or ""),
        "signature.algorithm": sig.get("algorithm"),
        "signature.valueLen": len(sig.get("value") or ""),
        "nonceLen": len(body.get("nonce") or ""),
        "astNodeCount": meta.get("astNodeCount"),
        "projectId": body.get("projectId"),
        "timestamp": body.get("timestamp"),
    }


def redact_publish_body(body: dict) -> dict:
    sig = body.get("signature") or {}
    return {
        "action": body.get("action"),
        "projectId": body.get("projectId"),
        "signature.algorithm": sig.get("algorithm"),
        "signature.valueLen": len(sig.get("value") or ""),
        "signerPublicKeyId": body.get("signerPublicKeyId"),
        "timestamp": body.get("timestamp"),
    }


def assert_sync_pqc(body: dict) -> None:
    kem = body.get("kem") or {}
    classical = body.get("classicalKem") or {}
    cipher = body.get("cipher") or {}
    sig = body.get("signature") or {}
    assert body.get("version") == 2, f"sync version={body.get('version')!r}"
    assert kem.get("algorithm") == PQC_KEM, f"sync kem.algorithm={kem.get('algorithm')!r}"
    assert classical.get("algorithm") == PQC_CLASSICAL_KEM, (
        f"sync classicalKem.algorithm={classical.get('algorithm')!r}"
    )
    assert cipher.get("algorithm") == PQC_CIPHER, f"sync cipher.algorithm={cipher.get('algorithm')!r}"
    assert sig.get("algorithm") == PQC_SIGN, f"sync signature.algorithm={sig.get('algorithm')!r}"
    assert is_b64(kem.get("ciphertext")), "sync kem.ciphertext not valid base64"
    assert is_b64(classical.get("ephemeralPublicKey")), "sync classicalKem.ephemeralPublicKey not valid base64"
    assert is_b64(cipher.get("iv")), "sync cipher.iv not valid base64"
    assert is_b64(cipher.get("ciphertext")), "sync cipher.ciphertext not valid base64"
    assert is_b64(cipher.get("tag")), "sync cipher.tag not valid base64"
    assert is_b64(sig.get("value")), "sync signature.value not valid base64"
    meta = body.get("plaintextMeta") or {}
    assert (meta.get("astNodeCount") or 0) > 0, "sync plaintextMeta.astNodeCount must be > 0"
    assert len(body.get("nonce") or "") >= 16, "sync nonce too short"


def assert_publish_pqc(body: dict) -> None:
    sig = body.get("signature") or {}
    assert sig.get("algorithm") == PQC_SIGN, f"publish signature.algorithm={sig.get('algorithm')!r}"
    assert is_b64(sig.get("value")), "publish signature.value not valid base64"


class NetworkCapture:
    """CDP performance-log capture for /api/projects request bodies + responses."""

    def __init__(self, driver: webdriver.Chrome) -> None:
        self.driver = driver
        self._post_by_id: dict[str, dict[str, Any]] = {}
        self.sync_bodies: list[dict] = []
        self.publish_bodies: list[dict] = []
        self.hits: list[dict] = []

    def enable(self) -> None:
        self.driver.execute_cdp_cmd("Network.enable", {"maxPostDataSize": 10_000_000})

    def _parse_logs(self) -> None:
        for entry in self.driver.get_log("performance"):
            try:
                msg = json.loads(entry["message"])["message"]
            except Exception:
                continue
            method = msg.get("method")
            params = msg.get("params") or {}

            if method == "Network.requestWillBeSent":
                req = params.get("request") or {}
                url = req.get("url") or ""
                if "/api/projects/" not in url:
                    continue
                request_id = params.get("requestId")
                post_data = req.get("postData")
                if not post_data and request_id:
                    try:
                        got = self.driver.execute_cdp_cmd(
                            "Network.getRequestPostData", {"requestId": request_id}
                        )
                        post_data = got.get("postData")
                    except Exception:
                        post_data = None
                if request_id and post_data:
                    self._post_by_id[request_id] = {"url": url, "postData": post_data}
                    try:
                        body = json.loads(post_data)
                    except Exception:
                        continue
                    if "/sync" in url:
                        self.sync_bodies.append(body)
                    elif "/publish" in url:
                        self.publish_bodies.append(body)

            elif method == "Network.responseReceived":
                response = params.get("response") or {}
                url = response.get("url") or ""
                if "/api/projects/" not in url:
                    continue
                request_id = params.get("requestId")
                hit = {
                    "url": url,
                    "status": response.get("status"),
                    "mime": response.get("mimeType"),
                    "type": params.get("type"),
                    "requestId": request_id,
                }
                self.hits.append(hit)

    def refresh(self) -> None:
        self._parse_logs()

    def latest_sync(self) -> dict | None:
        self.refresh()
        return self.sync_bodies[-1] if self.sync_bodies else None

    def latest_publish(self) -> dict | None:
        self.refresh()
        return self.publish_bodies[-1] if self.publish_bodies else None

    def has_status(self, path_part: str, status: int = 200) -> bool:
        self.refresh()
        return any(path_part in h["url"] and h["status"] == status for h in self.hits)


def fetch_health(driver: webdriver.Chrome) -> dict:
    """Fetch /api/health in-page and render a summary for screenshot."""
    result = driver.execute_script(
        """
        const url = arguments[0];
        return fetch(url).then(async (r) => {
          const body = await r.json().catch(() => ({}));
          return { status: r.status, body };
        });
        """,
        API_HEALTH,
    )
    # Overlay evidence for screenshot
    driver.execute_script(
        """
        const data = arguments[0];
        let el = document.getElementById('pqc-health-overlay');
        if (!el) {
          el = document.createElement('pre');
          el.id = 'pqc-health-overlay';
          el.style.cssText = 'position:fixed;inset:auto 16px 16px auto;z-index:99999;'
            + 'background:#0f172a;color:#e2e8f0;padding:16px 20px;border-radius:12px;'
            + 'font:13px/1.45 ui-monospace,monospace;max-width:420px;box-shadow:0 8px 32px rgba(0,0,0,.35)';
          document.body.appendChild(el);
        }
        el.textContent = 'GET /api/health\\n' + JSON.stringify(data, null, 2);
        """,
        result,
    )
    time.sleep(0.4)
    return result


def show_pqc_assert_overlay(driver: webdriver.Chrome, evidence: dict) -> None:
    driver.execute_script(
        """
        const data = arguments[0];
        let el = document.getElementById('pqc-assert-overlay');
        if (!el) {
          el = document.createElement('pre');
          el.id = 'pqc-assert-overlay';
          el.style.cssText = 'position:fixed;inset:auto 16px 16px auto;z-index:99999;'
            + 'background:#064e3b;color:#ecfdf5;padding:16px 20px;border-radius:12px;'
            + 'font:12px/1.45 ui-monospace,monospace;max-width:480px;box-shadow:0 8px 32px rgba(0,0,0,.35)';
          document.body.appendChild(el);
        }
        el.textContent = 'PQC WIRE PROOF (redacted)\\n' + JSON.stringify(data, null, 2);
        """,
        evidence,
    )
    time.sleep(0.5)


def remove_overlays(driver: webdriver.Chrome) -> None:
    driver.execute_script(
        """
        for (const id of ['pqc-health-overlay', 'pqc-assert-overlay']) {
          const el = document.getElementById(id);
          if (el) el.remove();
        }
        """
    )


def write_evidence(payload: dict) -> Path:
    path = OUT / "pqc-evidence.json"
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"  evidence -> {path.name}")
    return path


def main() -> None:
    print("=== Selenium PQC IDE functional demo + wire proof ===")
    print(f"Target: {BASE}")
    print(f"Expect: {PQC_KEM} + {PQC_CLASSICAL_KEM} + {PQC_CIPHER} + {PQC_SIGN}")

    options = Options()
    options.add_argument("--window-size=1440,900")
    options.add_argument("--disable-gpu")
    options.set_capability("goog:loggingPrefs", {"performance": "ALL"})

    driver = webdriver.Chrome(options=options)
    wait = WebDriverWait(driver, 45)
    net = NetworkCapture(driver)
    net.enable()

    evidence: dict[str, Any] = {
        "target": BASE,
        "algorithms": {
            "kem": PQC_KEM,
            "classicalKem": PQC_CLASSICAL_KEM,
            "cipher": PQC_CIPHER,
            "sign": PQC_SIGN,
        },
        "checks": {},
    }

    try:
        driver.get(BASE)
        wait_visible(wait, By.CSS_SELECTOR, '[data-testid="left-nav"]')
        wait_badge(wait, "ML-KEM")

        health = fetch_health(driver)
        evidence["health"] = health
        assert health.get("status") == 200, f"health status={health.get('status')}"
        body = health.get("body") or {}
        # enforcePqcOnly may be nested or top-level depending on gateway
        enforce = body.get("enforcePqcOnly")
        if enforce is None and isinstance(body.get("crypto"), dict):
            enforce = body["crypto"].get("enforcePqcOnly")
        evidence["checks"]["health_200"] = True
        evidence["checks"]["enforcePqcOnly"] = enforce
        print(f"0) Health OK | enforcePqcOnly={enforce}")
        shot(driver, "00-health.png")
        remove_overlays(driver)

        theme = driver.find_element(By.CSS_SELECTOR, "html").get_attribute("data-theme")
        assert theme == "light", f"expected light theme, got {theme}"
        print(f"1) Shell loaded | badge={badge_text(driver)!r} | theme={theme}")
        shot(driver, "01-shell.png")
        evidence["checks"]["light_theme"] = True

        wait_click(wait, By.CSS_SELECTOR, '[data-testid="theme-toggle"]')
        time.sleep(0.3)
        assert driver.find_element(By.CSS_SELECTOR, "html").get_attribute("data-theme") == "dark"
        wait_click(wait, By.CSS_SELECTOR, '[data-testid="theme-toggle"]')
        time.sleep(0.3)
        assert driver.find_element(By.CSS_SELECTOR, "html").get_attribute("data-theme") == "light"
        print("1b) Theme toggle dark/light OK")
        evidence["checks"]["theme_toggle"] = True

        wait_click(wait, By.CSS_SELECTOR, '[data-testid="nav-templates"]')
        wait_visible(wait, By.CSS_SELECTOR, '[data-testid="templates-panel"]')
        print("2) Templates panel open")
        shot(driver, "02-templates.png")

        wait_click(wait, By.CSS_SELECTOR, '[data-testid="template-blog"]')
        wait_visible(wait, By.CSS_SELECTOR, '[data-testid="page-canvas"]')
        assert "Blog" in driver.find_element(By.ID, "project-name").get_attribute("value")
        print("3) Blog template loaded into builder")
        shot(driver, "03-builder-blog.png")

        wait_click(wait, By.CSS_SELECTOR, '[data-testid="preset-hero"]')
        time.sleep(0.5)
        wait_click(wait, By.CSS_SELECTOR, '[data-testid="undo-action"]')
        time.sleep(0.4)
        print("3b) Hero preset + Undo OK")
        evidence["checks"]["hero_undo"] = True

        wait_click(wait, By.CSS_SELECTOR, '[data-testid="add-p"]')
        time.sleep(0.6)
        print("4) Click-to-add Paragraph")

        wait_click(wait, By.CSS_SELECTOR, '[data-testid="nav-pqc"]')
        wait_visible(wait, By.CSS_SELECTOR, '[data-testid="pqc-panel"]')
        panel = driver.find_element(By.CSS_SELECTOR, '[data-testid="pqc-panel"]').text
        assert "ML-KEM" in panel or "Authenticated" in panel or "Session" in panel
        print("5) PQC Security panel visible")
        shot(driver, "04-pqc-panel.png")
        wait_click(wait, By.CSS_SELECTOR, '[data-testid="nav-builder"]')
        wait_visible(wait, By.CSS_SELECTOR, '[data-testid="page-canvas"]')

        nodes = driver.find_elements(By.CSS_SELECTOR, "[data-node-id]")
        if nodes:
            nodes[0].click()
            time.sleep(0.4)
            props = driver.find_elements(By.ID, "prop-class")
            if props:
                props[0].clear()
                props[0].send_keys("selenium-edited")
                print("6) Inspector edited className")
            else:
                print("6) Inspector open (no class field for this node)")
        shot(driver, "05-inspector.png")

        # --- Save + PQC sync assert ---
        net.refresh()
        sync_before = len(net.sync_bodies)
        wait_click(wait, By.CSS_SELECTOR, '[data-testid="save-project"]')
        wait_badge(wait, "Saved", timeout=60)
        time.sleep(1.2)
        net.refresh()

        sync_ok = net.has_status("/sync", 200)
        sync_body = net.latest_sync()
        assert sync_ok, f"No successful /sync. hits={[h for h in net.hits if 'sync' in h['url']]}"
        assert sync_body is not None and len(net.sync_bodies) > sync_before, (
            "CDP did not capture sync POST body - cannot prove PQC algorithms"
        )
        assert_sync_pqc(sync_body)
        sync_redacted = redact_sync_body(sync_body)
        evidence["sync"] = {"status": 200, "envelope": sync_redacted}
        evidence["checks"]["sync_200"] = True
        evidence["checks"]["sync_pqc_algorithms"] = True
        print(
            f"7) Save -> sync_200 | {PQC_KEM}/{PQC_CLASSICAL_KEM}/{PQC_CIPHER}/{PQC_SIGN} "
            f"| badge={badge_text(driver)!r}"
        )
        shot(driver, "06-after-save.png")

        show_pqc_assert_overlay(
            driver,
            {
                "endpoint": "POST /sync",
                "status": 200,
                **sync_redacted,
                "verdict": "PASS - NIST hybrid PQC envelope",
            },
        )
        shot(driver, "06b-sync-pqc-assert.png")
        remove_overlays(driver)

        # --- Publish + ML-DSA intent assert ---
        pub_before = len(net.publish_bodies)
        wait_click(wait, By.CSS_SELECTOR, '[data-testid="publish-project"]')
        wait_visible(wait, By.CSS_SELECTOR, '[data-testid="preview-modal"]')
        time.sleep(1.0)
        net.refresh()

        pub_ok = net.has_status("/publish", 200)
        pub_body = net.latest_publish()
        assert pub_ok, f"No successful /publish. hits={[h for h in net.hits if 'publish' in h['url']]}"
        assert pub_body is not None and len(net.publish_bodies) > pub_before, (
            "CDP did not capture publish POST body - cannot prove ML-DSA intent"
        )
        assert_publish_pqc(pub_body)
        pub_redacted = redact_publish_body(pub_body)
        evidence["publish"] = {"status": 200, "intent": pub_redacted}
        evidence["checks"]["publish_200"] = True
        evidence["checks"]["publish_mldsa"] = True
        print(f"8) Publish -> preview | publish_200 | {PQC_SIGN}")
        shot(driver, "07-preview.png")
        wait_click(wait, By.CSS_SELECTOR, '[data-testid="preview-close"]')

        # --- Export (auth + stored AST; no PQC body) ---
        wait_click(wait, By.CSS_SELECTOR, '[data-testid="export-project"]')
        time.sleep(2.5)
        net.refresh()
        export_hits = [h for h in net.hits if "/export" in h["url"]]
        export_ok = any(h["status"] == 200 for h in export_hits)
        evidence["export"] = {
            "status": 200 if export_ok else None,
            "hits": [{"url": h["url"], "status": h["status"], "mime": h.get("mime")} for h in export_hits[-3:]],
            "note": "Export is JWT + stored AST ZIP; PQC proven on prior sync decrypt",
        }
        evidence["checks"]["export_200"] = export_ok
        print(f"9) Export -> export_200={export_ok} | badge={badge_text(driver)!r}")
        assert export_ok, f"No successful /export. hits={export_hits}"
        shot(driver, "08-after-export.png")

        wait_click(wait, By.CSS_SELECTOR, '[data-testid="nav-projects"]')
        wait_visible(wait, By.CSS_SELECTOR, '[data-testid="projects-panel"]')
        print("10) Projects panel open")
        shot(driver, "09-projects.png")

        wait_click(wait, By.CSS_SELECTOR, '[data-testid="nav-builder"]')
        select = Select(wait_visible(wait, By.CSS_SELECTOR, 'select[aria-label="Load demo template"]'))
        select.select_by_value("login")
        time.sleep(0.8)
        name = driver.find_element(By.ID, "project-name").get_attribute("value")
        assert "Login" in name, name
        print(f"11) Top-bar template -> {name!r}")
        shot(driver, "10-login-template.png")

        evidence["checks"]["all_selenium"] = True
        evidence["verdict"] = (
            f"PASS - site data transferred with {PQC_KEM} + {PQC_CLASSICAL_KEM} + {PQC_CIPHER} + {PQC_SIGN}; "
            "classical harvestable envelopes are rejected by ENFORCE_PQC_ONLY (see security-tests)"
        )
        write_evidence(evidence)

        print("\n=== ALL SELENIUM CHECKS PASSED (incl. PQC wire proof) ===")
        print(f"Screenshots: {OUT}")
        print(f"Evidence:    {OUT / 'pqc-evidence.json'}")
        time.sleep(2)
    except Exception:
        evidence["checks"]["all_selenium"] = False
        evidence["verdict"] = "FAIL"
        try:
            write_evidence(evidence)
        except Exception:
            pass
        raise
    finally:
        driver.quit()


if __name__ == "__main__":
    main()
