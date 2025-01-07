SELECT
    code_departement,
    nom_departement,
    code_region,
    nom_region
FROM {{ ref ('departements_france') }}
