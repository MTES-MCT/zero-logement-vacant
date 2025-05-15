WITH structured_data AS (
    -- Structure data for owner 1
    SELECT
        local_id,
        owner_fullname,
        owner_postal_code,
        owner_raw_address,
        owner_city,
        mutation_date,
        ff_owner_1_fullname AS ff_owner_fullname,
        ff_owner_1_postal_code AS ff_owner_postal_code,
        ff_owner_1_birth_date AS ff_owner_birth_date,
        ff_owner_1_raw_address AS ff_owner_raw_address,
        ff_owner_1_idprodroit AS ff_owner_idprodroit,
        ff_owner_1_idpersonne AS ff_owner_idpersonne,
        ff_owner_1_locprop AS ff_owner_locprop,
        ff_owner_1_property_rights AS ff_owner_property_rights,
        1 AS rank
    FROM {{ ref('int_zlovac') }}
    WHERE ff_owner_1_fullname IS NOT NULL
    
    UNION ALL
    
    -- Structure data for owner 2
    SELECT
        local_id,
        owner_fullname,
        owner_postal_code,
        owner_raw_address,
        owner_city,
        mutation_date,
        ff_owner_2_fullname AS ff_owner_fullname,
        ff_owner_2_postal_code AS ff_owner_postal_code,
        ff_owner_2_birth_date AS ff_owner_birth_date,
        ff_owner_2_raw_address AS ff_owner_raw_address,
        ff_owner_2_idprodroit AS ff_owner_idprodroit,
        ff_owner_2_idpersonne AS ff_owner_idpersonne,
        ff_owner_2_locprop AS ff_owner_locprop,
        ff_owner_2_property_rights AS ff_owner_property_rights,
        2 AS rank
    FROM {{ ref('int_zlovac') }}
    WHERE ff_owner_2_fullname IS NOT NULL
    
    UNION ALL
    
    -- Structure data for owner 3
    SELECT
        local_id,
        owner_fullname,
        owner_postal_code,
        owner_raw_address,
        owner_city,
        mutation_date,
        ff_owner_3_fullname AS ff_owner_fullname,
        ff_owner_3_postal_code AS ff_owner_postal_code,
        ff_owner_3_birth_date AS ff_owner_birth_date,
        ff_owner_3_raw_address AS ff_owner_raw_address,
        ff_owner_3_idprodroit AS ff_owner_idprodroit,
        ff_owner_3_idpersonne AS ff_owner_idpersonne,
        ff_owner_3_locprop AS ff_owner_locprop,
        ff_owner_3_property_rights AS ff_owner_property_rights,
        3 AS rank
    FROM {{ ref('int_zlovac') }}
    WHERE ff_owner_3_fullname IS NOT NULL
    
    UNION ALL
    
    -- Structure data for owner 4
    SELECT
        local_id,
        owner_fullname,
        owner_postal_code,
        owner_raw_address,
        owner_city,
        mutation_date,
        ff_owner_4_fullname AS ff_owner_fullname,
        ff_owner_4_postal_code AS ff_owner_postal_code,
        ff_owner_4_birth_date AS ff_owner_birth_date,
        ff_owner_4_raw_address AS ff_owner_raw_address,
        ff_owner_4_idprodroit AS ff_owner_idprodroit,
        ff_owner_4_idpersonne AS ff_owner_idpersonne,
        ff_owner_4_locprop AS ff_owner_locprop,
        ff_owner_4_property_rights AS ff_owner_property_rights,
        4 AS rank
    FROM {{ ref('int_zlovac') }}
    WHERE ff_owner_4_fullname IS NOT NULL
    
    UNION ALL
    
    -- Structure data for owner 5
    SELECT
        local_id,
        owner_fullname,
        owner_postal_code,
        owner_raw_address,
        owner_city,
        mutation_date,
        ff_owner_5_fullname AS ff_owner_fullname,
        ff_owner_5_postal_code AS ff_owner_postal_code,
        ff_owner_5_birth_date AS ff_owner_birth_date,
        ff_owner_5_raw_address AS ff_owner_raw_address,
        ff_owner_5_idprodroit AS ff_owner_idprodroit,
        ff_owner_5_idpersonne AS ff_owner_idpersonne,
        ff_owner_5_locprop AS ff_owner_locprop,
        ff_owner_5_property_rights AS ff_owner_property_rights,
        5 AS rank
    FROM {{ ref('int_zlovac') }}
    WHERE ff_owner_5_fullname IS NOT NULL
    
    UNION ALL
    
    -- Structure data for owner 6
    SELECT
        local_id,
        owner_fullname,
        owner_postal_code,
        owner_raw_address,
        owner_city,
        mutation_date,
        ff_owner_6_fullname AS ff_owner_fullname,
        ff_owner_6_postal_code AS ff_owner_postal_code,
        ff_owner_6_birth_date AS ff_owner_birth_date,
        ff_owner_6_raw_address AS ff_owner_raw_address,
        ff_owner_6_idprodroit AS ff_owner_idprodroit,
        ff_owner_6_idpersonne AS ff_owner_idpersonne,
        ff_owner_6_locprop AS ff_owner_locprop,
        ff_owner_6_property_rights AS ff_owner_property_rights,
        6 AS rank
    FROM {{ ref('int_zlovac') }}
    WHERE ff_owner_6_fullname IS NOT NULL
),

-- Note: In SQL we can't directly reproduce the fuzzy matching that's done in Python
-- We'll use simpler matching logic for addresses and names
fuzzy_matched AS (
    SELECT
        *,
        -- Exact match for postal code
        CASE WHEN owner_postal_code = ff_owner_postal_code THEN TRUE ELSE FALSE END AS match_postal_code,
        
        -- We can't directly implement fuzzy matching in standard SQL
        -- Instead, we'll use some simplified matching for fullname (exact match, contains, etc.)
        -- This is a simplified approximation of the original Python fuzzy matching
        CASE 
            WHEN LOWER(owner_fullname) = LOWER(ff_owner_fullname) THEN TRUE
            WHEN owner_fullname IS NOT NULL AND ff_owner_fullname IS NOT NULL AND 
                 LENGTH(owner_fullname) > 5 AND LENGTH(ff_owner_fullname) > 5 AND
                 (POSITION(LOWER(owner_fullname) IN LOWER(ff_owner_fullname)) > 0 OR 
                  POSITION(LOWER(ff_owner_fullname) IN LOWER(owner_fullname)) > 0)
            THEN TRUE
            ELSE FALSE
        END AS match_fullname,
        
        -- Simplified matching for raw address
        CASE 
            WHEN LOWER(owner_raw_address) = LOWER(ff_owner_raw_address) THEN TRUE
            WHEN owner_raw_address IS NOT NULL AND ff_owner_raw_address IS NOT NULL AND 
                 LENGTH(owner_raw_address) > 5 AND LENGTH(ff_owner_raw_address) > 5 AND
                 (POSITION(LOWER(owner_raw_address) IN LOWER(ff_owner_raw_address)) > 0 OR 
                  POSITION(LOWER(ff_owner_raw_address) IN LOWER(owner_raw_address)) > 0)
            THEN TRUE
            ELSE FALSE
        END AS match_raw_address
    FROM structured_data
),

-- Since we can't implement the exact first_name extraction logic from the Python code,
-- we'll use a simplified approach to check if the fullnames might share first names
first_name_matched AS (
    SELECT
        *,
        -- Simplified first name matching logic
        -- We'll check if the first word in both names matches
        CASE 
            WHEN SPLIT_PART(LOWER(owner_fullname), ' ', 1) = SPLIT_PART(LOWER(ff_owner_fullname), ' ', 1) 
                AND LENGTH(SPLIT_PART(LOWER(owner_fullname), ' ', 1)) >= 3
            THEN TRUE
            ELSE FALSE
        END AS match_same_first_name
    FROM fuzzy_matched
),

-- Define score and reason based on various match conditions
scored AS (
    SELECT
        *,
        CASE
            -- Score 10: match fullname and raw address
            WHEN match_fullname AND match_raw_address THEN 10
            -- Score 9: match fullname and postal code
            WHEN match_fullname AND match_postal_code THEN 9
            -- Score 8: match fullname
            WHEN match_fullname THEN 8
            -- Score 7: match first name and raw address
            WHEN match_same_first_name AND match_raw_address THEN 7
            -- Score 6: match first name and postal code
            WHEN match_same_first_name AND match_postal_code THEN 6
            -- Score 5: match first name
            WHEN match_same_first_name THEN 5
            -- Score 0: no match
            ELSE 0
        END AS final_owner_score,
        
        CASE
            WHEN match_fullname AND match_raw_address THEN 'match_fullname, match_raw_address'
            WHEN match_fullname AND match_postal_code THEN 'match_fullname, match_postal_code'
            WHEN match_fullname THEN 'match_fullname'
            WHEN match_same_first_name AND match_raw_address THEN 'match_same_first_name, match_raw_address'
            WHEN match_same_first_name AND match_postal_code THEN 'match_same_first_name, match_postal_code'
            WHEN match_same_first_name THEN 'match_same_first_name'
            ELSE 'no_match'
        END AS final_owner_reason
    FROM first_name_matched
),

-- Add mutation scores for records with no match
mutation_scores AS (
    SELECT
        *,
        -- Adjust score based on mutation date
        CASE
            -- Keep existing score if it's greater than 0
            WHEN final_owner_score > 0 THEN final_owner_score
            -- Mutation in last two years
            WHEN mutation_date > CURRENT_DATE - INTERVAL '2 years' THEN 2
            -- No mutation in last two years
            ELSE 1
        END AS adjusted_owner_score,
        
        -- Adjust reason based on mutation date
        CASE
            -- Keep existing reason if score is greater than 0
            WHEN final_owner_score > 0 THEN final_owner_reason
            -- Mutation in last two years
            WHEN mutation_date > CURRENT_DATE - INTERVAL '2 years' THEN 'mutation_in_last_two_years'
            -- No mutation in last two years
            ELSE 'no_mutation_in_last_two_years'
        END AS adjusted_owner_reason
    FROM scored
),

-- Reprocess rank based on final_owner_score
-- This is a bit tricky in SQL, but we can use window functions
rank_processed AS (
    SELECT
        local_id,
        owner_fullname,
        owner_postal_code,
        owner_raw_address,
        owner_city,
        mutation_date,
        ff_owner_fullname,
        ff_owner_postal_code,
        ff_owner_birth_date,
        ff_owner_raw_address,
        ff_owner_idprodroit,
        ff_owner_idpersonne,
        ff_owner_property_rights,
        ff_owner_locprop,
        rank AS old_rank,
        -- Assign new rank based on score (higher score = lower rank)
        ROW_NUMBER() OVER (PARTITION BY local_id ORDER BY adjusted_owner_score DESC) AS rank,
        adjusted_owner_score AS final_owner_score,
        adjusted_owner_reason AS final_owner_reason,
        match_postal_code,
        match_fullname,
        match_raw_address,
        match_same_first_name
    FROM mutation_scores
)

-- Final selection, keeping only necessary columns
SELECT
    local_id,
    owner_fullname,
    owner_postal_code,
    owner_raw_address,
    owner_city,
    mutation_date,
    ff_owner_fullname,
    ff_owner_postal_code,
    ff_owner_birth_date,
    ff_owner_raw_address,
    ff_owner_idprodroit,
    ff_owner_idpersonne,
    ff_owner_property_rights,
    ff_owner_locprop,
    old_rank,
    rank,
    final_owner_score,
    final_owner_reason
FROM rank_processed
-- Only keep records with a score > 0, as in the Python code
WHERE final_owner_score > 0