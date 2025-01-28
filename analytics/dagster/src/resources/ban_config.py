from pydantic_settings import BaseSettings
from pydantic import Field, field_validator
from dagster import resource

class BANConfig(BaseSettings):
    api_url: str = Field("https://api-adresse.data.gouv.fr/search/csv/", env="BAN_API_URL")
    csv_file_path: str = Field("temp_csv", env="CSV_FILE_PATH")

    chunk_size: int = Field(10000, env="CHUNK_SIZE")
    max_files: int = Field(5, env="MAX_FILES")
    disable_max_files: bool = Field(False, env="DISABLE_MAX_FILES")

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
        "api_url": str,
        "csv_file_path": str,
        "chunk_size": int,
        "max_files": int,
        "disable_max_files": bool,
    }
)
def ban_config_resource(init_context):
    return BANConfig(**init_context.resource_config)
