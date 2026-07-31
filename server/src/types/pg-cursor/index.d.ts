// pg-cursor ships no type declarations. Kysely's PostgresDialect only needs the
// constructor reference for `cursor`, so an untyped module declaration suffices.
declare module 'pg-cursor';
