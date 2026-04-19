from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str

    @field_validator("database_url", mode="before")
    @classmethod
    def _force_asyncpg(cls, v: str) -> str:
        v = (v or "").strip().strip("'\"")
        # Tolerate users pasting `psql 'postgresql://...'`
        if v.lower().startswith("psql "):
            v = v[5:].strip().strip("'\"")
        if v.startswith("postgres://"):
            v = v.replace("postgres://", "postgresql+asyncpg://", 1)
        elif v.startswith("postgresql://") and "+asyncpg" not in v:
            v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
        # asyncpg rejects libpq params — drop them
        for junk in (
            "?sslmode=require", "&sslmode=require",
            "?channel_binding=require", "&channel_binding=require",
        ):
            v = v.replace(junk, "")
        # clean dangling `?&` or trailing `?`
        v = v.replace("?&", "?").rstrip("?&")
        return v

    openrouter_api_key: str
    openrouter_model: str = "meta-llama/llama-3.3-70b-instruct:free"
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_app_name: str = "VisaGuard"
    openrouter_site_url: str = "http://localhost:3000"

    postmark_inbound_secret: str = ""
    resend_api_key: str = ""
    frontend_url: str = "http://localhost:3000"
    app_email_domain: str = "visaguard.app"

    next_public_clerk_publishable_key: str = ""
    clerk_secret_key: str = ""

    @property
    def clerk_domain(self) -> str:
        """Derive Clerk frontend API domain from publishable key.
        pk_test_<b64(domain$)>.
        """
        import base64

        pk = self.next_public_clerk_publishable_key
        if not pk:
            return ""
        try:
            b64 = pk.split("_", 2)[2]
            padded = b64 + "=" * (-len(b64) % 4)
            decoded = base64.b64decode(padded).decode()
            return decoded.rstrip("$")
        except Exception:
            return ""

    @property
    def clerk_jwks_url(self) -> str:
        domain = self.clerk_domain
        return f"https://{domain}/.well-known/jwks.json" if domain else ""

    @property
    def clerk_issuer(self) -> str:
        domain = self.clerk_domain
        return f"https://{domain}" if domain else ""


settings = Settings()
