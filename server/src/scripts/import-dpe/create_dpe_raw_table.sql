-- Create DPE raw data table
-- This table stores all DPE (Diagnostic de Performance Énergétique) data from ADEME API

CREATE TABLE IF NOT EXISTS dpe_raw (
    -- Primary key
    id BIGSERIAL PRIMARY KEY,

    -- Identifiers
    dpe_id TEXT NOT NULL UNIQUE,  -- _id from ADEME
    numero_dpe TEXT,  -- DPE certificate number

    -- Location
    adresse_ban TEXT,
    code_insee_ban VARCHAR(5),
    code_postal_ban VARCHAR(5),
    code_departement_ban VARCHAR(3),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,

    -- Building characteristics
    type_batiment VARCHAR(50),  -- appartement, maison
    annee_construction INTEGER,
    surface_habitable_logement DOUBLE PRECISION,

    -- Energy performance
    etiquette_dpe VARCHAR(1),  -- A, B, C, D, E, F, G
    etiquette_ges VARCHAR(1),  -- A, B, C, D, E, F, G
    conso_5_usages_ep DOUBLE PRECISION,  -- kWh ep/m²/an
    conso_5_usages_par_m2_ep INTEGER,
    emission_ges_5_usages DOUBLE PRECISION,  -- kg CO2/m²/an
    emission_ges_5_usages_par_m2 INTEGER,

    -- Dates
    date_etablissement_dpe DATE,
    date_reception_dpe DATE,
    date_fin_validite_dpe DATE,
    date_visite_diagnostiqueur DATE,

    -- Metadata
    imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_dpe_raw_dpe_id ON dpe_raw(dpe_id);
CREATE INDEX IF NOT EXISTS idx_dpe_raw_code_insee ON dpe_raw(code_insee_ban) WHERE code_insee_ban IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dpe_raw_code_postal ON dpe_raw(code_postal_ban) WHERE code_postal_ban IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dpe_raw_etiquette_dpe ON dpe_raw(etiquette_dpe) WHERE etiquette_dpe IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dpe_raw_date_etablissement ON dpe_raw(date_etablissement_dpe) WHERE date_etablissement_dpe IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dpe_raw_type_batiment ON dpe_raw(type_batiment) WHERE type_batiment IS NOT NULL;

-- GiST index for geospatial queries (if needed later)
-- CREATE INDEX IF NOT EXISTS idx_dpe_raw_location ON dpe_raw USING GIST (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Comment on table
COMMENT ON TABLE dpe_raw IS 'Raw DPE (Energy Performance Certificate) data from ADEME API';
COMMENT ON COLUMN dpe_raw.dpe_id IS 'Unique identifier from ADEME (_id field)';
COMMENT ON COLUMN dpe_raw.etiquette_dpe IS 'Energy performance label (A=best to G=worst)';
COMMENT ON COLUMN dpe_raw.etiquette_ges IS 'Greenhouse gas emissions label (A=best to G=worst)';
