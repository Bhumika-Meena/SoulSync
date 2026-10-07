from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    INTERNAL_AGENT_SECRET: str = "soulsync-internal-agent-secret-do-not-use-in-production"
    INTERNAL_GATEWAY_URL: str = "http://127.0.0.1:4000/internal/v1/tools/execute"
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    MOCK_LLM: bool = False

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()

