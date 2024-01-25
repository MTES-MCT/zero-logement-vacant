# Scripts
Each script is executed in a one-off container duplicated upon an existing one.
Thus, it executes even on review apps!
Scalingo does not allow configuring this,
so it should be checked in user code.

An environment variable `IS_REVIEW_APP` is defined in `scalingo.json`. It can be
obtained from the config as `config.application.isReviewApp` and should be
checked at the start of your script.

```ts
// import config from ...

async function run() {
  if (config.application.isReviewApp) {
    logger.info('This is a review app. Skipping...')
    return
  }
  
  // Do something
}

run()
  .finally(() => db.destroy())
  .then(() => {
    logger.info('DB connection destroyed.')
  })
```

## List of available scripts

- [import-datafoncier](import-datafoncier/README.md): import Datafoncier
  owners and housing to our database
