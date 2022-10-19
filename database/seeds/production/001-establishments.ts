import { localitiesTable } from '../../../server/repositories/localityRepository';
import { Knex } from 'knex';
import { establishmentsTable } from '../../../server/repositories/establishmentRepository';
import db from '../../../server/repositories/db';

const addLocalityAsEstablishment = (knex: Knex, name: string, geoCode: string, siren: number) => {
    return knex.table(establishmentsTable)
        .insert({siren, name, localities_geo_code: [geoCode]})
        .onConflict('siren')
        .ignore()
}
const addAreaAsEstablishment = (knex: Knex, name: string, areaCode: string, siren: number) => {
    return knex.table(localitiesTable)
        .select(db.raw('array_agg(geo_code) as geo_codes'))
        .whereRaw("geo_code like ? || '%'", areaCode)
        .first()
        .then((result: any) =>
            knex.table(establishmentsTable)
                .insert({siren, name, localities_geo_code: result.geo_codes})
                .onConflict('siren')
                .ignore()
        )
}
const addEstablishmentsAsEstablishment = (knex: Knex, name: string, establishmentSirens: number[], siren: number) => {
    return knex
        .select(db.raw('array_agg(localities_geo_code.geo_codes) as geo_codes from (select unnest(localities_geo_code) geo_codes from establishments where siren = ANY(?)) as localities_geo_code', [establishmentSirens]))
        .first()
        .then((result: any) =>
            knex.table(establishmentsTable)
                .insert({ siren, name, localities_geo_code: result.geo_codes })
                .onConflict('siren')
                .ignore()
        )
}

const addLocalitiesToEstablishment = (knex: Knex, establishmentSiren: number, localityGeoCodes: string[]) => {
    return knex
        .select(db.raw('localities_geo_code as geo_codes from establishments where siren = ?', [establishmentSiren]))
        .first()
        .then((result: any) =>
            knex.table(establishmentsTable)
                .update({ localities_geo_code: [...result.geo_codes, ...localityGeoCodes] })
                .where('siren', establishmentSiren)
        )
}

// @ts-ignore
exports.seed = function(knex) {
    //EPCI
    return knex.table(localitiesTable).count().first()
        .then((result: {count: number}) => {
            return Number(result.count) === 0 ? Promise.resolve() :
                Promise.all([
                    //Arrondissements Lyon
                    knex.table(localitiesTable)
                        .insert([
                            { geo_code: '69381', name: 'Lyon 1er Arrondissement' },
                            { geo_code: '69382', name: 'Lyon 2e Arrondissement' },
                            { geo_code: '69383', name: 'Lyon 3e Arrondissement' },
                            { geo_code: '69384', name: 'Lyon 4e Arrondissement' },
                            { geo_code: '69385', name: 'Lyon 5e Arrondissement' },
                            { geo_code: '69386', name: 'Lyon 6e Arrondissement' },
                            { geo_code: '69387', name: 'Lyon 7e Arrondissement' },
                            { geo_code: '69388', name: 'Lyon 8e Arrondissement' },
                            { geo_code: '69389', name: 'Lyon 9e Arrondissement' }
                        ])
                        .onConflict('geo_code')
                        .ignore()
                        .then(() =>
                            addLocalitiesToEstablishment(knex, 200046977, ['69381', '69382', '69383', '69384', '69385', '69386', '69387', '69388', '69389']),
                        ),

                    //Arrondissements Marseille
                    knex.table(localitiesTable)
                        .insert([
                            { geo_code: '13201', name: 'Marseille 1er Arrondissement' },
                            { geo_code: '13202', name: 'Marseille 2e Arrondissement' },
                            { geo_code: '13203', name: 'Marseille 3e Arrondissement' },
                            { geo_code: '13204', name: 'Marseille 4e Arrondissement' },
                            { geo_code: '13205', name: 'Marseille 5e Arrondissement' },
                            { geo_code: '13206', name: 'Marseille 6e Arrondissement' },
                            { geo_code: '13207', name: 'Marseille 7e Arrondissement' },
                            { geo_code: '13208', name: 'Marseille 8e Arrondissement' },
                            { geo_code: '13209', name: 'Marseille 9e Arrondissement' },
                            { geo_code: '13210', name: 'Marseille 10e Arrondissement' },
                            { geo_code: '13211', name: 'Marseille 11e Arrondissement' },
                            { geo_code: '13212', name: 'Marseille 12e Arrondissement' },
                            { geo_code: '13213', name: 'Marseille 13e Arrondissement' },
                            { geo_code: '13214', name: 'Marseille 14e Arrondissement' },
                            { geo_code: '13215', name: 'Marseille 15e Arrondissement' },
                            { geo_code: '13216', name: 'Marseille 16e Arrondissement' }
                        ])
                        .onConflict('geo_code')
                        .ignore()
                        .then(() =>
                            addLocalitiesToEstablishment(knex, 200054807, ['13201', '13202', '13203', '13204', '13205', '13206', '13207', '13208', '13209', '13210', '13211', '13212', '13213', '13214', '13215', '13216']),
                        ),

                    //Communes
                    addLocalityAsEstablishment(knex, 'Commune d\'\'Ajaccio', '2A004', 212000046),
                    addLocalityAsEstablishment(knex, 'Commune de Brive-la-Gaillarde', '19031', 211903109),
                    addLocalityAsEstablishment(knex, 'Commune de Mulhouse', '68224', 200066009),
                    addLocalityAsEstablishment(knex, 'Commune de Vire Normandie', '14762', 200060176),
                    addLocalityAsEstablishment(knex, 'Commune de Roubaix', '59512', 215905126),
                    addLocalityAsEstablishment(knex, 'Commune de Fort de France', '97209', 219722097),
                    addLocalityAsEstablishment(knex, 'Commune de Mantes-la-Jolie', '78361', 217803618),
                    addLocalityAsEstablishment(knex, 'Commune de Montclar', '04126', 210401261),
                    addLocalityAsEstablishment(knex, 'Commune de Bastia', '2B033', 212000335),
                    addLocalityAsEstablishment(knex, 'Commune de Cayenne', '97302', 219733029),
                    addLocalityAsEstablishment(knex, 'Commune de Thann', '68334', 216803346),
                    addLocalityAsEstablishment(knex, 'Commune de Craponne-sur-Arzon', '43080', 214300808),
                    addLocalityAsEstablishment(knex, 'Commune de Dun-sur-Auron', '18087', 211800875),
                    addLocalityAsEstablishment(knex, 'Commune de Rostrenen', '22266', 212202667),
                    addLocalityAsEstablishment(knex, 'Commune de Castelnau-Magnoac', '65129', 216501296),
                    addLocalityAsEstablishment(knex, 'Commune d’Arras', '62041', 216200410),
                    addLocalityAsEstablishment(knex, 'Commune d’Auchel', '62048', 216200485),
                    addLocalityAsEstablishment(knex, 'Commune du Monastier-sur-Gazeille', '43135', 214301350),
                    addLocalityAsEstablishment(knex, 'Commune de Varennes-sur-Allier', '03298', 210302980),
                    addLocalityAsEstablishment(knex, 'Commune de Montreuil-sur-Mer', '62588', 216205880),
                    addLocalityAsEstablishment(knex, 'Commune d’Argelès-Gazost', '65025', 216500256),
                    addLocalityAsEstablishment(knex, 'Commune de Cauterets', '65138', 216501387),
                    addLocalityAsEstablishment(knex, 'Commune d’Aubigny-sur-Nère', '18015', 211800156),
                    addLocalityAsEstablishment(knex, 'Commune de Vichy', '03310', 210303103),
                    addLocalityAsEstablishment(knex, 'Commune de Cusset', '03095', 210300950),
                    addLocalityAsEstablishment(knex, 'Commune de Luxeuil-les-Bains', '70311', 217003110),
                    addLocalityAsEstablishment(knex, 'Commune de Lannemezan', '65258', 216502583),
                    addLocalityAsEstablishment(knex, 'Commune de Châteauneuf-sur-Cher', '18058', 211800586),
                    addLocalityAsEstablishment(knex, 'Commune de Lignières', '18127', 211801279),
                    addLocalityAsEstablishment(knex, 'Commune de Giromagny', '90052', 219000528),
                    addLocalityAsEstablishment(knex, 'Commune de Tournay', '65447', 216504472),
                    addLocalityAsEstablishment(knex, 'Commune de La Pesse', '39413', 213904139),
                    addLocalityAsEstablishment(knex, 'Commune de Montréjeau', '31390', 213103906),
                    addLocalityAsEstablishment(knex, 'Commune de Cazères', '31135', 213101355),
                    addLocalityAsEstablishment(knex, 'Commune de Rieumes', '31454', 213104540),
                    addLocalityAsEstablishment(knex, 'Commune de Martres-Tolosane', '31324', 213103245),
                    addAreaAsEstablishment(knex, 'DDT Cher', '18', 221800014),
                    addAreaAsEstablishment(knex, 'DDT Haute-Garonne', '18', 130010747),
                    addAreaAsEstablishment(knex, 'DDTM Pas-de-Calais', '62%', 130010366),
                    addAreaAsEstablishment(knex, 'DDTM Nord', '59%', 130009970),
                    addAreaAsEstablishment(knex, 'Département de la Meuse', '55%', 225500016),
                    addAreaAsEstablishment(knex, 'ADIL du Doubs', '25%', 341096394),
                    addEstablishmentsAsEstablishment(knex, 'PETR du Piémont des Vosges', [246700744, 200034270, 246701080], 200086197)
                ])
        }).then(() =>
            //Mise à disposition
            knex.table(establishmentsTable)
                .update({available: false})
                .then(() =>
                    knex.table(establishmentsTable).update({available: true}).whereIn('siren', [
                        '200027217',
                        '211903109',
                        '200041622',
                        '200041572',
                        '200049187',
                        '200055481',
                        '200049211',
                        '200065597',
                        '247200090',
                        '200067742',
                        '200068815',
                        '200069052',
                        '200069409',
                        '200069961',
                        '200060176',
                        '215905126',
                        '225500016',
                        '219722097',
                        '341096394',
                        '200073237',
                        '200083392',
                        '243400819',
                        '243301223',
                        '248400251',
                        '200065928',
                        '200067205',
                        '200071082',
                        '243600327',
                        '200040715',
                        '200067759',
                        '200066009',
                        '247000011',
                        '200046977',
                        '200069037',
                        '200073419',
                        '200070407',
                        '244100798',
                        '244300307',
                        '200035731',
                        '212202667',
                        '216501296',
                        '216200410',
                        '216200485',
                        '214301350',
                        '210302980',
                        '247100589',
                        '200023737',
                        '216205880',
                        '216500256',
                        '216501387',
                        '211800156',
                        '210303103',
                        '210300950',
                        '217003110',
                        '216502583',
                        '216803346',
                        '211800586',
                        '211801279',
                        '219000528',
                        '216504472',
                        '241500230',
                        '200035814',
                        '246200299',
                        '200071363',
                        '200067254',
                        '200071934',
                        '245400676',
                        '243400017',
                        '217803618',
                        '210401261',
                        '200023307',
                        '200041630',
                        '200069425',
                        '200043081',
                        '200066389',
                        '242500361',
                        '241800374',
                        '200084952',
                        '200067882',
                        '212000046',
                        '200070324',
                        '130010366',
                        '246700488',
                        '248400053',
                        '200070464',
                        '247700107',
                        '247900798',
                        '221800014',
                        '214300808',
                        '211800875',
                        '200068781',
                        '200071512',
                        '241800507',
                        '243500139',
                        '200034825',
                        '200086197',
                        '200093201',
                        '200070043',
                        '243300316',
                        '200072460',
                        '240300491',
                        '200066660',
                        '212000335',
                        '246500573',
                        '200066637',
                        '200042190',
                        '200065886',
                        '219733029',
                        '200066876',
                        '200054807',
                        '200067031',
                        '243301181',
                        '200068799',
                        '200033025',
                        '130009970',
                        '213904139',
                        '243400488',
                        '200066645',
                        '130010747',
                        '200073146',
                        '200072643',
                        '213103906',
                        '213101355',
                        '213104540',
                        '213103245',
                        '200042372'
                    ])
                )
        )
};
