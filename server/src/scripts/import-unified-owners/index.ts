import createImportUnifiedOwnersCommand from '~/scripts/import-unified-owners/command';

const importer = createImportUnifiedOwnersCommand();
importer().catch((error) => {
  console.error(error);
  process.exit(1);
});
