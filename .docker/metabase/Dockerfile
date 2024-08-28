# Utiliser l'image OpenJDK comme base
FROM openjdk:19-buster

# Mettre à jour le système et installer les dépendances nécessaires
RUN apt-get update && apt-get install -y \
    python3-pip \
    python3-setuptools \
    cron

# Installer s3cmd et awscli
RUN pip3 install s3cmd awscli

# Définir les variables d'environnement pour Metabase
ENV MB_PLUGINS_DIR=/home/plugins/

# Télécharger Metabase et le plugin DuckDB
ADD https://downloads.metabase.com/v0.50.22/metabase.jar /home
ADD https://github.com/MotherDuck-Open-Source/metabase_duckdb_driver/releases/download/0.2.9/duckdb.metabase-driver.jar /home/plugins/

# Créer les répertoires nécessaires
RUN mkdir -p /data/duckdb/
RUN chmod 744 /home/plugins/duckdb.metabase-driver.jar

# Définir les variables d'environnement AWS (vous pouvez les configurer lors du déploiement)
#$CELLAR_ADDON_KEY_ID
ENV AWS_ACCESS_KEY_ID=7HEO1E7QL2ZL06JUHDVZ
ENV AWS_SECRET_ACCESS_KEY=SkmBkERVUHhhki3KKYu1Lsb1sgF2b0h05yIgdB1k
ENV CELLAR_ADDON_BUCKET=zlv-metabase
ENV AWS_ENDPOINT_URL=https://cellar-c2.services.clever-cloud.com
ENV FILE_PATH=s3://zlv-metabase/duckdb/identifier.db

# Téléchargement du fichier DuckDB depuis S3 avant le démarrage de Metabase
RUN aws s3 --endpoint-url $AWS_ENDPOINT_URL cp $FILE_PATH /data/duckdb/identifier.db

# Configurer un cron job pour mettre à jour quotidiennement le fichier DuckDB
RUN echo "0 3 * * * root aws s3 --endpoint-url $AWS_ENDPOINT_URL cp $FILE_PATH /data/duckdb/identifier.db" >> /etc/crontab

# Commande pour démarrer Metabase
CMD cron && java -jar /home/metabase.jar