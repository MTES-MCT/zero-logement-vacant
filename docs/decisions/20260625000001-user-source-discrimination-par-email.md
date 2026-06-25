---
statut: accepté
date: 2026-06-25
---

# Discrimination user_source par domaine email (@beta.gouv.fr)

Les événements sur les logements sont classés `user_source = 'zlv'` si l'utilisateur a une adresse email `@beta.gouv.fr`, et `user_source = 'user'` sinon. Seuls les événements `'user'` comptent dans les métriques de pro-activité, de retour de campagne, et d'engagement ZLV.

## Contexte et problématique

L'équipe ZLV (agents beta.gouv.fr) effectue parfois des mises à jour de statut dans la production pour corriger des données, tester des fonctionnalités, ou assister une collectivité. Ces mises à jour ne doivent pas être comptées comme des actions des collectivités territoriales dans les KPIs d'impact. Sans discrimination, l'équipe ZLV gonfle artificiellement les métriques des établissements qu'elle touche.

## Options envisagées

- Discriminer par domaine email (`@beta.gouv.fr`)
- Ajouter un flag booléen `is_platform_user` sur la table `users`
- Discriminer par rôle utilisateur (ADMIN = plateforme, USUAL = collectivité)

## Décision

Option choisie : domaine email. Le domaine email est stable même si le rôle d'un utilisateur change (ex. un agent ZLV qui devient USUAL pour tester). Un flag dédié serait plus propre mais nécessite une migration et reste sujet à erreur humaine. Le rôle ADMIN ne correspond pas exactement à "équipe plateforme" (certains admins sont des collectivités).

### Conséquences

- Bon : simple, ne nécessite pas de colonne supplémentaire, survit aux changements de rôle.
- Mauvais : couplage implicite entre l'adresse email et la signification analytique d'un événement. Un futur changement de domaine de l'équipe (ex. passage à orizons.io) casserait silencieusement les métriques.
- Mauvais : un agent collectivité avec une adresse beta.gouv.fr serait classé 'zlv' à tort.
