# Génération de PDF

> Documentation technique : [packages/pdf/README.md](../../packages/pdf/README.md)

## Qu'est-ce que c'est ?

`@zerologementvacant/pdf` est le moteur de génération de courriers PDF de ZLV.
Il remplace l'ancien système (`@zerologementvacant/draft`) par une solution plus
rapide et plus flexible.

Il alimente deux cas d'usage :

- **Prévisualisation** : l'agent voit le rendu de son courrier en temps réel
  dans le navigateur, avant d'envoyer la campagne
- **Génération en masse** : le serveur produit un PDF multi-pages (un courrier
  par logement) lors du déclenchement d'une campagne

## Fonctionnalités

### Courrier de campagne personnalisé

Chaque courrier est généré individuellement pour chaque logement et son
propriétaire. Les variables du corps du message (ex. `{{owner.fullName}}`)
sont remplacées automatiquement.

### Logos de l'expéditeur

L'agent peut associer un ou plusieurs logos à son courrier (ex. logo de la
collectivité). Ils apparaissent en en-tête de chaque page.

### Signataires

Le courrier affiche les signataires en pied de page, avec leur nom, rôle
et signature numérique.

### Métadonnées PDF

Le fichier PDF généré intègre automatiquement le titre et la description de
la campagne, ainsi que la langue (français) et l'auteur ("Zéro Logement
Vacant"), aussi bien lors de la prévisualisation dans le navigateur que lors
de la génération en masse côté serveur.

## Limites connues

- Un seul type de document disponible : le courrier de campagne
- La mise en page n'est pas personnalisable par l'agent
- Le prévisualiseur affiche un seul logement à titre d'exemple ;
  le PDF final en contiendra autant que la campagne en compte
