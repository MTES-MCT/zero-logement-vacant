"""
MotherDuck Connection Utilities
Provides helper functions for connecting to MotherDuck and executing queries.
"""

import duckdb
import pandas as pd
from typing import Optional, Any

# Global connection instance
_connection: Optional[duckdb.DuckDBPyConnection] = None

# Database configuration
DATABASE = "dwh"
SCHEMA_MARTS = "main_marts"
SCHEMA_INTERMEDIATE = "main_intermediate"


def get_connection() -> duckdb.DuckDBPyConnection:
    """
    Get or create a MotherDuck connection.
    Uses SSO authentication automatically.
    
    Returns:
        DuckDB connection to MotherDuck
    """
    global _connection
    if _connection is None:
        _connection = duckdb.connect(f'md:{DATABASE}')
        print("✅ Connected to MotherDuck")
    return _connection


def close_connection():
    """Close the MotherDuck connection."""
    global _connection
    if _connection is not None:
        _connection.close()
        _connection = None
        print("🔌 Connection closed")


def query(sql: str) -> Any:
    """
    Execute a SQL query and return raw results.
    
    Args:
        sql: SQL query string
        
    Returns:
        Query results
    """
    conn = get_connection()
    return conn.execute(sql).fetchall()


def query_df(sql: str) -> pd.DataFrame:
    """
    Execute a SQL query and return results as a pandas DataFrame.
    
    Args:
        sql: SQL query string
        
    Returns:
        pandas DataFrame with query results
    """
    conn = get_connection()
    return conn.execute(sql).fetchdf()


def query_one(sql: str) -> Any:
    """
    Execute a SQL query and return a single value.
    
    Args:
        sql: SQL query string
        
    Returns:
        Single value from query
    """
    conn = get_connection()
    result = conn.execute(sql).fetchone()
    return result[0] if result else None


# Table references for easy access
class Tables:
    """Table references for the analysis."""
    
    # Marts tables
    HOUSING_OUT_FEATURES = f"{DATABASE}.{SCHEMA_MARTS}.marts_analysis_housing_out_features"
    CITY_AGGREGATED = f"{DATABASE}.{SCHEMA_MARTS}.marts_analysis_city_aggregated"
    PRODUCTION_HOUSING = f"{DATABASE}.{SCHEMA_MARTS}.marts_production_housing"
    
    # Intermediate tables
    HOUSING_WITH_FLAG = f"{DATABASE}.{SCHEMA_INTERMEDIATE}.int_analysis_housing_with_out_flag"
    CITY_FEATURES = f"{DATABASE}.{SCHEMA_INTERMEDIATE}.int_analysis_city_features"


# Color scheme for visualizations
class Colors:
    """Color palette for consistent visualizations."""
    
    # Main colors
    HOUSING_OUT = "#2E8B57"      # Sea Green - sortis de vacance
    STILL_VACANT = "#CD5C5C"     # Indian Red - toujours vacants
    REFERENCE = "#4682B4"        # Steel Blue - référence/total
    
    # Extended palette
    PRIMARY = "#1f77b4"
    SECONDARY = "#ff7f0e"
    SUCCESS = "#2ca02c"
    DANGER = "#d62728"
    WARNING = "#ffbb78"
    INFO = "#17becf"
    
    # Gradient for heatmaps
    DIVERGING = "RdYlGn"
    SEQUENTIAL = "Blues"
    
    # Palette for categorical data
    CATEGORICAL = [
        "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
        "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"
    ]


def test_connection():
    """Test the MotherDuck connection with a simple query."""
    try:
        conn = get_connection()
        result = conn.execute("SELECT 1 as test").fetchone()
        print(f"✅ Connection test successful: {result[0]}")
        return True
    except Exception as e:
        print(f"❌ Connection test failed: {e}")
        return False












