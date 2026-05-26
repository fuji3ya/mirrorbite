"""ASC API JWT generator + helper.

Usage:
  python asc-jwt.py
  → prints a fresh JWT (20 min validity) to stdout.

Use:
  TOKEN=$(python scripts/asc-jwt.py)
  curl -H "Authorization: Bearer $TOKEN" https://api.appstoreconnect.apple.com/v1/...
"""
import time
import sys
import jwt
import pathlib

KEY_PATH = pathlib.Path(__file__).parent.parent / ".secrets" / "AuthKey_CQ7T58CX49.p8"
KEY_ID = "CQ7T58CX49"
ISSUER_ID = "cb16e608-d263-428a-998f-aa00eab7830b"

private_key = KEY_PATH.read_text()
payload = {
    "iss": ISSUER_ID,
    "iat": int(time.time()),
    "exp": int(time.time()) + 60 * 19,  # 20 min - 1 sec
    "aud": "appstoreconnect-v1",
}
headers = {
    "alg": "ES256",
    "kid": KEY_ID,
    "typ": "JWT",
}
token = jwt.encode(payload, private_key, algorithm="ES256", headers=headers)
sys.stdout.write(token)
