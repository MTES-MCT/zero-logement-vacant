"""
Minimal compilation tests for the dagster project.

These tests verify that all Python files compile without syntax errors
and that configuration files are valid. This catches common errors
when files are modified directly on GitHub.

Note: Full dagster definitions loading requires environment variables
that are only available in production. These tests focus on syntax
validation and configuration checks that can run in CI.
"""

import ast
import re
from pathlib import Path

import pytest

# Get the project root (analytics/dagster)
PROJECT_ROOT = Path(__file__).parent.parent
SRC_DIR = PROJECT_ROOT / "src"

# Dagster valid name pattern
DAGSTER_NAME_PATTERN = re.compile(r"^[A-Za-z0-9_]+$")

# Valid enum values from base.py (must match exactly, case-sensitive)
VALID_FILE_TYPES = {"CSV", "PARQUET", "XLSX"}
VALID_PRODUCERS = {"CEREMA", "DGALN", "INSEE", "URSSAF", "DGFIP", "PRIVATE"}


def get_all_python_files() -> list[Path]:
    """Collect all Python files in the src directory."""
    return list(SRC_DIR.rglob("*.py"))


class TestPythonCompilation:
    """Test that all Python files can be compiled (syntax check)."""

    @pytest.mark.parametrize(
        "python_file",
        get_all_python_files(),
        ids=lambda p: str(p.relative_to(PROJECT_ROOT)),
    )
    def test_file_compiles(self, python_file: Path):
        """Each Python file should compile without syntax errors."""
        source = python_file.read_text(encoding="utf-8")
        try:
            ast.parse(source, filename=str(python_file))
        except SyntaxError as e:
            pytest.fail(f"Syntax error in {python_file}: {e}")


class TestAssetNameValidation:
    """
    Test that asset names in configuration files are valid Dagster names.
    
    Dagster requires asset names to match ^[A-Za-z0-9_]+$ pattern.
    This test reads the config files directly (without importing) to
    validate names without requiring environment variables.
    """

    def _extract_names_from_ast(self, source: str) -> list[str]:
        """
        Extract 'name' values from ExternalSourceConfig calls in source code.
        
        This parses the AST to find patterns like:
        ExternalSourceConfig(name="some_name", ...)
        """
        tree = ast.parse(source)
        names = []

        for node in ast.walk(tree):
            if isinstance(node, ast.Call):
                # Look for ExternalSourceConfig(...) calls
                if isinstance(node.func, ast.Name) and node.func.id == "ExternalSourceConfig":
                    for keyword in node.keywords:
                        if keyword.arg == "name" and isinstance(keyword.value, ast.Constant):
                            names.append(keyword.value.value)
        return names

    def test_dgfip_config_names_valid(self):
        """DGFIP external source names should be valid Dagster names."""
        config_file = SRC_DIR / "assets/dwh/ingest/queries/config/dgfip.py"
        source = config_file.read_text(encoding="utf-8")
        names = self._extract_names_from_ast(source)
        
        invalid = [name for name in names if not DAGSTER_NAME_PATTERN.match(name)]
        assert not invalid, f"Invalid DGFIP asset names (must match ^[A-Za-z0-9_]+$): {invalid}"

    def test_dgaln_config_names_valid(self):
        """DGALN external source names should be valid Dagster names."""
        config_file = SRC_DIR / "assets/dwh/ingest/queries/config/dgaln.py"
        source = config_file.read_text(encoding="utf-8")
        names = self._extract_names_from_ast(source)
        
        invalid = [name for name in names if not DAGSTER_NAME_PATTERN.match(name)]
        assert not invalid, f"Invalid DGALN asset names (must match ^[A-Za-z0-9_]+$): {invalid}"

    def test_insee_config_names_valid(self):
        """INSEE external source names should be valid Dagster names."""
        config_file = SRC_DIR / "assets/dwh/ingest/queries/config/insee.py"
        source = config_file.read_text(encoding="utf-8")
        names = self._extract_names_from_ast(source)
        
        invalid = [name for name in names if not DAGSTER_NAME_PATTERN.match(name)]
        assert not invalid, f"Invalid INSEE asset names (must match ^[A-Za-z0-9_]+$): {invalid}"

    def test_cerema_config_names_valid(self):
        """CEREMA external source names should be valid Dagster names."""
        config_file = SRC_DIR / "assets/dwh/ingest/queries/config/cerema.py"
        source = config_file.read_text(encoding="utf-8")
        names = self._extract_names_from_ast(source)
        
        invalid = [name for name in names if not DAGSTER_NAME_PATTERN.match(name)]
        assert not invalid, f"Invalid CEREMA asset names (must match ^[A-Za-z0-9_]+$): {invalid}"

    def test_urssaf_config_names_valid(self):
        """URSSAF external source names should be valid Dagster names."""
        config_file = SRC_DIR / "assets/dwh/ingest/queries/config/urssaf.py"
        source = config_file.read_text(encoding="utf-8")
        names = self._extract_names_from_ast(source)
        
        invalid = [name for name in names if not DAGSTER_NAME_PATTERN.match(name)]
        assert not invalid, f"Invalid URSSAF asset names (must match ^[A-Za-z0-9_]+$): {invalid}"


class TestEnumValidation:
    """
    Test that enum values used in config files are valid.
    
    This catches errors like FileType.Parquet (should be FileType.PARQUET)
    or Producer.Dgfip (should be Producer.DGFIP).
    """

    def _extract_enum_usages(self, source: str, enum_name: str) -> list[tuple[str, int]]:
        """
        Extract all usages of an enum from source code.
        
        Returns list of (attribute_name, line_number) tuples.
        E.g., for FileType.PARQUET returns [("PARQUET", 10)]
        """
        tree = ast.parse(source)
        usages = []

        for node in ast.walk(tree):
            if isinstance(node, ast.Attribute):
                # Look for EnumName.VALUE patterns
                if isinstance(node.value, ast.Name) and node.value.id == enum_name:
                    usages.append((node.attr, node.lineno))
        return usages

    def _validate_enum_usages(
        self, config_file: Path, enum_name: str, valid_values: set[str]
    ) -> list[str]:
        """Validate all usages of an enum in a file."""
        source = config_file.read_text(encoding="utf-8")
        usages = self._extract_enum_usages(source, enum_name)
        
        errors = []
        for attr, lineno in usages:
            if attr not in valid_values:
                # Find the closest valid value (case-insensitive match)
                suggestion = next(
                    (v for v in valid_values if v.upper() == attr.upper()), None
                )
                if suggestion:
                    errors.append(
                        f"Line {lineno}: {enum_name}.{attr} should be {enum_name}.{suggestion}"
                    )
                else:
                    errors.append(
                        f"Line {lineno}: {enum_name}.{attr} is not valid. "
                        f"Valid values: {', '.join(sorted(valid_values))}"
                    )
        return errors

    @pytest.mark.parametrize(
        "config_file",
        list((SRC_DIR / "assets/dwh/ingest/queries/config").glob("*.py")),
        ids=lambda p: p.name,
    )
    def test_filetype_enum_values_valid(self, config_file: Path):
        """FileType enum values should be uppercase (CSV, PARQUET, XLSX)."""
        errors = self._validate_enum_usages(config_file, "FileType", VALID_FILE_TYPES)
        assert not errors, f"Invalid FileType usage in {config_file.name}:\n" + "\n".join(errors)

    @pytest.mark.parametrize(
        "config_file",
        list((SRC_DIR / "assets/dwh/ingest/queries/config").glob("*.py")),
        ids=lambda p: p.name,
    )
    def test_producer_enum_values_valid(self, config_file: Path):
        """Producer enum values should be uppercase (CEREMA, DGALN, etc.)."""
        errors = self._validate_enum_usages(config_file, "Producer", VALID_PRODUCERS)
        assert not errors, f"Invalid Producer usage in {config_file.name}:\n" + "\n".join(errors)
