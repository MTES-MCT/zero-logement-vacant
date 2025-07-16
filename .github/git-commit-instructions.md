# Git Commit Instructions - Zéro Logement Vacant

## Conventional Commits Format

We use [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

## Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, missing semi-colons, etc.)
- **refactor**: Code changes that neither fix a bug nor add a feature
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Changes to build process, auxiliary tools, or dependencies
- **ci**: Changes to CI/CD configuration
- **revert**: Reverts a previous commit

## Scopes

Use the workspace/package name as scope:

### Main Applications
- **analytics**: Data pipeline (DBT + DuckDB + Dagster)
- **e2e**: End-to-end tests
- **frontend**: React frontend (`@zerologementvacant/front`)
- **queue**: Background job processing
- **server**: Backend API (`@zerologementvacant/server`)

### Packages
- **api-sdk**: API client SDK (`@zerologementvacant/api-sdk`)
- **draft**: Draft (`@zerologementvacant/draft`)
- **healthcheck**: Draft (`@zerologementvacant/healthcheck`)
- **models**: Shared models and DTOs (`@zerologementvacant/models`)
- **schemas**: Validation schemas (`@zerologementvacant/schemas`)
- **utils**: Shared utilities (`@zerologementvacant/utils`)

## Examples

### Single Workspace Changes

```bash
# Server changes
feat(server): add housing search API endpoint
fix(server): resolve housing validation error
chore(server): update dependencies

# Frontend changes
feat(frontend): implement housing list component with DSFR
fix(frontend): correct modal closing behavior
style(frontend): update DSFR button styling

# Package changes
feat(models): add HousingStatusDTO
fix(models): correct HousingDTO transformation in pipe
refactor(utils): improve address validation function

# Database changes
feat(server): add housing_campaigns table migration
fix(server): correct foreign key constraint in owners table

# Analytics changes
feat(analytics): add housing vacancy dashboard
fix(analytics): correct DBT model for campaign metrics
```

### Multi-Workspace Changes

When changes affect multiple workspaces, omit the scope:

```bash
# Cross-workspace features
feat: implement housing campaign management
fix: resolve housing data sync between frontend and server
refactor: standardize error handling across all packages

# Infrastructure changes
chore: update all workspace dependencies
ci: add automated testing pipeline
docs: update project setup instructions
```

### Breaking Changes

Add `!` after the scope and include `BREAKING CHANGE:` in the footer:

```bash
feat(models)!: restructure HousingDTO interface

BREAKING CHANGE: HousingDTO.address is now HousingDTO.location
```

### Complex Changes

Use the body to provide more context:

```bash
feat(server): implement housing import from CSV

Add support for bulk housing import with validation:
- CSV parsing with proper error handling
- Address validation using BAN API
- Owner matching and creation
- Transaction rollback on errors

Closes #123
```

## Best Practices

1. **Keep the description concise** (50 characters or less)
2. **Use imperative mood** ("add" not "added" or "adds")
3. **Capitalize the first letter** of the description
4. **No period at the end** of the description
5. **Reference issues** when applicable (`Closes #123`, `Fixes #456`)
8. **Include migration info** for database changes

## Special Cases

### Database Migrations
```bash
feat(db): add housing_status_history table
fix(db): correct index on housing.geo_code column
```

### API Endpoint Changes
```bash
feat(server): add GET /api/housings/:id/campaigns endpoint
fix(server): correct housing search pagination
```

### Testing
```bash
test(e2e): add housing campaign creation flow
test(server): add housing repository unit tests
```

## Validation

Before committing, ensure:
- [ ] The type matches the change category
- [ ] The scope matches the affected workspace
- [ ] The description is clear and concise
- [ ] Breaking changes are properly marked
- [ ] Related issues are referenced
