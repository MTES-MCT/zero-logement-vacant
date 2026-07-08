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

## Source de référence (canonique)

Référentiel officiel : <https://accessibilite.numerique.gouv.fr/methode/criteres-et-tests/>

Version en vigueur au moment de la rédaction de ce fichier : **RGAA 4.1.2**
(déclinaison française de WCAG 2.1 niveau AA), organisée en **13 thématiques**
et **106 critères de contrôle**, eux-mêmes décomposés en tests élémentaires.

**Important — numérotation exacte :** la numérotation précise des critères
(ex. « critère 7.3 ») peut varier d'une version du RGAA à l'autre, et les
outils de résumé automatique ne restituent pas toujours l'intégralité de la
page de référence de façon fiable. Par conséquent :

- Tu dois connaître **le fond de chaque règle par cœur** (ce qui suit dans ce
  document) — c'est ce qui doit guider ton code au quotidien, sans avoir à
  consulter une page à chaque ligne écrite.
- Si tu dois **citer un numéro de critère précis** dans un document formel
  (rapport d'audit, description de PR, commentaire de revue officiel),
  **revérifie-le** via WebFetch/WebSearch sur l'URL ci-dessus plutôt que de
  te fier à un numéro mémorisé — ne jamais inventer ou approximer un numéro
  de critère dans un livrable destiné à être cité comme référence.
- L'absence de certitude sur un numéro exact n'est **jamais** une excuse pour
  ignorer la règle de fond correspondante.

## Les 13 thématiques du RGAA — checklist obligatoire

Pour chaque changement frontend, passe en revue mentalement ces 13 axes.
Chaque ligne ci-dessous est une reformulation opérationnelle des critères
officiels, applicable directement dans le contexte DSFR/MUI/React de ce repo.

### 1. Images
- Toute image informative (`<img>`, `background-image` porteuse de sens,
  icône SVG cliquable) a une alternative textuelle pertinente (`alt`,
  `aria-label`, ou équivalent).
- Toute image décorative a `alt=""` (jamais d'`alt` absent) ou
  `aria-hidden="true"`, et n'est jamais focusable.
- Les images complexes (graphiques, cartes) ont une description détaillée
  accessible à proximité, pas seulement dans l'`alt`.
- Ne jamais utiliser une image pour représenter du texte quand une vraie
  balise texte stylée peut faire l'affaire.

### 2. Cadres (iframes)
- Chaque `<iframe>` a un attribut `title` explicite et pertinent décrivant
  son contenu/fonction (ex. carte, lecteur vidéo, widget tiers).

### 3. Couleurs
- L'information ne doit **jamais** être portée par la couleur seule (ex. un
  statut rouge/vert doit aussi avoir un texte, une icône ou un motif).
- Tout élément recevant un effet de contraste (lien souligné au survol,
  focus, état actif) reste perceptible même sans distinction de couleur.

### 4. Multimédia
- Toute vidéo/audio préenregistré a, si nécessaire, transcription textuelle,
  sous-titres et/ou audiodescription pertinents.
- Aucun contenu ne doit clignoter/flasher de façon susceptible de déclencher
  une crise d'épilepsie photosensible.

### 5. Tableaux
- Tout tableau de données a un titre (`<caption>` ou équivalent accessible)
  pertinent.
- Structure correcte : en-têtes `<th scope="col"|"row">`, pas de tableau
  utilisé à des fins de mise en page.

### 6. Liens
- Tout lien est explicite hors contexte : jamais « cliquer ici », « en savoir
  plus » sans contexte associé (utiliser `aria-label`/`aria-labelledby` si le
  libellé visuel est insuffisant).
- Deux liens au texte identique mais menant à des destinations différentes
  doivent être distingués (libellé ou attribut accessible).

### 7. Scripts
- Tout composant interactif en JS (dropdown, accordéon, modale, DSFR
  `Modal`, tabs) reste **entièrement utilisable au clavier** (Tab, Shift+Tab,
  Entrée, Espace, Échap, flèches si composite widget) et expose les rôles/
  états ARIA corrects (`role`, `aria-expanded`, `aria-selected`,
  `aria-modal`, etc.).
- Tout contenu généré dynamiquement et pertinent pour l'utilisateur (message
  d'erreur, résultat de recherche, toast) doit être annoncé aux technologies
  d'assistance (`aria-live`, focus management), pas seulement affiché
  visuellement.

### 8. Éléments obligatoires
- Chaque page a un `<title>` de page pertinent et à jour selon le contenu.
- La langue par défaut du document est déclarée (`<html lang="fr">`).

### 9. Structuration de l'information
- Hiérarchie de titres cohérente et sans saut (`h1` → `h2` → `h3`, jamais de
  niveau sauté pour des raisons de style).
- Vraies listes sémantiques (`<ul>`, `<ol>`, `<dl>`) pour tout contenu qui est
  une liste, jamais simulées avec des `<div>`/tirets.
- Citations, mise en emphase, changements de langue, abréviations sont
  balisés sémantiquement (`<blockquote>`, `<em>`/`<strong>`, `lang="en"`
  inline, `<abbr>`), pas seulement stylés visuellement.

### 10. Présentation de l'information
- L'information n'est jamais donnée uniquement par la forme, la taille ou la
  position (ex. « le bouton à droite » sans libellé).
- Contraste minimum **4.5:1** pour le texte normal, **3:1** pour le grand
  texte (≥18pt ou ≥14pt gras) et pour les éléments d'interface non textuels
  significatifs (icônes porteuses de sens, bordures d'input en erreur).
- Jamais de texte justifié. Interlignage et espacement suffisants. Pas de
  texte sous forme d'image sauf logo/exception justifiée.

### 11. Formulaires
- Chaque champ a un `<label>` associé programmatiquement (`htmlFor`/`id`),
  jamais un simple placeholder en guise de label.
- Type de champ approprié (`type="email"`, `type="tel"`, etc.) pour
  bénéficier de l'assistance native.
- Erreurs de saisie identifiées, décrites en texte, associées au champ
  concerné (`aria-describedby`, `aria-invalid`) et suggérant une correction.
- Présence d'un bouton de soumission explicite ; jamais de soumission
  automatique au changement de valeur.
- Champs obligatoires signalés de façon non ambiguë (pas uniquement par la
  couleur — cf. thématique 3).

### 12. Navigation
- Menu de navigation cohérent, présent au même endroit sur toutes les pages.
- Lien d'évitement / accès direct au contenu principal (« skip to content »)
  présent et fonctionnel en tout début de page.

### 13. Consultation
- L'utilisateur peut arrêter/mettre en pause tout contenu en mouvement,
  clignotant ou qui se met à jour automatiquement (carrousel, auto-refresh).
- Le contenu reste utilisable et lisible avec un zoom texte à 200 % et en
  redimensionnement de fenêtre (reflow), sans scroll horizontal ni perte de
  fonctionnalité.

## Comportement obligatoire de l'agent (auto-contrôle)

- Avant de considérer terminé tout changement touchant au balisage, au style
  ou à l'interactivité frontend, **relis ton propre diff** à travers la
  checklist des 13 thématiques ci-dessus.
- Si tu identifies une violation potentielle — même incertaine, même hors du
  périmètre strict de la tâche demandée — tu dois **le signaler
  explicitement** dans ta réponse à l'utilisateur, avec ce format :

  > ⚠️ **RGAA (thématique N — sujet)** : `<description du problème>` →
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

Connaître le **fond** de chaque règle ci-dessus au point de l'appliquer par
réflexe en écrivant du code — pas mémoriser un tableau de numéros de
critères qui peut devenir obsolète d'une version du RGAA à l'autre. La
numérotation se vérifie à la source si besoin (voir section précédente) ;
la substance des règles, elle, doit être connue et appliquée sans avoir à
la relire.
