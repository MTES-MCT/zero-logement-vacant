WITH lovac_history AS (
    SELECT
        ff_idprodroit_1 AS idprodroit,
        'lovac-' || annee AS file_year,
        annee,
        groupe,
        aff,
        nature,
        ff_ccthp,
        TRY_CAST(debutvacance AS INTEGER) AS debutvacance,
        ccodep
    FROM raw_lovac_2024
    UNION ALL
    SELECT
        ff_idprodroit_2 AS idprodroit,
        'lovac-' || annee AS file_year,
        annee,
        groupe,
        aff,
        nature,
        ff_ccthp,
        TRY_CAST(debutvacance AS INTEGER) AS debutvacance,
        ccodep
    FROM raw_lovac_2024
    UNION ALL
    SELECT
        ff_idprodroit_3 AS idprodroit,
        'lovac-' || annee AS file_year,
        annee,
        groupe,
        aff,
        nature,
        ff_ccthp,
        TRY_CAST(debutvacance AS INTEGER) AS debutvacance,
        ccodep
    FROM raw_lovac_2024
    UNION ALL
    SELECT
        ff_idprodroit_4 AS idprodroit,
        'lovac-' || annee AS file_year,
        annee,
        groupe,
        aff,
        nature,
        ff_ccthp,
        TRY_CAST(debutvacance AS INTEGER) AS debutvacance,
        ccodep
    FROM raw_lovac_2024
    UNION ALL
    SELECT
        ff_idprodroit_5 AS idprodroit,
        'lovac-' || annee AS file_year,
        annee,
        groupe,
        aff,
        nature,
        ff_ccthp,
        TRY_CAST(debutvacance AS INTEGER) AS debutvacance,
        ccodep
    FROM raw_lovac_2024
    UNION ALL
    SELECT
        ff_idprodroit_6 AS idprodroit,
        'lovac-' || annee AS file_year,
        annee,
        groupe,
        aff,
        nature,
        ff_ccthp,
        TRY_CAST(debutvacance AS INTEGER) AS debutvacance,
        ccodep
    FROM raw_lovac_2024
    UNION ALL
    SELECT
        ff_idprodroit_1 AS idprodroit,
        'lovac-' || annee AS file_year,
        annee,
        groupe,
        aff,
        nature,
        ff_ccthp,
        TRY_CAST(debutvacance AS INTEGER) AS debutvacance,
        ccodep
    FROM raw_lovac_2023
    UNION ALL
    SELECT
        ff_idprodroit_2 AS idprodroit,
        'lovac-' || annee AS file_year,
        annee,
        groupe,
        aff,
        nature,
        ff_ccthp,
        TRY_CAST(debutvacance AS INTEGER) AS debutvacance,
        ccodep
    FROM raw_lovac_2023
    UNION ALL
    SELECT
        ff_idprodroit_3 AS idprodroit,
        'lovac-' || annee AS file_year,
        annee,
        groupe,
        aff,
        nature,
        ff_ccthp,
        TRY_CAST(debutvacance AS INTEGER) AS debutvacance,
        ccodep
    FROM raw_lovac_2023
    UNION ALL
    SELECT
        ff_idprodroit_4 AS idprodroit,
        'lovac-' || annee AS file_year,
        annee,
        groupe,
        aff,
        nature,
        ff_ccthp,
        TRY_CAST(debutvacance AS INTEGER) AS debutvacance,
        ccodep
    FROM raw_lovac_2023
    UNION ALL
    SELECT
        ff_idprodroit_5 AS idprodroit,
        'lovac-' || annee AS file_year,
        annee,
        groupe,
        aff,
        nature,
        ff_ccthp,
        TRY_CAST(debutvacance AS INTEGER) AS debutvacance,
        ccodep
    FROM raw_lovac_2023
    UNION ALL
    SELECT
        ff_idprodroit_6 AS idprodroit,
        'lovac-' || annee AS file_year,
        annee,
        groupe,
        aff,
        nature,
        ff_ccthp,
        TRY_CAST(debutvacance AS INTEGER) AS debutvacance,
        ccodep
    FROM raw_lovac_2023
)

SELECT idprodroit, LISTAGG(file_year, ',') AS file_years
FROM lovac_history
WHERE
    debutvacance < annee - 2
    AND groupe NOT IN ('1', '2', '3', '4', '5', '6', '9')
    AND aff = 'H'
    AND nature IN ('APPART', 'MAISON') AND ff_ccthp = 'V'
GROUP BY idprodroit
