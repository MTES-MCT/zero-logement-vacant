-- Échelons inscrits: pour un établissement donné, combien d'établissements des
-- échelons inférieurs couvrant son périmètre sont inscrits sur ZLV.
--
-- "Inscrit" = l'établissement compte au moins un utilisateur (`user_number > 0`).
-- À ne pas confondre avec "ouvert" (`available` ET au moins un utilisateur):
-- une collectivité peut avoir des comptes sans que l'accès soit ouvert.
--
-- Un compteur n'est renseigné que pour les établissements d'un échelon
-- STRICTEMENT supérieur à celui mesuré (rangs ci-dessous). Sinon il vaut NULL,
-- et non 0: une commune n'a pas de sous-échelon, et un pourcentage sur un
-- dénominateur vide n'a pas de sens.
--
-- Rangs: 1 commune, 2 intercommunalité (EPCI, PETR, SIVOM), 3 département
-- (DEP, SDED), 4 région (REG, SDER, CTU). Exception assumée: `sded_inscrits`
-- est aussi calculé pour les départements, un département ayant un intérêt
-- direct à savoir si "son" service déconcentré est inscrit.
--
-- Dénominateurs: pour les communes, le nombre de `geo_code` du périmètre (une
-- commune = un code géographique), plus robuste que le nombre d'établissements
-- de type Commune. Pour les autres échelons, le nombre d'établissements de
-- l'échelon dont le périmètre intersecte celui de l'établissement mesuré.

WITH establishments AS (
    SELECT
        CAST(establishment_id AS VARCHAR) AS establishment_id,
        kind,
        COALESCE(user_number, 0) > 0 AS inscrit,
        CASE
            WHEN kind = 'Commune' THEN 1
            WHEN kind IN ('CA', 'CC', 'CU', 'ME', 'PETR', 'SIVOM') THEN 2
            -- Le libellé long est un kind réel en base, à l'échelon départemental.
            WHEN kind IN (
                'DEP',
                'SDED',
                'Service déconcentré de l''État à compétence (inter) départementale'
            ) THEN 3
            WHEN kind IN ('REG', 'SDER', 'CTU') THEN 4
            ELSE NULL
        END AS echelon_rank
    FROM {{ ref ('marts_production_establishments') }}
),

localities AS (
    SELECT
        CAST(establishment_id AS VARCHAR) AS establishment_id,
        geo_code
    FROM {{ ref ('int_production_establishments_localities') }}
),

perimeter_size AS (
    SELECT
        establishment_id,
        COUNT(DISTINCT geo_code) AS total_communes_in_territory
    FROM localities
    GROUP BY establishment_id
),

-- Communes du périmètre couvertes par une commune inscrite.
communes_inscrites AS (
    SELECT
        l.establishment_id,
        COUNT(DISTINCT l.geo_code) AS n_inscrits
    FROM localities l
    JOIN localities cl ON l.geo_code = cl.geo_code
    JOIN establishments ce ON cl.establishment_id = ce.establishment_id
    WHERE ce.kind = 'Commune'
      AND ce.inscrit
    GROUP BY l.establishment_id
),

-- Établissements des autres échelons intersectant le périmètre, inscrits ou non.
{% set echelons = [
    ('intercommunalites', ['CA', 'CC', 'CU', 'ME'], 2, 'intercommunalites_inscrites'),
    ('departements', ['DEP'], 3, 'departements_inscrits'),
    ('sded', ['SDED'], 3, 'sded_inscrits'),
] %}

{% for name, kinds, rank, col in echelons %}
{{ name }}_couvrants AS (
    SELECT
        l.establishment_id,
        COUNT(DISTINCT xe.establishment_id) AS n_total,
        COUNT(DISTINCT CASE WHEN xe.inscrit THEN xe.establishment_id END) AS n_inscrits
    FROM localities l
    JOIN localities xl ON l.geo_code = xl.geo_code
    JOIN establishments xe ON xl.establishment_id = xe.establishment_id
    WHERE xe.kind IN ({{ "'" ~ kinds | join("', '") ~ "'" }})
      AND xe.establishment_id <> l.establishment_id
    GROUP BY l.establishment_id
),
{% endfor %}

final AS (
    SELECT
        e.establishment_id,
        e.kind,
        e.echelon_rank,
        ps.total_communes_in_territory,

        CASE WHEN e.echelon_rank > 1 AND COALESCE(ps.total_communes_in_territory, 0) > 0
            THEN COALESCE(ci.n_inscrits, 0)
        END AS communes_inscrites,

        {% for name, kinds, rank, col in echelons %}
        {% set applicable = "e.echelon_rank > 3 OR (e.echelon_rank = 3 AND e.kind <> 'SDED')" if name == 'sded' else "e.echelon_rank > " ~ rank %}
        CASE WHEN ({{ applicable }}) AND COALESCE({{ name }}.n_total, 0) > 0
            THEN {{ name }}.n_inscrits
        END AS {{ col }},
        CASE WHEN ({{ applicable }})
            THEN {{ name }}.n_total
        END AS {{ name }}_couvrant_le_perimetre,
        {% endfor %}

        CASE WHEN e.echelon_rank > 1 AND COALESCE(ps.total_communes_in_territory, 0) > 0
            THEN ROUND(
                COALESCE(ci.n_inscrits, 0)::FLOAT
                / ps.total_communes_in_territory * 100, 0
            )
        END AS communes_inscrites_pct

    FROM establishments e
    LEFT JOIN perimeter_size ps ON e.establishment_id = ps.establishment_id
    LEFT JOIN communes_inscrites ci ON e.establishment_id = ci.establishment_id
    {% for name, kinds, rank, col in echelons %}
    LEFT JOIN {{ name }}_couvrants AS {{ name }} ON e.establishment_id = {{ name }}.establishment_id
    {% endfor %}
)

SELECT
    establishment_id,
    kind,
    echelon_rank,
    total_communes_in_territory,
    communes_inscrites,
    communes_inscrites_pct,
    {% for name, kinds, rank, col in echelons %}
    {{ col }},
    {{ name }}_couvrant_le_perimetre,
    CASE WHEN COALESCE({{ name }}_couvrant_le_perimetre, 0) > 0
        THEN ROUND(
            {{ col }}::FLOAT
            / {{ name }}_couvrant_le_perimetre * 100, 0
        )
    END AS {{ col }}_pct{{ "," if not loop.last }}
    {% endfor %}
FROM final
