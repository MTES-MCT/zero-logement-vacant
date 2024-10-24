import async from 'async';
import { ReadableStream } from 'node:stream/web';
import * as handlebars from 'handlebars';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import puppeteer from 'puppeteer';
import { Logger } from '@zerologementvacant/utils';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
global.ReadableStream = ReadableStream;

handlebars.registerHelper('localdate', (date: string) => {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
});

interface TransformerOptions {
  logger: Logger;
}

const A4_WIDTH = Math.round(toPixels(595));
const A4_HEIGHT = Math.round(toPixels(842));

function createTransformer(opts: TransformerOptions) {
  const { logger } = opts;
  const cache = new Map<string, (data: unknown) => string>();
  const images: Image[] = [];

  return {
    compile<T>(template: string, data?: T): string {
      const render = cache.get(template) ?? handlebars.compile(template);
      if (!cache.has(template)) {
        cache.set(template, render);
      }
      return render(data);
    },
    async fromSingleHTML(html: string): Promise<PDFDocument> {
      // Launch the browser and open a new blank page
      const browser = await puppeteer.launch({
        args: ['--no-sandbox'],
        defaultViewport: {
          width: A4_WIDTH,
          height: A4_HEIGHT
        }
      });

      const tab = await browser.newPage();
      await tab.setContent(html, {
        waitUntil: 'networkidle0'
      });
      await tab.addStyleTag({
        path: path.join(
          __dirname,
          '..',
          'node_modules',
          '@codegouvfr',
          'react-dsfr',
          'dsfr',
          'dsfr.min.css'
        )
      });
      await tab.addStyleTag({
        path: path.join(__dirname, 'templates', 'draft', 'draft.css')
      });

      // Retrieve images from the HTML only once
      if (images.length === 0) {
        const elements = await tab.$$eval('img', (images) => {
          return images.map((image) => {
            const { x, y, width, height } = image.getBoundingClientRect();
            return {
              content: image.src,
              width: width,
              height: height,
              x: x,
              y: y
            };
          });
        });
        images.push(...elements);
      }

      // Remove images from the HTML
      await tab.$$eval('img', (images) => {
        images.forEach((image) => {
          image.remove();
        });
      });
      const buffer = await tab.pdf({ format: 'A4' });
      const chunk = await PDFDocument.load(buffer);

      // Clean up
      await tab.close();
      await browser.close();

      return chunk;
    },
    async merge(pdf: PDFDocument, chunk: PDFDocument): Promise<PDFDocument> {
      const pages = await pdf.copyPages(chunk, chunk.getPageIndices());
      pages.forEach((page) => {
        pdf.addPage(page);
      });
      return pdf;
    },
    async save(pdf: PDFDocument): Promise<Buffer> {
      // Embed images into the PDF
      await async.forEach(images, async (image) => {
        const content = image.content.substring(image.content.indexOf('/9j/'));
        const embed = await pdf.embedJpg(content);
        pdf.getPages().forEach((page) => {
          page.drawImage(embed, {
            x: toPoints(image.x),
            // The Y-axis is inverted in the PDF specification
            y: page.getHeight() - toPoints(image.y) - toPoints(image.height),
            width: toPoints(image.width),
            height: toPoints(image.height)
          });
        });
      });
      const final = await pdf.save();
      return Buffer.from(final);
    },
    async fromHTML(htmls: string[]): Promise<Buffer> {
      let index = 1;
      const pdf = await PDFDocument.create();

      await async.forEachSeries(htmls, async (html) => {
        // Launch the browser and open a new blank page
        const browser = await puppeteer.launch({
          args: ['--no-sandbox'],
          defaultViewport: {
            width: A4_WIDTH,
            height: A4_HEIGHT
          }
        });

        logger.debug(`Generating PDF page ${index} of ${htmls.length}...`);
        index++;
        const tab = await browser.newPage();
        await tab.setContent(html, {
          waitUntil: 'networkidle0'
        });
        await tab.addStyleTag({
          path: path.join(
            __dirname,
            '..',
            'node_modules',
            '@codegouvfr',
            'react-dsfr',
            'dsfr',
            'dsfr.min.css'
          )
        });
        await tab.addStyleTag({
          path: path.join(__dirname, 'templates', 'draft', 'draft.css')
        });

        // Retrieve images from the HTML only once
        if (images.length === 0) {
          const elements = await tab.$$eval('img', (images) => {
            return images.map((image) => {
              const { x, y, width, height } = image.getBoundingClientRect();
              return {
                content: image.src,
                width: width,
                height: height,
                x: x,
                y: y
              };
            });
          });
          images.push(...elements);
        }

        // Remove images from the HTML
        await tab.$$eval('img', (images) => {
          images.forEach((image) => {
            image.remove();
          });
        });
        const buffer = await tab.pdf({ format: 'A4' });
        const chunk = await PDFDocument.load(buffer);
        const pages = await pdf.copyPages(chunk, chunk.getPageIndices());
        pages.forEach((page) => {
          pdf.addPage(page);
        });
        // Clean up
        await tab.close();
        await browser.close();
      });

      // Embed images into the PDF
      await async.forEach(images, async (image) => {
        const content = image.content.substring(image.content.indexOf('/9j/'));
        const embed = await pdf.embedJpg(content);
        pdf.getPages().forEach((page) => {
          page.drawImage(embed, {
            x: toPoints(image.x),
            // The Y-axis is inverted in the PDF specification
            y: page.getHeight() - toPoints(image.y) - toPoints(image.height),
            width: toPoints(image.width),
            height: toPoints(image.height)
          });
        });
      });

      const mergedPDF = await pdf.save();
      logger.info('Saved generated PDF');
      return Buffer.from(mergedPDF);
    }
  };
}

function toPoints(px: number): number {
  return px * 0.75;
}

function toPixels(pt: number): number {
  return (pt * 96) / 72;
}

/**
 * An image extracted from the rendered HTML to be embedded into the PDF.
 * All units are in pixels, and the origin is the top-left corner of the page.
 * They shall be converted to points before being used in the PDF.
 * Also, the Y-axis is inverted in the PDF, so the Y-coordinate must be adjusted.
 */
interface Image {
  content: string;
  width: number;
  height: number;
  x: number;
  y: number;
}

export default {
  createTransformer
};
