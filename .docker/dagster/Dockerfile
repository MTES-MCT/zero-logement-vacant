FROM python:3.10-slim

ARG ZLV_HTTP_USERNAME
ARG ZLV_HTTP_PASSWORD

ENV ZLV_HTTP_USERNAME=$ZLV_HTTP_USERNAME
ENV ZLV_HTTP_PASSWORD=$ZLV_HTTP_PASSWORD

COPY --from=clevercloud/clever-tools /bin/clever /usr/local/bin/clever
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

RUN apt-get update && \
    apt-get install -y nginx apache2-utils curl gnupg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN curl -sL https://clever-tools.clever-cloud.com/releases/latest/clever-tools-latest_linux.tar.gz | tar xz -C /usr/local/bin

COPY analytics/uv.lock analytics/pyproject.toml . 
RUN uv sync --frozen


ENV DAGSTER_HOME=/opt/dagster/dagster_home/

RUN mkdir -p $DAGSTER_HOME

COPY analytics/dagster/dagster.yaml analytics/dagster/workspace.yaml $DAGSTER_HOME

COPY analytics/dagster/src $DAGSTER_HOME/src

COPY analytics/dbt /opt/dagster/dbt

WORKDIR /opt/dagster/dbt

RUN uv run dbt deps && uv run dbt parse && uv run dbt compile

WORKDIR $DAGSTER_HOME

RUN mkdir -p db/

# Setup Nginx configuration
RUN htpasswd -cb /etc/nginx/.htpasswd $ZLV_HTTP_USERNAME $ZLV_HTTP_PASSWORD
COPY .docker/dagster/nginx/nginx.conf /etc/nginx/sites-available/default

EXPOSE 8080 3000

CMD service nginx start && uv run dagster dev -h 0.0.0.0 -p 3000