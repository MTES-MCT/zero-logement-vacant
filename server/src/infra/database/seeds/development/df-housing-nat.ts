import async from 'async';
import { Knex } from 'knex';

import { genDatafoncierHousing } from '~/test/testFixtures';
import { Establishments } from '~/repositories/establishmentRepository';

const DF_HOUSING_NAT = 'df_housing_nat';

export async function seed(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable(DF_HOUSING_NAT);
  if (!exists) {
    await knex.schema.createTable(DF_HOUSING_NAT, (table) => {
      table.string('idlocal').notNullable();
      table.string('idbat').notNullable();
      table.string('idpar').notNullable();
      table.string('idtup').notNullable();
      table.string('idsec').notNullable();
      table.string('idvoie').notNullable();
      table.string('idprocpte').notNullable();
      table.string('idcom').notNullable();
      table.string('idcomtxt').notNullable();
      table.string('ccodep').notNullable();
      table.string('ccodir').notNullable();
      table.string('ccocom').notNullable();
      table.string('invar').notNullable();
      table.string('ccopre');
      table.string('ccosec').notNullable();
      table.string('dnupla').notNullable();
      table.string('dnubat').notNullable();
      table.string('descc').notNullable();
      table.string('dniv').notNullable();
      table.string('dpor').notNullable();
      table.string('ccoriv').notNullable();
      table.string('ccovoi').notNullable();
      table.string('dnvoiri').notNullable();
      table.string('dindic');
      table.string('ccocif').notNullable();
      table.string('dvoilib').notNullable();
      table.string('cleinvar').notNullable();
      table.string('ccpper').notNullable();
      table.string('gpdl').notNullable();
      table.string('ctpdl');
      table.string('dnupro').notNullable();
      table.string('jdatat').notNullable();
      table.string('jdatatv').notNullable();
      table.integer('jdatatan').notNullable();
      table.string('dnufnl');
      table.string('ccoeva').notNullable();
      table.string('ccoevatxt').notNullable();
      table.string('dteloc').notNullable();
      table.string('dteloctxt').notNullable();
      table.string('logh').notNullable();
      table.string('loghmais').notNullable();
      table.string('loghappt');
      table.string('gtauom').notNullable();
      table.string('dcomrd').notNullable();
      table.string('ccoplc');
      table.string('ccoplctxt');
      table.string('cconlc').notNullable();
      table.string('cconlctxt').notNullable();
      table.integer('dvltrt').notNullable();
      table.string('cc48lc');
      table.integer('dloy48a');
      table.string('top48a').notNullable();
      table.string('dnatlc').notNullable();
      table.string('ccthp').notNullable();
      table.string('proba_rprs').notNullable();
      table.string('typeact');
      table.string('loghvac');
      table.string('loghvac2a');
      table.string('loghvac5a');
      table.string('loghvacdeb');
      table.string('cchpr');
      table.string('jannat').notNullable();
      table.string('dnbniv').notNullable();
      table.integer('nbetagemax').notNullable();
      table.integer('nbnivssol');
      table.string('hlmsem');
      table.string('loghlls').notNullable();
      table.string('postel');
      table.string('dnatcg');
      table.string('jdatcgl').notNullable();
      table.integer('fburx').notNullable();
      table.string('gimtom');
      table.string('cbtabt');
      table.string('jdbabt');
      table.string('jrtabt');
      table.string('cconac');
      table.string('cconactxt');
      table.string('toprev').notNullable();
      table.integer('ccoifp').notNullable();
      table.integer('jannath').notNullable();
      table.integer('janbilmin').notNullable();
      table.integer('npevph').notNullable();
      table.integer('stoth').notNullable();
      table.integer('stotdsueic').notNullable();
      table.integer('npevd').notNullable();
      table.integer('stotd').notNullable();
      table.integer('npevp').notNullable();
      table.integer('sprincp').notNullable();
      table.integer('ssecp').notNullable();
      table.integer('ssecncp').notNullable();
      table.integer('sparkp').notNullable();
      table.integer('sparkncp').notNullable();
      table.integer('npevtot').notNullable();
      table.integer('slocal').notNullable();
      table.integer('npiece_soc').notNullable();
      table.integer('npiece_ff').notNullable();
      table.integer('npiece_i').notNullable();
      table.integer('npiece_p2').notNullable();
      table.integer('nbannexe').notNullable();
      table.integer('nbgarpark').notNullable();
      table.integer('nbagrement').notNullable();
      table.integer('nbterrasse').notNullable();
      table.integer('nbpiscine').notNullable();
      table.integer('ndroit').notNullable();
      table.integer('ndroitindi').notNullable();
      table.integer('ndroitpro').notNullable();
      table.integer('ndroitges').notNullable();
      table.string('catpro2').notNullable();
      table.string('catpro2txt').notNullable();
      table.string('catpro3').notNullable();
      table.string('catpropro2').notNullable();
      table.string('catproges2').notNullable();
      table.string('locprop').notNullable();
      table.string('locproptxt').notNullable();
      table.string('source_geo').notNullable();
      table.string('vecteur').notNullable();
      table.string('ban_id').notNullable();
      table.string('ban_geom');
      table.string('ban_type').notNullable();
      table.string('ban_score').notNullable();
      table.string('ban_cp').notNullable();
      table.string('code_epci');
      table.string('lib_epci');
      table.string('geomloc');
      table.integer('idpk');
      table.integer('dis_ban_ff').notNullable();
    });
  }

  // Deletes ALL existing entries
  await knex(DF_HOUSING_NAT).delete();

  // Inserts seed entries
  const availableEstablishments = await Establishments(knex).where({
    available: true,
  });
  const geoCodes = availableEstablishments.map(
    (establishment) => establishment.localities_geo_code[0]
  );
  await async.forEachSeries(geoCodes, async (geoCode) => {
    const houses = Array.from({ length: 10, }, () =>
      genDatafoncierHousing(geoCode)
    );
    await knex(DF_HOUSING_NAT).insert(houses);
  });
}
