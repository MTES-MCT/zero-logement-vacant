# e2e tests

## Running locally

Copy the .env.example to .env and fill in the required values.
Run `yarn workspace @zerologementvacant/e2e dev` to open the cypress GUI.
Run `yarn workspace @zerologementvacant/e2e test` to run the tests in headless
mode.

## Running in CI

`E2E_EMAIL` and `E2E_PASSWORD` must be set on the API where you want to run the
tests.
The API seeds a specific environment for the end-to-end tests with variables
defined on [our cloud provider](https://console.clever-cloud.com/organisations/orga_31f13631-abb3-48d2-a58b-24b736f02a9d/applications/app_be5bb031-0ce0-4ce1-ac71-c5434691dcb6/variables).

GitHub CI runs the headless tests, thus the variables defined in [.env.example](./.env.example) must be defined in the CI environment.
The _staging_ environment variables and secrets are defined [on GitHub](https://github.com/MTES-MCT/zero-logement-vacant/settings/environments/3313774599/edit).
