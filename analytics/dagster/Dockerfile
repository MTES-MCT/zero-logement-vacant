FROM python:3.10-slim

ARG ZLV_HTTP_USERNAME=zlv
ARG ZLV_HTTP_PASSWORD=zlv

ENV ZLV_HTTP_USERNAME=$ZLV_HTTP_USERNAME
ENV ZLV_HTTP_PASSWORD=$ZLV_HTTP_PASSWORD

COPY --from=clevercloud/clever-tools /bin/clever /usr/local/bin/clever
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Installer les dépendances nécessaires
RUN apt-get update && \
    apt-get install -y nginx apache2-utils curl gnupg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Installer Clever Tools
RUN curl -sL https://clever-tools.clever-cloud.com/releases/latest/clever-tools-latest_linux.tar.gz | tar xz -C /usr/local/binuv

# Copier les fichiers de configuration et le code source
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen

# Définir la variable d'environnement pour Dagster
ENV DAGSTER_HOME=/opt/dagster/dagster_home/
RUN mkdir -p $DAGSTER_HOME
COPY dagster.yaml workspace.yaml $DAGSTER_HOME
COPY src/ $DAGSTER_HOME

# Définir le répertoire de travail
WORKDIR $DAGSTER_HOME

# RUN dbt deps

# Configurer l'authentification basique pour Nginx
RUN htpasswd -cb /etc/nginx/.htpasswd $ZLV_HTTP_USERNAME $ZLV_HTTP_PASSWORD
COPY docker/nginx/nginx.conf /etc/nginx/sites-available/default

# Exposer le port 8080 pour le serveur web Nginx
EXPOSE 8080

# Définir la commande de démarrage
CMD nginx -g 'daemon off;' & uv run dagster-webserver -h 0.0.0.0 -p 3000
