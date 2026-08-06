---
statut: accepté
date: 2026-08-05
décideurs: Raphaël Courivaud
---

# « Millésime inclus » désigne une provenance d'import, pas une présence dans le fichier LOVAC

## Contexte et problématique

Un signalement rapporte une incohérence entre deux chiffres censés mesurer « les
logements vacants » d'un territoire :

- **Analyses** expose `count_vacant_housing_private_fil_public`, issu de
  `marts_common_morphology`, calculé directement sur les fichiers LOVAC bruts ;
- **Parc de logements** compte les logements de l'application filtrés sur
  « Millésimes inclus », c'est-à-dire sur la colonne `housing.data_file_years`.

Écarts constatés sur la Région Grand Est (établissement
`c281e953-0024-4d1d-9b20-853bd6ceb74a`) : −22,6 % en 2019, −17,3 % en 2020,
−12,1 % en 2021, quasi nuls de 2022 à 2024, **+7,6 % en 2025**, nul en 2026.

L'investigation a reproduit les deux côtés sur l'entrepôt, d'abord sur la Région
Grand Est puis sur l'ensemble du territoire, et montre que le signalement agrège
**trois causes indépendantes**, dont une seule est un bug au sens attendu.

| Cause                                               | Millésimes        | Ampleur nationale                    |
| --------------------------------------------------- | ----------------- | ------------------------------------ |
| 1. Seuil du critère public régressé                 | 2025              | **+109 689 (+8,8 %)**                |
| 2. Sémantique de `data_file_years`                  | 2019-2021 surtout | −597 160 absents, −95 689 non tagués |
| 3. Comptage à la maille du local et non du logement | 2019-2025         | +0,04 % à +0,25 %                    |

Une quatrième cause avait été soupçonnée — des logements vacants présents en base
mais non tagués, indépendamment de la cause 2 — puis écartée par la
vérification nationale (voir ci-dessous).

Le filtre lui-même (`server/src/repositories/housingRepository.ts`,
`data_file_years && $years`) est exact : il reproduit à l'unité les huit chiffres
du signalement.

### Cause 1 — régression du seuil

`marts_common_morphology.sql` définit le chiffre public par :

```sql
CASE WHEN year > 2025 THEN count_vacant_housing_private_fil
     ELSE count_vacant_housing_private_fil_ccthp END
```

`git log -L` sur cette ligne montre qu'elle valait `year > 2024` lors de son
introduction (commit `5321f998f`, « update lovac and ff 2025 ») et a été portée à
`year > 2025` par le commit `c8991b586` (« create a new pipeline pour zlovac
generation », 22 fichiers) sans intention documentée. Les données confirment que
`year > 2024` était juste : pour 2025, le parc importé (128 547) suit
`count_vacant_housing_private_fil` (128 675) et non
`count_vacant_housing_private_fil_ccthp` (119 426). Le millésime 2025 a donc
abandonné le croisement CCTHP à l'import, mais le mart continuait de le
supposer. Régression restée en production environ quatre mois, sans test pour la
détecter.

La vérification nationale sur le mart déployé confirme le diagnostic et en donne
l'ampleur réelle :

| Millésime | Vacance FIL   | Vacance FIL+CCTHP | Chiffre public déployé | Parc ZLV importé |
| --------- | ------------- | ----------------- | ---------------------- | ---------------- |
| 2019      | 1 362 661     | 1 122 921         | 1 122 921              | 823 329          |
| 2020      | 1 420 296     | 1 114 492         | 1 114 492              | 886 147          |
| 2021      | 1 341 820     | 1 167 654         | 1 167 654              | 997 836          |
| 2022      | 1 303 733     | 1 139 834         | 1 139 834              | 1 137 053        |
| 2023      | 1 286 731     | 1 130 129         | 1 130 129              | 1 112 691        |
| 2024      | 1 324 987     | 1 154 533         | 1 154 533              | 1 150 543        |
| 2025      | **1 349 505** | 1 239 816         | **1 239 816**          | **1 348 382**    |
| 2026      | 1 179 845     | 1 148 767         | 1 179 845              | 1 179 845        |

2026 est le seul millésime où le chiffre public diffère de la vacance FIL+CCTHP :
le seuil est donc décalé d'exactement une année. Pour 2025, le parc importé
(1 348 382) suit la vacance FIL (1 349 505) à 0,08 % près, alors que le chiffre
publié en est éloigné de **109 689 logements, soit +8,8 %**.

### Cause 2 — sémantique de `data_file_years`

`data_file_years` est un tableau cumulatif alimenté uniquement par l'import de
l'année concernée, sur une ligne unique par identifiant local. Aucune reprise
historique n'existe : un logement entré dans l'application en 2023 ne se voit
jamais attribuer `lovac-2019`, même s'il figurait dans ce fichier.

Décomposition des 110 301 logements du Stock LOVAC 2019 de la Région Grand Est :

- 85 445 présents dans l'application **et** tagués `lovac-2019` ;
- **21 648 absents de l'application** (87 % de l'écart) ;
- **3 208 présents mais non tagués 2019** (13 % de l'écart).

Aucune dérive de `geo_code` entre LOVAC et la production n'intervient : zéro
logement tagué `lovac-2019` ne sort du périmètre Grand Est côté application.

La même décomposition à l'échelle nationale, par millésime, sur le Stock LOVAC
dédoublonné :

| Millésime | Stock LOVAC | Absents | Non tagués | dont vacants | Tagués    |
| --------- | ----------- | ------- | ---------- | ------------ | --------- |
| 2019      | 1 121 374   | 263 232 | 34 723     | 27 282       | 823 329   |
| 2020      | 1 112 854   | 198 710 | 27 941     | 21 865       | 886 147   |
| 2021      | 1 166 256   | 135 218 | 33 025     | 21 880       | 997 836   |
| 2022      | 1 138 464   | 943     | 382        | 136          | 1 137 053 |
| 2023      | 1 128 680   | 4 305   | 11 520     | 6 812        | 1 112 691 |
| 2024      | 1 152 192   | 526     | 847        | 413          | 1 150 543 |
| 2025      | 1 348 679   | 93      | 179        | 59           | 1 348 382 |
| 2026      | 1 179 845   | **0**   | **0**      | 0            | 1 179 845 |

Deux enseignements. D'une part le déficit est massif et concentré sur 2019-2021
(597 160 absents à eux trois), puis résiduel ensuite : ZLV ne couvrait alors pas
le territoire dans les mêmes conditions, et aucune reprise n'a eu lieu depuis.
D'autre part **2026 est exact** — aucun absent, aucun non tagué, aucun doublon.
La chaîne d'ingestion est donc saine sur le dernier millésime ; c'est le mart qui
n'a pas suivi.

### Cause écartée — un résidu de non tagués indépendant

Le millésime 2023 se détache avec 11 520 non tagués (1,02 %), soit un ordre de
grandeur au-dessus de 2022 et 2024. L'hypothèse d'un défaut d'import distinct de
la cause 2 a donc été testée sur cette population, puis écartée :

- **10 115 (88 %) portent `lovac-2024` mais pas `lovac-2023`** : ces logements
  sont entrés dans l'application lors de l'import 2024. Ils n'ont jamais été
  éligibles à un tag 2023 — la provenance est correcte, c'est la cause 2 ;
- 712 portent 2022 sans 2024, 755 ne portent ni l'un ni l'autre ;
- **62 portent à la fois 2022 et 2024 mais pas 2023** : présents avant et après,
  figurant dans le fichier 2023, non tagués. C'est la seule population réellement
  anormale, et elle est négligeable à l'échelle nationale.

L'hypothèse d'une exclusion des logements sans propriétaire est également
écartée : seuls 690 des 11 520 (6 %) n'ont aucun propriétaire rattaché, et ils se
répartissent sur 6 288 communes — diffus, donc ni règle systématique ni lot
d'import en échec.

### Cause 3 — maille du comptage

Les métriques `count_vacant_housing*` sont des `SUM(CASE …)` sur les lignes des
fichiers, alors que la production porte une ligne par identifiant local. Or les
identifiants locaux sont dupliqués dans tous les millésimes sauf 2026 :

| Millésime | Lignes     | Identifiants distincts | Taux de doublon |
| --------- | ---------- | ---------------------- | --------------- |
| 2019      | 7 835 698  | 7 816 210              | 0,25 %          |
| 2020      | 8 030 465  | 8 010 468              | 0,25 %          |
| 2021      | 8 216 462  | 8 202 258              | 0,17 %          |
| 2022      | 10 225 516 | 10 211 769             | 0,13 %          |
| 2023      | 10 794 422 | 10 780 341             | 0,13 %          |
| 2024      | 12 047 294 | 12 030 509             | 0,14 %          |
| 2025      | 7 124 015  | 7 121 120              | 0,04 %          |
| 2026      | 8 600 273  | 8 600 273              | 0,00 %          |

Ces métriques comptent donc des locaux en se nommant logements. Le choix de la
ligne conservée n'est pas cosmétique : sur les 8 917 groupes de doublons de 2024,
`living_area`, `plot_area`, `ff_ccthp` et `housing_kind` ne divergent jamais,
mais **`vacancy_start_year` diverge dans 5 466 groupes (61 %)** — c'est-à-dire
sur le champ qui détermine la qualification en vacance FIL.

## Critères de décision

- Ne pas présenter comme comparables deux chiffres qui mesurent des populations
  différentes
- Corriger la régression 2025 sans dégrader la confiance des collectivités dans
  des chiffres publiés
- Refermer la classe de régression, pas seulement l'occurrence
- Ne pas modifier le périmètre du parc suivi par les collectivités à l'occasion
  d'une correction de mesure
- Séparer une correction de maille d'un changement de règle métier

## Options envisagées

- **A. Provenance d'import** — conserver la sémantique actuelle et rendre les deux
  populations non confondables
- **B. Présence réelle dans le millésime** — redéfinir « Millésime inclus » et
  reprendre l'historique en base de production
- **C. Deux notions distinctes exposées** — conserver la provenance et ajouter une
  notion séparée de présence

## Décision

Option retenue : **A. Provenance d'import**.

« Millésime inclus » signifie « ZLV a importé ce logement depuis le fichier LOVAC
de cette année-là ». C'est une propriété de traçabilité du **Parc ZLV importé**,
structurellement un sous-ensemble du **Stock LOVAC** (voir [CONTEXT.md](../../CONTEXT.md)).
Le filtre est donc fidèle à la colonne, et la colonne est fidèle au domaine.

L'option B a été écartée parce qu'elle aurait imposé de choisir entre laisser la
reprise incomplète — taguer les 95 689 logements déjà en base sans rien faire des
597 160 absents de 2019-2021 — et importer plus d'un demi-million de logements
vacants il y a six ans qui ne le sont plus, c'est-à-dire modifier le périmètre de
travail des collectivités pour résoudre un problème de présentation. L'option C a
été écartée pour son coût, la provenance restant la seule notion dont
l'application a besoin.

En conséquence :

1. **Le critère public devient une donnée déclarée.** Le seuil en dur est
   remplacé par une table de correspondance millésime → critère (2019-2024 =
   vacance FIL+CCTHP, 2025 et suivants = vacance FIL), accompagnée d'un test dbt
   vérifiant par millésime que le chiffre public suit bien la branche déclarée.
2. **Aucun ticket d'import n'est ouvert.** La quantification nationale a montré
   que le résidu de non tagués relève de la cause 2 (88 % des cas de 2023 sont des
   logements entrés en base au millésime suivant) et que 62 cas nationaux
   seulement restent inexpliqués. Ce constat est acquis, il n'y a plus rien à
   investiguer.
3. **Un comptage du parc importé par millésime est ajouté** à
   `marts_common_morphology`, en généralisant
   `count_housing_last_lovac_production` aujourd'hui figé sur `lovac-2026`.
   Chaque ligne de millésime porte alors les deux populations, et tout écart
   futur s'explique de lui-même dans la donnée.
4. **Les métriques `count_vacant_housing*` passent à la maille du logement** (un
   identifiant local), `count_vacant_premisses` restant un comptage de locaux.
5. **La ligne conservée par identifiant local est celle de plus petite
   `vacancy_start_year`.** C'est l'équivalent de « le logement est en vacance FIL
   si l'une de ses lignes le déclare », donc la sémantique d'inclusion actuelle
   est préservée à l'identique et seul le double comptage disparaît : aucune règle
   métier n'est modifiée à la faveur d'une correction de maille.

### Conséquences

- Bon, parce que le vocabulaire distingue désormais Stock LOVAC et Parc ZLV
  importé, et que les deux chiffres cessent d'être présentés comme comparables
- Bon, parce que la régression du seuil ne peut plus se reproduire silencieusement
  lors de l'ajout d'un millésime
- Bon, parce que les métriques nommées « logements » comptent effectivement des
  logements
- Neutre, parce que Analyses et Parc de logements **ne convergeront pas** sur
  2019-2021 (écart résiduel de 12 à 27 %) ni sur 2023 (1,4 %), alors que 2022,
  2024, 2025 et 2026 s'alignent à 0,15 % près : c'est le résultat attendu,
  l'écart devenant documenté et explicable au lieu d'être inexpliqué
- Mauvais, parce que le chiffre public 2025 augmente de 8,8 % au niveau national
  (+108 863 logements) et que tout taux de couverture bâti dessus baisse
  mécaniquement d'autant
- Neutre, parce que la crainte d'un reclassement d'établissements dans
  `marts_production_establishments_category_pro_activity` ne se matérialise pas :
  la classification étant relative (quartiles), et la correction déplaçant presque
  tous les dénominateurs du même ordre, **aucun des 1 534 établissements ne change
  de catégorie** — vérifié en rejouant le modèle sur les deux versions de la
  morphologie
- Mauvais, parce que la déduplication décale de 0,04 % à 0,25 % des chiffres
  2019-2025 déjà publiés, sommes de surfaces incluses
- Mauvais, parce que l'écart 2019-2021 restera important et visible (jusqu'à
  −23 % en 2019) : il devient explicable, il ne devient pas petit

## Validation

- `test_morphology_public_criterion_declared` : le chiffre public est égal à la
  branche déclarée dans le seed, par millésime, et un millésime non déclaré fait
  échouer le test. Vérifié rouge sur le mart déployé (une ligne en échec, 2025) et
  vert sur la nouvelle logique.
- `test_morphology_tagged_lovac_consistency` : le compteur par millésime coïncide
  avec le compteur historique `lovac-2026` sur 2026, commune par commune.
- `dbt_utils.unique_combination_of_columns` sur `(year, local_id)` de
  `int_lovac_morphology_housing` : garantit la maille logement.
- Une seule PR portant les cinq points, avec le tableau avant/après ci-dessous,
  pour validation PO avant fusion.

Effet mesuré sur le chiffre public national, en rejouant la nouvelle logique en
lecture seule sur l'entrepôt :

| Millésime | Avant     | Après         | Écart        | Écart relatif |
| --------- | --------- | ------------- | ------------ | ------------- |
| 2019      | 1 122 921 | 1 121 374     | −1 547       | −0,14 %       |
| 2020      | 1 114 492 | 1 112 902     | −1 590       | −0,14 %       |
| 2021      | 1 167 654 | 1 166 256     | −1 398       | −0,12 %       |
| 2022      | 1 139 834 | 1 138 464     | −1 370       | −0,12 %       |
| 2023      | 1 130 129 | 1 128 680     | −1 449       | −0,13 %       |
| 2024      | 1 154 533 | 1 152 289     | −2 244       | −0,19 %       |
| 2025      | 1 239 816 | **1 348 679** | **+108 863** | **+8,78 %**   |
| 2026      | 1 179 845 | 1 179 845     | 0            | 0 %           |

Les millésimes 2019-2024 ne bougent que de la déduplication ; 2025 porte en plus
la correction du critère ; 2026 ne bouge pas du tout, ce qui est le contrôle
interne attendu puisque c'est le seul millésime sans doublon et que son critère
était déjà juste.

## Plus d'information

Consommateurs de `count_vacant_housing_private_fil_public` à contrôler lors de la
correction :

- `marts_public_establishments_morphology_unpivoted` — libellé « Logements
  Vacants >2 ans du Parc Privé - Public », surface exposée dans Analyses
- `int_analysis_establishments_zlv_usage` — `parc_vacant_lovac_25`
- `marts_production_establishments_category_pro_activity` — `lovac_2025_count`,
  `lovac_2024_count`

Méthode et réserve : tous les chiffres de cet ADR ont été mesurés le 2026-08-05
sur l'entrepôt MotherDuck `dwh` (mart déployé, `main_stg.stg_lovac_*` et
`main_int.int_production_housing`). La reproduction du critère du mart en requête
ad hoc s'écarte du mart de moins de 0,01 % sur 2020 et 2024 (49 et 97 lignes) :
immatériel pour les conclusions, mais à ne pas confondre avec un écart réel si
les requêtes sont rejouées.

À revisiter si la reprise historique des millésimes en base de production devient
un besoin métier explicite, ce qui rouvrirait l'option B.
