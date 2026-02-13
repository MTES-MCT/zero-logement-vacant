import { Document, renderToStream } from '@react-pdf/renderer';
import type { HousingDTO } from '@zerologementvacant/models';
import { Readable } from 'node:stream';

import { HousingTemplate } from '../templates/index.js';

interface GenerateOptions {
  housings: HousingDTO[];
}

/**
 * Generate PDF for one or multiple housings.
 * Returns a web ReadableStream suitable for piping to HTTP response.
 */
export async function generate(options: GenerateOptions) {
  const { housings } = options;

  // Create document with all housing pages
  const document = (
    <Document>
      {housings.map((housing) => (
        <HousingTemplate key={housing.id} housing={housing} />
      ))}
    </Document>
  );

  // renderToStream returns Node.js Readable, wrap into web ReadableStream
  const nodeStream = await renderToStream(document);

  return Readable.toWeb(nodeStream as unknown as Readable);
}
