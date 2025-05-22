{% macro deduplicate_lovac() %}
QUALIFY
ROW_NUMBER () OVER (PARTITION BY local_id ORDER BY debutvacance desc,anmutation desc,vlcad desc,vl_revpro desc,anrefthlv,potentiel_tlv_thlv ,txtlv,proprietaire,gestre_ppre,loc_num,libvoie,loc_voie,groupe,aff,nature,refcad,dir,sip,intercommunalite,adresse1,adresse2,adresse3,adresse4) = 1
{% endmacro %}