{% macro process_owner_property_rights (ff_ccodro) %}
CASE
WHEN {{ ff_ccodro }} = 'P' THEN 'Propriétaire'
WHEN {{ ff_ccodro }} = 'U' THEN 'Usufruitier'
WHEN {{ ff_ccodro }} = 'N' THEN 'Nu-propriétaire'
WHEN {{ ff_ccodro }} = 'R' THEN 'Prêneur à construction'
WHEN {{ ff_ccodro }} = 'F' THEN 'Foncier'
WHEN {{ ff_ccodro }} = 'T' THEN 'Tenuyer'
WHEN {{ ff_ccodro }} = 'D' THEN 'Domanier'
WHEN {{ ff_ccodro }} = 'V' THEN 'Bailleur d un bail à réhabilitation'
WHEN {{ ff_ccodro }} = 'W' THEN 'Prêneur d un bail à réhabilitation'
WHEN {{ ff_ccodro }} = 'A' THEN 'Locataire-attributaire'
WHEN {{ ff_ccodro }} = 'E' THEN 'Emphtéote'
WHEN {{ ff_ccodro }} = 'K' THEN 'Antichrististe'
WHEN {{ ff_ccodro }} = 'L' THEN 'Fonctionnaire loge'
WHEN {{ ff_ccodro }} = 'G' THEN 'Gérant, mandataire, gestionnaire'
WHEN {{ ff_ccodro }} = 'S' THEN 'Syndic de copropriété'
WHEN {{ ff_ccodro }} = 'H' THEN 'Associé dans une société en transparence fiscale'
WHEN {{ ff_ccodro }} = 'O' THEN 'Autorisation d occupation temporaire'
WHEN {{ ff_ccodro }} = 'J' THEN 'Jeune agriculteur'
WHEN {{ ff_ccodro }} = 'Q' THEN 'Gestionnaire taxe sur les bureaux'
WHEN {{ ff_ccodro }} = 'X' THEN 'La poste propriétaire et occupant'
WHEN {{ ff_ccodro }} = 'Y' THEN 'La poste occupant - non propriétaire'
WHEN {{ ff_ccodro }} = 'C' THEN 'Fiduciaire'
WHEN {{ ff_ccodro }} = 'M' THEN 'Occupant d une parcelle appartenant au département de Mayotte ou à l Etat'
WHEN {{ ff_ccodro }} = 'Z' THEN 'Gestionnaire d un bien de l Etat'
WHEN {{ ff_ccodro }} = 'B' THEN 'Bailleur à construction'
ELSE 'Non spécifié'
END
{% endmacro %}
