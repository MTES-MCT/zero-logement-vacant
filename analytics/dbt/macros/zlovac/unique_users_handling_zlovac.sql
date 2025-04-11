{% macro unique_users_handling_zlovac(index) %}
    SELECT
        ff_owner_{{ index }}_fullname AS owner_fullname,
        ff_owner_{{ index }}_raw_address AS owner_address,
        ff_owner_{{ index }}_birth_date AS owner_birth_date,
        ff_owner_{{ index }}_idprodroit AS owner_idprodroit,
        ff_owner_{{ index }}_idpersonne AS owner_idpersonne,
        ff_owner_{{ index }}_kind_detail AS owner_kind_detail,
        ff_owner_{{ index }}_code_droit AS owner_code_droit,
        ff_owner_{{ index }}_kind as owner_category,
        ff_owner_{{ index }}_kind_detail as owner_category_text,
        ff_owner_{{ index }}_siren as owner_siren,
        ff_owner_{{ index }}_locprop as owner_locprop, 
        ff_owner_{{ index }}_postal_code AS owner_postal_code,
        ff_owner_{{ index }}_city AS owner_city

    FROM {{ ref ('int_zlovac') }}
    WHERE ff_owner_{{ index }}_fullname IS NOT NULL
    AND ff_owner_{{ index }}_raw_address IS NOT NULL
{% endmacro %}
        