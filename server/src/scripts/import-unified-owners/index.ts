import createImportUnifiedOwnersCommand from '~/scripts/import-unified-owners/command';

const importer = createImportUnifiedOwnersCommand();
importer()
  .then(() => {
    console.log('Done.');
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
