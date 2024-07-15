import { Knex } from 'knex';

import { genDatafoncierOwner } from '~/test/testFixtures';

const DF_OWNERS_NAT = 'df_owners_nat';

export async function seed(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable(DF_OWNERS_NAT);
  if (!exists) {
    await knex.schema.createTable(DF_OWNERS_NAT, (table) => {
      table.string('idprodroit').notNullable();
      table.string('idprocpte').notNullable();
      table.string('idpersonne').notNullable();
      table.string('idvoie').notNullable();
      table.string('idcom').notNullable();
      table.string('idcomtxt').notNullable();
      table.string('ccodep').notNullable();
      table.string('ccodir').notNullable();
      table.string('ccocom').notNullable();
      table.string('dnupro').notNullable();
      table.string('dnulp').notNullable();
      table.string('ccocif').notNullable();
      table.string('dnuper').notNullable();
      table.string('ccodro').notNullable();
      table.string('ccodrotxt').notNullable();
      table.string('typedroit').notNullable();
      table.string('ccodem').notNullable();
      table.string('ccodemtxt').notNullable();
      table.string('gdesip').notNullable();
      table.string('gtoper').notNullable();
      table.string('ccoqua').notNullable();
      table.string('dnatpr');
      table.string('dnatprtxt');
      table.string('ccogrm');
      table.string('ccogrmtxt');
      table.string('dsglpm');
      table.string('dforme');
      table.string('ddenom').notNullable();
      table.string('gtyp3').notNullable();
      table.string('gtyp4').notNullable();
      table.string('gtyp5').notNullable();
      table.string('gtyp6').notNullable();
      table.string('dlign3');
      table.string('dlign4');
      table.string('dlign5');
      table.string('dlign6');
      table.string('ccopay');
      table.string('ccodep1a2').notNullable();
      table.string('ccodira').notNullable();
      table.string('ccocomadr').notNullable();
      table.string('ccovoi').notNullable();
      table.string('ccoriv').notNullable();
      table.string('dnvoiri').notNullable();
      table.string('dindic');
      table.string('ccopos').notNullable();
      table.string('dqualp').notNullable();
      table.string('dnomlp').notNullable();
      table.string('dprnlp').notNullable();
      table.string('jdatnss');
      table.string('dldnss').notNullable();
      table.string('dsiren');
      table.string('topja');
      table.string('datja');
      table.string('dformjur');
      table.string('dnomus').notNullable();
      table.string('dprnus').notNullable();
      table.string('locprop').notNullable();
      table.string('locproptxt').notNullable();
      table.string('catpro2').notNullable();
      table.string('catpro2txt').notNullable();
      table.string('catpro3').notNullable();
      table.string('catpro3txt').notNullable();
      table.integer('idpk').notNullable();
    });
  }

  // Deletes ALL existing entries
  await knex(DF_OWNERS_NAT).delete();

  // Inserts seed entries
  const owners = Array.from({ length: 100 }, () => genDatafoncierOwner());
  await knex(DF_OWNERS_NAT).insert(owners);
}
