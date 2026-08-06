# Zéro Logement Vacant

Service public français de lutte contre la vacance des logements. Les
collectivités y suivent des logements vacants identifiés à partir des fichiers
LOVAC, contactent leurs propriétaires et enregistrent l'évolution de
l'occupation.

Ce document est un **glossaire** : il fixe le vocabulaire du domaine et rien
d'autre. Les choix techniques sont documentés dans [docs/decisions](./docs/decisions).

## Language

### Sources et millésimes

**Millésime LOVAC** :
Une livraison annuelle du fichier LOVAC, identifiée par son année de
publication (2019 à 2026). Chaque millésime est un instantané complet et
autonome, pas un delta par rapport au précédent.
_Avoid_: année LOVAC, version LOVAC, cru

**Ligne LOVAC** :
Un enregistrement d'un millésime LOVAC. Un même local peut apparaître sur
plusieurs lignes d'un même millésime, parfois avec des années de début de
vacance divergentes. Compter des lignes n'est donc jamais compter des
logements.
_Avoid_: enregistrement, occurrence, ligne (seul)

**Local** :
Une unité immobilière telle que le fichier LOVAC la décrit, quelle que soit sa
nature (habitation, commerce, dépendance).
_Avoid_: bien, unité

**Logement** :
Un local à usage d'habitation, c'est-à-dire un appartement ou une maison
effectivement affecté à l'habitation. Tout logement est un local ; l'inverse
est faux. Un logement est identifié de façon unique par son identifiant local.
_Avoid_: habitation, bien, local (quand on parle bien d'habitation)

### Populations de logements

La distinction suivante est la source de confusion la plus fréquente du projet :
deux populations différentes portent le même nom courant de « logements
vacants » et ne coïncident pas.

**Stock LOVAC** :
L'ensemble des logements qu'un millésime LOVAC déclare vacants sur un
territoire donné. C'est une mesure de la vacance réelle telle que l'État
l'observe, indépendante de ZLV. C'est ce que présente Analyses.
_Avoid_: parc vacant, logements vacants (seul), stock de vacance

**Parc ZLV importé** :
L'ensemble des logements que ZLV a effectivement importés d'un millésime LOVAC
donné, et qui existent donc dans l'application. C'est une mesure de ce que ZLV
connaît et donne à suivre aux collectivités. C'est ce que présente Parc de
logements.
_Avoid_: parc de logements, logements ZLV, logements suivis

**Millésime inclus** :
Critère de provenance : « ZLV a importé ce logement depuis le millésime LOVAC
de telle année ». C'est une propriété de traçabilité du Parc ZLV importé, et
non une affirmation sur la présence du logement dans le fichier LOVAC de cette
année-là. Un logement peut appartenir au Stock LOVAC d'un millésime sans porter
le millésime inclus correspondant.
_Avoid_: présence dans le millésime, année de vacance, millésime d'origine

### Qualification de la vacance

**Vacance FIL** :
Vacance constatée depuis plus de deux ans au regard de la seule année de début
de vacance déclarée dans le millésime. Critère retenu pour les millésimes 2025
et suivants.
_Avoid_: vacance longue, vacance structurelle

**Vacance FIL+CCTHP** :
Vacance FIL confirmée par le classement du local comme vacant dans les Fichiers
Fonciers. Critère plus restrictif, retenu pour les millésimes 2019 à 2024.
_Avoid_: vacance croisée, vacance confirmée

**Parc privé** :
Logements dont le propriétaire n'est ni une personne morale publique ni un
bailleur social. C'est le périmètre d'action de ZLV.
_Avoid_: hors bailleurs, non social

### Territoires

**Établissement** :
Une collectivité utilisatrice de ZLV (commune, EPCI, département, région).
_Avoid_: collectivité (dans le code), organisation, structure

**Périmètre** :
L'ensemble des communes qu'un établissement couvre, et donc l'assiette de tous
ses chiffres.
_Avoid_: territoire, ressort, zone

**Échelon** :
Le niveau administratif d'un établissement : commune, intercommunalité,
département, région. Deux établissements d'échelons différents couvrent
légitimement le même logement.
_Avoid_: niveau, type, strate

**Établissement inscrit** :
Un établissement qui compte au moins un utilisateur. Mesure la présence d'une
collectivité sur ZLV, indépendamment de son activité.
_Avoid_: établissement actif, collectivité présente

**Établissement ouvert** :
Un établissement inscrit dont l'accès est par ailleurs ouvert. Sous-ensemble des
établissements inscrits : les deux notions ne se substituent pas l'une à l'autre.
_Avoid_: établissement disponible, compte actif

### Usage de l'application

**Attribution événementielle** :
Rattacher une action à l'établissement de l'utilisateur qui l'a effectuée, et non
aux établissements dont le périmètre couvre le logement concerné. C'est la règle
de tous les compteurs d'activité.
_Avoid_: attribution géographique, rattachement territorial

**Logement mis à jour** :
Un logement dont un utilisateur d'un établissement a modifié le suivi ou
l'occupation. Se compte toujours en logements distincts par établissement.
_Avoid_: logement traité, logement modifié, logement suivi

**Logement contacté** :
Un logement dont le propriétaire a reçu au moins un courrier d'une campagne
envoyée. Un logement recontacté reste un seul logement contacté.
_Avoid_: contact, envoi, logement ciblé

**Enrichissement** :
Toute amélioration de la connaissance d'un logement ou de son propriétaire par un
utilisateur : coordonnées, identité, adresse, rang, note, document, DPE constaté.
Distinct de la mise à jour de situation, qui porte sur le suivi et l'occupation.
Un enregistrement qui ne change aucune valeur n'est pas un enrichissement, même
s'il produit un événement.
_Avoid_: complétion, qualification, fiabilisation

**Acte** :
Une intervention unitaire d'un utilisateur. Un même logement peut porter
plusieurs actes, donc un comptage d'actes est toujours supérieur ou égal au
comptage de logements distincts correspondant. Les deux mesures répondent à des
questions différentes — effort fourni contre couverture atteinte — et ne doivent
jamais être présentées l'une pour l'autre.
_Avoid_: action, opération, mise à jour (au sens du décompte)

**Logement distinct** :
L'unité de tout compteur nommé « logements ». Deux conséquences : un logement
touché plusieurs fois ne compte qu'une fois, et les compteurs de deux
établissements ne s'additionnent pas, un logement pouvant être compté par
chacun d'eux.
_Avoid_: nombre de logements (sans qualificatif), volume
