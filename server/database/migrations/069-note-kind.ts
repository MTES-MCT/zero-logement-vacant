import { Knex } from 'knex';

exports.up = function (knex: Knex) {
  return knex
    .raw(
      "update notes set content = title || case when content is not null then '\\n' || content else '' end where title <> content or content is null"
    )
    .then(() =>
      knex.schema.alterTable('notes', (table) => {
        table.setNullable('title');
        table.renameColumn('title', 'title_deprecated');
        table.setNullable('contact_kind');
        table.renameColumn('contact_kind', 'contact_kind_deprecated');
        table.string('note_kind').notNullable().defaultTo('Note courante');
        table.dropNullable('content');
      })
    );
};

exports.down = function (knex: Knex) {
  return Promise.all([
    knex.schema.alterTable('notes', (table) => {
      table.dropColumns('note_kind');
      table.renameColumn('title_deprecated', 'title');
      table.renameColumn('contact_kind_deprecated', 'contact_kind');
    }),
  ]);
};
