CREATE TABLE _extract_zlv_
(
    ccodep             TEXT,
    annee              INTEGER,
    dir                TEXT,
    sip                INTEGER,
    commune            TEXT,
    intercommunalite   TEXT,
    gestre_ppre        TEXT,
    proprietaire       TEXT,
    adresse1           TEXT,
    adresse2           TEXT,
    adresse3           TEXT,
    adresse4           TEXT,
    groupe             TEXT,
    nature             TEXT,
    loc_voie           TEXT,
    loc_num            TEXT,
    invariant          TEXT,
    refcad             TEXT,
    batloc             TEXT,
    vlcad              TEXT,
    vl_revpro          TEXT,
    aff                TEXT,
    anmutation         TEXT,
    libvoie            TEXT,
    libcom             TEXT,
    debutvacance       INTEGER,
    anrefthlv          INTEGER,
    txtlv              TEXT,
    potentiel_tlv_thlv TEXT,
    ff_idlocal         TEXT,
    ff_millesime       INTEGER,
    ff_idsec           TEXT,
    ff_idbat           TEXT,
    ff_ctpdl           TEXT,
    ff_stoth           TEXT,
    ff_slocal          TEXT,
    ff_npiece_p2       INTEGER,
    ff_jannath         INTEGER,
    ff_jdatat          INTEGER,
    ff_ndroit          INTEGER,
    ff_dnbbai          INTEGER,
    ff_dnbdou          INTEGER,
    ff_dnbwc           INTEGER,
    ff_dcapec2         INTEGER,
    ff_ccthp           TEXT,
    ff_jdatnss_1       TEXT,
    ff_ddenom_1        TEXT,
    ff_dlign3_1        TEXT,
    ff_dlign4_1        TEXT,
    ff_dlign5_1        TEXT,
    ff_dlign6_1        TEXT,
    ff_jdatnss_2       TEXT,
    ff_ddenom_2        TEXT,
    ff_dlign3_2        TEXT,
    ff_dlign4_2        TEXT,
    ff_dlign5_2        TEXT,
    ff_dlign6_2        TEXT,
    ff_jdatnss_3       TEXT,
    ff_ddenom_3        TEXT,
    ff_dlign3_3        TEXT,
    ff_dlign4_3        TEXT,
    ff_dlign5_3        TEXT,
    ff_dlign6_3        TEXT,
    ff_jdatnss_4       TEXT,
    ff_ddenom_4        TEXT,
    ff_dlign3_4        TEXT,
    ff_dlign4_4        TEXT,
    ff_dlign5_4        TEXT,
    ff_dlign6_4        TEXT,
    ff_jdatnss_5       TEXT,
    ff_ddenom_5        TEXT,
    ff_dlign3_5        TEXT,
    ff_dlign4_5        TEXT,
    ff_dlign5_5        TEXT,
    ff_dlign6_5        TEXT,
    ff_jdatnss_6       TEXT,
    ff_ddenom_6        TEXT,
    ff_dlign3_6        TEXT,
    ff_dlign4_6        TEXT,
    ff_dlign5_6        TEXT,
    ff_dlign6_6        TEXT,
    ff_catpro2txt      TEXT,
    ff_catpro3         TEXT,
    ff_locprop         INTEGER,
    ff_x               TEXT,
    ff_y               TEXT,
    ff_x_4326          TEXT,
    ff_y_4326          TEXT
);


create index _extract_zlv__ff_idlocal_ff_ccthp_index
    on _extract_zlv_ (ff_idlocal, ff_ccthp);

\set copy '\\COPY _extract_zlv_ FROM ' :filePath ' DELIMITER '';'' CSV HEADER;'
:copy

UPDATE _extract_zlv_ SET anmutation = '28/02/1999' WHERE anmutation = '31/02/1999';
UPDATE _extract_zlv_ SET anmutation = '01/01/' || substr(anmutation, 3) WHERE anmutation ~ '^[0-9]{4}';
UPDATE _extract_zlv_ SET anmutation = '01/' || substr(anmutation, 6) WHERE anmutation ~ '^[0-9]{2}/[0-9]{4}';

CALL load_housing(:dateFormat || ' CC');

REINDEX TABLE housing;
REINDEX TABLE owners;
REINDEX TABLE owners_housing;

DROP TABLE _extract_zlv_;
