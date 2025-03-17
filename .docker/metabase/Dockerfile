# Utiliser l'image OpenJDK comme base
FROM openjdk:19-buster

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

# Create plugins directory first
RUN mkdir -p $MB_PLUGINS_DIR

# Download Metabase JAR
ADD https://downloads.metabase.com/v0.53.5/metabase.jar /home

# Download DuckDB driver with specific version instead of 'latest'
RUN wget -O $MB_PLUGINS_DIR/duckdb.metabase-driver.jar https://github.com/motherduckdb/metabase_duckdb_driver/releases/download/0.2.12-b/duckdb.metabase-driver.jar

# Ensure the driver file exists before changing permissions
RUN ls -la $MB_PLUGINS_DIR && \
    chmod 744 $MB_PLUGINS_DIR/duckdb.metabase-driver.jar

RUN mkdir -p /data/duckdb/

# Installer DuckDB CLI version 1.2.1 pour assurer la compatibilité avec MotherDuck
RUN wget -O /tmp/duckdb.zip https://github.com/duckdb/duckdb/releases/download/v1.2.1/duckdb_cli-linux-amd64.zip && \
    unzip -o /tmp/duckdb.zip -d /usr/local/bin/ && \
    chmod +x /usr/local/bin/duckdb && \
    rm /tmp/duckdb.zip
    
# Configurer un cron job pour mettre à jour quotidiennement le fichier DuckDB
RUN echo "0 3 * * * root aws s3 --endpoint-url $AWS_ENDPOINT_URL cp $FILE_PATH /data/duckdb/$FILENAME" >> /etc/crontab

# Commande pour démarrer Metabase
CMD aws s3 --endpoint-url $AWS_ENDPOINT_URL cp $FILE_PATH /data/duckdb/$FILENAME && \
    cron && \
    java --add-opens java.base/java.nio=ALL-UNNAMED -jar /home/metabase.jar