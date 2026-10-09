from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator
from typing import Optional
import os

class Settings(BaseSettings):
    INTERNAL_AGENT_SECRET: str = "soulsync-internal-agent-secret-do-not-use-in-production"
    INTERNAL_GATEWAY_URL: str = "http://127.0.0.1:4000/internal/v1/tools/execute"
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    MOCK_LLM: bool = False
    ENVIRONMENT: str = "development"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def is_production(self) -> bool:
        env = (os.getenv("NODE_ENV") or self.ENVIRONMENT).lower()
        return env in ("production", "prod")

    @model_validator(mode="after")
    def validate_production_configuration(self) -> "Settings":
        env = (os.getenv("NODE_ENV") or self.ENVIRONMENT).lower()
        if env in ("production", "prod"):
            dev_secret = "soulsync-internal-agent-secret-do-not-use-in-production"
            if self.INTERNAL_AGENT_SECRET == dev_secret or len(self.INTERNAL_AGENT_SECRET) < 32:
                raise ValueError(
                    "Production requires a custom INTERNAL_AGENT_SECRET with at least 32 characters."
                )
        return self

settings = Settings()
