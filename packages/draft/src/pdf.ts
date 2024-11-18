import async from 'async';
import { ReadableStream } from 'node:stream/web';
import * as handlebars from 'handlebars';
import path from 'node:path';
import { PDFDocument, PDFEmbeddedPage, PDFImage } from 'pdf-lib';
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

    /**
     * Open a browser and render the HTML content using puppeteer.
     * The images are extracted from the HTML and saved for later.
     * The images are hidden in the HTML to avoid rendering them in the PDF.
     * Transform HTML to PDF and return the result as a PDFDocument.
     * Clean up the browser.
     * @param html
     */
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
            y: y,
            type: (image as Element)?.classList.contains('header__image') ? 'logo' : 'signature'
          };
        });
      });
      // Retrieve images from the HTML only once
      if (images.length === 0) {
        images.push(...elements.map(element => ({
          ...element,
          type: element.type as 'logo' | 'signature'
        })));
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

    /**
     * Merge two PDF documents, i.e., copy the chunk’s pages into the PDF.
     * @param pdf
     * @param chunk
     */
    async merge(pdf: PDFDocument, chunk: PDFDocument): Promise<PDFDocument> {
      const pages = await pdf.copyPages(chunk, chunk.getPageIndices());
      pages.forEach((page) => {
        pdf.addPage(page);
      });
      return pdf;
    },

    /**
     * Embed an image into the PDF.
     * @param pdf
     * @param image A PDF, JPEG or PNG image encoded in base64
     */
    async embed(pdf: PDFDocument, image: Image): Promise<PDFImage | PDFEmbeddedPage> {
      return match(image)
        .when(
          (image) => image.content.startsWith('data:application/pdf'),
          async (image) => {
            const content = image.content.substring(
              image.content.indexOf('JVBER')
            );

            const binaryString = atob(content);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
          
            for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }

            const [embeddedPage] = await pdf.embedPdf(bytes.buffer, [0]);
            return embeddedPage;
          }
        )
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

    /**
     * Draw images on each page of the PDF using their recorded positions.
     * Save the final PDF and return it as a buffer.
     * @param pdf
     */
    async save(pdf: PDFDocument): Promise<Buffer> {
      const firstImageHeight = { 'logo': 0, 'signature': 0 };
      const firstImageWidth = { 'logo': 0, 'signature': 0 };

      // Embed images into the PDF
      await async.forEach(images, async (image) => {
        console.log(image.type);
        const embed = await this.embed(pdf, image);

        let imageHeight = 0;
        if (embed instanceof PDFImage) {
          imageHeight = image.height;
        } else if (embed instanceof PDFEmbeddedPage) {
          // PDFs are vector images, so we use the max width defined for the header__image CSS class
          imageHeight = 140 / (embed.width / embed.height); // Keep the aspect ratio as image.height is incorrect
        }

        pdf.getPages().forEach((page, i) => {
          const position = imagePositions.get(image.id)?.at(i);
          if (!position) {
            throw new Error('Image position not found');
          }
          if (embed instanceof PDFImage) {
            page.drawImage(embed, {
              x: toPoints(position.x),
              // The Y-axis is inverted in the PDF specification
              y: page.getHeight() - toPoints(image.height) - (image.type === 'signature' ? toPoints(position.y) : toPoints(40) + toPoints(firstImageHeight[image.type])),
              width: toPoints(image.width),
              height: toPoints(image.height)
            });
          } else if (embed instanceof PDFEmbeddedPage) {
            page.drawPage(embed, {
              x: toPoints(position.x) - (image.type === 'signature' ? toPoints(40) : 0),
              // The Y-axis is inverted in the PDF specification
              y: page.getHeight() - toPoints(imageHeight) - (image.type === 'signature' ? toPoints(position.y) : toPoints(40) + toPoints(firstImageHeight[image.type])),
              width: toPoints(140),
              height: toPoints(imageHeight)
            });

          }
        });
        firstImageHeight[image.type] = firstImageHeight[image.type] === 0 ? imageHeight : 0;
        firstImageWidth[image.type] = firstImageWidth[image.type] === 0 ? image.width : 0;
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
  type: 'logo' | 'signature';
}

interface Position {
  x: number;
  y: number;
}

export default {
  createTransformer
};
