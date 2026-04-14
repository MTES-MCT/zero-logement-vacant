# Import LOVAC

Pipeline EETL annuel pour importer propriétaires, logements et droits de propriété depuis les fichiers LOVAC.

## Prérequis

- `clever` CLI installé et authentifié (`clever login`)
- `duckdb` installé
- `youplot` installé (`gem install youplot`)
- `ZLV_IMPORT_APP_ID` — ID de l'application Clever Cloud dédiée à l'import (dans votre shell profile, jamais commité)
- `NOTION_TOKEN` + `NOTION_LOVAC_PARENT_PAGE_ID` — pour l'export Notion (dans votre shell profile)

## Ordre d'exécution

Remplacer `lovac-2026` par le millésime courant.

```bash
# 1. Snapshot avant import
./stats/snapshot.sh owners pre "$DATABASE_URL"

# 2. Import propriétaires
./run-on-clevercloud.sh owners --year lovac-2026 --file owners.jsonl

# 3. Snapshot après propriétaires
./stats/snapshot.sh owners post "$DATABASE_URL"

# 4. Import logements
./run-on-clevercloud.sh housings --year lovac-2026 --file housings.jsonl

# 5. Snapshot après logements
./stats/snapshot.sh housings post "$DATABASE_URL"

# 6. Import droits de propriété
./run-on-clevercloud.sh housing-owners --year lovac-2026 --file housing-owners.jsonl

# 7. Snapshot après droits de propriété
./stats/snapshot.sh housing-owners post "$DATABASE_URL"

# 8. Voir les deltas dans le terminal
./stats/diff.sh snapshot-owners-pre.json snapshot-owners-post.json
./stats/diff.sh snapshot-housings-pre.json snapshot-housings-post.json
./stats/diff.sh snapshot-housing-owners-pre.json snapshot-housing-owners-post.json

# 9. Publier le rapport sur Notion (dans une session Claude Code)
# /publish-lovac-report lovac-2026
```

## Options disponibles

| Option | Description |
|---|---|
| `--year <millésime>` | Obligatoire. Ex: `lovac-2026` |
| `--file <clé-s3>` | Fichier source sur S3 |
| `--dry-run` | Simule l'import sans écrire en base |
| `--abort-early` | Arrête au premier échec de validation |
| `--departments <dep...>` | Filtre par département(s) |

## Architecture

Le pipeline owner suit le modèle EETL :

```
Source → Validate → Enrich (bulk SELECT) → Transform (pure) → Load (ON CONFLICT)
```

Les identifiants sont déterministes (UUID v5) : relancer l'import avec le même `--year` et le même fichier est sans effet.

## Rapport Notion

Le rapport est publié **en français** via le skill Claude Code `/publish-lovac-report`.  
Il lit les fichiers `snapshot-*-pre.json` / `snapshot-*-post.json` produits par `stats/snapshot.sh`.

Sections générées :
- Propriétaires (total, par type, avec/sans `idpersonne`, avec/sans adresse DGFIP)
- Logements (total, par occupation, par statut de suivi)
- Droits de propriété (total, par rang, avec/sans `idprocpte`)
- Événements générés (par type)
- Erreurs de validation (par champ)

## Débogage

```bash
# Voir les logs en temps réel
clever logs --app "$ZLV_IMPORT_APP_ID" --follow

# Dry-run local (base locale)
yarn workspace @zerologementvacant/server tsx \
  src/scripts/import-lovac/cli.ts owners \
  --from file --year lovac-2026 --dry-run ~/owners.jsonl
```
