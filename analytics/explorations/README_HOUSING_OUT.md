# Problème

- `[PRIO]` Besoin d’éléments de contexte pour le comité d’investissement de Septembre
- Besoin d’éléments de cadrage pour aider à la création d’un panel représentatif de logements/propriétaires dont le logement est sorti de la vacance pour l’[enquête visant à comprendre les déterminants de sortie de la vacance](https://www.notion.so/Propri-taires-Enqu-te-aupr-s-des-propri-taires-qui-ont-sorti-un-logement-de-la-vacance-2109ec2a056c805c814bfbe7be34aa19?pvs=21)

# Solution

- Créer un dashboard d’analyse descriptive des logements et de leurs propriétaires (cf specs ci-dessous)
- Proposer des résumés textuels (compréhensibles pour l’ensemble de l’équipe) de l’analyse descriptive.
- `PRIO` [Impact] Tester des analyses statistiques pour prouver impact de ZLV
- [Panel] Tester des analyses statistiques pour trouver des classes ou individus types pour constitution panel représentatif de la population des propriétaires de logements sortis de la vacance

## Spécifications

Dashboard d’analyse descriptive avec les dimensions suivantes :

- Logements
  - Localisation (Région, Département, EPCI)
  - Caractéristique de la parcelle (surface)
  - Caractéristiques du bâtiment (nb de logement, date de construction…)
  - Caractéristiques du logement (type, surface…)
  - Mutations (écart de la dernière mutation avec fin de la vacance, type de mutation, valeurs des transactions)
  - Pro-activité (nombre de courriers reçus, classe de pro-activité l’EPCI d’appartenance)
  - Vie du logement (Nombre de changements d’occupation via [ffh_ccthp](https://doc-datafoncier.cerema.fr/doc/lovac/lovac_fil/ffh_ccthp) ; Nombre de mutations via [ffh_jdatat](https://doc-datafoncier.cerema.fr/doc/lovac/lovac_fil/ffh_jdatat))

- Propriétaires
  - Localisation
  - Localisation par rapport au logement
  - Caractéristiques (Type, Age, Sexe…)
  - Expérience de la propriété (nb de logements possédés, nb de logements possédés par type…)
  - Pro-activité (nombre de courriers reçus, classe de pro-activité l’EPCI d’appartenance)

## Livrable

### V1

- **Dashboard Metabase**

[](https://stats.zlv.beta.gouv.fr/dashboard/31-explo-sorti-de-la-vacance)

- **Retours 27/08**
  - **Corrections/Vérifications**
    - [Cohortes]
      - Logements sortis de la vacances → Vérifier que ce sont les logements présents dans les LOVAC FIL (data-file-years = 2019, 2020, 2021, 2022, 2023, 2024) ?
      - Logements total (total housing count) 10 000 000 → trop → Doit être tous les logements référencés dans la prod ZLV où ” contient LOVAC
    - [Propriétaires] Type de propriétaires non cohérents → Présence de propriétaires publics, or les LOVAC FIL ne doivent contenir que des propriétaires privés → A vérifier
    - [Pro-activité-Zonage] Territoires avec cumul des dispositifs → à vérifier car difficile qu’un établissement aient plus de 4 dispositif → Exclure les départements et régions
    - [Impact] Avec ou sans campagne → Vérifier cohortes

  - **Pour aller plus loin**
    - [Description] Discriminer selon les catégories de territoires (Zone tendues/détendues (TLV, non TLV) ; Type interco (Métropole, CU, CA, CC) ; Types de communes (rural/urbain inter/urbain dense → cf [grille de densité insee](https://www.insee.fr/fr/information/8571524)); Intercos ZLV/Non ZLV)
    - [Pro-activité]
      - Discriminer seulement sur les établissements = Intercommunalités
        - Discriminer sur les interco ZLV et non ZLV
