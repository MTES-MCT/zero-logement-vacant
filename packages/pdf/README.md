# @zerologementvacant/pdf

PDF generation package for housing exports using React components.

## Features

- 🖥️ **Browser & Node.js** - Works in both environments
- ⚛️ **React-based** - Build PDFs with React components
- 🎨 **DSFR-compliant** - French government design system
- 📄 **Templates** - Reusable Housing and Campaign templates
- 🔄 **Streaming** - Handle 1000+ housings efficiently

## Installation

```bash
yarn add @zerologementvacant/pdf
```

## Usage

### Browser - Display PDF

```tsx
import { Viewer, HousingTemplate } from '@zerologementvacant/pdf';

function HousingPDF({ housing }) {
  return (
    <Viewer>
      <HousingTemplate housing={housing} />
    </Viewer>
  );
}
```

### Browser - Download PDF

```tsx
import { DownloadLink, HousingTemplate } from '@zerologementvacant/pdf';

function DownloadButton({ housing }) {
  return (
    <DownloadLink
      document={<HousingTemplate housing={housing} />}
      fileName="logement.pdf"
    >
      Télécharger PDF
    </DownloadLink>
  );
}
```

### Node.js - Generate PDF

```typescript
import { generateHousingsPDF } from '@zerologementvacant/pdf';

app.get('/api/export', async (req, res) => {
  const housings = await getHousings();
  const stream = await generateHousingsPDF({ housings });

  res.setHeader('Content-Type', 'application/pdf');
  stream.pipeTo(res);
});
```

### Campaign with Variable Replacement

```typescript
import { generateCampaignPDF } from '@zerologementvacant/pdf';

const stream = await generateCampaignPDF({
  housings: [housing1, housing2],
  draft: {
    subject: 'Important Notice',
    body: '<p>Bonjour {{owner.fullName}},</p>'
  }
});
```

## Components

### Typography

```tsx
import { Typography } from '@zerologementvacant/pdf';

<Typography variant="h1">Heading</Typography>
<Typography variant="body">Body text</Typography>
```

Variants: `h1`, `h2`, `h3`, `h4`, `h5`, `h6`, `body`

### Stack

```tsx
import { Stack } from '@zerologementvacant/pdf';

<Stack direction="column" spacing={16}>
  <Typography>Item 1</Typography>
  <Typography>Item 2</Typography>
</Stack>
```

## Templates

### HousingTemplate

Displays housing information (address, characteristics, owner).

### CampaignTemplate

Renders personalized campaign letters with HTML content and variable replacement.

## Testing

```bash
# Run all tests
yarn nx test pdf

# Run with visual snapshots update
yarn nx test pdf -- -u

# Run specific test file
yarn nx test pdf -- Housing
```

## Development

```bash
# Build package
yarn nx build pdf

# Type check
yarn nx typecheck pdf
```

## Architecture

- **Components**: Reusable primitives (Typography, Stack)
- **Templates**: Composable page layouts (Housing, Campaign)
- **Generators**: PDF creation functions with streaming support

Uses @react-pdf/renderer for PDF generation and react-pdf-html for HTML parsing.
