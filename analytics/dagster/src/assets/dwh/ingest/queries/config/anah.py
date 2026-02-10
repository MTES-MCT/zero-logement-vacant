"""ANAH data sources configuration."""

from .base import ExternalSourceConfig, Producer, FileType

ANAH_SOURCES = [
 
]

# Convert to dict format for backward compatibility
ANAH_CONFIG = {source.name: source.to_dict() for source in ANAH_SOURCES}
