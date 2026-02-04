# PDF Generation Design

**Date:** 2026-02-04
**Status:** Approved
**Package:** `@zerologementvacant/pdf`

## Overview

Create a reusable PDF generation package that supports:
- **Instant browser export** for single housing
- **Bulk server export** for multiple housings (streaming, 1000+ housings)
- **Campaign PDF generation** with personalized draft letters

**Key principles:**
- Works in both browser and Node.js
- Abstracts @react-pdf/renderer implementation
- DSFR-compliant styling
- Flexible, customizable templates

---

## 1. Package Structure & Setup

**Location:** `packages/pdf/`

**Dependencies:**
```json
{
  "dependencies": {
    "@react-pdf/renderer": "4.3.2",
    "react-pdf-html": "2.1.5",
    "@zerologementvacant/models": "workspace:*",
    "react": "18.3.1"
  },
  "devDependencies": {
    "@faker-js/faker": "8.4.1",
    "@tsconfig/node20": "20.1.6",
    "@types/node": "20.19.10",
    "@types/react": "18.3.18",
    "pdf-to-png-converter": "^3.4.0"
  }
}
```

**File structure:**
```
packages/pdf/
├── src/
│   ├── components/          # Primitives (Typography, Stack)
│   │   ├── Typography.tsx
│   │   ├── Stack.tsx
│   │   └── index.ts
│   ├── templates/           # PDF templates
│   │   ├── Housing.tsx      # Single housing detail
│   │   ├── Campaign.tsx     # Campaign letter
│   │   └── index.ts
│   ├── generators/          # PDF generation functions
│   │   ├── housings.ts      # Housing exports
│   │   └── campaigns.ts     # Campaign exports
│   └── index.ts             # Public exports
├── tsconfig.json            # Extends ../../tsconfig.base.json
├── tsconfig.lib.json        # Build config
├── tsconfig.spec.json       # Test config
├── vitest.config.ts
└── package.json
```

**Build target:** Dual export (ESM + CJS), same pattern as `@zerologementvacant/models`.

---

## 2. Core Architecture

**Abstraction principle:** Apps never import `@react-pdf/renderer` directly. The `@zerologementvacant/pdf` package encapsulates all PDF logic.

### Browser Usage

```typescript
import { Viewer, DownloadLink } from '@zerologementvacant/pdf';
import { HousingTemplate } from '@zerologementvacant/pdf/templates';

// Display PDF in browser (wraps PDFViewer)
<Viewer>
  <HousingTemplate housing={housing} />
</Viewer>

// Download button (wraps PDFDownloadLink)
<DownloadLink
  document={<HousingTemplate housing={housing} />}
  fileName="logement.pdf"
>
  Télécharger PDF
</DownloadLink>
```

### Node.js Usage

```typescript
import { generateHousingsPDF } from '@zerologementvacant/pdf';

// In Express route handler - returns web ReadableStream
const stream = await generateHousingsPDF(housings);

res.setHeader('Content-Type', 'application/pdf');
stream.pipeTo(res);
```

### Internal Implementation

- **Browser**: `Viewer`/`DownloadLink` wrap `PDFViewer`/`PDFDownloadLink` from @react-pdf/renderer
- **Node.js**: Use `renderToStream()` → wrap Node Readable into web ReadableStream
- **Bulk exports**: Single `<Document>` with multiple `<Page>` components:
  ```tsx
  {housings.map(housing => (
    <HousingTemplate key={housing.id} housing={housing} />
  ))}
  ```
- **Variable replacement**: Before rendering, `replaceVariables(draft.body, { housing, owner })`

### Streaming Strategy

For 1000+ housings:
- Render all pages in a single `<Document>`
- @react-pdf/renderer generates complete PDF
- Stream final buffer to HTTP response

Memory consideration: PDF builds in memory before streaming. For extremely large exports (5000+), can optimize later with batching.

---

## 3. React Components & Primitives

**Design philosophy:** Wrap @react-pdf/renderer primitives with DSFR-compliant styling.

### Typography Component

```tsx
import { Text, StyleSheet } from '@react-pdf/renderer';

interface TypographyProps {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body';
  children: React.ReactNode;
}

export function Typography({ variant = 'body', children }: TypographyProps) {
  return <Text style={styles[variant]}>{children}</Text>;
}

// DSFR-compliant values (desktop/print sizes)
const styles = StyleSheet.create({
  h1: {
    fontSize: 40,        // 2.5rem (desktop)
    lineHeight: 48,      // 3rem
    fontWeight: 700,
    marginBottom: 24     // 1.5rem
  },
  h2: {
    fontSize: 32,        // 2rem
    lineHeight: 40,      // 2.5rem
    fontWeight: 700,
    marginBottom: 24
  },
  h3: {
    fontSize: 28,        // 1.75rem
    lineHeight: 36,      // 2.25rem
    fontWeight: 700,
    marginBottom: 24
  },
  h4: {
    fontSize: 24,        // 1.5rem
    lineHeight: 32,      // 2rem
    fontWeight: 700,
    marginBottom: 24
  },
  h5: {
    fontSize: 20,        // 1.25rem
    lineHeight: 28,      // 1.75rem
    fontWeight: 700,
    marginBottom: 24
  },
  h6: {
    fontSize: 18,        // 1.125rem
    lineHeight: 24,      // 1.5rem
    fontWeight: 700,
    marginBottom: 24
  },
  body: {
    fontSize: 16,        // 1rem
    lineHeight: 24,      // 1.5rem
    marginBottom: 24     // 1.5rem per DSFR spacing
  }
});
```

**Note:** h2-h6 values are approximations based on typical type scales. Fine-tune after visual testing.

### Stack Component

```tsx
import { View, StyleSheet } from '@react-pdf/renderer';

interface StackProps {
  direction?: 'row' | 'column';
  spacing?: number;
  children: React.ReactNode;
}

export function Stack({
  direction = 'column',
  spacing = 8,
  children
}: StackProps) {
  return (
    <View style={[
      styles[direction],
      { gap: spacing }
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  column: { flexDirection: 'column' }
});
```

---

## 4. Templates Structure

**Philosophy:** Templates are React components that return `<Page>` elements (not `<Document>`). The generator wraps them in `<Document>` for composability.

### Housing Template

```tsx
// src/templates/Housing.tsx
import React from 'react';
import { Page, View, StyleSheet } from '@react-pdf/renderer';
import { Typography, Stack } from '../components';
import type { HousingDTO } from '@zerologementvacant/models';

interface HousingTemplateProps {
  housing: HousingDTO;
}

export function HousingTemplate({ housing }: HousingTemplateProps) {
  return (
    <Page size="A4" style={styles.page}>
      <Stack spacing={8}>
        <Typography variant="h1">Fiche Logement</Typography>

        {/* Address section */}
        <View>
          <Typography variant="h3">Adresse</Typography>
          {housing.rawAddress.map((line, index) => (
            <Typography key={index} variant="body">{line}</Typography>
          ))}
        </View>

        {/* Housing details */}
        <View>
          <Typography variant="h3">Caractéristiques</Typography>
          <Stack direction="row" spacing={16}>
            <Typography variant="body">
              Surface: {housing.livingArea ?? 'N/A'} m²
            </Typography>
            <Typography variant="body">
              Pièces: {housing.roomsCount ?? 'N/A'}
            </Typography>
          </Stack>
        </View>

        {/* Owner section */}
        {housing.owner && (
          <View>
            <Typography variant="h3">Propriétaire</Typography>
            <Typography variant="body">
              {housing.owner.fullName}
            </Typography>
          </View>
        )}
      </Stack>
    </Page>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#ffffff'
  }
});
```

**Note:** This is a sample template - actual layout will be customized.

### Campaign Template

```tsx
// src/templates/Campaign.tsx
import { Page, View } from '@react-pdf/renderer';
import Html from 'react-pdf-html';
import type { HousingDTO, DraftDTO } from '@zerologementvacant/models';

interface CampaignTemplateProps {
  housing: HousingDTO;
  draft: DraftDTO; // Body already personalized
}

export function CampaignTemplate({ draft }: CampaignTemplateProps) {
  return (
    <Page size="A4">
      <View>
        <Html>{draft.body}</Html>
      </View>
    </Page>
  );
}
```

---

## 5. Generators API

### Housings Generator

**File:** `src/generators/housings.ts`

```typescript
import { renderToStream } from '@react-pdf/renderer';
import { Document } from '@react-pdf/renderer';
import { HousingTemplate } from '../templates';
import type { HousingDTO } from '@zerologementvacant/models';

interface GenerateOptions {
  housings: HousingDTO[];
}

/**
 * Generate PDF for one or multiple housings.
 * Returns a web ReadableStream suitable for piping to HTTP response.
 */
export async function generate(options: GenerateOptions): Promise<ReadableStream> {
  const { housings } = options;

  // Create document with all housing pages
  const document = (
    <Document>
      {housings.map(housing => (
        <HousingTemplate key={housing.id} housing={housing} />
      ))}
    </Document>
  );

  // renderToStream returns Node.js Readable, wrap into web ReadableStream
  const nodeStream = await renderToStream(document);

  return Readable.toWeb(nodeStream);
}
```

### Campaigns Generator

**File:** `src/generators/campaigns.ts`

```typescript
import { renderToStream } from '@react-pdf/renderer';
import { Document } from '@react-pdf/renderer';
import { CampaignTemplate } from '../templates/Campaign';
import { replaceVariables } from '@zerologementvacant/models'; // Existing utility
import type { HousingDTO, DraftDTO } from '@zerologementvacant/models';

interface GenerateCampaignOptions {
  housings: HousingDTO[];
  draft: DraftDTO;
}

export async function generate(options: GenerateCampaignOptions): Promise<ReadableStream> {
  const { housings, draft } = options;

  const nodeStream = await renderToStream(
    <Document>
      {housings.map(housing => {
        // Replace variables for each housing
        const personalizedBody = replaceVariables(draft.body, {
          housing,
          owner: housing.owner
        });

        // Create personalized draft
        const personalizedDraft = {
          ...draft,
          body: personalizedBody
        };

        return (
          <CampaignTemplate
            key={housing.id}
            housing={housing}
            draft={personalizedDraft}
          />
        );
      })}
    </Document>
  );

  return Readable.toWeb(nodeStream);
}
```

### Public Exports

**File:** `src/index.ts`

```typescript
export { PDFViewer as Viewer, PDFDownloadLink as DownloadLink } from '@react-pdf/renderer';
export { HousingTemplate, CampaignTemplate } from './templates';
export { generate as generateHousingsPDF } from './generators/housings';
export { generate as generateCampaignPDF } from './generators/campaigns';
```

### Usage Example (Express)

```typescript
import { generateHousingsPDF } from '@zerologementvacant/pdf';

app.get('/api/export/housings', async (req, res) => {
  const housings = await getHousings(req.query);
  const stream = await generateHousingsPDF({ housings });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="export.pdf"');

  stream.pipeTo(res);
});
```

---

## 6. Testing Strategy

**Approach:** Visual regression testing - PDFs are visual documents, test them visually.

### Strategy

1. Generate PDF for test fixtures (with fixed data)
2. Convert PDF to PNG images (one per page)
3. Use Vitest's `toMatchSnapshot()` for image comparison
4. Update snapshots when layout changes intentionally

### Dependencies

```json
{
  "devDependencies": {
    "pdf-to-png-converter": "^3.4.0"
  }
}
```

### Example Test

```typescript
// src/templates/Housing.test.ts
import { describe, it, expect } from 'vitest';
import { generateHousingsPDF } from '../generators/housings';
import { genHousingDTO } from '@zerologementvacant/models/fixtures';
import { pdfToPng } from 'pdf-to-png-converter';

describe('HousingTemplate visual regression', () => {
  it('should match visual snapshot', async () => {
    // Use fixed data for consistent snapshots
    const housing = genHousingDTO({
      id: 'test-123',
      rawAddress: ['123 Rue de la Paix', '75001 Paris'],
      livingArea: 50,
      roomsCount: 2,
      owner: {
        fullName: 'Jean Dupont'
      }
    });

    const stream = await generateHousingsPDF({ housings: [housing] });
    const buffer = await streamToBuffer(stream);

    // Convert PDF to PNG (returns array of pages)
    const pngPages = await pdfToPng(buffer, { viewportScale: 2.0 });

    // Snapshot each page
    for (const [index, page] of pngPages.entries()) {
      expect(page.content).toMatchSnapshot(`housing-page-${index + 1}.png`);
    }
  });
});

async function streamToBuffer(stream: ReadableStream): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  return Buffer.concat(chunks);
}
```

### Running Tests

```bash
yarn nx test pdf              # Compare against snapshots
yarn nx test pdf -- -u        # Update snapshots when layout changes
```

### Benefits

- Visual regression catches layout issues
- Vitest handles image diffing automatically
- Snapshots stored in `__snapshots__/` directory

---

## 7. Variable Replacement Integration

**For campaign PDFs:** Draft HTML contains variables like `{{owner.fullName}}` that need replacement before rendering.

### Integration

Variables are replaced using the existing `replaceVariables()` utility from `@zerologementvacant/models`:

```typescript
const personalizedBody = replaceVariables(draft.body, {
  housing,
  owner: housing.owner
});

const personalizedDraft = {
  ...draft,
  body: personalizedBody
};
```

### Flow

1. **Before rendering**: Replace variables in HTML string
2. **Pass to template**: Template receives personalized draft
3. **Parse HTML**: `react-pdf-html` converts HTML to React PDF components
4. **Render PDF**: @react-pdf/renderer generates final PDF

---

## Implementation Notes

### Phase 1: MVP
- Create package structure
- Implement Typography and Stack primitives
- Create sample HousingTemplate
- Implement housings generator (Node.js only)
- Add basic tests

### Phase 2: Browser Support
- Wrap Viewer and DownloadLink components
- Test browser rendering

### Phase 3: Campaign Support
- Create CampaignTemplate
- Implement campaigns generator
- Integrate variable replacement
- Add react-pdf-html for HTML parsing

### Phase 4: Visual Testing
- Set up visual regression tests
- Create baseline snapshots

### Future Optimizations (if needed)
- Batch processing for 5000+ housings
- PDF merging with pdf-lib for true streaming
- Custom fonts (Marianne, Spectral)
- Additional DSFR components (tables, badges, etc.)

---

## Success Criteria

- ✅ Single housing export works in browser
- ✅ Bulk export (100+ housings) works on server
- ✅ Campaign PDF with personalized drafts generates correctly
- ✅ PDFs are DSFR-compliant (typography, spacing)
- ✅ Visual regression tests catch layout changes
- ✅ Memory usage acceptable for 1000+ housing exports
- ✅ Package is reusable across frontend and server
