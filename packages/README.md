# Packages

## Initialize a new package

- Copy the `template` folder to `packages/<your-package>` and rename it
- Inside `package.json`, change the `"name"` field
- Inside your package, create a folder named `src`

You are ready to go!

## Add tests

- Inside `package.json`, add a script `"test": "jest"`
- Copy `template/jest.config.json` to your package root (not `src`)
- Type `yarn workspace @zerologementvacant/<your-package> add --dev @types/jest
  jest jest-extended @swc/core @swc/jest`

## Lint

Linting is provided by the root directory. You have nothing to do!

## Available scripts

### clean

Cleans up the package artifacts (the `dist` folder and *.tsbuildinfo)

### build

Build the sources using tsconfig.build.json
