# Housing Vacancy Exit Analysis - AI Documentation

## Purpose

This documentation helps AI assistants understand and work with the housing vacancy exit analysis tables. The goal is to analyze **what factors determine whether a vacant housing unit exits vacancy** and specifically **whether ZLV (Zero Logement Vacant) application usage is a determinant**.

## Business Context

**Zero Logement Vacant (ZLV)** is a French government application that helps local authorities (collectivites territoriales) track and reduce vacant housing. The key question is: **Does using ZLV help housing exit vacancy?**

### Key Concepts

- **Housing (Logement)**: A residential unit tracked in the LOVAC database
- **Vacancy Exit (Sortie de vacance)**: When a housing unit is no longer vacant (occupied, sold, demolished, etc.)
- **LOVAC**: Official French database of vacant housing, updated annually
- **Establishment (Etablissement)**: Local authority using ZLV (EPCI, commune, DDT, etc.)
- **Campaign (Campagne)**: Outreach action by an establishment to contact property owners

### Target Variable

`is_housing_out` (INTEGER: 0 or 1)
- **1** = Housing has exited vacancy (was in LOVAC but NOT in LOVAC 2025)
- **0** = Housing is still vacant (still in LOVAC 2025)

## Data Architecture

```
                                    ┌──────────────────────────────────┐
                                    │   marts_bi_housing_complete      │
                                    │   (Master Analysis Table)        │
                                    └──────────────────────────────────┘
                                                    │
                    ┌───────────────┬───────────────┼───────────────┬───────────────┐
                    ▼               ▼               ▼               ▼               
    ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐
    │ marts_bi_housing  │ │ marts_bi_housing  │ │ marts_bi_housing  │ │ marts_bi_housing  │
    │ _characteristics  │ │ _geography        │ │ _owners           │ │ _zlv_usage        │
    └───────────────────┘ └───────────────────┘ └───────────────────┘ └───────────────────┘
            │                     │                     │                     │
            ▼                     ▼                     ▼                     ▼
    ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐
    │ int_analysis_     │ │ int_analysis_     │ │ int_analysis_     │ │ int_analysis_     │
    │ housing_with_     │ │ city_features     │ │ housing_owners    │ │ housing_zlv_usage │
    │ out_flag          │ │                   │ │                   │ │                   │
    └───────────────────┘ └───────────────────┘ └───────────────────┘ └───────────────────┘
```

## Table Descriptions

### 1. marts_bi_housing_characteristics

**Purpose**: Housing intrinsic features

**Key Features**:
| Feature | Type | Description |
|---------|------|-------------|
| `housing_kind` | VARCHAR | maison, appartement |
| `living_area_category` | VARCHAR | Surface categories (Moins de 30m2, 30-49m2, ...) |
| `energy_consumption_category` | VARCHAR | DPE category (Performant, Moyen, Passoire) |
| `is_energy_sieve` | BOOLEAN | TRUE if DPE F or G |
| `vacancy_duration_category` | VARCHAR | 0-2 ans, 3-5 ans, 6-10 ans, Plus de 10 ans |
| `vacancy_severity` | VARCHAR | Combines duration + energy + cadastral |
| `cadastral_classification_label` | VARCHAR | Comfort level (Luxe to Tres mediocre) |

### 2. marts_bi_housing_geography

**Purpose**: Territorial context

**Key Features**:
| Feature | Type | Description |
|---------|------|-------------|
| `densite_category` | VARCHAR | Urbain dense, Urbain intermediaire, Rural |
| `zonage_category` | VARCHAR | Zone tendue, Zone detendue |
| `niveau_loyer` | VARCHAR | Rent level (Tres eleve to Faible) |
| `dvg_marche_dynamisme` | VARCHAR | Market dynamism |
| `is_population_declining` | BOOLEAN | Population trend |
| `prix_evolution_category` | VARCHAR | Price evolution over 5 years |
| `pression_fiscale_category` | VARCHAR | Tax pressure level |
| `is_in_tlv_territory` | BOOLEAN | TLV zone (vacancy tax) |
| `has_any_special_territory` | BOOLEAN | Any special program (ACV, PVD, OPAH, ORT) |

### 3. marts_bi_housing_owners

**Purpose**: Owner profile (primary owner only)

**Key Features**:
| Feature | Type | Description |
|---------|------|-------------|
| `owner_kind_category` | VARCHAR | Particulier, SCI, Autre PM, Indivision |
| `owner_is_individual` | BOOLEAN | TRUE if individual owner |
| `owner_age_category` | VARCHAR | Age groups (Moins de 40 ans, 40-59 ans, ...) |
| `owner_generation` | VARCHAR | Baby Boomer, Gen X, Millennial, etc. |
| `owner_is_local` | BOOLEAN | Same commune or department |
| `owner_is_distant` | BOOLEAN | Different region |
| `owner_distance_category` | VARCHAR | Distance to housing |
| `owner_is_multi_owner` | BOOLEAN | Owns multiple properties |
| `owner_contactable` | BOOLEAN | Has email or phone |

### 4. marts_bi_housing_zlv_usage

**Purpose**: ZLV application usage metrics - **KEY TABLE FOR IMPACT ANALYSIS**

**Key Features**:
| Feature | Type | Description |
|---------|------|-------------|
| `was_contacted_by_zlv` | BOOLEAN | **Primary treatment variable** |
| `contact_intensity` | VARCHAR | Non contacte, 1 contact, 2-3 contacts, 4+ contacts |
| `contact_recency_category` | VARCHAR | Recent, Moyen, Ancien, Jamais contacte |
| `typologie_activation_simple` | VARCHAR | CT inactive, en analyse, en campagne, activee |
| `activation_level` | INTEGER | 1-5 scale |
| `kind_pro_activity_ntile` | VARCHAR | Non pro-actif, Peu pro-actif, Pro-actif, Tres pro-actif |
| `pro_activity_level` | INTEGER | 1-4 scale |
| `zlv_engagement_score` | INTEGER | Composite score 0-10 |
| `zlv_engagement_category` | VARCHAR | Aucun, Faible, Moyen, Fort |

### 5. marts_bi_housing_complete

**Purpose**: Master table joining all dimensions

**Additional Features**:
| Feature | Type | Description |
|---------|------|-------------|
| `owner_x_territory` | VARCHAR | Interaction: Local + Zone tendue, Distant + Rural, etc. |
| `housing_x_market` | VARCHAR | Interaction: Maison + Marche dynamique, etc. |
| `vacancy_x_energy` | VARCHAR | Interaction: Longue duree + Passoire, etc. |
| `contact_x_activation` | VARCHAR | Interaction: Contacte + CT activee, etc. |
| `is_favorable_for_exit` | BOOLEAN | Favorable conditions |
| `is_at_risk_long_vacancy` | BOOLEAN | Risk factors |
| `zlv_treatment_group` | VARCHAR | For quasi-experimental analysis |

## Key Analysis Queries

### 1. Basic Exit Rate by ZLV Contact

```sql
SELECT 
    was_contacted_by_zlv,
    COUNT(*) as total_housing,
    SUM(is_housing_out) as housing_out,
    ROUND(AVG(is_housing_out) * 100, 2) as exit_rate_pct
FROM marts_bi_housing_complete
GROUP BY was_contacted_by_zlv;
```

### 2. Exit Rate by Establishment Activation Level

```sql
SELECT 
    typologie_activation_simple,
    COUNT(*) as total_housing,
    ROUND(AVG(is_housing_out) * 100, 2) as exit_rate_pct
FROM marts_bi_housing_complete
WHERE typologie_activation_simple IS NOT NULL
GROUP BY typologie_activation_simple
ORDER BY typologie_activation_simple;
```

### 3. Exit Rate by Pro-Activity Level

```sql
SELECT 
    kind_pro_activity_ntile,
    was_contacted_by_zlv,
    COUNT(*) as total_housing,
    ROUND(AVG(is_housing_out) * 100, 2) as exit_rate_pct
FROM marts_bi_housing_complete
WHERE kind_pro_activity_ntile IS NOT NULL
GROUP BY kind_pro_activity_ntile, was_contacted_by_zlv
ORDER BY kind_pro_activity_ntile, was_contacted_by_zlv;
```

### 4. Exit Rate by Owner Type

```sql
SELECT 
    owner_kind_category,
    COUNT(*) as total_housing,
    ROUND(AVG(is_housing_out) * 100, 2) as exit_rate_pct,
    ROUND(AVG(CASE WHEN was_contacted_by_zlv THEN is_housing_out ELSE NULL END) * 100, 2) as exit_rate_contacted_pct,
    ROUND(AVG(CASE WHEN NOT was_contacted_by_zlv THEN is_housing_out ELSE NULL END) * 100, 2) as exit_rate_not_contacted_pct
FROM marts_bi_housing_complete
WHERE owner_kind_category IS NOT NULL
GROUP BY owner_kind_category
ORDER BY exit_rate_pct DESC;
```

### 5. Exit Rate by Territorial Context

```sql
SELECT 
    densite_category,
    zonage_category,
    dvg_marche_dynamisme,
    COUNT(*) as total_housing,
    ROUND(AVG(is_housing_out) * 100, 2) as exit_rate_pct
FROM marts_bi_housing_complete
WHERE densite_category IS NOT NULL
GROUP BY densite_category, zonage_category, dvg_marche_dynamisme
ORDER BY exit_rate_pct DESC;
```

### 6. Quasi-Experimental Analysis (Treatment Groups)

```sql
SELECT 
    zlv_treatment_group,
    COUNT(*) as total_housing,
    SUM(is_housing_out) as housing_out,
    ROUND(AVG(is_housing_out) * 100, 2) as exit_rate_pct
FROM marts_bi_housing_complete
WHERE zlv_treatment_group != 'Indetermine'
GROUP BY zlv_treatment_group
ORDER BY exit_rate_pct DESC;
```

### 7. Multivariate Analysis - ZLV Impact Controlling for Confounders

```sql
SELECT 
    densite_category,
    vacancy_duration_category,
    owner_kind_category,
    was_contacted_by_zlv,
    COUNT(*) as n,
    ROUND(AVG(is_housing_out) * 100, 2) as exit_rate_pct
FROM marts_bi_housing_complete
WHERE 
    densite_category IS NOT NULL
    AND vacancy_duration_category IS NOT NULL
    AND owner_kind_category IS NOT NULL
GROUP BY 
    densite_category,
    vacancy_duration_category,
    owner_kind_category,
    was_contacted_by_zlv
HAVING COUNT(*) >= 10
ORDER BY 
    densite_category,
    vacancy_duration_category,
    owner_kind_category,
    was_contacted_by_zlv;
```

## Analysis Guidelines

### Correlation vs Causation

**Warning**: Simple comparisons between contacted/not contacted housing may be biased because:
1. **Selection bias**: Establishments may contact housing more likely to exit anyway
2. **Confounders**: Contacted housing may be in more dynamic markets
3. **Activity bias**: Active establishments operate in specific territories

### Recommended Analysis Approach

1. **Descriptive Statistics**: Start with exit rates by dimension
2. **Stratified Analysis**: Compare within similar strata (same density, same owner type, etc.)
3. **Propensity Score Matching**: Match contacted/non-contacted housing on observable characteristics
4. **Regression Analysis**: Multivariate models controlling for confounders
5. **Difference-in-Differences**: Compare changes over time between treatment/control

### Key Variables for Matching/Controlling

When analyzing ZLV impact, control for:
- `densite_category` - Urban/rural context
- `zonage_category` - Housing market tension
- `dvg_marche_dynamisme` - Market dynamism
- `vacancy_duration_category` - Vacancy duration
- `owner_kind_category` - Owner type
- `is_energy_sieve` - Energy performance
- `owner_is_local` - Owner proximity

## Data Dictionary

### Categorical Variables Coding

**vacancy_duration_category**:
- `0-2 ans` - Recent vacancy
- `3-5 ans` - Medium-term vacancy
- `6-10 ans` - Long-term vacancy
- `Plus de 10 ans` - Very long-term vacancy

**densite_category**:
- `Urbain dense` - High density urban
- `Urbain intermediaire` - Suburban
- `Rural` - Rural areas

**zonage_category**:
- `Zone tendue` - High-demand areas (A, A bis, B1)
- `Zone detendue` - Lower-demand areas (B2, C)

**owner_kind_category**:
- `Particulier` - Individual
- `SCI` - Real estate company (Societe Civile Immobiliere)
- `Autre personne morale` - Other corporate entity
- `Indivision` - Joint ownership
- `Inconnu` - Unknown

**zlv_engagement_category**:
- `Aucun engagement` - Score 0 (no ZLV engagement)
- `Engagement faible` - Score 1-3
- `Engagement moyen` - Score 4-6
- `Engagement fort` - Score 7-10

## File Locations

```
analytics/dbt/models/
├── intermediate/analysis/
│   ├── int_analysis_housing_with_out_flag.sql
│   ├── int_analysis_housing_owners.sql
│   ├── int_analysis_housing_zlv_usage.sql
│   └── schema.yml
└── marts/analysis/
    ├── marts_bi_housing_characteristics.sql
    ├── marts_bi_housing_geography.sql
    ├── marts_bi_housing_owners.sql
    ├── marts_bi_housing_zlv_usage.sql
    ├── marts_bi_housing_complete.sql
    ├── schema.yml
    └── CLAUDE.md (this file)
```

## Running the Models

```bash
# Run all analysis models
cd analytics/dbt
dbt run --select marts_bi_housing_characteristics marts_bi_housing_geography marts_bi_housing_owners marts_bi_housing_zlv_usage marts_bi_housing_complete

# Or run with dependencies
dbt run --select +marts_bi_housing_complete
```

## Contact

These tables were designed to support the analysis described in:
- **[Stats] Analyse de la population des logements sortis de la vacance + analyse determinants (iteration 2)**

For questions about data sources or business rules, consult the ZLV team.
