import { Plugin, Schema, PDFRenderProps } from '@pdfme/common';

export interface PDFSchema extends Schema {
  content?: string;
}

/**
 * Custom PDFme plugin to embed a single-page PDF encoded in base64
 */
export const pdfPlugin: Plugin<PDFSchema> = {
  ui: async () => {
  },

  pdf: async ({ page, schema, value }: PDFRenderProps<PDFSchema>) => {

    const { width, height, position } = schema;
    if (!value || typeof value !== 'string') return;

    const match = value.match(/^data:application\/pdf;base64,(.+)/);
    if (!match) return;

    const pdfData = Buffer.from(match[1], 'base64');
    const [embeddedPage] = await page.doc.embedPdf(pdfData, [0]);

    page.drawPage(embeddedPage, {
      x: position.x,
      y: page.getSize().height - position.y - height,
      width,
      height,
    });
  },

  propPanel: {
    schema: {},
    defaultSchema: {
      name: 'defaultPDF',
      type: 'pdf',
      position: { x: 0, y: 0 },
      width: 0,
      height: 0,
    },
  },
};
