// packages/pdf/src/generators/housings.tsx
import React from 'react';
import { renderToStream, Document } from '@react-pdf/renderer';
import { Readable } from 'stream';
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

  return Readable.toWeb(nodeStream as any) as ReadableStream;
}
