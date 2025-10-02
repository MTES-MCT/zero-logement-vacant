# How to develop or refactor an API endpoint?

## Router

- Add or update the route in @server/src/routers/protected.ts or @server/src/routers/unprotected.ts

## Controller

- Test the API using a file `example-api.test.ts` in `src/controllers/test`
- Write the code in a controller function usually called `list`, `get`, `create`, `update`, `remove` when writing CRUD resources

## Repository

- Use or create the related repository
- Test the repository function using a file `<exampleRepository>.test.ts in `src/repositories/test`

## Validation

- API input validation should happen either in @server/src/routers/protected.ts or @server/src/routers/unprotected.ts using `validatorNext`, passing it the appropriate schemas. Schemas should be shared and tested in @packages/schemas/
- Whenever you test API inputs in the @server/ or schema validation in @packages/schemas/ you MUST use `@fast-check/vitest`.

## Models

- The API models should extend the corresponding model from @packages/models/
- The shared DTO models should go to `packages/models`. For example, the best practice is to name a model `ExampleDTO`, derive the payload as `ExamplePayload`, or even `ExampleCreationPayload`and`ExampleUpdatePayload`if they are different. Usually, they would pick properties from`ExampleDTO`.

## Testing

- To test the API, you can use `nx` to test the server and add the proper arguments to filter the file you want to test. We are using `vitest` under the hood.