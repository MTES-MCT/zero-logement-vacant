# Installation du script d'import des données foncières

Ce script a pour objectif d'importer les données foncières dans le format SQL brute fourni. Il n'est pour le moment pas adapté à un usage en production, il manque notamment l'étape de renommage de la table et savoir ce que l'ont fait des anciennes données en base.

## 1. Installation des Pré-requis

### Installer Postgres.app

- Suivre les instructions sur [Postgres.app](https://postgresapp.com/).

### Installer pgAdmin (Interface Graphique Optionnelle)

- Télécharger et installer depuis [pgAdmin.org](https://www.pgadmin.org/).

### Installer Homebrew

Exécuter dans le terminal :

```
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### Installer Python

Utiliser Homebrew pour installer Python :

```
brew install python
```

### Installer pipx

Configurer et installer pipx :

```
mkdir -p /Users/[USER]/.pipx/bin
export PIPX_BIN_DIR=/Users/[USER]/.pipx/bin
brew install pipx
```

Modifier le PATH:

```
export PATH=/Users/[USER]/.pipx/bin:$PATH
```

Remplacer `[USER]` par votre nom d'utilisateur.

## 2. Installer Ansible

### Activer l'environnement Python

Dans le dossier racine des données foncières, créer et activer l'environnement virtuel :

```
python -m venv ansible-env
source ansible-env/bin/activate
```

### Installation des dépendances du spript

Utiliser pip pour installer le client PostgreSQL `psycopg2` :

```
pip install psycopg2
```

### Installation d'Ansible

Utiliser pipx pour installer `ansible` :

```
pipx install --include-deps ansible
```

Installation du module PostgreSQL:

```
ansible-galaxy collection install community.postgresql
```

### Créer le Vault pour les Identifiants PostgreSQL

Utiliser la commande suivante pour créer un fichier de variables sécurisé :

```
ansible-vault create vars/db_credentials.yml
```

Dans le fichier, ajouter les identifiants de connexion :

```
db_user: [USERNAME]
db_password: [PASSWORD]
```

Remplacer `[USERNAME]` et `[PASSWORD]` par votre nom d'utilisateur et votre mot de passe PostgreSQL.

Si le mot de passe est vide, utiliser :

```
db_password: ""
```

## Exécuter l'Import

Lancer l'importation des données avec la commande suivante, en remplaçant les valeurs de `db_name`, `table_name`, `final_name`, `script_file_path` selon les besoins.

Par exemple, pour importer les propriétaires:

```
ansible-playbook -i inventory.ini import.yml -e "db_name=zlv_copy_prod table_name=zlv_proprio_nat23 final_name=df_owners_nat_2023 script_file_path=2023" --ask-vault-pass
```

Par exemple, pour importer les logements:

```
ansible-playbook -i inventory.ini import.yml -e "db_name=zlv_copy_prod table_name=zlv_logt_nat23 final_name=df_housing_nat_2023 script_file_path=2023" --ask-vault-pass
```


ansible-playbook -i inventory.ini import.yml -e "table_name=zlv_proprio_nat23 final_name=df_owners_nat_2023 script_file_path=/Volumes/Zéro_Logement_Vacant/Données_foncières/2023" --ask-vault-pass