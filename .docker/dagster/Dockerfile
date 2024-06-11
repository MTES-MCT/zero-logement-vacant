FROM python:3.10-slim

# ARG DAGSTER_PASSWORD=zlv
# ARG DAGSTER_USERNAME=zlv

# ENV DAGSTER_PASSWORD=$DAGSTER_PASSWORD
# ENV DAGSTER_USERNAME=$DAGSTER_USERNAME
# Set environment variables for Dagster
ENV DAGSTER_HOME=/opt/dagster/dagster_home/ \
    DAGSTER_USERNAME=zlv \
    DAGSTER_PASSWORD=zlv

RUN apt-get update && apt-get install -y nginx apache2-utils

RUN pip install dagster-webserver dagster-postgres dagster-aws

COPY analytics/dagster/requirements.txt .


RUN pip install -r requirements.txt

RUN mkdir -p $DAGSTER_HOME

COPY analytics/dagster/dagster.yaml analytics/dagster/workspace.yaml $DAGSTER_HOME

COPY analytics/dagster/src $DAGSTER_HOME/src

WORKDIR $DAGSTER_HOME

RUN htpasswd -cb /etc/nginx/.htpasswd zlv zlv


# Configure Nginx using a custom nginx.conf file
RUN htpasswd -cb /etc/nginx/.htpasswd $DAGSTER_USERNAME $DAGHER_PASSWORD \
    && rm /etc/nginx/sites-enabled/default \
    && cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup  # Backup the original config
COPY analytics/dagster/docker/nginx/nginx.conf /etc/nginx/nginx.conf


EXPOSE 8080 3000

CMD nginx -t && service nginx start && dagster-webserver -h 0.0.0.0 -p 3000
