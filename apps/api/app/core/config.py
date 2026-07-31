from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Bhagwanti Cloud"
    API_V1_STR: str = "/api/v1"
    
    # Security (Dev defaults, overwrite via .env in production)
    SECRET_KEY: str = "bhagwanti_cloud_super_secret_key_development_only_1234567890"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Infrastructure Connection strings
    DATABASE_URL: str = "sqlite:///c:/Users/v/Desktop/Bhagwanti/bhagwanti.db"
    REDIS_URL: str = "redis://localhost:6379/0"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()
