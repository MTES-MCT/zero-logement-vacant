# Scripts

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

- [deduplicate-owners](deduplicate-owners/README.md): try removing
  duplicate owners from the database
- [import-datafoncier](import-datafoncier/README.md): import Datafoncier
  owners and housing to our database
- [link-dpe](link-dpe/README.md): link energy performance certificates to
  the housing in the database
