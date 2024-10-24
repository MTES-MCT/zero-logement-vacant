import async from 'async';
import { ReadableStream } from 'node:stream/web';
import * as handlebars from 'handlebars';
import path from 'node:path';
import { PDFDocument, PDFImage } from 'pdf-lib';
import puppeteer from 'puppeteer';
import { match } from 'ts-pattern';
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
  /**
   * For each image, its position on each page of the PDF.
   */
  const imagePositions: Map<Image['id'], ReadonlyArray<Position>> = new Map();

  return {
    compile<T>(template: string, data?: T): string {
      const render = cache.get(template) ?? handlebars.compile(template);
      if (!cache.has(template)) {
        cache.set(template, render);
      }
      return render(data);
    },

    async fromHTML(html: string): Promise<PDFDocument> {
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

      const elements = await tab.$$eval('img', (images) => {
        return images.map((image) => {
          const { x, y, width, height } = image.getBoundingClientRect();
          return {
            id: image.id,
            content: image.src,
            width: width,
            height: height,
            x: x,
            y: y
          };
        });
      });
      // Retrieve images from the HTML only once
      if (images.length === 0) {
        images.push(...elements);
      }
      // Save image positions
      elements.forEach((element) => {
        const positions: ReadonlyArray<Position> = (
          imagePositions.get(element.id) ?? []
        ).concat({
          x: element.x,
          y: element.y
        });
        logger.debug('Saving image positions for later...', {
          image: element.id,
          positions
        });
        imagePositions.set(element.id, positions);
      });

      // Hide images to avoid rendering them in the PDF but keep their space
      // so that the text is not shifted
      await tab.$$eval('img', (images) => {
        images.forEach((image) => {
          const style = image.getAttribute('style') ?? '';
          const styles = style.concat('visibility: hidden;');
          image.setAttribute('style', styles);
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

    async embed(pdf: PDFDocument, image: Image): Promise<PDFImage> {
      return match(image)
        .when(
          (image) => image.content.startsWith('data:image/jpeg'),
          async (image) => {
            const content = image.content.substring(
              image.content.indexOf('/9j/')
            );
            return pdf.embedJpg(content);
          }
        )
        .when(
          (image) => image.content.startsWith('data:image/png'),
          async (image) => {
            const content = image.content.substring(
              image.content.indexOf('iVBORw')
            );
            return pdf.embedPng(content);
          }
        )
        .otherwise(() => {
          throw new Error('Unsupported image format');
        });
    },

    async save(pdf: PDFDocument): Promise<Buffer> {
      // Embed images into the PDF
      await async.forEach(images, async (image) => {
        const embed = await this.embed(pdf, image);
        pdf.getPages().forEach((page, i) => {
          const position = imagePositions.get(image.id)?.at(i);
          if (!position) {
            throw new Error('Image position not found');
          }
          page.drawImage(embed, {
            x: toPoints(position.x),
            // The Y-axis is inverted in the PDF specification
            y: page.getHeight() - toPoints(position.y) - toPoints(image.height),
            width: toPoints(image.width),
            height: toPoints(image.height)
          });
        });
      });
      const final = await pdf.save();
      return Buffer.from(final);
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
  id: string;
  content: string;
  width: number;
  height: number;
}

interface Position {
  x: number;
  y: number;
}

export default {
  createTransformer
};
