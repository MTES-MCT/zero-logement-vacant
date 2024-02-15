CREATE TABLE _localities_
(
    com_code    text,
    com_siren   integer,
    com_name    text,
    epci_siren  integer,
    epci_name   text,
    dep_siren   integer,
    dep_name    text,
    reg_siren   text,
    reg_name    text,
    ept_siren   text,
    ept_name    text
);

\set copy '\\COPY _localities_ FROM ' :filePath ' DELIMITER '';'' CSV HEADER;'
:copy

INSERT INTO localities (geo_code, name) (
    SELECT lpad(com_code, 5, '0'), com_name from _localities_
) ON CONFLICT (geo_code) DO UPDATE SET name = EXCLUDED.name;


-- Communes
INSERT INTO establishments (siren, name, localities_geo_code, kind) (
    SELECT DISTINCT on (com_siren) com_siren,
           (case when left(upper(com_name) , 1) in ('A','E','I','O','U') then 'Commune d''' || com_name
                 else 'Commune de ' || com_name
           end),
           array[com_code],
           'Commune'
    FROM _localities_
) ON CONFLICT (siren) DO UPDATE SET name = EXCLUDED.name, localities_geo_code = EXCLUDED.localities_geo_code;


-- EPCI
INSERT INTO establishments (siren, name, localities_geo_code, kind) (
    SELECT DISTINCT on (epci_siren) epci_siren, epci_name, array_agg(l2.geo_code), 'EPCI'
    FROM _localities_ l1, localities l2
    WHERE lpad(l1.com_code, 5, '0') = l2.geo_code GROUP BY epci_siren, epci_name
) ON CONFLICT (siren) DO UPDATE SET name = EXCLUDED.name, localities_geo_code = EXCLUDED.localities_geo_code;


-- Departements
INSERT INTO establishments (siren, name, localities_geo_code, kind) (
    SELECT DISTINCT on (dep_siren) dep_siren,
           'Département ' || dep_name,
           array_agg(l.com_code),
           'DEP'
    FROM _localities_ l, localities l2
    WHERE lpad(l.com_code, 5, '0') = l2.geo_code GROUP BY dep_siren, dep_name
) ON CONFLICT (siren) DO UPDATE SET name = EXCLUDED.name, localities_geo_code = EXCLUDED.localities_geo_code, kind = EXCLUDED.kind;


-- Regions
INSERT INTO establishments (siren, name, localities_geo_code, kind) (
    SELECT DISTINCT on (reg_siren) reg_siren::integer,
           'Région ' || reg_name,
           array_agg(l.com_code),
           'REG'
    FROM _localities_ l, localities l2
    WHERE reg_siren is not null and reg_siren <> '' AND lpad(l.com_code, 5, '0') = l2.geo_code GROUP BY reg_siren, reg_name
) ON CONFLICT (siren) DO UPDATE SET name = EXCLUDED.name, localities_geo_code = EXCLUDED.localities_geo_code, kind = EXCLUDED.kind;


-- EPT
INSERT INTO establishments (siren, name, localities_geo_code, kind) (
    SELECT DISTINCT on (ept_siren) ept_siren::integer, ept_name,
           array_agg(l.com_code),
           'SIVOM'
    FROM _localities_ l, localities l2
    WHERE ept_siren is not null AND lpad(l.com_code, 5, '0') = l2.geo_code GROUP BY ept_siren, ept_name
) ON CONFLICT (siren) DO UPDATE SET name = EXCLUDED.name, localities_geo_code = EXCLUDED.localities_geo_code, kind = EXCLUDED.kind;


-- Link establishments <-> localities
INSERT INTO establishments_localities (
    SELECT l.id, e.id
    FROM localities l, establishments e
    WHERE l.geo_code = any(e.localities_geo_code)
) ON conflict do nothing;


--Cleanup
DELETE FROM localities
WHERE NOT EXISTS (
    SELECT  * FROM _localities_ WHERE geo_code=lpad(com_code, 5, '0')
);
DELETE FROM settings s
WHERE NOT EXISTS (
    SELECT * FROM establishments_localities el WHERE s.establishment_id = el.establishment_id
);
DELETE FROM establishments e
WHERE NOT EXISTS (
    SELECT * FROM establishments_localities el WHERE e.id = el.establishment_id
);

DROP TABLE _localities_;

