# @zerologementvacant/pdf

Génération de PDF pour les courriers de campagne. Remplace `@zerologementvacant/draft`.

## Pourquoi ce package ?

- **Flexible** : nouvelles templates sans toucher au serveur
- **Rapide** : streaming Node.js natif (~1000 logements sans timeout)
- **Isomorphique** : même code React dans le navigateur et sur le serveur

## Structure

```
src/
  browser.ts        # Point d'entrée navigateur (Viewer, DownloadLink, usePDF…)
  node.ts           # Point d'entrée Node.js (generateCampaignPDF)
  components/       # Primitives réutilisables (Typography, Stack)
  templates/        # Layouts de page (CampaignDocument, CampaignTemplate)
  generators/       # Fonctions de génération avec streaming
  preview/          # App Vite de prévisualisation (dev only)
```

## Entrées d'export

| Import                         | Environnement | Contenu                                              |
|--------------------------------|---------------|------------------------------------------------------|
| `@zerologementvacant/pdf`      | Navigateur    | Viewer, DownloadLink, BlobProvider, usePDF, composants, templates |
| `@zerologementvacant/pdf/node` | Node.js       | `generateCampaignPDF`                                |

## Usage navigateur

```tsx
// Afficher un PDF inline
import { Viewer, CampaignDocument, CampaignTemplate } from '@zerologementvacant/pdf';

<Viewer>
  <CampaignDocument campaign={campaign}>
    <CampaignTemplate draft={draft} housing={housing} owner={owner} />
  </CampaignDocument>
</Viewer>

// Lien de téléchargement
import { DownloadLink, CampaignDocument, CampaignTemplate } from '@zerologementvacant/pdf';

<DownloadLink
  document={
    <CampaignDocument campaign={campaign}>
      <CampaignTemplate draft={draft} housing={housing} owner={owner} />
    </CampaignDocument>
  }
  fileName="courrier.pdf"
>
  Télécharger
</DownloadLink>
```

## Usage Node.js (streaming)

```typescript
import { generateCampaignPDF } from '@zerologementvacant/pdf/node';

const stream = await generateCampaignPDF({ campaign, housings, draft });
res.setHeader('Content-Type', 'application/pdf');
stream.pipeTo(res);
```

`housings` doit contenir `owner` non-null — chaque courrier est personnalisé par logement.

## Templates

### CampaignDocument

Racine du document PDF. Porte les métadonnées (titre, description, auteur, langue, date).

```tsx
import { CampaignDocument } from '@zerologementvacant/pdf';

<CampaignDocument campaign={campaign}>
  {/* une ou plusieurs CampaignTemplate */}
</CampaignDocument>
```

| Prop       | Type          | Description                    |
|------------|---------------|--------------------------------|
| `campaign` | `CampaignDTO` | Source des métadonnées PDF     |
| `children` | `ReactNode`   | Pages du document              |

### CampaignTemplate

Rendu d'un courrier de campagne personnalisé. Une page A4 par logement.

```tsx
import { CampaignTemplate } from '@zerologementvacant/pdf';

<CampaignTemplate draft={draft} housing={housing} owner={owner} />
```

| Prop      | Type         | Description                                           |
|-----------|--------------|-------------------------------------------------------|
| `draft`   | `DraftDTO`   | Contenu du courrier (sujet, corps HTML, logos, expéditeur, signataires) |
| `housing` | `HousingDTO` | Données du logement (pour la substitution de variables) |
| `owner`   | `OwnerDTO`   | Destinataire (nom, adresse)                           |

**Substitution de variables** : le corps HTML (`draft.body`) supporte `{{owner.fullName}}`, `{{housing.*}}` etc. via `replaceVariables()` de `@zerologementvacant/models`.

## Composants primitifs

| Composant    | Description                                               |
|--------------|-----------------------------------------------------------|
| `Typography` | Texte avec variantes `h1`–`h6`, `body`. Police Marianne.  |
| `Stack`      | Flexbox : props `direction`, `spacing`, `style`.          |

Ces composants utilisent `@react-pdf/renderer` (pas du DOM) — ne pas les utiliser hors d'un contexte PDF.

## Référence API

### `generateCampaignPDF(options)` — Node.js uniquement

| Paramètre          | Type           | Description                                    |
|--------------------|----------------|------------------------------------------------|
| `options.campaign` | `CampaignDTO`  | Métadonnées PDF (titre, description, langue)   |
| `options.draft`    | `DraftDTO`     | Contenu du courrier                            |
| `options.housings` | `HousingDTO[]` | Logements (chacun doit avoir `owner` non-null) |

Retourne une `ReadableStream` (Web Streams API) à piper dans la réponse HTTP.

> **Note :** ne jamais importer depuis `@react-pdf/renderer` directement dans le frontend ou le serveur — toujours passer par `@zerologementvacant/pdf`.

## Prévisualiseur

Un prévisualiseur Vite tourne dans le package pour itérer sur les templates sans passer par le serveur ou le frontend.

```bash
yarn nx preview pdf   # lance le prévisualiseur sur localhost
```

Il génère des données factices via les fixtures de `@zerologementvacant/models` et charge des logos depuis `packages/pdf/public/`.

Pour ajouter une template au prévisualiseur : éditer `src/preview/Previewer.tsx`, ajouter un bouton dans la nav et le rendu conditionnel.

## Ajouter une template

1. Créer `src/templates/MonDocument.tsx` — un composant `MonDocument` (racine `<Document>`) et un composant `MonTemplate` (une `<Page>`)
2. Les exporter depuis `src/templates/index.ts`
3. Si génération côté serveur : créer `src/generators/mon-template.tsx`, l'exporter depuis `src/generators/index.ts`
4. Ajouter au prévisualiseur pour valider visuellement
5. Builder : `yarn nx build pdf`

## Tests

```bash
yarn nx test pdf                  # tous les tests
yarn nx test pdf -- campaigns     # fichier spécifique
yarn nx test pdf -- -u            # mettre à jour les snapshots visuels
```

Les tests de générateurs produisent des snapshots PNG via `pdf-to-png-converter`.

## Build

```bash
yarn nx build pdf      # compile le package
yarn nx typecheck pdf  # vérification de types
```
