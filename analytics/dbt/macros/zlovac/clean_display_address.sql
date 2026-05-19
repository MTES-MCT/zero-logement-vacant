{% macro clean_display_address(addr_expr) %}
-- Cleans a French postal address string for display:
-- 1. Drop standalone zero tokens: "0 0 LE MANLE" -> "LE MANLE"
--    (postal codes like 44700 are unaffected — they aren't all-zero tokens)
-- 2. Strip leading zeros before digits: "0024" -> "24", "0009 RUE" -> "9 RUE"
-- 3. Collapse runs of whitespace to a single space
-- 4. Trim
-- Idempotent. Safe to apply before normalize_address (used for owner_uid hashing).
TRIM(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        {{ addr_expr }},
        '\b0+\b', '', 'g'
      ),
      '(^|\s)0+(\d)', '\1\2', 'g'
    ),
    '\s+', ' ', 'g'
  )
)
{% endmacro %}
