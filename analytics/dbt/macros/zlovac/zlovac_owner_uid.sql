{% macro zlovac_owner_uid(fullname_expr, address_expr, idpersonne_expr) %}
-- Deterministic UUID v5 keyed on
-- (COALESCE(idpersonne,'') || '|' || UPPER(TRIM(fullname)) || '|' || normalize_address(address)).
-- Namespace: RFC 4122 DNS namespace 6ba7b810-9dad-11d1-80b4-00c04fd430c8.
--
-- idpersonne is included so DGFIP-duplicate idpersonne (same person entered
-- twice on one parcel with two distinct idpersonne, same fullname+address)
-- resolve to TWO distinct owner_uid. Downstream dedup is deferred to the
-- manual dedup workstream. Rows with NULL idpersonne (CER no-match path)
-- still collapse by fullname+address.
{%- set hash_expr -%}
LOWER(sha1(
    from_hex('6ba7b8109dad11d180b400c04fd430c8')
    || encode(
        COALESCE({{ idpersonne_expr }}, '')
        || '|'
        || UPPER(TRIM(COALESCE({{ fullname_expr }}, '')))
        || '|'
        || {{ normalize_address("COALESCE(" ~ address_expr ~ ", '')") }}
    )
))
{%- endset %}
CAST(
    SUBSTR({{ hash_expr }}, 1, 8) || '-' ||
    SUBSTR({{ hash_expr }}, 9, 4) || '-' ||
    '5' || SUBSTR({{ hash_expr }}, 14, 3) || '-' ||
    '8' || SUBSTR({{ hash_expr }}, 18, 3) || '-' ||
    SUBSTR({{ hash_expr }}, 21, 12)
AS UUID)
{% endmacro %}
