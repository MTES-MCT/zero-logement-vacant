 -- ============================================================
-- REQUÊTES SQL EXPLORATOIRES - VARIABLES TERRITORIALES
-- ============================================================
-- Ces requêtes permettent d'explorer les données avant de créer
-- les notebooks d'analyse complète sur la sortie de vacance
-- ============================================================

-- ============================================================
-- 1. VUE D'ENSEMBLE DES DONNÉES
-- ============================================================

-- 1.1 Métriques globales au niveau communal
SELECT 
    COUNT(*) as total_communes,
    SUM(total_housing_count) as total_logements,
    SUM(housing_out_count) as total_sortis,
    SUM(still_vacant_count) as total_encore_vacants,
    ROUND(AVG(exit_rate_pct), 2) as taux_sortie_moyen,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY exit_rate_pct), 2) as taux_sortie_median,
    ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY exit_rate_pct), 2) as taux_sortie_q25,
    ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY exit_rate_pct), 2) as taux_sortie_q75
FROM dwh.main_marts.marts_analysis_city_aggregated
WHERE total_housing_count > 0;

total_communes	total_logements	total_sortis	total_encore_vacants	taux_sortie_moyen	taux_sortie_median	taux_sortie_q25	taux_sortie_q75
34746	2404864	1117612	1287252	39.18	39.62	29.73	50.0


-- 1.2 Métriques globales au niveau logement
SELECT 
    COUNT(*) as total_logements,
    SUM(is_housing_out) as total_sortis,
    SUM(CASE WHEN is_housing_out = 0 THEN 1 ELSE 0 END) as total_encore_vacants,
    ROUND(SUM(is_housing_out) * 100.0 / COUNT(*), 2) as taux_sortie_global,
    COUNT(DISTINCT geo_code) as nb_communes
FROM dwh.main_marts.marts_analysis_housing_out_features;

total_logements	total_sortis	total_encore_vacants	taux_sortie_global	nb_communes
2531356	1182886	1348470	46.73	34867


-- ============================================================
-- 2. DISTRIBUTION DES VARIABLES TERRITORIALES
-- ============================================================

-- 2.1 Distribution par catégorie de densité (3 niveaux)
SELECT 
    densite_category,
    densite_label,
    COUNT(*) as nb_communes,
    SUM(total_housing_count) as total_logements,
    SUM(housing_out_count) as logements_sortis,
    ROUND(AVG(exit_rate_pct), 2) as taux_sortie_moyen,
    ROUND(AVG(population_2021), 0) as pop_moyenne_2021
FROM dwh.main_marts.marts_analysis_city_aggregated
WHERE densite_category IS NOT NULL
GROUP BY densite_category, densite_label
ORDER BY 
    CASE densite_category
        WHEN 'Dense' THEN 1
        WHEN 'Intermédiaire' THEN 2
        WHEN 'Peu dense' THEN 3
        WHEN 'Très peu dense' THEN 4
        ELSE 5
    END;

densite_category	densite_label	nb_communes	total_logements	logements_sortis	taux_sortie_moyen	pop_moyenne_2021
Urbain intermédiaire	Urbain intermédiaire	3580	722240	357580	45.39	5777.0
Urbain dense	Urbain dense	696	589928	316017	49.23	30885.0
Rural	Rural	30470	1092696	444015	38.22	712.0


-- 2.2 Distribution par densité 7 niveaux
SELECT 
    densite_grid_7,
    densite_label_7,
    COUNT(*) as nb_communes,
    SUM(total_housing_count) as total_logements,
    ROUND(AVG(exit_rate_pct), 2) as taux_sortie_moyen,
    ROUND(AVG(population_2021), 0) as pop_moyenne_2021
FROM dwh.main_marts.marts_analysis_city_aggregated
WHERE densite_grid_7 IS NOT NULL
GROUP BY densite_grid_7, densite_label_7
ORDER BY densite_grid_7;

densite_grid_7	densite_label_7	nb_communes	total_logements	taux_sortie_moyen	pop_moyenne_2021
1	Grands centres urbains	696	589928	49.23	30885.0
2	Centres urbains intermédiaires	637	370344	49.85	15129.0
3	Petites villes	947	183557	44.85	4375.0
4	Ceintures urbaines	1996	168339	44.22	3481.0
5	Bourgs ruraux	5069	435989	42.49	2004.0
6	Rural à habitat dispersé	18231	496910	38.1	544.0
7	Rural à habitat très dispersé	7170	159797	35.49	229.0


-- 2.3 Distribution par composition urbaine
SELECT 
    CASE 
        WHEN pct_pop_urbain_dense >= 50 THEN 'Majoritairement urbain dense'
        WHEN pct_pop_urbain_intermediaire >= 50 THEN 'Majoritairement urbain intermédiaire'
        WHEN pct_pop_rural >= 50 THEN 'Majoritairement rural'
        ELSE 'Mixte'
    END as type_territoire,
    COUNT(*) as nb_communes,
    SUM(total_housing_count) as total_logements,
    ROUND(AVG(exit_rate_pct), 2) as taux_sortie_moyen,
    ROUND(AVG(pct_pop_urbain_dense), 1) as avg_pct_urbain_dense,
    ROUND(AVG(pct_pop_urbain_intermediaire), 1) as avg_pct_urbain_intermediaire,
    ROUND(AVG(pct_pop_rural), 1) as avg_pct_rural
FROM dwh.main_marts.marts_analysis_city_aggregated
WHERE pct_pop_urbain_dense IS NOT NULL
GROUP BY 
    CASE 
        WHEN pct_pop_urbain_dense >= 50 THEN 'Majoritairement urbain dense'
        WHEN pct_pop_urbain_intermediaire >= 50 THEN 'Majoritairement urbain intermédiaire'
        WHEN pct_pop_rural >= 50 THEN 'Majoritairement rural'
        ELSE 'Mixte'
    END;

type_territoire	nb_communes	total_logements	taux_sortie_moyen	avg_pct_urbain_dense	avg_pct_urbain_intermediaire	avg_pct_rural
Majoritairement urbain dense	667	578544	49.33	90.2	8.5	1.3
Majoritairement urbain intermédiaire	3591	730411	45.4	0.7	85.1	14.2
Mixte	12	1453	49.41	39.9	43.6	16.5
Majoritairement rural	30476	1094456	38.22	0.0	0.4	99.6


-- 2.4 Distribution par dynamique démographique
SELECT 
    is_population_declining,
    CASE 
        WHEN is_population_declining THEN 'Population en déclin'
        ELSE 'Population stable/croissante'
    END as dynamique_demo,
    COUNT(*) as nb_communes,
    SUM(total_housing_count) as total_logements,
    ROUND(AVG(exit_rate_pct), 2) as taux_sortie_moyen,
    ROUND(AVG(population_growth_rate_2019_2022), 2) as croissance_moyenne_pct
FROM dwh.main_marts.marts_analysis_city_aggregated
WHERE is_population_declining IS NOT NULL
GROUP BY is_population_declining;

is_population_declining	dynamique_demo	nb_communes	total_logements	taux_sortie_moyen	croissance_moyenne_pct
false	Population stable/croissante	18570	1402308	39.94	4.08
true	Population en déclin	16176	1002556	38.3	-3.57


-- ============================================================
-- 3. VARIABLES ÉCONOMIQUES TERRITORIALES
-- ============================================================

-- 3.1 Distribution par niveau de loyer
SELECT 
    niveau_loyer,
    COUNT(*) as nb_communes,
    SUM(total_housing_count) as total_logements,
    ROUND(AVG(exit_rate_pct), 2) as taux_sortie_moyen,
    ROUND(AVG(loyer_predit_m2), 0) as loyer_moyen_m2,
    ROUND(AVG(loyer_nb_obs_commune), 0) as nb_obs_moyen
FROM dwh.main_marts.marts_analysis_city_aggregated
WHERE niveau_loyer IS NOT NULL
GROUP BY niveau_loyer
ORDER BY 
    CASE niveau_loyer
        WHEN 'Très bas' THEN 1
        WHEN 'Bas' THEN 2
        WHEN 'Moyen' THEN 3
        WHEN 'Élevé' THEN 4
        WHEN 'Très élevé' THEN 5
        ELSE 6
    END;

niveau_loyer	nb_communes	total_logements	taux_sortie_moyen	loyer_moyen_m2	nb_obs_moyen
Moyen	15445	963386	40.27	10.0	136.0
Élevé	3021	487167	43.56	13.0	669.0
Très élevé	1039	330832	45.16	17.0	1239.0
Faible	62	2750	34.34	6.0	7.0
Modéré	15152	609972	36.79	8.0	31.0


-- 3.2 Distribution par dynamisme du marché immobilier (DVG)
SELECT 
    dvg_marche_dynamisme,
    COUNT(*) as nb_communes,
    SUM(total_housing_count) as total_logements,
    ROUND(AVG(exit_rate_pct), 2) as taux_sortie_moyen,
    ROUND(AVG(dvg_avg_annual_transactions), 0) as transactions_moyennes_an,
    ROUND(AVG(dvg_evolution_prix_m2_2019_2023_pct), 2) as evolution_prix_moyenne_pct
FROM dwh.main_marts.marts_analysis_city_aggregated
WHERE dvg_marche_dynamisme IS NOT NULL
GROUP BY dvg_marche_dynamisme
ORDER BY 
    CASE dvg_marche_dynamisme
        WHEN 'Très faible' THEN 1
        WHEN 'Faible' THEN 2
        WHEN 'Moyen' THEN 3
        WHEN 'Élevé' THEN 4
        WHEN 'Très élevé' THEN 5
        ELSE 6
    END;

dvg_marche_dynamisme	nb_communes	total_logements	taux_sortie_moyen	transactions_moyennes_an	evolution_prix_moyenne_pct
Faible	4872	40887	34.92	1.0	44.72
Dynamique	10611	368964	39.32	9.0	26.91
Très dynamique	7470	1616394	44.19	93.0	25.42
Modéré	9943	157616	36.89	3.0	35.02


-- 3.3 Distribution par évolution des prix immobiliers (maisons)
SELECT 
    CASE 
        WHEN evolution_prix_maisons_2019_2023_pct IS NULL THEN 'Données manquantes'
        WHEN evolution_prix_maisons_2019_2023_pct < -10 THEN 'Forte baisse (<-10%)'
        WHEN evolution_prix_maisons_2019_2023_pct < 0 THEN 'Baisse (-10% à 0%)'
        WHEN evolution_prix_maisons_2019_2023_pct < 10 THEN 'Stable (0% à 10%)'
        WHEN evolution_prix_maisons_2019_2023_pct < 30 THEN 'Croissance modérée (10% à 30%)'
        ELSE 'Forte croissance (>30%)'
    END as evolution_prix_cat,
    COUNT(*) as nb_communes,
    SUM(total_housing_count) as total_logements,
    ROUND(AVG(exit_rate_pct), 2) as taux_sortie_moyen,
    ROUND(AVG(evolution_prix_maisons_2019_2023_pct), 2) as evolution_prix_moyenne
FROM dwh.main_marts.marts_analysis_city_aggregated
GROUP BY 
    CASE 
        WHEN evolution_prix_maisons_2019_2023_pct IS NULL THEN 'Données manquantes'
        WHEN evolution_prix_maisons_2019_2023_pct < -10 THEN 'Forte baisse (<-10%)'
        WHEN evolution_prix_maisons_2019_2023_pct < 0 THEN 'Baisse (-10% à 0%)'
        WHEN evolution_prix_maisons_2019_2023_pct < 10 THEN 'Stable (0% à 10%)'
        WHEN evolution_prix_maisons_2019_2023_pct < 30 THEN 'Croissance modérée (10% à 30%)'
        ELSE 'Forte croissance (>30%)'
    END;

evolution_prix_cat	nb_communes	total_logements	taux_sortie_moyen	evolution_prix_moyenne
Données manquantes	26777	756270	37.79	
Forte croissance (>30%)	2785	430275	42.76	47.1
Stable (0% à 10%)	906	160627	43.76	5.95
Croissance modérée (10% à 30%)	3779	987807	44.87	19.95
Forte baisse (<-10%)	189	28472	40.95	-20.72
Baisse (-10% à 0%)	310	41413	43.02	-4.11


-- ============================================================
-- 4. VARIABLES D'ARTIFICIALISATION ET CONSOMMATION D'ESPACE
-- ============================================================

-- 4.1 Distribution par taux d'artificialisation
SELECT 
    CASE 
        WHEN taux_artificialisation_pct IS NULL THEN 'Données manquantes'
        WHEN taux_artificialisation_pct < 5 THEN 'Très faible (<5%)'
        WHEN taux_artificialisation_pct < 10 THEN 'Faible (5-10%)'
        WHEN taux_artificialisation_pct < 20 THEN 'Modéré (10-20%)'
        WHEN taux_artificialisation_pct < 40 THEN 'Élevé (20-40%)'
        ELSE 'Très élevé (>40%)'
    END as artificialisation_cat,
    COUNT(*) as nb_communes,
    SUM(total_housing_count) as total_logements,
    ROUND(AVG(exit_rate_pct), 2) as taux_sortie_moyen,
    ROUND(AVG(taux_artificialisation_pct), 2) as artificialisation_moyenne
FROM dwh.main_marts.marts_analysis_city_aggregated
GROUP BY 
    CASE 
        WHEN taux_artificialisation_pct IS NULL THEN 'Données manquantes'
        WHEN taux_artificialisation_pct < 5 THEN 'Très faible (<5%)'
        WHEN taux_artificialisation_pct < 10 THEN 'Faible (5-10%)'
        WHEN taux_artificialisation_pct < 20 THEN 'Modéré (10-20%)'
        WHEN taux_artificialisation_pct < 40 THEN 'Élevé (20-40%)'
        ELSE 'Très élevé (>40%)'
    END;

artificialisation_cat	nb_communes	total_logements	taux_sortie_moyen	artificialisation_moyenne
Très faible (<5%)	34304	2347910	39.1	0.66
Données manquantes	34	10843	47.07	
Élevé (20-40%)	4	473	54.94	26.66
Faible (5-10%)	367	41878	45.02	6.4
Modéré (10-20%)	37	3760	48.07	12.92


-- ============================================================
-- 5. VARIABLES FISCALES TERRITORIALES
-- ============================================================

-- 5.1 Distribution par pression fiscale
SELECT 
    CASE 
        WHEN pression_fiscale_tfb_teom IS NULL THEN 'Données manquantes'
        WHEN pression_fiscale_tfb_teom < 20 THEN 'Très faible (<20%)'
        WHEN pression_fiscale_tfb_teom < 25 THEN 'Faible (20-25%)'
        WHEN pression_fiscale_tfb_teom < 30 THEN 'Modérée (25-30%)'
        WHEN pression_fiscale_tfb_teom < 35 THEN 'Élevée (30-35%)'
        ELSE 'Très élevée (>35%)'
    END as pression_fiscale_cat,
    COUNT(*) as nb_communes,
    SUM(total_housing_count) as total_logements,
    ROUND(AVG(exit_rate_pct), 2) as taux_sortie_moyen,
    ROUND(AVG(pression_fiscale_tfb_teom), 2) as pression_fiscale_moyenne
FROM dwh.main_marts.marts_analysis_city_aggregated
GROUP BY 
    CASE 
        WHEN pression_fiscale_tfb_teom IS NULL THEN 'Données manquantes'
        WHEN pression_fiscale_tfb_teom < 20 THEN 'Très faible (<20%)'
        WHEN pression_fiscale_tfb_teom < 25 THEN 'Faible (20-25%)'
        WHEN pression_fiscale_tfb_teom < 30 THEN 'Modérée (25-30%)'
        WHEN pression_fiscale_tfb_teom < 35 THEN 'Élevée (30-35%)'
        ELSE 'Très élevée (>35%)'
    END;

pression_fiscale_cat	nb_communes	total_logements	taux_sortie_moyen	pression_fiscale_moyenne
Données manquantes	7	209	0.0	
Modérée (25-30%)	1210	47037	39.29	27.97
Très faible (<20%)	12	6654	53.11	18.3
Très élevée (>35%)	30980	2250050	39.2	51.66
Élevée (30-35%)	2349	96620	38.7	32.75
Faible (20-25%)	188	4294	40.81	23.66


-- 5.2 Distribution par régime fiscal EPCI
SELECT 
    epci_regime_fiscal,
    COUNT(*) as nb_communes,
    SUM(total_housing_count) as total_logements,
    ROUND(AVG(exit_rate_pct), 2) as taux_sortie_moyen
FROM dwh.main_marts.marts_analysis_city_aggregated
WHERE epci_regime_fiscal IS NOT NULL
GROUP BY epci_regime_fiscal
ORDER BY COUNT(*) DESC;

epci_regime_fiscal	nb_communes	total_logements	taux_sortie_moyen
FPU	30295	2253504	39.3
FPZ	2970	86874	37.75
FPA	1471	64010	39.66


-- ============================================================
-- 6. TERritoires SPÉCIAUX ET POLITIQUES PUBLIQUES
-- ============================================================

-- 6.1 Distribution par présence dans territoires spéciaux (au niveau logement)
SELECT 
    is_in_tlv1_territory,
    is_in_tlv2_territory,
    action_coeur_de_ville,
    petite_ville_de_demain,
    village_davenir,
    COUNT(*) as nb_logements,
    ROUND(SUM(is_housing_out) * 100.0 / COUNT(*), 2) as taux_sortie
FROM dwh.main_marts.marts_analysis_housing_out_features
GROUP BY 
    is_in_tlv1_territory,
    is_in_tlv2_territory,
    action_coeur_de_ville,
    petite_ville_de_demain,
    village_davenir;

is_in_tlv1_territory	is_in_tlv2_territory	action_coeur_de_ville	petite_ville_de_demain	village_davenir	nb_logements	taux_sortie
					258	6.59
true		false	false	true	1167	45.07
true		true	false	false	68648	51.71
	true	true	false	false	8704	50.67
		false	true	true	298	33.22
		false	true	false	340703	46.36
true		false	false	false	567610	50.54
	true	false	true	false	38161	46.23
true		false	true	false	17899	45.25
		false	false	false	926446	42.91
	true	false	false	true	18370	43.34
		false	false	true	112199	39.41
	true	false	false	false	120935	44.61
		true	false	false	309958	54.23


-- 6.2 Distribution par OPAH
SELECT 
    opah,
    type_opah,
    COUNT(*) as nb_logements,
    ROUND(SUM(is_housing_out) * 100.0 / COUNT(*), 2) as taux_sortie
FROM dwh.main_marts.marts_analysis_housing_out_features
WHERE opah IS NOT NULL
GROUP BY opah, type_opah;

opah	type_opah	nb_logements	taux_sortie
2	OPAH-RU	33439	51.49
1	OPAH-CB	13269	42.64
2	OPAH-RR,OPAH	5347	38.6
8	OPAH-RR	233	51.93
20	OPAH	813	54.61
2	OPAH-CB,OPAH	1765	37.62
9	OPAH-RU	460	37.61
8	OPAH,OPAH-RU	440	47.73
15	OPAH	1145	45.07
4	OPAH-D,OPAH-RU	72	34.72
8	OPAH	2260	35.66
3	OPAH,OPAH-D	424	39.62
6	OPAH-D,OPAH	5643	59.53
34	OPAH,OPAH-RR	216	44.91
1	OPAH-RU	76849	50.38
2	OPAH-CB	1199	44.29
14	OPAH-RR,OPAH	595	42.02
6	OPAH	3463	42.62
3	OPAH,OPAH-RU	13492	48.55
5	OPAH-CB	1276	40.36
3	OPAH-RR	2213	42.34
4	OPAH,OPAH-CB	118	37.29
2	OPAH-CB,OPAH-RU	260	53.08
4	OPAH-D	7635	55.44
3	OPAH-RU	852	45.19
1	OPAH-RR	45310	39.31
12	OPAH-RR,OPAH	447	44.07
3	OPAH-CB,OPAH	713	45.58
3	OPAH-RR,OPAH	726	30.99
8	OPAH-CB	346	46.82
3	OPAH	16696	48.83
2	OPAH-RU,OPAH-D	1512	56.61
3	OPAH-RU,OPAH	2349	48.49
6	OPAH,OPAH-RU	18	27.78
2	OPAH-D,OPAH	103	48.54
2	OPAH-D,OPAH-RU	369	41.73
10	OPAH	2686	44.15
3	OPAH,OPAH-RR	611	37.81
3	OPAH,OPAH-CB	424	43.4
3	OPAH-CB,OPAH-RU,OPAH	469	42.86
4	OPAH,OPAH-RU	297	51.18
4	OPAH-RR	1711	37.87
16	OPAH-RR	253	37.15
0		1156991	46.94
1	OPAH	278510	43.83
2	OPAH,OPAH-D	731	54.17
18	OPAH,OPAH-RR	161	29.81
14	OPAH	1469	38.05
6	OPAH-RR,OPAH	364	43.13
21	OPAH	355	38.59
4	OPAH,OPAH-RR	395	40.25
6	OPAH-RU	1238	47.01
2	OPAH	178182	45.18
5	OPAH	10301	52.74
9	OPAH	2541	47.97
2	OPAH-RU,OPAH	2367	42.08
6	OPAH-CB	318	29.56
3	OPAH-RU,OPAH-D	2074	55.88
4	OPAH-RU,OPAH-CB	519	51.25
6	OPAH-RU,OPAH-RR	597	41.71
2	OPAH-D	85895	52.46
4	OPAH-CB	682	41.5
2	OPAH,OPAH-CB	1202	39.43
15	OPAH,OPAH-RU	2513	60.8
22	OPAH,OPAH-CB	327	47.71
4	OPAH-CB,OPAH-RU	23	26.09
7	OPAH-RU	2366	45.44
2	OPAH-RU,OPAH-RR	2918	50.69
4	OPAH	25424	51.72
2	OPAH-RU,OPAH-CB	935	51.66
4	OPAH-RU,OPAH	2799	50.16
8	OPAH-D,OPAH-RU	7284	56.63
2	OPAH-RR,OPAH-RU	607	50.41
2	OPAH,OPAH-RR	6233	40.53
11	OPAH	639	45.23
3	OPAH-D,OPAH	1352	54.29
2	OPAH-RR	20881	38.91
2	OPAH,OPAH-RU	9530	58.24
8	OPAH-RR,OPAH	186	38.17
6	OPAH-RU,OPAH-D	5523	60.4
9	OPAH,OPAH-RU	224	41.07
5	OPAH-RR	139	58.99
9	OPAH-RR	250	31.2
3	OPAH-CB	1214	44.73
4	OPAH-RU	13693	57.89
1	OPAH-D	57664	48.08
6	OPAH-RR,OPAH-RU	396	41.67
4	OPAH-RR,OPAH	493	37.73
6	OPAH,OPAH-RR	450	33.33
7	OPAH	3787	42.04


-- ============================================================
-- 7. CORRÉLATIONS ENTRE VARIABLES TERRITORIALES ET TAUX DE SORTIE
-- ============================================================

-- 7.1 Taux de sortie par densité et dynamique démographique (croisement)
SELECT 
    densite_category,
    is_population_declining,
    COUNT(*) as nb_communes,
    SUM(total_housing_count) as total_logements,
    ROUND(AVG(exit_rate_pct), 2) as taux_sortie_moyen
FROM dwh.main_marts.marts_analysis_city_aggregated
WHERE densite_category IS NOT NULL 
    AND is_population_declining IS NOT NULL
GROUP BY densite_category, is_population_declining
ORDER BY densite_category, is_population_declining;

densite_category	is_population_declining	nb_communes	total_logements	taux_sortie_moyen
Rural	false	15820	555459	38.86
Rural	true	14650	537237	37.52
Urbain dense	false	468	411568	49.31
Urbain dense	true	228	178360	49.08
Urbain intermédiaire	false	2282	435281	45.48
Urbain intermédiaire	true	1298	286959	45.23


-- 7.2 Taux de sortie par densité et niveau de loyer (croisement)
SELECT 
    densite_category,
    niveau_loyer,
    COUNT(*) as nb_communes,
    SUM(total_housing_count) as total_logements,
    ROUND(AVG(exit_rate_pct), 2) as taux_sortie_moyen
FROM dwh.main_marts.marts_analysis_city_aggregated
WHERE densite_category IS NOT NULL 
    AND niveau_loyer IS NOT NULL
GROUP BY densite_category, niveau_loyer
ORDER BY densite_category, niveau_loyer;

densite_category	niveau_loyer	nb_communes	total_logements	taux_sortie_moyen
Rural	Faible	62	2750	34.34
Rural	Modéré	14856	524004	36.65
Rural	Moyen	13491	457327	39.45
Rural	Très élevé	289	20474	41.34
Rural	Élevé	1758	85919	41.77
Urbain dense	Modéré	2	3597	56.16
Urbain dense	Moyen	135	147818	50.5
Urbain dense	Très élevé	342	222333	47.41
Urbain dense	Élevé	216	214005	51.22
Urbain intermédiaire	Modéré	294	82371	43.8
Urbain intermédiaire	Moyen	1819	358241	45.6
Urbain intermédiaire	Très élevé	408	88025	45.98
Urbain intermédiaire	Élevé	1047	187243	45.0


-- 7.3 Taux de sortie par densité et dynamisme marché (croisement)
SELECT 
    densite_category,
    dvg_marche_dynamisme,
    COUNT(*) as nb_communes,
    SUM(total_housing_count) as total_logements,
    ROUND(AVG(exit_rate_pct), 2) as taux_sortie_moyen
FROM dwh.main_marts.marts_analysis_city_aggregated
WHERE densite_category IS NOT NULL 
    AND dvg_marche_dynamisme IS NOT NULL
GROUP BY densite_category, dvg_marche_dynamisme
ORDER BY densite_category, dvg_marche_dynamisme;

densite_category	dvg_marche_dynamisme	nb_communes	total_logements	taux_sortie_moyen
Rural	Dynamique	10008	354105	39.14
Rural	Faible	4870	40754	34.91
Rural	Modéré	9887	156843	36.87
Rural	Très dynamique	4299	488182	42.27
Urbain dense	Dynamique	4	109	52.11
Urbain dense	Très dynamique	658	530492	49.05
Urbain intermédiaire	Dynamique	599	14750	42.26
Urbain intermédiaire	Faible	2	133	46.1
Urbain intermédiaire	Modéré	56	773	40.46
Urbain intermédiaire	Très dynamique	2513	597720	46.2


-- ============================================================
-- 8. COMPLÉTUDE DES DONNÉES TERRITORIALES
-- ============================================================

-- 8.1 Taux de complétude par variable territoriale (niveau communal)
SELECT 
    'densite_category' as variable,
    COUNT(*) as total_communes,
    COUNT(densite_category) as communes_avec_donnees,
    ROUND(COUNT(densite_category) * 100.0 / COUNT(*), 2) as taux_completude
FROM dwh.main_marts.marts_analysis_city_aggregated
UNION ALL
SELECT 
    'population_2021' as variable,
    COUNT(*) as total_communes,
    COUNT(population_2021) as communes_avec_donnees,
    ROUND(COUNT(population_2021) * 100.0 / COUNT(*), 2) as taux_completude
FROM dwh.main_marts.marts_analysis_city_aggregated
UNION ALL
SELECT 
    'loyer_predit_m2' as variable,
    COUNT(*) as total_communes,
    COUNT(loyer_predit_m2) as communes_avec_donnees,
    ROUND(COUNT(loyer_predit_m2) * 100.0 / COUNT(*), 2) as taux_completude
FROM dwh.main_marts.marts_analysis_city_aggregated
UNION ALL
SELECT 
    'dvg_marche_dynamisme' as variable,
    COUNT(*) as total_communes,
    COUNT(dvg_marche_dynamisme) as communes_avec_donnees,
    ROUND(COUNT(dvg_marche_dynamisme) * 100.0 / COUNT(*), 2) as taux_completude
FROM dwh.main_marts.marts_analysis_city_aggregated
UNION ALL
SELECT 
    'taux_artificialisation_pct' as variable,
    COUNT(*) as total_communes,
    COUNT(taux_artificialisation_pct) as communes_avec_donnees,
    ROUND(COUNT(taux_artificialisation_pct) * 100.0 / COUNT(*), 2) as taux_completude
FROM dwh.main_marts.marts_analysis_city_aggregated
UNION ALL
SELECT 
    'pression_fiscale_tfb_teom' as variable,
    COUNT(*) as total_communes,
    COUNT(pression_fiscale_tfb_teom) as communes_avec_donnees,
    ROUND(COUNT(pression_fiscale_tfb_teom) * 100.0 / COUNT(*), 2) as taux_completude
FROM dwh.main_marts.marts_analysis_city_aggregated;

variable	total_communes	communes_avec_donnees	taux_completude
densite_category	34746	34746	100.0
population_2021	34746	34719	99.92
loyer_predit_m2	34746	34719	99.92
dvg_marche_dynamisme	34746	32896	94.68
taux_artificialisation_pct	34746	34712	99.9
pression_fiscale_tfb_teom	34746	34739	99.98


-- ============================================================
-- 9. ANALYSE AU NIVEAU LOGEMENT - VARIABLES TERRITORIALES
-- ============================================================

-- 9.1 Taux de sortie par densité (niveau logement)
SELECT 
    densite_category,
    COUNT(*) as nb_logements,
    SUM(is_housing_out) as logements_sortis,
    ROUND(SUM(is_housing_out) * 100.0 / COUNT(*), 2) as taux_sortie
FROM dwh.main_marts.marts_analysis_housing_out_features
WHERE densite_category IS NOT NULL
GROUP BY densite_category
ORDER BY 
    CASE densite_category
        WHEN 'Dense' THEN 1
        WHEN 'Intermédiaire' THEN 2
        WHEN 'Peu dense' THEN 3
        WHEN 'Très peu dense' THEN 4
        ELSE 5
    END;

densite_category	nb_logements	logements_sortis	taux_sortie
Rural	1092696	444015	40.63
Urbain intermédiaire	722240	357580	49.51
Urbain dense	589928	316017	53.57


-- 9.2 Taux de sortie par dynamique démographique (niveau logement)
SELECT 
    is_population_declining,
    COUNT(*) as nb_logements,
    SUM(is_housing_out) as logements_sortis,
    ROUND(SUM(is_housing_out) * 100.0 / COUNT(*), 2) as taux_sortie
FROM dwh.main_marts.marts_analysis_housing_out_features
WHERE is_population_declining IS NOT NULL
GROUP BY is_population_declining;

is_population_declining	nb_logements	logements_sortis	taux_sortie
false	1402308	668235	47.65
true	1002556	449377	44.82


-- 9.3 Taux de sortie par niveau de loyer (niveau logement)
SELECT 
    niveau_loyer,
    COUNT(*) as nb_logements,
    SUM(is_housing_out) as logements_sortis,
    ROUND(SUM(is_housing_out) * 100.0 / COUNT(*), 2) as taux_sortie
FROM dwh.main_marts.marts_analysis_housing_out_features
WHERE niveau_loyer IS NOT NULL
GROUP BY niveau_loyer
ORDER BY 
    CASE niveau_loyer
        WHEN 'Très bas' THEN 1
        WHEN 'Bas' THEN 2
        WHEN 'Moyen' THEN 3
        WHEN 'Élevé' THEN 4
        WHEN 'Très élevé' THEN 5
        ELSE 6
    END;

niveau_loyer	nb_logements	logements_sortis	taux_sortie
Moyen	963386	456077	47.34
Élevé	487167	249094	51.13
Très élevé	330832	159583	48.24
Faible	2750	998	36.29
Modéré	609972	244304	40.05


-- 9.4 Taux de sortie par densité ET type de logement (croisement)
SELECT 
    densite_category,
    housing_kind,
    COUNT(*) as nb_logements,
    SUM(is_housing_out) as logements_sortis,
    ROUND(SUM(is_housing_out) * 100.0 / COUNT(*), 2) as taux_sortie
FROM dwh.main_marts.marts_analysis_housing_out_features
WHERE densite_category IS NOT NULL 
    AND housing_kind IS NOT NULL
GROUP BY densite_category, housing_kind
ORDER BY densite_category, housing_kind;

densite_category	housing_kind	nb_logements	logements_sortis	taux_sortie
Rural	APPART	281292	134303	47.75
Rural	MAISON	811404	309712	38.17
Urbain dense	APPART	488378	271454	55.58
Urbain dense	MAISON	101550	44563	43.88
Urbain intermédiaire	APPART	429034	230433	53.71
Urbain intermédiaire	MAISON	293206	127147	43.36


-- ============================================================
-- 10. EXTREMES ET CAS REMARQUABLES
-- ============================================================

-- 10.1 Communes avec taux de sortie très élevé (>80%)
SELECT 
    geo_code,
    commune_name,
    total_housing_count,
    housing_out_count,
    exit_rate_pct,
    densite_category,
    population_2021,
    niveau_loyer,
    dvg_marche_dynamisme
FROM dwh.main_marts.marts_analysis_city_aggregated
WHERE exit_rate_pct >= 80
    AND total_housing_count >= 50  -- Minimum pour avoir de la significativité
ORDER BY exit_rate_pct DESC
LIMIT 50;

geo_code	commune_name	total_housing_count	housing_out_count	exit_rate_pct	densite_category	population_2021	niveau_loyer	dvg_marche_dynamisme
97605	Chiconi	678	627	92.48	Urbain intermédiaire			
67104	Drachenbronn-Birlenbach	140	127	90.71	Rural	591	Moyen	
77268	Magny-le-Hongre	656	587	89.48	Urbain intermédiaire	9064	Très élevé	Très dynamique
97602	Bandraboua	532	468	87.97	Rural			
16139	Fleurac	54	47	87.04	Rural	240	Moyen	Modéré
01369	Saint-Just	71	61	85.92	Urbain intermédiaire	954	Moyen	Dynamique
33097	Carcans	459	390	84.97	Rural	2418	Moyen	Très dynamique
71520	Sevrey	60	50	83.33	Rural	1235	Moyen	Dynamique
11015	Arques	75	62	82.67	Rural	259	Modéré	Dynamique
79003	Aiffres	128	103	80.47	Urbain intermédiaire	5377	Moyen	Très dynamique
05119	Risoul	200	160	80.0	Rural	660	Moyen	Très dynamique


-- 10.2 Communes avec taux de sortie très faible (<20%)
SELECT 
    geo_code,
    commune_name,
    total_housing_count,
    housing_out_count,
    exit_rate_pct,
    densite_category,
    population_2021,
    niveau_loyer,
    dvg_marche_dynamisme
FROM dwh.main_marts.marts_analysis_city_aggregated
WHERE exit_rate_pct <= 20
    AND total_housing_count >= 50
ORDER BY exit_rate_pct ASC
LIMIT 50;

geo_code	commune_name	total_housing_count	housing_out_count	exit_rate_pct	densite_category	population_2021	niveau_loyer	dvg_marche_dynamisme
97129	Sainte-Rose	155	0	0.0	Urbain intermédiaire	17630	Élevé	
97128	Sainte-Anne	185	0	0.0	Urbain intermédiaire	24281	Élevé	
12218	Conques-en-Rouergue	119	0	0.0	Rural			
97132	Trois-Rivières	104	0	0.0	Urbain intermédiaire	7625	Élevé	
97134	Vieux-Habitants	87	1	1.15	Urbain intermédiaire	7014	Élevé	
06079	Mandelieu-la-Napoule	217	8	3.69	Urbain dense	21561	Très élevé	Très dynamique
39436	Pont-d'Héry	66	4	6.06	Rural	239	Moyen	Modéré
91599	Soisy-sur-École	334	21	6.29	Rural	1207	Très élevé	Très dynamique
12203	Roquefort-sur-Soulzon	275	18	6.55	Rural	528	Modéré	Dynamique
85017	Beaurepaire	65	5	7.69	Rural	2426	Modéré	Très dynamique
70202	Demangevelle	102	8	7.84	Rural	266	Modéré	Modéré
58270	Saint-Vérain	50	5	10.0	Rural	361	Modéré	Dynamique
43142	Montregard	63	7	11.11	Rural	597	Modéré	Dynamique
51457	Cœur-de-la-Vallée	52	6	11.54	Rural	648	Moyen	Modéré
68014	Aubure	59	7	11.86	Rural	360	Moyen	
03158	Haut-Bocage	75	9	12.0	Rural	855	Modéré	Dynamique
01294	Peyrieu	56	7	12.5	Rural	908	Moyen	Dynamique
38289	Oz	150	19	12.67	Rural	213	Élevé	Très dynamique
58036	Bouhy	62	8	12.9	Rural	445	Modéré	Dynamique
06085	Mougins	212	30	14.15	Urbain intermédiaire	19677	Très élevé	Très dynamique
19248	Les Trois-Saints	94	14	14.89	Rural	698	Modéré	Dynamique
36107	Lye	66	10	15.15	Rural	741	Modéré	Dynamique
29272	Saint-Yvi	66	10	15.15	Rural	3339	Élevé	Très dynamique
68237	Niedermorschwihr	52	8	15.38	Rural	560	Élevé	
12129	Lestrade-et-Thouels	52	8	15.38	Rural	444	Modéré	Modéré
51472	Saint-Amand-sur-Fion	51	8	15.69	Rural	1023	Modéré	Dynamique
23246	Saint-Sulpice-les-Champs	56	9	16.07	Rural	345	Modéré	Modéré
66005	Angoustrine-Villeneuve-des-Escaldes	116	19	16.38	Rural	554	Moyen	Dynamique
74018	Arenthon	54	9	16.67	Rural	1915	Très élevé	Très dynamique
61097	La Chapelle-Montligeon	60	10	16.67	Rural	513	Modéré	Dynamique
43052	Champagnac-le-Vieux	58	10	17.24	Rural	186	Modéré	Dynamique
12266	Ségur	81	14	17.28	Rural	546	Modéré	Modéré
73176	Montvalezan	81	14	17.28	Rural	722	Élevé	Très dynamique
80802	Villers-Faucon	52	9	17.31	Rural	553	Moyen	Dynamique
25149	Chenecey-Buillon	52	9	17.31	Rural	502	Moyen	Modéré
51193	Courtisols	52	9	17.31	Rural	2353	Moyen	Très dynamique
69014	Aveize	74	13	17.57	Rural	1115	Modéré	Dynamique
12079	Coubisou	62	11	17.74	Rural	489	Modéré	Dynamique
23235	Saint-Priest-la-Feuille	56	10	17.86	Rural	739	Modéré	Dynamique
50294	Martinvast	50	9	18.0	Rural	1331	Moyen	Dynamique
23081	Flayat	61	11	18.03	Rural	300	Modéré	Modéré
18259	Sury-ès-Bois	55	10	18.18	Rural	290	Modéré	Modéré
23073	Dontreix	70	13	18.57	Rural	412	Modéré	Dynamique
71155	Cronat	75	14	18.67	Rural	513	Modéré	Dynamique
74160	Manigod	64	12	18.75	Rural	1003	Élevé	Très dynamique
37001	Abilly	64	12	18.75	Rural	1133	Modéré	Dynamique
87149	Saint-Hilaire-la-Treille	64	12	18.75	Rural	362	Modéré	Dynamique
31035	Auzeville-Tolosane	122	23	18.85	Urbain intermédiaire	4234	Élevé	Très dynamique
58228	Saint-Andelain	58	11	18.97	Rural	601	Modéré	Dynamique
06029	Cannes	1891	359	18.98	Urbain dense	73255	Très élevé	Très dynamique















