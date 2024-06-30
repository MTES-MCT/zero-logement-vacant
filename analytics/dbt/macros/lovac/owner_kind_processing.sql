{% macro process_owner_kind(catpro_3) %}
    CASE
        WHEN {{ catpro_3 }} IN ('P1a','P1b','P2a','P3a','P4a','P4b','P4c','P4d','P5a','P6a','P6b') THEN 'Etat et collectivité territoriale'
        WHEN {{ catpro_3 }} IN ('F1a','F2a','F2b','F4a','F4b','F4c','F5a','F5b','F7a','F7c','F7g') THEN 'Bailleur social, Aménageur, Investisseur public'
        WHEN {{ catpro_3 }} IN ('F6a','F6b','F6c','F7b','F7d','F7e','F7f') THEN 'Promoteur, Investisseur privé'
        WHEN {{ catpro_3 }} IN ('A1a','A1e','A1f','A1g','A1h','A2a','A2c','A2d','A3a','A3b','A3c','A3d','A3e','A3f','A3g','A3h','A4a','A5a',
                                 'R1a','R2a','R2b','R2c','R3a','R4a','R4b','R4c','R4d','R5a','R5b','R6a','R7a','R0a',
                                 'E1a','E2a','E2b','E2c','E2d','E2e','E2f','E2g','E2h','E2i','E2j','E2k','E2l','E2m','E2n','E2o','E2q','E2r','E3a','E3e',
                                 'S1a','S1b','S1c','S1d','S1e','S2a','S2b','S2c','S2d','S2e','S2g',
                                 'Z1a','Z2a','Z2b','Z2c','Z3a','Z3b','Z3c','Z4a','Z4b',
                                 'L1a','L1b','L1c','L1d','L2a','L3a','L3b','L4a') THEN 'Autres'
        WHEN {{ catpro_3 }} IN ('G1a','G1b','G1c','G1d','G2a','G2b','G2c','G2d','M1a','M2a','M0a') THEN 'SCI, Copropriété, Autres personnes morales'
        WHEN {{ catpro_3 }} = 'X1a' THEN 'Particulier'
        WHEN {{ catpro_3 }} = '999' THEN 'Absence de propriétaire'
        ELSE 'Non classifié'
    END
{% endmacro %}