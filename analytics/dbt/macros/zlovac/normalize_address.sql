{% macro normalize_address(addr_expr) %}
-- Normalize address for matching:
-- 1. UPPER + TRIM
-- 2. Strip leading zeros before digits: 0024 -> 24
-- 3. Remove building prefixes: BAT A, BAT 1, ESC B, VILLA xxx, etc.
-- 4. Normalize SAINTE -> STE, SAINT -> ST (word boundaries)
-- 5. Add space after bis/ter suffixes: 22BRUE -> 22B RUE, 5TRUE -> 5T RUE
-- 6. Collapse multiple spaces
REGEXP_REPLACE(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            REGEXP_REPLACE(
              UPPER(TRIM({{ addr_expr }})),
              '(^|\s)0+(\d)', '\1\2', 'g'
            ),
            '^(BAT(IMENT)?|ESC|APPT|APPARTEMENT|PORTE|ETAGE|RDC|CHEZ\s+\S+(\s+\S+)?)\s+\S+\s+', '', 'i'
          ),
          '\bSAINTE\b', 'STE', 'g'
        ),
        '\bSAINT\b', 'ST', 'g'
      ),
      '(\d[A-Z])(RUE|AV|BD|IMP|ALL|CHE|PL|PAS|RTE|QUA|CIT|VLA|GR)', '\1 \2', 'g'
    ),
    '\s{2,}', ' ', 'g'
  ),
  '^\s+|\s+$', '', 'g'
)
{% endmacro %}
