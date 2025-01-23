{% macro handle_lovac_different_years (new_version=False) %}
cleaned_data AS (
SELECT
annee as data_year,
ff_millesime,
invariant,
ff_idlocal AS local_id,
TRY_CAST (groupe AS INTEGER) as groupe,
debutvacance AS vacancy_start_year,
aff as aff,
'lovac-' || annee as file_year,
annee as year, groupe, aff, nature, ff_ccthp,
TRY_CAST (debutvacance as INTEGER) as debutvacance,
ccodep,
lpad (ccodep, 2, '0') || lpad (commune, 3, '0') AS geo_code,
nature AS housing_kind,
ff_stoth, 
CASE 
      WHEN potentiel_tlv_thlv = ' ' OR potentiel_tlv_thlv IS NULL THEN false
      WHEN potentiel_tlv_thlv = '*' THEN true
      ELSE NULL
END as potentiel_tlv_thlv,
TRY_CAST(ff_stoth AS NUMERIC) as living_area,
{% if new_version %}
    TRY_CAST(ff_dcntpa AS NUMERIC) as plot_area,
    TRY_CAST(ff_jdatnss_1 AS DATE) AS ff_jdatnss_1,
    TRY_CAST(ff_jdatnss_2 AS DATE) AS ff_jdatnss_2,
    TRY_CAST(ff_jdatnss_3 AS DATE) AS ff_jdatnss_3,
    TRY_CAST(ff_jdatnss_4 AS DATE) AS ff_jdatnss_4,
    TRY_CAST(ff_jdatnss_5 AS DATE) AS ff_jdatnss_5,
    TRY_CAST(ff_jdatnss_6 AS DATE) AS ff_jdatnss_6,

{% else %}
    NULL as plot_area,
    NULL AS ff_jdatnss_1,
    NULL AS ff_jdatnss_2,
    NULL AS ff_jdatnss_3,
    NULL AS ff_jdatnss_4,
    NULL AS ff_jdatnss_5,
    NULL AS ff_jdatnss_6,
{% endif %}


source.*

FROM
source
)
SELECT * FROM cleaned_data
{% endmacro %}
