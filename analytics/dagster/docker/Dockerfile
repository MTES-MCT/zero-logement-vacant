FROM python:3.10-slim

# ARG DAGSTER_PASSWORD=zlv
# ARG DAGSTER_USERNAME=zlv

# ENV DAGSTER_PASSWORD=$DAGSTER_PASSWORD
# ENV DAGSTER_USERNAME=$DAGSTER_USERNAME

RUN apt-get update && apt-get install -y nginx apache2-utils

RUN pip install dagster-webserver dagster-postgres dagster-aws

COPY analytics/dagster/requirements.txt .


RUN pip install -r requirements.txt

ENV DAGSTER_HOME=/opt/dagster/dagster_home/

RUN mkdir -p $DAGSTER_HOME

COPY analytics/dagster/dagster.yaml analytics/dagster/workspace.yaml $DAGSTER_HOME

COPY analytics/dagster/src $DAGSTER_HOME/src

WORKDIR $DAGSTER_HOME

RUN htpasswd -cb /etc/nginx/.htpasswd zlv zlv

RUN rm /etc/nginx/sites-enabled/default
ADD analytics/dagster/docker/nginx/nginx.conf /etc/nginx/sites-available/dagster
RUN ln -s /etc/nginx/sites-available/dagster /etc/nginx/sites-enabled/dagster

COPY analytics/dagster/docker/nginx/nginx.conf /etc/nginx/nginx.conf

EXPOSE 8080

CMD service nginx start && dagster-webserver -h 0.0.0.0 -p 3000