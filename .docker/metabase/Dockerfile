FROM eclipse-temurin:21-jre

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

# Update and install dependencies
RUN apt-get update && apt-get install -y \
    python3-pip \
    python3-setuptools \
    python3-wheel \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install AWS CLI v2 (recommended over v1)
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    apt-get update && apt-get install -y unzip && \
    unzip awscliv2.zip && \
    ./aws/install && \
    rm -rf awscliv2.zip aws && \
    apt-get remove -y unzip && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

# Download Metabase and DuckDB driver
ADD https://downloads.metabase.com/v0.57.3/metabase.jar /home
ADD https://github.com/motherduckdb/metabase_duckdb_driver/releases/download/0.2.12-b/duckdb.metabase-driver.jar $MB_PLUGINS_DIR

# Create necessary directories and set permissions
RUN mkdir -p /data/duckdb/ && \
    chmod 744 /home/plugins/duckdb.metabase-driver.jar

# Command to start Metabase
CMD aws s3 --endpoint-url $AWS_ENDPOINT_URL cp $FILE_PATH /data/duckdb/$FILENAME && \
    java --add-opens java.base/java.nio=ALL-UNNAMED -jar /home/metabase.jar