"""Build full iOS credentials for EAS via ASC API:
1. Fetch the certificate content we just created
2. Build .p12 (PKCS12) bundling private key + cert
3. Create Provisioning Profile via ASC API
4. Save .mobileprovision
5. Write credentials.json for EAS

Output:
  .secrets/ios_distribution.cer         (DER-decoded from base64)
  .secrets/ios_distribution.p12         (PKCS12 with private key + cert)
  .secrets/ios_distribution_password.txt (random p12 password)
  .secrets/Mirrorbite_AppStore.mobileprovision
  credentials.json                       (EAS pickup format)
"""
import base64, json, pathlib, secrets, time
import jwt
import requests
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.serialization import pkcs12, BestAvailableEncryption

KEY_ID = 'CQ7T58CX49'
ISSUER_ID = 'cb16e608-d263-428a-998f-aa00eab7830b'
CERT_ID = '6HR8JDH7HJ'  # the Distribution cert we just created
BUNDLE_ID_RESOURCE = '4G77T4BBAB'  # ASC Bundle ID resource ID
TEAM_ID = 'YXFS993Z4K'
BUNDLE_IDENTIFIER = 'app.starvingeffort.mirrorbite'
APP_ID_NUMERIC = '6772862571'

SECRETS = pathlib.Path(__file__).parent.parent / ".secrets"
P8_PATH = SECRETS / "AuthKey_CQ7T58CX49.p8"
PRIVKEY_PATH = SECRETS / "ios_distribution.key"


def jwt_token():
    return jwt.encode({
        'iss': ISSUER_ID, 'iat': int(time.time()),
        'exp': int(time.time()) + 60*19, 'aud': 'appstoreconnect-v1',
    }, P8_PATH.read_text(), algorithm='ES256',
       headers={'alg':'ES256','kid':KEY_ID,'typ':'JWT'})


# Step 1: Re-fetch certificate content (to get the latest data)
print("=== Step 1: Fetch certificate content ===")
token = jwt_token()
r = requests.get(
    f'https://api.appstoreconnect.apple.com/v1/certificates/{CERT_ID}',
    headers={'Authorization': f'Bearer {token}'})
cert_data = r.json()['data']
cert_b64 = cert_data['attributes']['certificateContent']
cert_der = base64.b64decode(cert_b64)
cer_path = SECRETS / "ios_distribution.cer"
cer_path.write_bytes(cert_der)
print(f"Saved cert: {cer_path} ({len(cert_der)} bytes)")

# Parse cert
cert = x509.load_der_x509_certificate(cert_der)
print(f"Cert subject: {cert.subject.rfc4514_string()}")
print(f"Cert expires: {cert.not_valid_after_utc}")

# Step 2: Load private key + build .p12
print("\n=== Step 2: Build .p12 ===")
key_pem = PRIVKEY_PATH.read_bytes()
private_key = serialization.load_pem_private_key(key_pem, password=None)

p12_password = secrets.token_hex(8)  # 16-char hex
(SECRETS / "ios_distribution_password.txt").write_text(p12_password)

p12_bytes = pkcs12.serialize_key_and_certificates(
    name=b"Mirrorbite Distribution",
    key=private_key,
    cert=cert,
    cas=None,
    encryption_algorithm=BestAvailableEncryption(p12_password.encode()),
)
p12_path = SECRETS / "ios_distribution.p12"
p12_path.write_bytes(p12_bytes)
print(f"Saved p12: {p12_path} ({len(p12_bytes)} bytes), password: {p12_password}")

# Step 3: Create Provisioning Profile (App Store type)
print("\n=== Step 3: Create Provisioning Profile ===")
token = jwt_token()
profile_payload = {
    "data": {
        "type": "profiles",
        "attributes": {
            "name": "Mirrorbite App Store Profile",
            "profileType": "IOS_APP_STORE"
        },
        "relationships": {
            "bundleId": {"data": {"type": "bundleIds", "id": BUNDLE_ID_RESOURCE}},
            "certificates": {"data": [{"type": "certificates", "id": CERT_ID}]},
        }
    }
}
r = requests.post(
    'https://api.appstoreconnect.apple.com/v1/profiles',
    headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
    json=profile_payload)
print(f"Profile create status: {r.status_code}")
prof_data = r.json()
if r.status_code in (200, 201):
    profile_id = prof_data['data']['id']
    profile_content_b64 = prof_data['data']['attributes']['profileContent']
    mobileprov_bytes = base64.b64decode(profile_content_b64)
    mp_path = SECRETS / "Mirrorbite_AppStore.mobileprovision"
    mp_path.write_bytes(mobileprov_bytes)
    print(f"Saved profile: {mp_path} ({len(mobileprov_bytes)} bytes), id={profile_id}")
else:
    print("ERROR:", json.dumps(prof_data, indent=2)[:800])
    raise SystemExit(1)

# Step 4: Write credentials.json for EAS
print("\n=== Step 4: Write credentials.json ===")
cred_json = {
    "ios": {
        "provisioningProfilePath": ".secrets/Mirrorbite_AppStore.mobileprovision",
        "distributionCertificate": {
            "path": ".secrets/ios_distribution.p12",
            "password": p12_password
        }
    }
}
cred_path = pathlib.Path(__file__).parent.parent / "credentials.json"
cred_path.write_text(json.dumps(cred_json, indent=2))
print(f"Wrote: {cred_path}")
print("\n=== Done. Run: eas build --platform ios --profile production --local or with --non-interactive ===")
