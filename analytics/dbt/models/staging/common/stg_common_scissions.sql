SELECT
ANNEE_MODIF as year,
CAST(COM_INI AS VARCHAR) as geo_code_source,
CAST(COM_FIN AS VARCHAR) as geo_code_destination,
LIB_COM_INI as libelle_source,
LIB_COM_FIN as libelle_destination
FROM {{ ref('scissions')}}
