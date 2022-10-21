### Installer la base de données avec Docker

```bash
# Crée un service db (postgres + extension postgis) et un service mail (maildev)
DATABASE_URL=postgres://postgres@postgres@localhost/zlv bash setup.sh
```
