"""
Base configuration types and utilities for external data sources.
"""

from enum import Enum
from typing import Optional
from dataclasses import dataclass, field


class FileType(str, Enum):
    """Supported file types for external data sources."""
    CSV = "csv"
    PARQUET = "parquet"
    XLSX = "xlsx"


class Producer(str, Enum):
    """Data producers."""
    ANAH="ANAH"
    ANCT="ANCT"
    CEREMA = "CEREMA"
    DGALN = "DGALN"
    INSEE = "INSEE"
    URSSAF = "URSSAF"
    DGFIP = "DGFIP"
    PRIVATE = "PRIVATE"



@dataclass
class ExternalSourceConfig:
    """
    Configuration for an external data source.
    
    The table name is automatically generated as: external.{producer}_{name}_raw
    where producer is lowercased.
    """
    name: str  # Source name (will be used in table name and asset key)
    url: str  # Can be HTTP URL or s3:// path
    producer: Producer
    file_type: FileType
    description: str
    url_documentation: Optional[str] = None
    type_overrides: Optional[dict[str, str]] = None  # Column type overrides (not supported for XLSX)
    read_options: Optional[dict[str, any]] = None  # Additional read options
    
    @property
    def table_name(self) -> str:
        """Generate table name: external.{producer}_{name}_raw"""
        return f"external.{self.producer.value.lower()}_{self.name}_raw"
    
    def to_dict(self) -> dict:
        """Convert to dictionary format expected by existing code."""
        return {
            "url": self.url,
            "table_name": self.table_name,
            "file_type": self.file_type.value,
            "description": self.description,
            "producer": self.producer.value,
            "type_overrides": self.type_overrides,
            "read_options": self.read_options,
        }

