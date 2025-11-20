import type { Knex } from 'knex';

const TABLE = 'df_owners_nat';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.dropTable(TABLE);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.raw(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      code_epci character varying(10),
      lib_epci character varying(255),
      idprodroit character varying(13),
      idprocpte character varying(11),
      idpersonne character varying(8),
      idvoie character varying(9),
      idcom character varying(5),
      idcomtxt character varying(45),
      ccodep character varying(2),
      ccodir character varying(1),
      ccocom character varying(3),
      dnupro character varying(6),
      dnulp character varying(2),
      ccocif character varying(4),
      dnuper character varying(6),
      ccodro character varying(1),
      ccodrotxt character varying(64),
      typedroit character varying(1),
      ccodem character varying(1),
      ccodemtxt character varying(28),
      gdesip character varying(1),
      gtoper character varying(1),
      ccoqua character varying(1),
      dnatpr character varying(3),
      dnatprtxt character varying(53),
      ccogrm character varying(2),
      ccogrmtxt character varying(46),
      dsglpm character varying(10),
      dforme character varying(4),
      ddenom character varying(60),
      gtyp3 character varying(1),
      gtyp4 character varying(1),
      gtyp5 character varying(1),
      gtyp6 character varying(1),
      dlign3 character varying(30),
      dlign4 character varying(36),
      dlign5 character varying(30),
      dlign6 character varying(32),
      ccopay character varying(3),
      ccodep1a2 character varying(2),
      ccodira character varying(1),
      ccocomadr character varying(3),
      ccovoi character varying(5),
      ccoriv character varying(4),
      dnvoiri character varying(4),
      dindic character varying(1),
      ccopos character varying(5),
      dqualp character varying(3),
      dnomlp character varying(30),
      dprnlp character varying(15),
      jdatnss character varying(10),
      dldnss character varying(58),
      dsiren character varying(9),
      topja character varying(1),
      datja character varying(8),
      dformjur character varying(4),
      dnomus character varying(60),
      dprnus character varying(40),
      locprop character varying(1),
      locproptxt character varying(21),
      catpro2 character varying(2),
      catpro2txt character varying(100),
      catpro3 character varying(3),
      catpro3txt character varying(105),
      idpk integer
    );
  `);
}
