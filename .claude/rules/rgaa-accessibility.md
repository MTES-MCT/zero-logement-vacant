---
description: RGAA accessibility requirements — mandatory, non-negotiable for all frontend work
paths: ["frontend/**"]
---

# Accessibilité RGAA — Exigence absolue et non négociable

## Règle générale

**Zéro Logement Vacant est un service public numérique.** Le respect du RGAA
(Référentiel Général d'Amélioration de l'Accessibilité) n'est pas une option,
une bonne pratique parmi d'autres, ou un chantier séparé : c'est une
**obligation légale** et une **condition de complétude** de tout travail
frontend, au même titre que la compilation ou les tests.

Pour tout travail sur `frontend/**` (composant, vue, formulaire, modale,
tableau, navigation, contenu, style) :

- Tu dois connaître et appliquer **l'intégralité des critères RGAA**, sans
  exception, sans les traiter comme un "nice to have" a posteriori.
- Un code qui fonctionne visuellement mais qui viole un critère RGAA est un
  **code incorrect**, au même titre qu'un bug fonctionnel.
- Tu ne dois **jamais** livrer sciemment une régression d'accessibilité pour
  gagner du temps ou simplifier une implémentation. Si un raccourci casse un
  critère, tu le dis explicitement et tu proposes l'alternative conforme —
  tu n'implémentes pas silencieusement la version non conforme par défaut.
- Cette exigence s'applique à **tout** code frontend que tu écris ou modifies,
  qu'il s'agisse d'une nouvelle fonctionnalité, d'un correctif, d'un
  refactoring ou d'une intégration Figma (voir
  [figma-design-system.md](figma-design-system.md)).

## Source de référence (canonique) et fiabilité de cette liste

Référentiel officiel : <https://accessibilite.numerique.gouv.fr/methode/criteres-et-tests/>

**Version : RGAA 4.1.2** (tag `v4.1.2`, dernière version publiée), déclinaison
française de WCAG 2.1 niveau AA — **13 thématiques, 106 critères de contrôle,
258 tests élémentaires**.

La liste ci-dessous a été **validée le 2026-07-08 directement depuis les
données JSON sources faisant autorité** du dépôt officiel
(`RGAA/criteres.json` et `RGAA/methodologies.json` dans
[DISIC/accessibilite.numerique.gouv.fr](https://github.com/DISIC/accessibilite.numerique.gouv.fr)),
et non depuis un résumé généré par un outil de fetch web (ces résumés se sont
révélés incohérents d'un appel à l'autre lors de la rédaction de ce
document — ne jamais leur faire confiance pour ce niveau de précision).
Les 106 titres de critères ci-dessous sont donc le **texte officiel exact**,
et les totaux (13 / 106 / 258) ont été vérifiés par calcul sur le JSON
source, pas estimés.

**Cela signifie que tu peux citer un numéro de critère (ex. « critère 7.3 »)
directement depuis cette liste, avec confiance.** Le seul cas où il faut
revérifier à la source : si une nouvelle version majeure du RGAA succède à la
4.1.2 (auquel cas cette liste devient un instantané historique à mettre à
jour — voir la date de validation ci-dessus).

**Procédures de test exactes (les 258 tests élémentaires) :** elles sont
documentées intégralement, avec le même niveau de fidélité, dans
[docs/rgaa/methodologie-tests.md](../../docs/rgaa/methodologie-tests.md).
Ce fichier n'est **volontairement pas chargé automatiquement** (258 tests
représentent ~34k tokens, ce qui alourdirait chaque tâche frontend même
triviale) — va le lire explicitement quand tu dois : auditer précisément un
composant, citer la procédure officielle d'un test dans un rapport, ou
trancher un cas limite que le résumé "Application concrète" de chaque
critère ci-dessous ne couvre pas.

## Les 106 critères RGAA — liste officielle complète, par thématique

Pour chaque changement frontend, passe en revue mentalement les 13
thématiques. Chaque section donne le **texte officiel exact** des critères
(faisant autorité) puis, quand utile, une **application concrète** dans le
contexte DSFR/MUI/React de ce repo.

### 1. Images (9 critères)
1.1 — Chaque image porteuse d'information a-t-elle une alternative textuelle ?
1.2 — Chaque image de décoration est-elle correctement ignorée par les technologies d'assistance ?
1.3 — Pour chaque image porteuse d'information ayant une alternative textuelle, cette alternative est-elle pertinente (hors cas particuliers) ?
1.4 — Pour chaque image utilisée comme CAPTCHA ou comme image-test, ayant une alternative textuelle, cette alternative permet-elle d'identifier la nature et la fonction de l'image ?
1.5 — Pour chaque image utilisée comme CAPTCHA, une solution d'accès alternatif au contenu ou à la fonction du CAPTCHA est-elle présente ?
1.6 — Chaque image porteuse d'information a-t-elle, si nécessaire, une description détaillée ?
1.7 — Pour chaque image porteuse d'information ayant une description détaillée, cette description est-elle pertinente ?
1.8 — Chaque image texte porteuse d'information, en l'absence d'un mécanisme de remplacement, doit si possible être remplacée par du texte stylé. Cette règle est-elle respectée (hors cas particuliers) ?
1.9 — Chaque légende d'image est-elle, si nécessaire, correctement reliée à l'image correspondante ?

**Application concrète :** `alt` pertinent sur toute `<img>`/icône SVG porteuse de sens ; `alt=""` (jamais absent) sur le décoratif ; jamais de texte représenté en image quand une balise texte stylée suffit.

### 2. Cadres (2 critères)
2.1 — Chaque cadre a-t-il un titre de cadre ?
2.2 — Pour chaque cadre ayant un titre de cadre, ce titre de cadre est-il pertinent ?

**Application concrète :** tout `<iframe>` a un `title` explicite décrivant son contenu (carte, lecteur vidéo, widget tiers).

### 3. Couleurs (3 critères)
3.1 — Dans chaque page web, l'information ne doit pas être donnée uniquement par la couleur. Cette règle est-elle respectée ?
3.2 — Dans chaque page web, le contraste entre la couleur du texte et la couleur de son arrière-plan est-il suffisamment élevé (hors cas particuliers) ?
3.3 — Dans chaque page web, les couleurs utilisées dans les composants d'interface ou les éléments graphiques porteurs d'informations sont-elles suffisamment contrastées (hors cas particuliers) ?

**Application concrète :** un statut ne se distingue jamais par la couleur seule (texte/icône/motif en plus) ; contraste texte ≥ 4.5:1 (≥ 3:1 pour grand texte), et ≥ 3:1 pour les composants d'interface/icônes porteurs de sens.

### 4. Multimédia (13 critères)
4.1 — Chaque média temporel pré-enregistré a-t-il, si nécessaire, une transcription textuelle ou une audiodescription (hors cas particuliers) ?
4.2 — Pour chaque média temporel pré-enregistré ayant une transcription textuelle ou une audiodescription synchronisée, celles-ci sont-elles pertinentes (hors cas particuliers) ?
4.3 — Chaque média temporel synchronisé pré-enregistré a-t-il, si nécessaire, des sous-titres synchronisés (hors cas particuliers) ?
4.4 — Pour chaque média temporel synchronisé pré-enregistré ayant des sous-titres synchronisés, ces sous-titres sont-ils pertinents ?
4.5 — Chaque média temporel pré-enregistré a-t-il, si nécessaire, une audiodescription synchronisée (hors cas particuliers) ?
4.6 — Pour chaque média temporel pré-enregistré ayant une audiodescription synchronisée, celle-ci est-elle pertinente ?
4.7 — Chaque média temporel est-il clairement identifiable (hors cas particuliers) ?
4.8 — Chaque média non temporel a-t-il, si nécessaire, une alternative (hors cas particuliers) ?
4.9 — Pour chaque média non temporel ayant une alternative, cette alternative est-elle pertinente ?
4.10 — Chaque son déclenché automatiquement est-il contrôlable par l'utilisateur ?
4.11 — La consultation de chaque média temporel est-elle, si nécessaire, contrôlable par le clavier et tout dispositif de pointage ?
4.12 — La consultation de chaque média non temporel est-elle contrôlable par le clavier et tout dispositif de pointage ?
4.13 — Chaque média temporel et non temporel est-il compatible avec les technologies d'assistance (hors cas particuliers) ?

**Application concrète :** tout son/vidéo autoplay doit être contrôlable (pause/stop/volume) par l'utilisateur ; aucun contenu ne clignote de façon susceptible de déclencher une crise photosensible.

### 5. Tableaux (8 critères)
5.1 — Chaque tableau de données complexe a-t-il un résumé ?
5.2 — Pour chaque tableau de données complexe ayant un résumé, celui-ci est-il pertinent ?
5.3 — Pour chaque tableau de mise en forme, le contenu linéarisé reste-t-il compréhensible ?
5.4 — Pour chaque tableau de données ayant un titre, le titre est-il correctement associé au tableau de données ?
5.5 — Pour chaque tableau de données ayant un titre, celui-ci est-il pertinent ?
5.6 — Pour chaque tableau de données, chaque en-tête de colonne et chaque en-tête de ligne sont-ils correctement déclarés ?
5.7 — Pour chaque tableau de données, la technique appropriée permettant d'associer chaque cellule avec ses en-têtes est-elle utilisée (hors cas particuliers) ?
5.8 — Chaque tableau de mise en forme ne doit pas utiliser d'éléments propres aux tableaux de données. Cette règle est-elle respectée ?

**Application concrète :** `<caption>` pertinent, `<th scope="col"|"row">` correctement déclarés ; jamais de `<table>` pour de la mise en page.

### 6. Liens (2 critères)
6.1 — Chaque lien est-il explicite (hors cas particuliers) ?
6.2 — Dans chaque page web, chaque lien a-t-il un intitulé ?

**Application concrète :** jamais « cliquer ici » / « en savoir plus » sans contexte ; utiliser `aria-label`/`aria-labelledby` si le libellé visuel seul est insuffisant.

### 7. Scripts (5 critères)
7.1 — Chaque script est-il, si nécessaire, compatible avec les technologies d'assistance ?
7.2 — Pour chaque script ayant une alternative, cette alternative est-elle pertinente ?
7.3 — Chaque script est-il contrôlable par le clavier et par tout dispositif de pointage (hors cas particuliers) ?
7.4 — Pour chaque script qui initie un changement de contexte, l'utilisateur est-il averti ou en a-t-il le contrôle ?
7.5 — Dans chaque page web, les messages de statut sont-ils correctement restitués par les technologies d'assistance ?

**Application concrète :** tout composant interactif (dropdown, accordéon, DSFR `Modal`, tabs) reste utilisable **entièrement au clavier** (Tab, Shift+Tab, Entrée, Espace, Échap, flèches) avec les bons rôles/états ARIA (`role`, `aria-expanded`, `aria-selected`, `aria-modal`) ; tout contenu dynamique pertinent (erreur, résultat, toast) est annoncé via `aria-live`/gestion du focus, pas seulement affiché visuellement.

### 8. Éléments obligatoires (10 critères)
8.1 — Chaque page web est-elle définie par un type de document ?
8.2 — Pour chaque page web, le code source généré est-il valide selon le type de document spécifié ?
8.3 — Dans chaque page web, la langue par défaut est-elle présente ?
8.4 — Pour chaque page web ayant une langue par défaut, le code de langue est-il pertinent ?
8.5 — Chaque page web a-t-elle un titre de page ?
8.6 — Pour chaque page web ayant un titre de page, ce titre est-il pertinent ?
8.7 — Dans chaque page web, chaque changement de langue est-il indiqué dans le code source (hors cas particuliers) ?
8.8 — Dans chaque page web, le code de langue de chaque changement de langue est-il valide et pertinent ?
8.9 — Dans chaque page web, les balises ne doivent pas être utilisées uniquement à des fins de présentation. Cette règle est-elle respectée ?
8.10 — Dans chaque page web, les changements du sens de lecture sont-ils signalés ?

**Application concrète :** `<html lang="fr">` ; `<title>` de page pertinent et à jour ; tout passage dans une autre langue est balisé (`lang="en"` inline, etc.) ; pas de balises détournées de leur sémantique pour du style.

### 9. Structuration de l'information (4 critères)
9.1 — Dans chaque page web, l'information est-elle structurée par l'utilisation appropriée de titres ?
9.2 — Dans chaque page web, la structure du document est-elle cohérente (hors cas particuliers) ?
9.3 — Dans chaque page web, chaque liste est-elle correctement structurée ?
9.4 — Dans chaque page web, chaque citation est-elle correctement indiquée ?

**Application concrète :** hiérarchie de titres sans saut (`h1`→`h2`→`h3`) ; vraies listes sémantiques `<ul>`/`<ol>`/`<dl>`, jamais simulées avec des `<div>`/tirets ; citations en `<blockquote>`/`<q>`, pas juste stylées visuellement.

### 10. Présentation de l'information (14 critères)
10.1 — Dans le site web, des feuilles de styles sont-elles utilisées pour contrôler la présentation de l'information ?
10.2 — Dans chaque page web, le contenu visible porteur d'information reste-t-il présent lorsque les feuilles de styles sont désactivées ?
10.3 — Dans chaque page web, l'information reste-t-elle compréhensible lorsque les feuilles de styles sont désactivées ?
10.4 — Dans chaque page web, le texte reste-t-il lisible lorsque la taille des caractères est augmentée jusqu'à 200 %, au moins (hors cas particuliers) ?
10.5 — Dans chaque page web, les déclarations CSS de couleurs de fond d'élément et de police sont-elles correctement utilisées ?
10.6 — Dans chaque page web, chaque lien dont la nature n'est pas évidente est-il visible par rapport au texte environnant ?
10.7 — Dans chaque page web, pour chaque élément recevant le focus, la prise de focus est-elle visible ?
10.8 — Pour chaque page web, les contenus cachés ont-ils vocation à être ignorés par les technologies d'assistance ?
10.9 — Dans chaque page web, l'information ne doit pas être donnée uniquement par la forme, taille ou position. Cette règle est-elle respectée ?
10.10 — Dans chaque page web, l'information ne doit pas être donnée par la forme, taille ou position uniquement. Cette règle est-elle implémentée de façon pertinente ?
10.11 — Pour chaque page web, les contenus peuvent-ils être présentés sans perte d'information ou de fonctionnalité et sans avoir recours soit à un défilement vertical pour une fenêtre ayant une hauteur de 256 px, soit à un défilement horizontal pour une fenêtre ayant une largeur de 320 px (hors cas particuliers) ?
10.12 — Dans chaque page web, les propriétés d'espacement du texte peuvent-elles être redéfinies par l'utilisateur sans perte de contenu ou de fonctionnalité (hors cas particuliers) ?
10.13 — Dans chaque page web, les contenus additionnels apparaissant à la prise de focus ou au survol d'un composant d'interface sont-ils contrôlables par l'utilisateur (hors cas particuliers) ?
10.14 — Dans chaque page web, les contenus additionnels apparaissant via les styles CSS uniquement peuvent-ils être rendus visibles au clavier et par tout dispositif de pointage ?

**Application concrète :** indicateur de focus **toujours visible** (jamais de `outline: none` sans remplacement) ; jamais d'information portée uniquement par la forme/taille/position (« le bouton à droite ») ; le texte reste lisible en zoom 200 % et en reflow à 320px de large sans scroll horizontal ; tooltips/popovers au survol/focus doivent être atteignables au clavier et dismissables.

### 11. Formulaires (13 critères)
11.1 — Chaque champ de formulaire a-t-il une étiquette ?
11.2 — Chaque étiquette associée à un champ de formulaire est-elle pertinente (hors cas particuliers) ?
11.3 — Dans chaque formulaire, chaque étiquette associée à un champ de formulaire ayant la même fonction et répétée plusieurs fois dans une même page ou dans un ensemble de pages est-elle cohérente ?
11.4 — Dans chaque formulaire, chaque étiquette de champ et son champ associé sont-ils accolés (hors cas particuliers) ?
11.5 — Dans chaque formulaire, les champs de même nature sont-ils regroupés, si nécessaire ?
11.6 — Dans chaque formulaire, chaque regroupement de champs de même nature a-t-il une légende ?
11.7 — Dans chaque formulaire, chaque légende associée à un regroupement de champs de même nature est-elle pertinente ?
11.8 — Dans chaque formulaire, les items de même nature d'une liste de choix sont-ils regroupés de manière pertinente ?
11.9 — Dans chaque formulaire, l'intitulé de chaque bouton est-il pertinent (hors cas particuliers) ?
11.10 — Dans chaque formulaire, le contrôle de saisie est-il utilisé de manière pertinente (hors cas particuliers) ?
11.11 — Dans chaque formulaire, le contrôle de saisie est-il accompagné, si nécessaire, de suggestions facilitant la correction des erreurs de saisie ?
11.12 — Pour chaque formulaire qui modifie ou supprime des données, ou qui transmet des réponses à un test ou à un examen, ou dont la validation a des conséquences financières ou juridiques, les données saisies peuvent-elles être modifiées, mises à jour ou récupérées par l'utilisateur ?
11.13 — La finalité d'un champ de saisie peut-elle être déduite pour faciliter le remplissage automatique des champs avec les données de l'utilisateur ?

**Application concrète :** `<label htmlFor>` associé à chaque champ (jamais un simple `placeholder` en guise de label) ; champs de même nature groupés sous `<fieldset>`/`<legend>` pertinent ; erreurs décrites en texte, associées au champ (`aria-describedby`, `aria-invalid`) et suggérant une correction ; type de champ approprié (`type="email"`, `autocomplete="..."`) ; jamais de soumission automatique au changement de valeur.

### 12. Navigation (11 critères)
12.1 — Chaque ensemble de pages dispose-t-il de deux systèmes de navigation différents, au moins (hors cas particuliers) ?
12.2 — Dans chaque ensemble de pages, le menu et les barres de navigation sont-ils toujours à la même place (hors cas particuliers) ?
12.3 — La page « plan du site » est-elle pertinente ?
12.4 — Dans chaque ensemble de pages, la page « plan du site » est-elle accessible à partir d'une fonctionnalité identique ?
12.5 — Dans chaque ensemble de pages, le moteur de recherche est-il atteignable de manière identique ?
12.6 — Les zones de regroupement de contenus présentes dans plusieurs pages web (zones d'en-tête, de navigation principale, de contenu principal, de pied de page et de moteur de recherche) peuvent-elles être atteintes ou évitées ?
12.7 — Dans chaque page web, un lien d'évitement ou d'accès rapide à la zone de contenu principal est-il présent (hors cas particuliers) ?
12.8 — Dans chaque page web, l'ordre de tabulation est-il cohérent ?
12.9 — Dans chaque page web, la navigation ne doit pas contenir de piège au clavier. Cette règle est-elle respectée ?
12.10 — Dans chaque page web, les raccourcis clavier n'utilisant qu'une seule touche (lettre minuscule ou majuscule, ponctuation, chiffre ou symbole) sont-ils contrôlables par l'utilisateur ?
12.11 — Dans chaque page web, les contenus additionnels apparaissant au survol, à la prise de focus ou à l'activation d'un composant d'interface sont-ils si nécessaire atteignables au clavier ?

**Application concrète :** menu de navigation cohérent au même endroit sur toutes les pages ; lien d'évitement (« skip to content ») fonctionnel en tout début de page ; ordre de tabulation logique, jamais de piège au clavier (un utilisateur clavier doit toujours pouvoir sortir d'un composant).

### 13. Consultation (12 critères)
13.1 — Pour chaque page web, l'utilisateur a-t-il le contrôle de chaque limite de temps modifiant le contenu (hors cas particuliers) ?
13.2 — Dans chaque page web, l'ouverture d'une nouvelle fenêtre ne doit pas être déclenchée sans action de l'utilisateur. Cette règle est-elle respectée ?
13.3 — Dans chaque page web, chaque document bureautique en téléchargement possède-t-il, si nécessaire, une version accessible (hors cas particuliers) ?
13.4 — Pour chaque document bureautique ayant une version accessible, cette version offre-t-elle la même information ?
13.5 — Dans chaque page web, chaque contenu cryptique (art ASCII, émoticône, syntaxe cryptique) a-t-il une alternative ?
13.6 — Dans chaque page web, pour chaque contenu cryptique (art ASCII, émoticône, syntaxe cryptique) ayant une alternative, cette alternative est-elle pertinente ?
13.7 — Dans chaque page web, les changements brusques de luminosité ou les effets de flash sont-ils correctement utilisés ?
13.8 — Dans chaque page web, chaque contenu en mouvement ou clignotant est-il contrôlable par l'utilisateur ?
13.9 — Dans chaque page web, le contenu proposé est-il consultable quelle que soit l'orientation de l'écran (portrait ou paysage) (hors cas particuliers) ?
13.10 — Dans chaque page web, les fonctionnalités utilisables ou disponibles au moyen d'un geste complexe peuvent-elles être également disponibles au moyen d'un geste simple (hors cas particuliers) ?
13.11 — Dans chaque page web, les actions déclenchées au moyen d'un dispositif de pointage sur un point unique de l'écran peuvent-elles faire l'objet d'une annulation (hors cas particuliers) ?
13.12 — Dans chaque page web, les fonctionnalités qui impliquent un mouvement de l'appareil ou vers l'appareil peuvent-elles être satisfaites de manière alternative (hors cas particuliers) ?

**Application concrète :** toute limite de temps (session, timeout) est contrôlable par l'utilisateur ; jamais de nouvelle fenêtre/onglet ouvert sans action explicite (et si c'est le cas, l'utilisateur est prévenu avant activation) ; tout contenu en mouvement/clignotant/auto-actualisé (carrousel, auto-refresh) est arrêtable ; export PDF/bureautique a, si besoin, une version accessible équivalente.

## Comportement obligatoire de l'agent (auto-contrôle) — procédure à exécuter à chaque tâche frontend

Ceci n'est pas une vérification informelle "si j'y pense" : c'est une étape
**obligatoire de la définition de fini** pour toute tâche touchant
`frontend/**`, au même titre que faire passer le typecheck. Exécute-la dans
l'ordre, systématiquement :

1. **Identifier les critères concernés par la tâche demandée.** À partir de
   la nature du changement, repère les thématiques et critères pertinents
   dans la liste des 106 ci-dessus — pas les 106 à chaque fois, seulement
   ceux que le changement touche réellement. Exemples de mapping :
   - Formulaire/champ/validation → thématique 11 (+ 3 pour les couleurs
     d'erreur, + 10.7 pour le focus).
   - Image/icône/SVG → thématique 1.
   - Tableau de données → thématique 5.
   - Lien/bouton/CTA → thématique 6 (+ 10.6, 10.7).
   - Modale/dropdown/accordéon/tout composant interactif JS → thématique 7
     (+ 12.8, 12.9 pour le focus trap/ordre de tabulation).
   - Nouvelle page/route → thématique 8, 9, 12.
   - Nouveau composant visuel/couleurs custom → thématique 3, 10.
   - Vidéo/audio → thématique 4.
   - Contenu qui bouge/s'actualise seul (carrousel, auto-refresh, toast
     auto-dismiss) → thématique 13.
2. **Lire la procédure de test exacte** des critères identifiés dans
   [docs/rgaa/methodologie-tests.md](../../docs/rgaa/methodologie-tests.md)
   (lecture ciblée sur les critères concernés, pas le fichier entier si non
   nécessaire) — c'est la procédure qu'un auditeur RGAA suivrait réellement,
   pas une paraphrase.
3. **Vérifier le code produit contre cette procédure**, étape par étape,
   comme le ferait l'auditeur (ex. pour 1.1.1 : l'image a-t-elle bien
   `aria-labelledby`, `aria-label`, `alt` ou `title` ? pour 11.4 : le
   `<label>` est-il bien accolé à son champ ?).
4. **Rends compte du résultat dans ta réponse**, brièvement : quels critères
   ont été vérifiés et le résultat (conforme, ou alerte — voir format
   ci-dessous). Ne saute pas cette étape même si tout est conforme :
   l'utilisateur doit voir que le contrôle a eu lieu, pas juste le résultat
   d'un travail qui prétend l'avoir fait.

Si tu identifies une violation potentielle — même incertaine, même hors du
périmètre strict de la tâche demandée — tu dois **le signaler
explicitement** dans ta réponse à l'utilisateur, avec ce format :

> ⚠️ **RGAA (critère N.M — sujet)** : `<description du problème>` →
> `<correctif proposé>`

- Ce signalement est **proactif** : tu ne l'inclus pas seulement quand on te
  le demande. Traite une violation RGAA avec le même niveau de sérieux qu'une
  faille de sécurité ou une régression de types — jamais en silence.
- En cas de doute réel sur la conformité d'un pattern (ex. usage ARIA
  inhabituel, widget complexe), dis-le et propose de vérifier plutôt que de
  supposer que c'est correct.
- Ne jamais désactiver, contourner ou supprimer un attribut d'accessibilité
  existant (`alt`, `aria-*`, `role`, `tabIndex`, `label`) pour résoudre un
  problème visuel ou de layout — trouve la solution qui préserve les deux.

## Réutilisation et outillage

- Les composants **DSFR** (`@codegouvfr/react-dsfr`) sont conçus pour être
  conformes RGAA par défaut : ils doivent toujours être préférés à un
  composant custom pour cette raison. Ne jamais surcharger leur structure
  interne (ARIA, gestion du focus, rôles) d'une façon qui casserait cette
  garantie.
- Avant de considérer une fonctionnalité UI terminée, vérifie manuellement :
  navigation clavier complète, indicateur de focus visible, contraste des
  couleurs custom introduites, comportement au zoom 200 %.
- Ce repo n'a pas encore d'outillage a11y automatisé (`eslint-plugin-jsx-a11y`,
  `axe-core`/`vitest-axe`). Si tu ajoutes un composant interactif complexe,
  propose explicitement à l'utilisateur d'introduire cet outillage plutôt que
  de t'appuyer uniquement sur une vérification manuelle silencieuse.

## Ce que « connaître par cœur » signifie concrètement

Connaître **le texte et le numéro de chaque critère ci-dessus** au point de
les appliquer par réflexe en écrivant du code, et de pouvoir citer le bon
numéro dans une alerte. Cette liste est la donnée de référence : ne la
recopie pas de mémoire ailleurs, ne l'approxime pas — si ce fichier est un
jour désynchronisé d'une nouvelle version du RGAA, mets-le à jour depuis la
source JSON officielle (voir section « Source de référence ») plutôt que de
deviner. Pour la procédure exacte d'un test (comment un auditeur RGAA
vérifie concrètement un critère), la référence complète est
[docs/rgaa/methodologie-tests.md](../../docs/rgaa/methodologie-tests.md) —
volontairement séparée de ce fichier pour ne pas alourdir chaque tâche
frontend, mais tout aussi exhaustive et vérifiée à la source (258 tests).
