"""Generate RSA private key + CSR for iOS Distribution Certificate.

Uses Python cryptography (no shell shenanigans for / in subject).
Output:
  .secrets/ios_distribution.key  (RSA 2048 private key, PEM)
  .secrets/ios_distribution.csr  (CSR, PEM)
"""
import pathlib
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa

OUT = pathlib.Path(__file__).parent.parent / ".secrets"
OUT.mkdir(exist_ok=True)

key_path = OUT / "ios_distribution.key"
csr_path = OUT / "ios_distribution.csr"

# 1. Generate RSA 2048 private key
key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
with open(key_path, "wb") as f:
    f.write(key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ))

# 2. Generate CSR
csr = (x509.CertificateSigningRequestBuilder()
    .subject_name(x509.Name([
        x509.NameAttribute(NameOID.COMMON_NAME, "Mirrorbite Distribution"),
        x509.NameAttribute(NameOID.EMAIL_ADDRESS, "forvyrcompany@gmail.com"),
        x509.NameAttribute(NameOID.COUNTRY_NAME, "JP"),
    ]))
    .sign(key, hashes.SHA256()))

with open(csr_path, "wb") as f:
    f.write(csr.public_bytes(serialization.Encoding.PEM))

print(f"Private key: {key_path}")
print(f"CSR: {csr_path}")
print(f"CSR size: {csr_path.stat().st_size} bytes")
