WITH lovac_history as (
                       SELECT ff_idprodroit_1 as idprodroit, 'lovac-' || annee as file_year, annee, groupe, aff , nature,ff_ccthp, TRY_CAST(debutvacance as INTEGER) as debutvacance, ccodep
                       FROM raw_lovac_2024
                       UNION ALL
                       SELECT ff_idprodroit_2 as idprodroit, 'lovac-' || annee as file_year, annee, groupe, aff , nature,ff_ccthp, TRY_CAST(debutvacance as INTEGER) as debutvacance, ccodep
                            FROM raw_lovac_2024
                            UNION ALL
                         SELECT ff_idprodroit_3 as idprodroit, 'lovac-' || annee as file_year,annee, groupe, aff , nature,ff_ccthp, TRY_CAST(debutvacance as INTEGER) as debutvacance, ccodep
                           FROM raw_lovac_2024
                           UNION ALL
                         SELECT ff_idprodroit_4 as idprodroit, 'lovac-' || annee as file_year, annee, groupe, aff , nature,ff_ccthp, TRY_CAST(debutvacance as INTEGER) as debutvacance, ccodep
                           FROM raw_lovac_2024
                           UNION ALL
                         SELECT ff_idprodroit_5 as idprodroit, 'lovac-' || annee as file_year, annee, groupe, aff , nature,ff_ccthp, TRY_CAST(debutvacance as INTEGER) as debutvacance, ccodep
                           FROM raw_lovac_2024
                           UNION ALL
                         SELECT ff_idprodroit_6 as idprodroit, 'lovac-' || annee as file_year, annee, groupe, aff , nature,ff_ccthp, TRY_CAST(debutvacance as INTEGER) as debutvacance, ccodep
                           FROM raw_lovac_2024
                           UNION ALL
                       SELECT ff_idprodroit_1 as idprodroit, 'lovac-' || annee as file_year, annee, groupe, aff , nature,ff_ccthp, TRY_CAST(debutvacance as INTEGER) as debutvacance, ccodep
                       FROM raw_lovac_2023
                       UNION ALL
                       SELECT ff_idprodroit_2 as idprodroit,'lovac-' || annee as file_year, annee, groupe, aff , nature,ff_ccthp, TRY_CAST(debutvacance as INTEGER) as debutvacance, ccodep
                            FROM raw_lovac_2023
                            UNION ALL
                         SELECT ff_idprodroit_3 as idprodroit, 'lovac-' || annee as file_year, annee, groupe, aff , nature,ff_ccthp, TRY_CAST(debutvacance as INTEGER) as debutvacance, ccodep
                           FROM raw_lovac_2023
                           UNION ALL
                         SELECT ff_idprodroit_4 as idprodroit, 'lovac-' || annee as file_year, annee, groupe, aff , nature,ff_ccthp, TRY_CAST(debutvacance as INTEGER) as debutvacance, ccodep
                           FROM raw_lovac_2023
                           UNION ALL
                         SELECT ff_idprodroit_5 as idprodroit,'lovac-' || annee as file_year, annee, groupe, aff , nature,ff_ccthp, TRY_CAST(debutvacance as INTEGER) as debutvacance, ccodep
                           FROM raw_lovac_2023
                           UNION ALL
                         SELECT ff_idprodroit_6 as idprodroit, 'lovac-' || annee as file_year, annee, groupe, aff , nature,ff_ccthp, TRY_CAST(debutvacance as INTEGER) as debutvacance, ccodep
                           FROM raw_lovac_2023
    )

SELECT idprodroit, listagg(file_year, ',') as file_years
FROM lovac_history
    WHERE debutvacance < annee - 2
    AND groupe NOT IN ('1','2','3','4','5','6','9')
    AND aff='H'
    AND nature in ('APPART','MAISON') AND ff_ccthp='V'
GROUP BY idprodroit