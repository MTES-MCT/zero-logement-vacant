# Vacancy Explainer (Streamlit)

Petite app Streamlit pour explorer les relations entre indicateurs communaux et `exit_rate_pct`, et entraîner un petit modèle avec feature importance.

## Prérequis

- Python 3.11
- `uv` installé
- Accès MotherDuck + token dans `MOTHERDUCK_TOKEN`

## Lancer l’app (avec uv)

Depuis `analytics/`:

```bash
export MOTHERDUCK_TOKEN="..."
uv run streamlit run apps/vacancy_explainer/app.py
```

or  

```bash
uv run --env-file=.env streamlit run apps/vacancy_explainer/app.py
```

## Déployer sur Clever Cloud (via GitHub Actions)

Un workflow GitHub Actions existe: `.github/workflows/deploy-data-apps.yml`.

- Il réutilise le workflow commun `.github/workflows/deploy.yml`.
- Il suppose que l’application Clever Cloud existe déjà, avec:
  - **name**: `Vacancy Explainer (Production)`
  - **alias**: `vacancy-explainer-production`
- Les secrets Clever Cloud sont ceux déjà utilisés par les autres déploiements:
  - `CLEVER_TOKEN`, `CLEVER_SECRET`, `CLEVER_ORG`

Pour un pas-à-pas complet, voir `DEPLOY.md` (racine du repo).

### Variables Clever Cloud recommandées pour l’app

Dans Clever Cloud, configurer au minimum:

- `MOTHERDUCK_TOKEN` (secret)
- `CC_RUN_COMMAND`:

```bash
uv --directory analytics/apps/vacancy_explainer run streamlit run app.py --server.address 0.0.0.0 --server.port 9000 --server.headless true
```

## Notes

- L’app se connecte à MotherDuck via DuckDB (`md:dwh`). Aucun secret n’est stocké dans le repo.
- Les filtres/limits dans la sidebar évitent de charger trop de lignes.
