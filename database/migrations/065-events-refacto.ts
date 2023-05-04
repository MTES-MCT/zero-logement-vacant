import { Knex } from 'knex';

exports.up = function (knex: Knex) {
  return Promise.all([
    knex.schema.renameTable('events', 'old_events'),
    knex.schema.alterTable('old_events', (table) => {
      table.dropPrimary('events_pkey');
      table.primary(['id']);
    }),
    knex.schema.createTable('events', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('name').notNullable();
      table.string('kind').notNullable();
      table.string('category').notNullable();
      table.string('section').notNullable();
      table.string('contact_kind');
      table.boolean('conflict');
      table.jsonb('old');
      table.jsonb('new');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.uuid('created_by').references('id').inTable('users').notNullable();
    }),
    knex.schema.createTable('housing_events', (table) => {
      table.uuid('event_id').references('id').inTable('events').notNullable();
      table
        .uuid('housing_id')
        .references('id')
        .inTable('housing')
        .notNullable();
    }),
    knex.schema.createTable('owner_events', (table) => {
      table.uuid('event_id').references('id').inTable('events').notNullable();
      table.uuid('owner_id').references('id').inTable('owners').notNullable();
    }),
    knex.schema.createTable('campaign_events', (table) => {
      table.uuid('event_id').references('id').inTable('events').notNullable();
      table
        .uuid('campaign_id')
        .references('id')
        .inTable('campaigns')
        .notNullable();
    }),
    knex.schema.createTable('notes', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.text('title').notNullable();
      table.text('content');
      table.string('contact_kind');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.uuid('created_by').references('id').inTable('users').notNullable();
    }),
    knex.schema.createTable('housing_notes', (table) => {
      table.uuid('note_id').references('id').inTable('notes').notNullable();
      table
        .uuid('housing_id')
        .references('id')
        .inTable('housing')
        .notNullable();
    }),
    knex.schema.createTable('owner_notes', (table) => {
      table.uuid('note_id').references('id').inTable('notes').notNullable();
      table.uuid('owner_id').references('id').inTable('owners').notNullable();
    }),
    knex.schema.raw(
      `insert into notes(id, title, content, contact_kind, created_at, created_by) 
        (select id, content, null, contact_kind, created_at, created_by from old_events where kind in ('0', '4'))`
    ),
    knex.schema.raw(
      `insert into notes(id, title, content, contact_kind, created_at, created_by) 
        (select e.id, 'Ajout dans une campagne', c.title, contact_kind, e.created_at, e.created_by from old_events e, campaigns c where e.campaign_id = c.id and e.kind = '1')`
    ),
    knex.schema.raw(
      `insert into notes(id, title, content, contact_kind, created_at, created_by)
         (select id, 'Changement de statut', content, contact_kind, created_at, created_by from old_events where kind = '2')`
    ),
    knex.schema.raw(
      `insert into notes(id, title, content, contact_kind, created_at, created_by)
         (select id, 'Changement de propriétaire', content, contact_kind, created_at, created_by from old_events where kind in ('3', '5'))`
    ),
    knex.schema.raw(
      `insert into notes(id, title, content, contact_kind, created_at, created_by)
         (select id, title, content, contact_kind, created_at, created_by from old_events where kind = '6')`
    ),
    knex.schema.raw(
      `insert into owner_notes (select id, owner_id from old_events where kind in ('0', '4', '6') and owner_id is not null)`
    ),
    knex.schema.raw(
      `insert into housing_notes (select id, housing_id from old_events where kind not in ('0', '4', '6') or owner_id is null)`
    ),
  ]);
};

exports.down = function (knex: Knex) {
  return Promise.all([
    knex.schema.dropTable('campaign_events'),
    knex.schema.dropTable('owner_events'),
    knex.schema.dropTable('housing_events'),
    knex.schema.dropTable('events'),
    knex.schema.renameTable('old_events', 'events'),
    knex.schema.alterTable('events', (table) => {
      table.dropPrimary('old_events_pkey');
      table.primary(['id']);
    }),
    knex.schema.dropTable('owner_notes'),
    knex.schema.dropTable('housing_notes'),
    knex.schema.dropTable('notes'),
  ]);
};
