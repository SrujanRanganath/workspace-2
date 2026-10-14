import bcrypt
from passlib.context import CryptContext

# passlib 1.7.4 expects bcrypt.__about__.__version__ (removed in bcrypt 4.1+).
if not hasattr(bcrypt, "__about__"):
    class _About:
        __version__ = getattr(bcrypt, "__version__", "0")

    bcrypt.__about__ = _About()

# passlib 1.7.4 probes bcrypt with a 255-byte secret. bcrypt 5+ raises instead of truncating.
_orig_hashpw = bcrypt.hashpw


def _hashpw_compat(password, salt):
    if isinstance(password, (bytes, bytearray)) and len(password) > 72:
        password = bytes(password[:72])
    return _orig_hashpw(password, salt)


bcrypt.hashpw = _hashpw_compat

# Configure bcrypt hashing
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)


def hash_password(password: str) -> str:
    """
    Hash a plain text password.
    """
    return pwd_context.hash(password)


def verify_password(
    plain_password: str,
    hashed_password: str
) -> bool:
    """
    Verify a password against its hash.
    """
    return pwd_context.verify(
        plain_password,
        hashed_password
    )