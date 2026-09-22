"""Generate one VAPID key pair in the format expected by Vercel variables."""

import base64

from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
from py_vapid import Vapid


def encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode()


if __name__ == "__main__":
    vapid = Vapid()
    vapid.generate_keys()
    private_value = vapid.private_key.private_numbers().private_value.to_bytes(32, "big")
    public_value = vapid.public_key.public_bytes(
        Encoding.X962, PublicFormat.UncompressedPoint
    )
    print(f"VAPID_PUBLIC_KEY={encode(public_value)}")
    print(f"VAPID_PRIVATE_KEY={encode(private_value)}")
