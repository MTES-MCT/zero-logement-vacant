from pydantic_settings import BaseSettings
from pydantic import Field, field_validator
import dagster
from dagster import resource, String, Int, Bool
from ..config import Config

class BANConfig(BaseSettings):
    api_url: str = Field(Config.BAN_API_URL)
    csv_file_path: str = Field(Config.CSV_FILE_PATH)

    chunk_size: int = Field(Config.CHUNK_SIZE)
    max_files: int = Field(Config.MAX_FILES)
    disable_max_files: bool = Field(Config.DISABLE_MAX_FILES)

    ttl_not_found_days: int = Field(Config.BAN_TTL_NOT_FOUND_DAYS)
    ttl_low_score_days: int = Field(Config.BAN_TTL_LOW_SCORE_DAYS)
    daily_max_records: int = Field(Config.BAN_DAILY_MAX_RECORDS)

    @field_validator("chunk_size")
    def chunk_size_positive(cls, v):
        if v <= 0:
            raise ValueError("chunk_size must be > 0")
        return v

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

@resource(
    config_schema={
        "api_url": dagster.Field(String, default_value=Config.BAN_API_URL),
        "csv_file_path": dagster.Field(String, default_value=Config.CSV_FILE_PATH),
        "chunk_size": dagster.Field(Int, default_value=Config.CHUNK_SIZE),
        "max_files": dagster.Field(Int, default_value=Config.MAX_FILES),
        "disable_max_files": dagster.Field(Bool, default_value=Config.DISABLE_MAX_FILES),
        "ttl_not_found_days": dagster.Field(Int, default_value=Config.BAN_TTL_NOT_FOUND_DAYS),
        "ttl_low_score_days": dagster.Field(Int, default_value=Config.BAN_TTL_LOW_SCORE_DAYS),
        "daily_max_records": dagster.Field(Int, default_value=Config.BAN_DAILY_MAX_RECORDS),
    }
)
def ban_config_resource(init_context):
    return BANConfig(**init_context.resource_config)
