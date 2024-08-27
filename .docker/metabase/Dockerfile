FROM openjdk:19-buster

ENV MB_PLUGINS_DIR=/home/plugins/

ADD https://downloads.metabase.com/v0.50.22/metabase.jar /home
ADD https://github.com/MotherDuck-Open-Source/metabase_duckdb_driver/releases/download/0.2.9/duckdb.metabase-driver.jar /home/plugins/


RUN chmod 744 /home/plugins/duckdb.metabase-driver.jar

CMD ["java", "-jar", "/home/metabase.jar"]
