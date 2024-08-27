FROM openjdk:19-buster

RUN apt-get update && apt-get install -y python3-pip python3-setuptools

RUN pip3 install s3cmd

ENV MB_PLUGINS_DIR=/home/plugins/
ENV CONFIG_FILE_PATH=/root/.s3cfg
ADD https://downloads.metabase.com/v0.50.22/metabase.jar /home

ADD https://github.com/MotherDuck-Open-Source/metabase_duckdb_driver/releases/download/0.2.9/duckdb.metabase-driver.jar /home/plugins/

RUN echo "[default]" > ${CONFIG_FILE_PATH} && \
    echo "access_key = ${CELLAR_ADDON_KEY_ID}" >> ${CONFIG_FILE_PATH} && \
    echo "secret_key = ${CELLAR_ADDON_KEY_SECRET}" >> ${CONFIG_FILE_PATH} && \
    echo "host_base = ${CELLAR_ADDON_HOST}" >> ${CONFIG_FILE_PATH} && \
    echo "host_bucket = ${CELLAR_ADDON_BUCKET}.${CELLAR_ADDON_HOST}" >> ${CONFIG_FILE_PATH} && \
    echo "use_https = True" >> ${CONFIG_FILE_PATH}

RUN mkdir -p /data/duckdb/
RUN s3cmd get s3://${CELLAR_ADDON_BUCKET}/db.duckdb /data/duckdb/

RUN chmod 744 /home/plugins/duckdb.metabase-driver.jar

CMD ["java", "-jar", "/home/metabase.jar"]
