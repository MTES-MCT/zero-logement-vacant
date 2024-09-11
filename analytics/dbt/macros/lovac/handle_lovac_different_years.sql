{% macro handle_lovac_different_years() %}
cleaned_data AS (
    SELECT
            annee as data_year,
            ff_millesime,
            invariant,
            ff_idlocal AS local_id,
            TRY_CAST(groupe AS INTEGER) as groupe,
            debutvacance AS vacancy_start_year,
            aff as aff,
            'lovac-' || annee as file_year,
            annee as year, groupe, aff , nature,ff_ccthp, TRY_CAST(debutvacance as INTEGER) as debutvacance, 
            ccodep,
            lpad(ccodep, 2, '0') || lpad(commune, 3, '0') AS geo_code,
            nature AS housing_kind

    FROM
            source
)

SELECT * FROM cleaned_data
QUALIFY 
    ROW_NUMBER() OVER (PARTITION BY local_id ORDER BY 1 DESC) = 1

{% endmacro %}