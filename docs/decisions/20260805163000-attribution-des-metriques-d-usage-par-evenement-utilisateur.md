---
statut: accepté
date: 2026-08-05
décideurs: Raphaël Courivaud
---

# Les métriques d'usage sont attribuées par événement utilisateur, pas par territoire

## Contexte et problématique

Un signalement rapporte plusieurs incohérences dans la table `marts_zlv_usage`,
dont la plus visible est un écart de comptage : « 58 000 logements mis à jour côté
Marts Housing contre 121 000 issus de la somme effectuée dans Marts Usage ».

L'investigation montre que ce n'est pas un écart mais **deux mesures différentes
présentées comme la même**, et que la table mélangeait deux règles d'attribution
incompatibles :

- les compteurs de situation (suivi, occupation), les notes et les documents
  partaient déjà de l'**auteur de l'événement** ;
- les compteurs d'enrichissement du propriétaire et le DPE partaient du
  **territoire du logement**, c'est-à-dire de `int_production_establishments_housing`.

Un logement étant couvert par une commune, un EPCI, un département, une région et
un service déconcentré, l'attribution territoriale le créditait à environ 25
établissements — y compris ceux dont aucun utilisateur n'était intervenu.

Mesures du 2026-08-05 sur l'entrepôt `dwh`, sommes sur les 36 791 établissements :

| Compteur                       | Attribution territoriale | Attribution événementielle |
| ------------------------------ | ------------------------ | -------------------------- |
| `logements_maj_owners`         | 686 752                  | 9 882                      |
| `logements_maj_phone`          | 144 826                  | 5 042                      |
| `logements_maj_mails`          | 104 776                  | 3 582                      |
| `logements_maj_owners_address` | 61 966                   | 2 331                      |
| `logements_maj_dpe`            | 1 222                    | 49                         |
| `logements_maj_enrichissement` | 1 057 574                | 68 006                     |

Trois autres défauts, indépendants de la règle d'attribution, aggravaient la
lecture de la table :

1. **Comptages non dédoublonnés.** `logements_contactes_via_campagnes` et
   `logements_exportes_via_groupes` utilisaient `COUNT()` au lieu de
   `COUNT(DISTINCT)` : 178 223 au lieu de 149 069 pour les campagnes (77
   établissements concernés), et 3 029 177 au lieu de 2 014 977 pour les groupes
   (353 établissements, +50 %).
2. **Agrégat construit par addition.** `logements_maj_enrichissement` était la
   somme de six compteurs : un logement dont le mail et le téléphone avaient été
   corrigés y comptait deux fois. Même défaut sur `logements_maj_owners`, qui
   additionnait les modifications de nom et de rang.
3. **Perte d'attribution sur les comptes supprimés.** `int_production_events`
   résolvait l'auteur via `int_production_users`, qui filtre `deleted_at IS NULL` :
   16,71 % des événements utilisateurs n'étaient rattachés à aucun établissement.

### Ce que l'écart 58 000 / 121 000 mesurait réellement

Les deux nombres du signalement sont périmés — ils précèdent une correction
partielle déjà déployée. Au 2026-08-05, la somme de `logements_maj_situation`
valait 156 224 pour 155 699 logements distincts réellement mis à jour par des
utilisateurs. L'écart résiduel n'est pas une erreur : **un logement mis à jour par
deux établissements compte dans les deux**, et c'est le comportement attendu d'un
compteur par établissement. Additionner des comptages distincts ne produit pas un
total ; c'est la confusion que l'ADR ferme.

## Critères de décision

- Une seule règle d'attribution dans une table, faute de quoi ses colonnes ne sont
  ni comparables ni sommables entre elles
- Ne pas créditer un établissement d'une action qu'aucun de ses utilisateurs n'a
  effectuée
- Un compteur nommé « logements » doit compter des logements distincts
- Ne pas perdre l'information de volumétrie, qui mesure un effort réel
- Rendre les pièges de lecture explicites dans la donnée plutôt que dans une
  conversation

## Options envisagées

- **A. Attribution événementielle unique** — tout compteur d'activité vient d'un
  événement créé par un utilisateur de l'établissement ; le territoire ne sert
  qu'aux référentiels
- **B. Hybride assumé** — attribution événementielle, plus une famille de colonnes
  `*_territoire` exposant séparément « les logements de mon territoire enrichis,
  par qui que ce soit »
- **C. Statu quo territorial pour l'enrichissement**

## Décision

Option retenue : **A. Attribution événementielle unique**.

Un compteur d'activité mesure ce que les utilisateurs d'un établissement ont fait.
Le territoire reste utilisé pour deux usages qui ne sont pas de l'attribution :
les **référentiels** (parc vacant, région, département, échelons inscrits) et, pour
les événements portant sur un propriétaire, un **filtre d'assiette**.

Ce filtre d'assiette mérite sa justification. Un événement `owner:updated` porte
sur un propriétaire, pas sur un logement : il se déplie sur tous les logements de
ce propriétaire. Sur les 34 036 paires (établissement, logement) ainsi produites,
**19 530 concernaient des logements hors du périmètre de l'établissement** — un
agent corrigeant le mail d'un propriétaire possédant huit logements dont six dans
une autre région se voyait créditer les huit. L'intersection avec le périmètre
ramène le compteur au sens voulu : « logements de mon territoire dont j'ai enrichi
le propriétaire ».

L'option B a été écartée : elle double le nombre de colonnes pour une question —
la couverture du territoire — à laquelle `total_communes_in_territory` et les
échelons inscrits répondent déjà. L'option C a été écartée parce qu'elle laissait
deux règles dans la même table, donc l'impossibilité de comparer deux colonnes
voisines.

En conséquence :

1. **L'auteur d'un événement est résolu sur tous les utilisateurs, supprimés
   inclus** (`int_production_event_authors`). Le taux d'événements non rattachés
   passe de 16,71 % à 2,08 %, soit 176 839 logements attribués au lieu de 155 699.
   Le résidu correspond aux événements dont le `created_by` est absent de la table
   des utilisateurs, non récupérable depuis l'entrepôt.
2. **Tout compteur nommé `logements_*` est un `COUNT(DISTINCT housing_id)`**, et
   la volumétrie brute est conservée dans des colonnes distinctes et nommées comme
   telles : `contacts_campagnes`, `exports_groupes`, `actes_enrichissement`.
3. **Les agrégats ne sont plus des sommes de compteurs.**
   `logements_maj_enrichissement` devient le décompte distinct de l'union des
   familles d'enrichissement, et `logements_maj_owners_rank` est exposé séparément
   au lieu d'être additionné à `logements_maj_owners`.
4. **Le DPE constaté est mesuré par l'événement `housing:updated`** plutôt que par
   la présence d'une valeur dans `housing.actual_dpe`, la colonne ne portant ni
   date ni auteur.
5. **Les échelons inscrits sont calculés par une règle unique** pour tous les
   échelons (`int_production_establishments_echelons`), là où seules les communes
   des EPCI l'étaient et où intercommunalités, départements et SDED étaient des
   `NULL` en dur. « Inscrit » signifie `user_number > 0` ; un compteur vaut `NULL`,
   et non `0`, quand l'échelon n'est pas un sous-échelon de l'établissement mesuré.
6. **Les millésimes sont portés par un modèle long**
   (`int_analysis_establishments_zlv_usage_annuel`, exposé en
   `marts_zlv_usage_annuel`) puis pivotés en colonnes larges de 2020 à l'année
   courante. La plage est calculée à la compilation, donc aucune intervention au
   changement d'année.
7. **`type_simple` distingue les échelons** : `Département`, `Région` et
   `DREAL/SDER` sortent de `Autre`, qui ne contient plus que ce qui n'est pas un
   échelon administratif.

### Conséquences

- Bon, parce qu'une seule règle gouverne la table : deux colonnes voisines
  redeviennent comparables
- Bon, parce qu'un établissement n'est plus crédité du travail d'un autre
- Bon, parce que la distinction acte / logement distinct est portée par les noms de
  colonnes et par des tests, non par une convention orale
- Bon, parce que les quatre colonnes d'échelons cessent d'être vides
- Mauvais, parce que **tous les compteurs d'enrichissement s'effondrent** — d'un
  facteur 15 à 70 selon la colonne. Les chiffres déjà communiqués aux
  collectivités et les questions Metabase construites dessus deviennent faux, et
  ce n'est pas une baisse d'activité mais la fin d'un sur-comptage
- Mauvais, parce que `logements_maj_dpe` restera proche de zéro : `actual_dpe` date
  de janvier 2026 et n'est renseignée que sur 49 logements. Un lecteur attendant
  des milliers de lignes pense au DPE source LOVAC/ADEME, qui est une autre
  métrique
- Mauvais, parce que le changement de valeurs de `type_simple` modifie
  silencieusement le résultat de tout filtre Metabase portant sur `'Autre'`
- Mauvais, parce que la correction de l'attribution des comptes supprimés fait
  **monter** des chiffres hors du périmètre de ce ticket :
  `marts_production_housing`, `marts_production_establishments_activation`,
  `marts_production_establishments_category_pro_activity` et les tables
  `marts_bi_housing_*`
- Neutre, parce que la somme des colonnes annuelles restera supérieure au total
  toutes années : un logement recontacté deux années différentes compte dans
  chacune. C'est documenté et testé plutôt que corrigé, un total annuel n'ayant
  pas de sens autrement

## Validation

- Invariants dbt sur `marts_zlv_usage` : `suivi <= situation`,
  `occupation <= situation`, `distinct <= brut` pour les campagnes, les groupes et
  l'enrichissement, `MAX(familles) <= enrichissement <= SUM(familles)`,
  `inscrits <= couvrant le périmètre`
- Unicité de `establishment_id`, et de `(establishment_id, annee)` sur les modèles
  annuels
- Test de réconciliation entre la somme de `logements_maj_situation` et le nombre
  de logements distincts de `marts_production_housing`, écart borné à 15 %
- Test de non-régression sur `int_production_events` : moins de 6 % d'événements
  utilisateurs sans établissement
- Test de régression KPI en sévérité `warn` sur sept planchers, pour détecter un
  passage à zéro sans bloquer le DAG
- Descriptions `schema.yml` portant l'avertissement « ne pas sommer entre
  établissements » sur chaque colonne distincte, visible dans Metabase

## Plus d'information

Deux points restent à trancher avec le porteur du produit, hors périmètre de cette
décision :

- la métrique attendue derrière « Logements MAJ DPE » — DPE constaté saisi par un
  utilisateur, ou DPE source LOVAC/ADEME ;
- la reprise des questions Metabase filtrant `type_simple = 'Autre'`.

Méthode et réserve : tous les chiffres de cet ADR ont été mesurés le 2026-08-05 sur
l'entrepôt MotherDuck `dwh`, en exécutant le SQL compilé des modèles en lecture
seule avant déploiement. Les chiffres « après » de la table `marts_zlv_usage`
n'intègrent pas encore la correction des comptes supprimés, qui les fera légèrement
monter.
