FROM openjdk:21-buster


ARG CELLAR_ADDON_HOST
ARG CELLAR_ADDON_KEY_ID
ARG CELLAR_ADDON_KEY_SECRET
ARG CELLAR_ADDON_BUCKET
ARG FILENAME=metabase.duckdb

ENV MB_PLUGINS_DIR=/home/plugins/
ENV AWS_ACCESS_KEY_ID=$CELLAR_ADDON_KEY_ID
ENV AWS_SECRET_ACCESS_KEY=$CELLAR_ADDON_KEY_SECRET
ENV CELLAR_ADDON_BUCKET=$CELLAR_ADDON_BUCKET
ENV AWS_ENDPOINT_URL=https://$CELLAR_ADDON_HOST
ENV FILE_PATH=s3://$CELLAR_ADDON_BUCKET/$FILENAME

RUN apt-get update && apt-get install -y \
    python3-pip \
    python3-setuptools \
    cron

RUN pip3 install s3cmd awscli

ADD https://downloads.metabase.com/v0.53.6/metabase.jar /home
ADD https://github.com/motherduckdb/metabase_duckdb_driver/releases/download/0.2.12-b/duckdb.metabase-driver.jar $MB_PLUGINS_DIR

RUN mkdir -p /data/duckdb/
RUN chmod 744 /home/plugins/duckdb.metabase-driver.jar

# Commande pour démarrer Metabase
CMD aws s3 --endpoint-url $AWS_ENDPOINT_URL cp $FILE_PATH /data/duckdb/$FILENAME && \
    java --add-opens java.base/java.nio=ALL-UNNAMED -jar /home/metabase.jar