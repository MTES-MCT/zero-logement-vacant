FROM python:3.10-slim

RUN pip install dagster-webserver dagster-postgres dagster-aws

# Install dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

ENV DAGSTER_HOME=/opt/dagster/dagster_home/

RUN mkdir -p $DAGSTER_HOME

COPY dagster.yaml workspace.yaml $DAGSTER_HOME

COPY src/ $DAGSTER_HOME

WORKDIR $DAGSTER_HOME

EXPOSE 3000

ENTRYPOINT ["dagster-webserver", "-h", "0.0.0.0", "-p", "3000"]
