import { Knex } from 'knex';

exports.seed = async (knex: Knex) => {
  await knex.raw(
    `update owners o 
      set (owner_kind, owner_kind_detail, location) = (select 
         case 
           when catpro3 like 'P%' 
             then 'etat-et-collectivite-territoriale' 
           when catpro3 in ('F1a','F2a','F2b','F4a','F4b','F4c','F5a','F5b','F7a','F7c','F7g') 
             then 'bailleur-social-amenageur-investisseur-public' 
           when catpro3 in ('F6a','F6b','F6c','F7b','F7d','F7e','F7f') 
             then 'promoteur-investisseur-prive' 
           when catpro3 like 'G%' 
             then 'sci-copropriete-autres-personnes-morales' 
           when catpro3 = 'X1a' 
             then 'particulier' 
           when catpro3 = '999' 
             then 'absence-de-proprietaire' 
           else 'autres' 
         end, 
         case 
           when catpro3 like 'P%' 
             then 'etat-et-collectivite-territoriale' 
           when catpro3 like 'F%' 
             then 'professionnel-du-foncier-et-immobilier' 
           when catpro3 like 'A%' 
             then 'proprietaire-exploitant-du-foncier-naturel-agricole-ou-forestier' 
           when catpro3 like 'R%' 
             then 'proprietaire-et-exploitant-des-reseaux' 
           when catpro3 like 'G%' 
             then 'organisation-de-gestion-fonciere-et-immobiliere' 
           when catpro3 like 'M%' 
             then 'personnes-morales-autres' 
           when catpro3 like 'E%' 
             then 'etablissement-d-enseignement-d-etude-et-de-recherche' 
           when catpro3 like 'S%' 
             then 'etablissement-de-sante' 
           when catpro3 like 'Z%' 
             then 'etablissement-industriel-et-commercial' 
           when catpro3 like 'L%' 
             then 'etablissement-de-tourisme-et-structure-de-loisir-sportive-ou-cultuelle' 
           when catpro3 = 'X1a' 
             then 'personne-physique' 
           when catpro3 = '999' 
             then 'absence-de-proprietaire' 
         end, 
         case 
           when locprop = '1' 
             then 'commune' 
           when locprop = '2' 
             then 'departement' 
           when locprop = '3' 
             then 'region' 
           when locprop = '4' 
             then 'metropole' 
           when locprop = '5' 
             then 'outre-mer' 
           when locprop = '6' 
             then 'etranger' 
           when locprop = '7' 
             then 'inconnu' 
         end 
      from df_owners_nat dfo, owner_matches om 
      where o.id = om.owner_id 
         and om.idpersonne = dfo.idpersonne 
         limit 1)`
  );
};
