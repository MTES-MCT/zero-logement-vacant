import cli from '~/scripts/import-lovac/cli';

cli.parseAsync(process.argv).catch(console.error);
