# Import Owners from Datafoncier

This script imports owners from `df_owners_nat_2024` to the `owners` table. It only imports owners that have a valid `idpersonne` and are not already present in the `owners` table.

## Prerequisites

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## Usage

### Basic usage

```bash
python import_owners.py --db-url "postgresql://user:pass@host:port/dbname"
```

### Dry run (simulation mode)

```bash
python import_owners.py --db-url "$DATABASE_URL" --dry-run
```

### With limit (for testing)

```bash
python import_owners.py --db-url "$DATABASE_URL" --dry-run --limit 1000
```

### Production run with optimization

```bash
python import_owners.py --db-url "$DATABASE_URL" --batch-size 10000 --num-workers 6
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--db-url` | PostgreSQL connection URI (required) | - |
| `--dry-run` | Simulation mode - no database modifications | False |
| `--source-table` | Name of the source table | df_owners_nat_2024 |
| `--limit` | Maximum number of owners to import | None (all) |
| `--batch-size` | Batch size for insert operations | 5000 |
| `--num-workers` | Number of parallel workers | 4 |
| `--debug` | Enable debug logging | False |

## Field Mapping

| Source (df_owners_nat_2024) | Target (owners) |
|----------------------------|-----------------|
| `idpersonne` | `idpersonne` |
| `ddenom` | `full_name` (with `/` → space for physical persons) |
| `jdatnss` | `birth_date` (DD/MM/YYYY → ISO format) |
| `dlign3`, `dlign4`, `dlign5`, `dlign6` | `address_dgfip` (array) |
| `catpro2txt` | `kind_class` (mapped, see below) |
| `dsiren` | `siren` |
| - | `data_source` = 'datafoncier-2024' |
| - | `entity` = 'personnes-physiques' |

## Kind Mapping (catpro2txt → kind_class)

Classification CATPRO 3 (LOVAC ET FF) - Source CEREMA, effectif depuis S 2024.

### Catégories ZLV

| Catégorie ZLV | Description |
|---------------|-------------|
| Particulier | Personnes physiques |
| Etat et collectivité territoriale | Etat, régions, départements, communes, intercommunalités |
| Bailleur social, Aménageur, Investisseur public | OLS, EPF, SEM, SPLA, CDC, investisseurs publics |
| Promoteur, Investisseur privé | Promoteurs, constructeurs, investisseurs privés, banques privées |
| SCI, Copropriété, Autres personnes morales | SCI, copropriétés, personnes morales non classées |
| Autres | Agricole, forestier, réseaux, enseignement, santé, industrie, tourisme |
| Absence de propriétaires | Pas de propriétaire identifié |

### Mapping détaillé par catégorie CATPRO 3

#### X – Personne physique
| catpro2txt | kind_class |
|------------|------------|
| PERSONNE PHYSIQUE | Particulier |

#### P – Etat et collectivité territoriale
| catpro2txt | kind_class |
|------------|------------|
| ETAT ETRANGER | Etat et collectivité territoriale |
| ETAT FRANCAIS | Etat et collectivité territoriale |
| REGION | Etat et collectivité territoriale |
| DEPARTEMENT | Etat et collectivité territoriale |
| INTERCOMMUNALITE | Etat et collectivité territoriale |
| SYNDICAT INTERCOMMUNAL A VOCATION MULTIPLE | Etat et collectivité territoriale |
| SYNDICAT MIXTE | Etat et collectivité territoriale |
| SYNDICAT INTERCOMMUNAL AUTRE | Etat et collectivité territoriale |
| COMMUNE | Etat et collectivité territoriale |
| COLLECTIVITE TERRITORIALE SPECIFIQUE | Etat et collectivité territoriale |
| COLLECTIVITE DE PARIS | Etat et collectivité territoriale |

#### F – Professionnel du foncier et immobilier
| catpro2txt | kind_class |
|------------|------------|
| ORGANISME DE LOGEMENT SOCIAL | Bailleur social, Aménageur, Investisseur public |
| EPF – ETABLISSEMENT PUBLIC FONCIER D ETAT | Bailleur social, Aménageur, Investisseur public |
| EPFL – ETABLISSEMENT PUBLIC FONCIER LOCAL | Bailleur social, Aménageur, Investisseur public |
| SEM – SOCIETE D ECONOMIE MIXTE | Bailleur social, Aménageur, Investisseur public |
| SPLA – SOCIETE PUBLIQUE LOCALE D AMENAGEMENT | Bailleur social, Aménageur, Investisseur public |
| SEM OU SPLA INDETERMINE | Bailleur social, Aménageur, Investisseur public |
| AMENAGEUR FONCIER | Bailleur social, Aménageur, Investisseur public |
| EPA – ETABLISSEMENT PUBLIC D AMENAGEMENT | Bailleur social, Aménageur, Investisseur public |
| INVESTISSEUR PUBLIC | Bailleur social, Aménageur, Investisseur public |
| BANQUE PUBLIQUE | Bailleur social, Aménageur, Investisseur public |
| CAISSE DES DEPOTS ET CONSIGNATIONS | Bailleur social, Aménageur, Investisseur public |
| PROMOTEUR IMMOBILIER | Promoteur, Investisseur privé |
| CONSTRUCTEUR | Promoteur, Investisseur privé |
| SOCIETE CIVILE DE CONSTRUCTION VENTE | Promoteur, Investisseur privé |
| INVESTISSEUR PRIVE | Promoteur, Investisseur privé |
| BANQUE PRIVEE – CREDIT BAIL | Promoteur, Investisseur privé |
| ASSURANCE OU MUTUELLE | Promoteur, Investisseur privé |
| SOCIETE CIVILE DE PLACEMENT IMMOBILIER | Promoteur, Investisseur privé |

#### G – Organisation de gestion foncière et immobilière
| catpro2txt | kind_class |
|------------|------------|
| SCI - SOCIETE CIVILE IMMOBILIERE | SCI, Copropriété, Autres personnes morales |
| SOCIETE CIVILE A VOCATION DE CONSTRUCTION | SCI, Copropriété, Autres personnes morales |
| SOCIETE CIVILE A VOCATION D INVESTISSEMENT | SCI, Copropriété, Autres personnes morales |
| SOCIETE CIVILE AUTRE | SCI, Copropriété, Autres personnes morales |
| COPROPRIETE | SCI, Copropriété, Autres personnes morales |
| BND - PROPRIETAIRE EN BIENS NON DELIMITES | SCI, Copropriété, Autres personnes morales |
| COPROPRIETE AUTRE | SCI, Copropriété, Autres personnes morales |
| COPROPRIETE DE FAIT | SCI, Copropriété, Autres personnes morales |

#### M – Personne morale autre
| catpro2txt | kind_class |
|------------|------------|
| PERSONNE MORALE AUTRE | SCI, Copropriété, Autres personnes morales |
| PERSONNE MORALE PUBLIQUE AUTRE | SCI, Copropriété, Autres personnes morales |
| PERSONNE MORALE NON CLASSEE | SCI, Copropriété, Autres personnes morales |

#### A, R, E, S, Z, L – Autres catégories (→ Autres)
- **A** : Agricole, forestier, environnemental (exploitants, ONF, SAFER, conservatoires...)
- **R** : Réseaux (SNCF, RATP, EDF, VNF, autoroutes, télécoms...)
- **E** : Enseignement et recherche (universités, CNRS, INRA, CEA, INSEE...)
- **S** : Santé et social (hôpitaux, EHPAD, CAF, CCAS, Pôle Emploi...)
- **Z** : Industrie et commerce (CCI, grande distribution, activités extractives...)
- **L** : Tourisme, loisirs, cultes (hôtels, campings, associations sportives...)

#### Cas spécial
| catpro2txt | kind_class |
|------------|------------|
| PAS DE PROPRIETAIRE | Absence de propriétaires |

> **Note:** Toute valeur `catpro2txt` non présente dans ce mapping sera classée par défaut en `'Autres'`.

## Validation Rules

Owners are skipped if:
- `ddenom` (name) is null or empty
- All address fields (`dlign3`, `dlign4`, `dlign5`, `dlign6`) are null or empty
