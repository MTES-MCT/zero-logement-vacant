# Guide PM — Travailler sur l'entrepôt ZLV (sans Raph)

> Objectif : permettre à un·e Product Manager de demander une modification
> de l'entrepôt de données (ajout de table brute, ajout/modification d'une
> table Marts dans Metabase, relance d'une pipeline qui a échoué) **sans
> installer Python, dbt, Dagster ou DuckDB en local**. Tout passe par
> Claude Code + GitHub.

## En 1 minute

Trois commandes Claude Code à connaître. Tu les tapes dans le chat Claude
Code (web, desktop ou CLI), Claude ouvre la PR pour toi, la CI vérifie,
un·e dev relit et merge.

| Tu veux… | Tape | Ce qui se passe |
|---|---|---|
| Ajouter une **table brute** (data.gouv.fr, INSEE, CEREMA…) | `/pm-add-raw-table <url ou description>` | PR avec config + table de staging + tests |
| Ajouter ou modifier une **table Marts** (visible dans Metabase) | `/pm-add-mart <nom ou description>` | PR avec le modèle dbt + tests |
| **Relancer** une pipeline qui a échoué | `/pm-fix-pipeline <lien Dagster ou nom d'asset>` | Diagnostic + soit relance, soit PR de correctif |

## Pré-requis (à faire une seule fois)

1. **Compte GitHub** avec accès au repo `MTES-MCT/zero-logement-vacant`.
2. **Claude Code** installé (au choix) :
   - Web : <https://claude.ai/code> (le plus simple, aucun setup)
   - Desktop : <https://claude.com/claude-code>
   - CLI : `npm i -g @anthropic/claude-code` (si tu connais la ligne de commande)
3. Ouvrir le repo dans Claude Code : « Open repository » →
   `MTES-MCT/zero-logement-vacant`.

C'est tout. Pas besoin d'installer Python, dbt, Dagster ou DuckDB.

## Workflow PM type

### A. Ajouter une nouvelle table brute (raw)

Exemple : récupérer le fichier CEREMA DVF 2026 publié sur data.gouv.fr.

1. Récupère le **lien de téléchargement direct** du fichier (clic droit →
   « Copier l'adresse du lien » sur le bouton Télécharger).
2. Dans Claude Code, tape :
   ```
   /pm-add-raw-table https://www.data.gouv.fr/.../dvf_2026.parquet cerema_dvf_2026
   ```
3. Claude pose 1-2 questions (producteur, cadence) puis ouvre une PR.
4. La CI vérifie : URL accessible, parsing OK, table testée.
5. Un·e dev relit, merge.
6. **Après le merge**, déclencher l'import :
   GitHub → Actions → **Dagster - Rerun Job or Asset** → Run workflow
   → `mode = asset`, `target = cerema_dvf_2026`.
7. La table apparaît dans MotherDuck (`dwh.external.<nom>`) puis dans
   Metabase (via le modèle staging dbt).

### B. Ajouter / modifier une table Marts (Metabase)

Exemple : créer un mart mensuel des sorties de vacance par EPCI.

1. Dans Claude Code, tape :
   ```
   /pm-add-mart marts_analysis_exit_flow_monthly_epci
   ```
   ou plus librement :
   ```
   /pm-add-mart "table mensuelle des sorties de vacance par EPCI à partir de marts_analysis_exit_flow_ff23_lovac"
   ```
2. Claude explore les tables existantes via MotherDuck, te propose un grain
   et des colonnes, puis ouvre la PR.
3. La CI vérifie : modèle compile, tests présents.
4. Un·e dev relit, merge.
5. **Après merge**, rafraîchir le mart :
   Actions → **Dagster - Rerun Job or Asset** →
   `mode = asset`, `target = +marts_analysis_exit_flow_monthly_epci`
   (le `+` rebuild les modèles amont nécessaires).

### C. Relancer une pipeline qui a échoué

Cas 1 — tu as vu un échec dans Dagster (Clever Cloud) :

1. Copie l'URL ou le nom de l'asset/job en échec.
2. Tape :
   ```
   /pm-fix-pipeline raw_cerema_dvf_2025
   ```
3. Claude classe l'erreur :
   - **Transitoire** (réseau, timeout) → t'indique le bouton GH Actions
     pour relancer. Pas de code modifié.
   - **Code/source** → ouvre une PR de correctif.

Cas 2 — tu veux juste rejouer le pipeline quotidien :

GitHub → Actions → **Dagster - Rerun Job or Asset** →
`mode = job`, `target = datawarehouse_synchronize_and_build`.

## Que se passe-t-il sous le capot ?

```
Toi (PM)                Claude Code                GitHub                 Clever Cloud / MotherDuck
  │                         │                        │                          │
  │   /pm-add-mart  ────────►│                        │                          │
  │                         │  branche + PR ────────►│                          │
  │                         │                        │ CI : test coverage, dbt  │
  │                         │                        │      parse/compile       │
  │   relit, valide  ◄──────┼────── PR commentaires ─┤                          │
  │                         │                        │                          │
  │   merge       ──────────┼───────────────────────►│                          │
  │                         │                        │                          │
  │   Run workflow ─────────┼───────────────────────►│  dagster asset materialize│
  │   (Dagster rerun)       │                        │  ──────────────────────► │  écrit dans dwh
  │                         │                        │                          │
  │   ouvre Metabase  ──────┼────────────────────────┼──────────────────────────►│
```

## Garanties

- **Aucun modèle dbt n'est mergé sans test.** La CI (`dbt-test-coverage.yml`)
  rejette toute PR qui ajoute un modèle sans entrée dans `schema.yml` avec
  au moins un test.
- **Aucun secret n'est jamais demandé en local.** Les tokens (MotherDuck,
  Cellar S3) vivent dans les secrets GitHub Actions et ne sont utilisés
  qu'en CI.
- **Aucun écrasement direct de la prod.** Tu passes toujours par PR + run
  CI ou Dagster Action.

## Quand demander de l'aide humaine

- Une **régression KPI > 5 %** est détectée par les tests
  (`tests/production/stats/`) → Claude flag la PR `⚠️ KPI delta` et attend
  validation.
- Une source externe nécessite une **clé d'API privée** ou un compte payant.
- Un job Dagster dépasse 6h en CI → utiliser l'UI Dagster sur Clever Cloud
  à la place.
- L'erreur de pipeline est classée « inconnue » par `/pm-fix-pipeline`.

## Aide-mémoire fichiers

| Fichier | Rôle |
|---|---|
| `.claude/commands/pm-add-raw-table.md` | Workflow ajout table brute |
| `.claude/commands/pm-add-mart.md` | Workflow ajout mart |
| `.claude/commands/pm-fix-pipeline.md` | Workflow diagnostic pipeline |
| `.github/workflows/dbt-test-coverage.yml` | CI : tout modèle dbt doit avoir un test |
| `.github/workflows/dagster-rerun.yml` | Bouton GH Actions pour rejouer Dagster |
| `analytics/dagster/QUICK_START.md` | Détail technique source externe |
| `analytics/dbt/CLAUDE.md` | Détail technique dbt |

## Contact

- Owner data : Raphaël Courivaud
- Backup : équipe ZLV (`#zlv-tech` interne)
