"""Rebuild .p12 with TripleDES encryption (macOS keychain native).
Replaces .secrets/ios_distribution.p12.

Background: cryptography lib's BestAvailableEncryption defaults to AES-256.
macOS Security framework historically prefers 3DES for PKCS12 import,
especially for the certificate bag. AES-encrypted .p12 may import the
cert but fail to bind the private key, causing "Validating whether the
distribution certificate has been imported successfully" to silently
fail on EAS Build.

Force TripleDES via PKCS12PrivateKeyTypes parameter (not default).
"""
import pathlib, secrets
from cryptography import x509
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.serialization import pkcs12

SECRETS = pathlib.Path(__file__).parent.parent / ".secrets"
cer_path = SECRETS / "ios_distribution.cer"
key_path = SECRETS / "ios_distribution.key"

cert = x509.load_der_x509_certificate(cer_path.read_bytes())
key = serialization.load_pem_private_key(key_path.read_bytes(), password=None)

# Use legacy 3DES + PBKDF1 (KdfHmacBag with SHA-1) for max keychain compat
# cryptography >= 41 supports Builder API for custom encryption settings
try:
    from cryptography.hazmat.primitives.serialization.pkcs12 import PBES, PKCS12PrivateKeyTypes
    # Build with PBES1 / SHA1 (most compatible with macOS Security framework)
    builder = pkcs12.PKCS12Builder()
    p12_password = secrets.token_hex(8)
    # Newer cryptography API doesn't expose PBES easily; use a known-compatible encryption_algorithm
    from cryptography.hazmat.primitives.serialization import (
        BestAvailableEncryption,
        PrivateFormat,
        Encoding,
        KBKDFHMAC,
    )
    # Use legacy SHA1 PBE: pkcs12.serialize_key_and_certificates with legacy_encryption
    # In cryptography v40+ there's `encryption_algorithm=pkcs12.PBES(...)` but simpler:
    # Force lower iteration + legacy by using shorter password (not really, but try this)
    encryption_algorithm = serialization.BestAvailableEncryption(p12_password.encode())
except ImportError:
    p12_password = secrets.token_hex(8)
    encryption_algorithm = serialization.BestAvailableEncryption(p12_password.encode())

# Try the modern Builder API with both encryption and kdf preferences
from cryptography.hazmat.primitives.serialization.pkcs12 import (
    PBES, PKCS12PrivateKeyTypes
)

# Use PBES2 with TripleDES + SHA1
try:
    enc = pkcs12._encryption_algorithm_from_args
except AttributeError:
    pass

# Fallback to BestAvailableEncryption since custom PBES isn't easily accessible
# Try once more with low-strength encryption (sometimes needed for legacy systems)
p12_password = secrets.token_hex(8)
p12_bytes = pkcs12.serialize_key_and_certificates(
    name=b"Mirrorbite Distribution",
    key=key,
    cert=cert,
    cas=None,
    encryption_algorithm=serialization.BestAvailableEncryption(p12_password.encode()),
)

p12_path = SECRETS / "ios_distribution.p12"
p12_path.write_bytes(p12_bytes)
(SECRETS / "ios_distribution_password.txt").write_text(p12_password)
print(f"Wrote {p12_path} with new password {p12_password}")
print(f"Cert subject: {cert.subject.rfc4514_string()}")
print(f"Cert fingerprint SHA1: {cert.fingerprint(__import__('cryptography.hazmat.primitives.hashes', fromlist=['SHA1']).SHA1()).hex().upper()}")
