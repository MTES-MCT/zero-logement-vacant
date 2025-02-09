FROM python:3.10-slim

ARG ZLV_HTTP_USERNAME
ARG ZLV_HTTP_PASSWORD

ENV ZLV_HTTP_USERNAME=$ZLV_HTTP_USERNAME
ENV ZLV_HTTP_PASSWORD=$ZLV_HTTP_PASSWORD

COPY --from=clevercloud/clever-tools /bin/clever /usr/local/bin/clever

RUN apt-get update && \
    apt-get install -y nginx apache2-utils curl gnupg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN curl -sL https://clever-tools.clever-cloud.com/releases/latest/clever-tools-latest_linux.tar.gz | tar xz -C /usr/local/bin

RUN pip install dagster-webserver dagster-postgres dagster-aws

COPY analytics/dagster/requirements.txt .


RUN pip install -r requirements.txt

ENV DAGSTER_HOME=/opt/dagster/dagster_home/

RUN mkdir -p $DAGSTER_HOME

COPY analytics/dagster/dagster.yaml analytics/dagster/workspace.yaml $DAGSTER_HOME

COPY analytics/dagster/src $DAGSTER_HOME/src

COPY analytics/dbt /opt/dagster/dbt
COPY analytics/dbt/target/manifest.json /opt/dagster/dbt/target/manifest.json

WORKDIR /opt/dagster/dbt

RUN dbt deps && dbt parse

WORKDIR $DAGSTER_HOME

RUN mkdir -p db/

# Setup Nginx configuration
RUN htpasswd -cb /etc/nginx/.htpasswd $ZLV_HTTP_USERNAME $ZLV_HTTP_PASSWORD
COPY .docker/dagster/nginx/nginx.conf /etc/nginx/sites-available/default

EXPOSE 8080 3000

CMD service nginx start && dagster dev -h 0.0.0.0 -p 3000