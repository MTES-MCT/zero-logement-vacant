from dagster import AssetSpec, multi_asset, AssetExecutionContext
from ..ingest.queries.external_sources_config import EXTERNAL_SOURCES, get_sources_by_producer
from dagster_duckdb import DuckDBResource


# Get all CEREMA sources (LOVAC and FF)
cerema_sources = get_sources_by_producer("CEREMA")

print([f"check_{source_name}" for source_name in cerema_sources.keys()])


@multi_asset(
    specs=[
        AssetSpec(
            f"check_{source_name}",
            kinds={"duckdb"},
            deps=[source_name],
            group_name="check",
        )
        for source_name in cerema_sources.keys()
    ],
    can_subset=True,
)
def check_ff_lovac_on_duckdb(context: AssetExecutionContext, duckdb: DuckDBResource):
    """Check that CEREMA (FF and LOVAC) tables exist and contain data."""
    
    with duckdb.get_connection() as conn:
        for source_name, config in cerema_sources.items():
            # Check if this asset was selected
            from dagster import AssetKey
            check_key = AssetKey(f"check_{source_name}")
            if check_key not in context.op_execution_context.selected_asset_keys:
                continue
            
            table_name = config['table_name']
            query = f"SELECT COUNT(*) as cnt FROM {table_name};"
            
            context.log.info(f"Checking {table_name}")
            
            try:
                res = conn.execute(query)
                row_count = res.fetchone()[0]
                
                if row_count == 0:
                    raise Exception(f"No data in {table_name} table")
                else:
                    context.log.info(f"✅ {table_name}: {row_count:,} rows found")
                    
            except Exception as e:
                context.log.error(f"❌ Failed to check {table_name}: {str(e)}")
                raise
