FROM python:3.10-slim

RUN pip install dagster-webserver dagster-postgres dagster-aws

RUN apt-get update && apt-get install -y nginx apache2-utils

RUN ls 
# Install dependencies
COPY requirements.txt .


RUN pip install -r requirements.txt

ENV DAGSTER_HOME=/opt/dagster/dagster_home/

RUN mkdir -p $DAGSTER_HOME

COPY dagster.yaml workspace.yaml $DAGSTER_HOME

COPY src/ $DAGSTER_HOME

WORKDIR $DAGSTER_HOME

# Setup Nginx configuration
RUN htpasswd -cb /etc/nginx/.htpasswd zlv zlv
COPY docker/nginx/nginx.conf /etc/nginx/sites-available/default

# Expose port 80 for the Nginx web server
EXPOSE 8080

CMD nginx -g 'daemon off;' & dagster-webserver -h 0.0.0.0 -p 3000

