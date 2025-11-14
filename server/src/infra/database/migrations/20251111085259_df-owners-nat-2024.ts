import type { Knex } from 'knex';

const TABLE = 'df_owners_nat_2024';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(TABLE, (table) => {
    table.string('idprodroit', 13);
    table.string('idprocpte', 11);
    table.string('idpersonne', 8);
    table.string('idvoie', 9);
    table.string('idcom', 5);
    table.string('idcomtxt');
    table.string('ccodep', 2);
    table.string('ccodir', 1);
    table.string('ccocom', 3);
    table.string('dnupro', 6);
    table.string('dnulp', 2);
    table.string('ccocif', 4);
    table.string('dnuper', 6);
    table.string('ccodro', 1);
    table.string('ccodrotxt');
    table.string('typedroit', 1);
    table.string('ccodem', 1);
    table.string('ccodemtxt');
    table.string('gdesip', 1);
    table.string('gtoper', 1);
    table.string('ccoqua', 1);
    table.string('dnatpr', 3);
    table.string('dnatprtxt');
    table.string('ccogrm', 2);
    table.string('ccogrmtxt');
    table.string('dsglpm');
    table.string('dforme', 4);
    table.string('ddenom');
    table.string('gtyp3', 1);
    table.string('gtyp4', 1);
    table.string('gtyp5', 1);
    table.string('gtyp6', 1);
    table.string('dlign3');
    table.string('dlign4');
    table.string('dlign5');
    table.string('dlign6');
    table.string('ccopay', 3);
    table.string('ccodep1a2', 2);
    table.string('ccodira', 1);
    table.string('ccocomadr', 3);
    table.string('ccovoi', 5);
    table.string('ccoriv', 4);
    table.string('dnvoiri', 4);
    table.string('dindic', 1);
    table.string('ccopos', 5);
    table.string('dqualp', 3);
    table.string('dnomlp');
    table.string('dprnlp');
    table.string('jdatnss', 10);
    table.string('dldnss');
    table.string('dsiren', 9);
    table.string('topja', 1);
    table.string('datja', 8);
    table.string('dformjur', 4);
    table.string('dnomus');
    table.string('dprnus');
    table.string('locprop', 1);
    table.string('locproptxt');
    table.string('catpro2');
    table.string('catpro2txt');
    table.string('catpro3');
    table.string('catpro3txt');
    table.integer('idpk');

    table.index('idpersonne');
    table.index('idprocpte');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable(TABLE);
}
