# Queue Module

The Queue module is a part of a larger application that handles task scheduling
and execution. It uses Redis as a message broker to manage the tasks in the
queue.

## Prerequisites

- Docker
- Docker Compose

## Running the Services

To run the S3 and Redis services, you need to use Docker Compose. The
configuration for these services is defined in the `docker-compose.yml` file in
the `.docker` directory.

### S3 Service

The S3 service is a mock S3 server that you can use for local development. It's
based on the `adobe/s3mock` Docker image. The service is configured to create an
initial bucket named `zerologementvacant`.

To start the S3 service, navigate to the directory containing
the `docker-compose.yml` file and run the following command:

```bash
docker-compose up -d s3
```

This command starts the S3 service in the foreground. The S3 server is
accessible at `http://localhost:9090`.

### Redis Service

The Redis service is a Redis server that the Queue module uses as a message
broker. It's based on the `redis` Docker image.

To start the Redis service, navigate to the directory containing
the `docker-compose.yml` file and run the following command:

```bash
docker-compose up -d redis
```

This command starts the Redis service in the foreground. The Redis server is
accessible at `localhost:6379`.

## Environment Variables

The Queue module uses environment variables for configuration. These variables
are loaded at runtime from the `.env` file in the root directory of the project.
An example `.env.example` file is provided in the root directory as a template.

Here are the environment variables used by the Queue module:

- `REDIS_HOST`: The hostname of the Redis server. Default is `localhost`.
- `REDIS_PORT`: The port number of the Redis server. Default is `6379`.
- `S3_ENDPOINT`: The endpoint of the S3 service. Default
  is `http://localhost:9090`.
- `S3_BUCKET`: The name of the S3 bucket. Default is `zerologementvacant`.
- `S3_REGION`: The region of the S3 service. Can be any string.
- `S3_ACCESS_KEY_ID`: The access key ID for the S3 service. Can be any string.
- `S3_SECRET_ACCESS_KEY`: The secret access key for the S3 service. Can be any
  string.

To use these environment variables, copy the `.env.example` file to a new file
named `.env` and replace the placeholder values with your actual values.

```bash
cp .env.example .env
```
