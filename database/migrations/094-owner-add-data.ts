import { Knex } from 'knex';

exports.up = async (knex: Knex) => {
  await knex.schema.alterTable('owners', (table) => {
    table.string('location');
  });
  await knex.raw(
    'update owners o\n' +
      'set (owner_kind, owner_kind_detail, location) = (select ' +
      '  case\n' +
      "    when catpro3 like 'P%'\n" +
      "      then 'etat-et-collectivite-territoriale'\n" +
      "    when catpro3 in ('F1a','F2a','F2b','F4a','F4b','F4c','F5a','F5b','F7a','F7c','F7g')\n" +
      "      then 'bailleur-social-amenageur-investisseur-public'\n" +
      "    when catpro3 in ('F6a','F6b','F6c','F7b','F7d','F7e','F7f')\n" +
      "      then 'promoteur-investisseur-prive'\n" +
      "    when catpro3 like 'G%'\n" +
      "      then 'sci-copropriete-autres-personnes-morales'\n" +
      "    when catpro3 = 'X1a'\n" +
      "      then 'particulier'\n" +
      "    when catpro3 = '999'\n" +
      "      then 'absence-de-proprietaire'\n" +
      "    else 'autres'\n" +
      '  end,\n' +
      '  case\n' +
      "    when catpro3 like 'P%'\n" +
      "      then 'etat-et-collectivite-territoriale'\n" +
      "    when catpro3 like 'F%'\n" +
      "      then 'professionnel-du-foncier-et-immobilier'\n" +
      "    when catpro3 like 'A%'\n" +
      "      then 'proprietaire-exploitant-du-foncier-naturel-agricole-ou-forestier'\n" +
      "    when catpro3 like 'R%'\n" +
      "      then 'proprietaire-et-exploitant-des-reseaux'\n" +
      "    when catpro3 like 'G%'\n" +
      "      then 'organisation-de-gestion-fonciere-et-immobiliere'\n" +
      "    when catpro3 like 'M%'\n" +
      "      then 'personnes-morales-autres'\n" +
      "    when catpro3 like 'E%'\n" +
      "      then 'etablissement-d-enseignement-d-etude-et-de-recherche'\n" +
      "    when catpro3 like 'S%'\n" +
      "      then 'etablissement-de-sante'\n" +
      "    when catpro3 like 'Z%'\n" +
      "      then 'etablissement-industriel-et-commercial'\n" +
      "    when catpro3 like 'L%'\n" +
      "      then 'etablissement-de-tourisme-et-structure-de-loisir-sportive-ou-cultuelle'\n" +
      "    when catpro3 = 'X1a'\n" +
      "      then 'personne-physique'\n" +
      "    when catpro3 = '999'\n" +
      "      then 'absence-de-proprietaire'\n" +
      '  end,\n' +
      '  case\n' +
      "    when locprop = '1'\n" +
      "      then 'commune'\n" +
      "    when locprop = '2'\n" +
      "      then 'departement'\n" +
      "    when locprop = '3'\n" +
      "      then 'region'\n" +
      "    when locprop = '4'\n" +
      "      then 'metropole'\n" +
      "    when locprop = '5'\n" +
      "      then 'outre-mer'\n" +
      "    when locprop = '6'\n" +
      "      then 'etranger'\n" +
      "    when locprop = '7'\n" +
      "      then 'inconnu'\n" +
      '  end\n' +
      'from df_owners_nat dfo, owner_matches om\n' +
      'where o.id = om.owner_id\n' +
      '  and om.idpersonne = dfo.idpersonne' +
      '  limit 1)'
  );
};

exports.down = async (knex: Knex) => {
  await knex.schema.alterTable('owners', (table) => {
    table.dropColumns('location');
    table.string('owner_kind_detail');
  });
};
