import path from 'path';
import fs from 'fs';
import { generate } from '@pdfme/generator';
import { Template, BLANK_PDF, Schema } from '@pdfme/common';
import { Logger } from '@zerologementvacant/utils';
import { text, image } from '@pdfme/schemas';
import { PDFDocument, PDFPage } from 'pdf-lib';
import puppeteer, { Browser, Page } from 'puppeteer';
import { format } from 'date-fns';
import { fr as frLocale } from 'date-fns/locale';
import { pdfPlugin } from './pdfPlugin';
import { DraftData } from './draft';

interface TransformerOptions {
  logger: Logger;
}

// Timeout and limit configuration
const BROWSER_CONFIG = {
  protocolTimeout: 180_000, // 3 minutes
  pageTimeout: 60_000, // 1 minute
  maxRetries: 3,
  retryDelay: 1000, // 1 second
};

const pixelsToPointsPNG = (px: number) => px * 72 / 340;
const pixelsToPointsPDF = (px: number) => px * 0.65;

const MARGIN_RIGHT = 50; // pixels
const MARGIN_TOP = 40; // pixels
const LOGO_WIDTH = 140; // pixels
const BODY_WIDTH = 820; // pixels
const FIRST_PAGE_BODY_HEIGHT = 800; // pixels
const OTHER_PAGE_BODY_HEIGHT = 1000; // pixels
const LINE_HEIGHT = 22; // pixels

const regularBuffer = fs.readFileSync(
  path.join(import.meta.dirname, 'fonts', 'Marianne-Regular.otf')
);
const boldBuffer = fs.readFileSync(
  path.join(import.meta.dirname, 'fonts', 'Marianne-Bold.otf')
);

const regularBase64 = regularBuffer.toString('base64');
const boldBase64 = boldBuffer.toString('base64');

const fontCss = `
@font-face {
  font-family: 'Marianne';
  src: url(data:font/otf;base64,${regularBase64}) format('opentype');
  font-weight: 400;
  font-style: normal;
}

@font-face {
  font-family: 'Marianne';
  src: url(data:font/otf;base64,${boldBase64}) format('opentype');
  font-weight: 700;
  font-style: normal;
}

body { font-family: Marianne; font-size: 0.75rem; }
`;

/**
 * Helper class to manage PDF operations with a reusable page
 */
class PdfPageManager {
  private page: Page;
  private logger: Logger;

  constructor(page: Page, logger: Logger) {
    this.page = page;
    this.logger = logger;
    this.setupPage();
  }

  private async setupPage() {
    this.page.setDefaultTimeout(BROWSER_CONFIG.pageTimeout);
    this.page.setDefaultNavigationTimeout(BROWSER_CONFIG.pageTimeout);
    await this.page.addStyleTag({ content: fontCss });
  }

  async generatePdfFromHtml(
    html: string,
    width: number,
    height: number,
    id: string = 'content'
  ): Promise<Buffer> {
    return this.executeWithRetry(async () => {
      await this.page.setViewport({ width, height });
      await this.page.setContent(
        `<div id="${id}" style="margin: 0; padding: 0; display: inline-block">${html}</div>`
      );
      await this.page.addStyleTag({ content: fontCss });

      // Wait for content to load
      try {
        await this.page.waitForSelector(`#${id}`, { timeout: 5000 });
      } catch {
        this.logger.warn(`Selector #${id} not found, continuing anyway`);
      }

      return await this.page.pdf({
        printBackground: true,
        width: `${width}px`,
        height: `${height}px`,
        pageRanges: '1'
      });
    }, `generatePdfFromHtml for ${id}`);
  }

  async measureHtmlDimensions(
    html: string,
    containerId: string = 'block'
  ): Promise<{ width: number; height: number } | null> {
    return this.executeWithRetry(async () => {
      await this.page.setContent(
        `<div id="${containerId}" style="margin: 0; padding: 0; display: inline-block">${html}</div>`
      );
      await this.page.addStyleTag({ content: fontCss });

      try {
        await this.page.waitForSelector(`#${containerId}`, { timeout: 5000 });
        const element = await this.page.$(`#${containerId}`);
        const box = await element?.boundingBox();
        return box ? { width: box.width, height: box.height } : null;
      } catch (error) {
        this.logger.warn(
          `Error measuring dimensions for ${containerId}:`,
          error
        );
        return null;
      }
    }, `measureHtmlDimensions for ${containerId}`);
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    for (let attempt = 1; attempt <= BROWSER_CONFIG.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        this.logger.warn(`${operationName} attempt ${attempt} failed:`, error);

        if (attempt === BROWSER_CONFIG.maxRetries) {
          throw new Error(
            `${operationName} failed after ${BROWSER_CONFIG.maxRetries} attempts: ${error}`
          );
        }

        // Wait before retrying
        await new Promise((resolve) =>
          setTimeout(resolve, BROWSER_CONFIG.retryDelay * attempt)
        );
      }
    }
    throw new Error(`Unexpected error in ${operationName}`);
  }
}

function createTransformer(opts: TransformerOptions) {
  const { logger } = opts;

  return {
    async mergePDFs(pdfs: Buffer[]): Promise<Buffer> {
      logger.info('Merging PDFs...');

      const mergedPdf = await PDFDocument.create();

      for (const pdf of pdfs) {
        const pdfDoc = await PDFDocument.load(pdf);
        const pages = await mergedPdf.copyPages(
          pdfDoc,
          pdfDoc.getPageIndices()
        );
        pages.forEach((page: PDFPage) => mergedPdf.addPage(page));
      }

      const mergedBuffer = await mergedPdf.save();
      logger.info('PDFs successfully merged!');

      return Buffer.from(mergedBuffer);
    },

    async generatePDF(data: DraftData): Promise<Buffer> {
      logger.info('Generating the PDF...');

      // Optimized browser configuration
      const browser = await puppeteer.launch({
        protocolTimeout: BROWSER_CONFIG.protocolTimeout,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--memory-pressure-off',
          '--max_old_space_size=4096',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ],
        defaultViewport: { width: 1024, height: 768 },
        devtools: false,
        headless: false
      });

      try {
        // Create a reusable page for all operations
        const reusablePage = await browser.newPage();
        const pdfManager = new PdfPageManager(reusablePage, logger);

        const textBlocks = await splitHtmlIntoPages({
          fullHtml: data.body ?? '',
          browser,
          maxWidth: BODY_WIDTH,
          firstPageMaxHeight: FIRST_PAGE_BODY_HEIGHT,
          otherPagesMaxHeight: OTHER_PAGE_BODY_HEIGHT
        });

        logger.info(`Number of pages generated: ${textBlocks.length}`);

        const templates: any[] = [];
        const inputs: Record<string, string>[] = [];

        // Utility functions
        function formatWrittenInfo(
          writtenFrom?: string | Date,
          writtenAt?: string
        ): string {
          if (!writtenAt) return '';

          let formattedDate = '';
          if (writtenFrom) {
            const date =
              typeof writtenFrom === 'string'
                ? new Date(writtenFrom)
                : writtenFrom;
            formattedDate = format(date, 'd MMMM yyyy', { locale: frLocale });
          }

          return formattedDate
            ? `À ${writtenAt}, le ${formattedDate}`
            : `À ${writtenAt}`;
        }

        function formatImageContent(
          image: { content: string } | undefined
        ): string {
          return image?.content
            ? image.content
                .replace(
                  /^data:image\/(jpeg|png)(;charset=utf-8)?;base64,/,
                  (match: string, format: string) => {
                    return `data:image/${format};base64,`;
                  }
                )
                .replace(/\s/g, '')
            : '';
        }

        const logo1: string = formatImageContent(data.logo?.[0]);
        const logo2: string = formatImageContent(data.logo?.[1]);

        // Generate PDF elements using the reusable page
        logger.info('Generating sender PDF...');
        let senderHTML =
          "<div style='text-align: end; font-style: normal;font-weight: 400'>";
        if (data.sender) {
          if (data.sender.name) {
            senderHTML += `${data.sender.name}`;
          }
          if (data.sender.service) {
            senderHTML += `<br />${data.sender.service}`;
          }
          if (data.sender.firstName || data.sender.lastName) {
            senderHTML += `<br />${data.sender.firstName} ${data.sender.lastName}`;
          }
          if (data.sender.address) {
            senderHTML += `<br />${data.sender.address}`;
          }
          if (data.sender.email) {
            senderHTML += `<br />${data.sender.email}`;
          }
          if (data.sender.phone) {
            senderHTML += `<br />${data.sender.phone}`;
          }
        }
        senderHTML += '</div>';
        const sender = await pdfManager.generatePdfFromHtml(
          senderHTML,
          300,
          300,
          'sender'
        );

        logger.info('Generating written info PDF...');
        const dateHTML = `<div id='block' style='margin: 0; padding: 0; display: inline-block;'>${formatWrittenInfo(data.writtenAt ?? undefined, data.writtenFrom ?? undefined)}</div>`;
        const writtenInfo = await pdfManager.generatePdfFromHtml(
          dateHTML,
          BODY_WIDTH,
          LINE_HEIGHT * 2,
          'written-info'
        );

        logger.info('Generating subject PDF...');
        const subjectHTML = data.subject
          ? `<div id='block' style='margin: 0; padding: 0; display: inline-block;'><strong>Objet:&nbsp;</strong>${data.subject}</div>`
          : '';
        const subject = await pdfManager.generatePdfFromHtml(
          subjectHTML,
          BODY_WIDTH,
          LINE_HEIGHT * 2,
          'subject'
        );

        logger.info('Generating recipient PDF...');
        let recipientHTML = `<div style='font-style: normal;font-weight: 400'><strong>À l'attention de</strong>`;
        if (data.owner.fullName) {
          recipientHTML += `<br />${data.owner.fullName}`;
        }
        if (data.owner.address) {
          recipientHTML += `<br />${data.owner.address.join('<br>')}`;
        }
        recipientHTML += '</div>';
        const recipient = await pdfManager.generatePdfFromHtml(
          recipientHTML,
          300,
          300,
          'recipient'
        );

        logger.info('Generating signatory PDF...');
        let signatoryHTML = '';
        if (
          data.sender &&
          data.sender.signatories &&
          data.sender.signatories.length > 0
        ) {
          signatoryHTML += `<div style="display: flex; gap: 40px;">`;

          for (const signatory of data.sender.signatories) {
            if (!signatory) continue;

            let block = `<div style="text-align: center;">`;

            if (signatory.firstName || signatory.lastName) {
              block += `${signatory.firstName ?? ''} ${signatory.lastName ?? ''}<br />`;
            }

            if (signatory.role) {
              block += `${signatory.role}<br />`;
            }

            if (signatory.file?.content) {
              const signatoryImage = formatImageContent(signatory.file);
              block += `<img src="${signatoryImage}" alt="Signature" style="width: 100px; margin: 10px" /><br />`;
            }

            block += `</div>`;
            signatoryHTML += block;
          }

          signatoryHTML += `</div>`;
        }
        const signatory = await pdfManager.generatePdfFromHtml(
          signatoryHTML,
          400,
          200,
          'signatory'
        );

        // Generate template schemas
        const firstPageSchema = [
          {
            name: 'logo1',
            type: 'image',
            position: {
              x: pixelsToPointsPNG(MARGIN_RIGHT),
              y: pixelsToPointsPNG(MARGIN_TOP)
            },
            width: pixelsToPointsPNG(LOGO_WIDTH),
            height: pixelsToPointsPNG(LOGO_WIDTH)
          },
          {
            name: 'logo2',
            type: 'image',
            position: {
              x: pixelsToPointsPNG(MARGIN_RIGHT),
              y: pixelsToPointsPNG(MARGIN_TOP + 5 + LOGO_WIDTH)
            },
            width: pixelsToPointsPNG(LOGO_WIDTH),
            height: pixelsToPointsPNG(LOGO_WIDTH)
          },
          {
            name: 'sender',
            type: 'pdf',
            position: {
              x: pixelsToPointsPDF(580),
              y: pixelsToPointsPDF(MARGIN_TOP)
            },
            width: pixelsToPointsPDF(300),
            height: pixelsToPointsPDF(300)
          },
          {
            name: 'recipient',
            type: 'pdf',
            position: { x: pixelsToPointsPDF(500), y: pixelsToPointsPDF(200) },
            width: pixelsToPointsPDF(300),
            height: pixelsToPointsPDF(300)
          },
          {
            name: 'written_location',
            type: 'pdf',
            position: {
              x: pixelsToPointsPDF(MARGIN_RIGHT),
              y: pixelsToPointsPDF(360)
            },
            width: pixelsToPointsPDF(BODY_WIDTH),
            height: pixelsToPointsPDF(LINE_HEIGHT * 2)
          },
          {
            name: 'subject',
            type: 'pdf',
            position: {
              x: pixelsToPointsPDF(MARGIN_RIGHT),
              y: pixelsToPointsPDF(395)
            },
            width: pixelsToPointsPDF(BODY_WIDTH),
            height: pixelsToPointsPDF(LINE_HEIGHT * 2)
          }
        ];

        const pagesSchema = [
          {
            name: 'body',
            type: 'pdf',
            width: pixelsToPointsPDF(BODY_WIDTH),
            height: 0, // height will be replaced by calculated height
            position: { x: 0, y: 0 } // will be replaced by calculated position
          }
        ];

        const lastPageSchema = [
          {
            name: 'signatory',
            type: 'pdf',
            position: { x: pixelsToPointsPDF(400), y: pixelsToPointsPDF(1100) },
            width: pixelsToPointsPDF(400),
            height: pixelsToPointsPDF(200)
          }
        ];

        // Generate content pages
        logger.info('Generating content pages...');
        for (let i = 0; i < textBlocks.length; i++) {
          logger.info(`Processing page ${i + 1}/${textBlocks.length}`);

          const schema = [];
          let bodySchema: Schema;

          if (i === 0) {
            schema.push(...firstPageSchema);
            bodySchema = Object.assign({}, pagesSchema[0]);
            bodySchema.width = pixelsToPointsPDF(BODY_WIDTH);
            bodySchema.height = pixelsToPointsPDF(
              FIRST_PAGE_BODY_HEIGHT + LINE_HEIGHT
            );
            bodySchema.position = {
              x: pixelsToPointsPDF(MARGIN_RIGHT),
              y: pixelsToPointsPDF(410)
            };
            schema.push(bodySchema);
          } else if (i > 0) {
            bodySchema = Object.assign({}, pagesSchema[0]);
            bodySchema.width = pixelsToPointsPDF(BODY_WIDTH);
            bodySchema.height = pixelsToPointsPDF(
              OTHER_PAGE_BODY_HEIGHT + LINE_HEIGHT
            );
            bodySchema.position = {
              x: pixelsToPointsPDF(MARGIN_RIGHT),
              y: pixelsToPointsPDF(100)
            };
            schema.push(bodySchema);
          }

          if (i === textBlocks.length - 1) {
            schema.push(...lastPageSchema);
          }

          const template: Template = {
            basePdf: BLANK_PDF,
            schemas: [schema]
          };
          templates.push(template);

          // Generate PDF for this text block
          const contentHtml = `<div id='block' style='margin: 0; padding: 0; display: inline-block; font-size: 0.75rem'>${textBlocks[i]}</div>`;
          const pdfBuffer = await pdfManager.generatePdfFromHtml(
            contentHtml,
            BODY_WIDTH,
            i === 0 ? FIRST_PAGE_BODY_HEIGHT : OTHER_PAGE_BODY_HEIGHT,
            `body-${i}`
          );

          const inputsData = {
            logo1: logo1,
            logo2: logo2,
            sender: `data:application/pdf;base64,${sender.toString('base64')}`,
            recipient: `data:application/pdf;base64,${recipient.toString('base64')}`,
            written_location: `data:application/pdf;base64,${writtenInfo.toString('base64')}`,
            subject: `data:application/pdf;base64,${subject.toString('base64')}`,
            body: `data:application/pdf;base64,${pdfBuffer.toString('base64')}`,
            signatory: `data:application/pdf;base64,${signatory.toString('base64')}`
          };
          inputs.push(inputsData);
        }

        // Close the reusable page
        // await reusablePage.close();

        logger.info('Generating final PDF pages...');
        // Generate PDF pages one by one
        const pdfBuffers: Buffer[] = [];
        for (let i = 0; i < templates.length; i++) {
          logger.info(`Generating final page ${i + 1}/${templates.length}`);
          const pdfBuffer = await generate({
            template: templates[i],
            inputs: [inputs[i]],
            plugins: {
              text,
              image,
              pdf: pdfPlugin
            }
          });
          pdfBuffers.push(Buffer.from(pdfBuffer));
        }

        // Merge all PDFs
        logger.info('Merging final PDF...');
        const finalDoc = await PDFDocument.create();

        for (const buffer of pdfBuffers) {
          const docToMerge = await PDFDocument.load(buffer);
          const pages = await finalDoc.copyPages(
            docToMerge,
            docToMerge.getPageIndices()
          );
          pages.forEach((page: PDFPage) => finalDoc.addPage(page));
        }

        const finalPDF = await finalDoc.save();
        logger.info('Final PDF successfully generated!');

        return Buffer.from(finalPDF);
      } finally {
        // await browser.close();
      }
    }
  };
}

interface FindFitOptions {
  fullHtml: string;
  browser: Browser;
  maxHeight: number;
  maxWidth: number;
  containerId?: string;
}

/**
 * Optimized version that reuses a single page for all tests
 * Returns the maximum number of HTML characters that fit within a given area
 * without breaking the HTML code (properly closed tags).
 */
export async function findMaxHtmlLengthThatFits({
  fullHtml,
  browser,
  maxHeight,
  maxWidth,
  containerId = 'block'
}: FindFitOptions): Promise<number> {
  const safeIndices = getSafeCutPoints(fullHtml);
  let low = 0;
  let high = safeIndices.length - 1;
  let bestLength = 0;

  // Create a single page for all tests
  const testPage = await browser.newPage();
  testPage.setDefaultTimeout(BROWSER_CONFIG.pageTimeout);
  await testPage.addStyleTag({ content: fontCss });

  try {
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const cutoffIndex = safeIndices[mid];
      const partialHtml = fullHtml.slice(0, cutoffIndex);

      try {
        // Reuse the same page
        await testPage.setContent(
          `<div id="${containerId}" style="margin: 0; padding: 0; display: inline-block">${partialHtml}</div>`
        );
        await testPage.addStyleTag({ content: fontCss });

        // Wait for content to render with shorter timeout
        try {
          await testPage.waitForSelector(`#${containerId}`, { timeout: 3000 });
        } catch {
          // Continue even if selector is not found
        }

        const element = await testPage.$(`#${containerId}`);
        const box = await element?.boundingBox();

        if (box && box.height <= maxHeight && box.width <= maxWidth) {
          bestLength = cutoffIndex;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      } catch {
        // In case of error, consider it doesn't fit
        high = mid - 1;
      }
    }
  } finally {
    // await testPage.close();
  }

  return bestLength;
}

/**
 * Returns the positions in the HTML where it can be safely cut without breaking the markup
 */
function getSafeCutPoints(html: string): number[] {
  const regex = /<\/[^>]+>|<br\s*\/?>/gi; // split after closed tags or <br>
  const indices: number[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    indices.push(match.index + match[0].length);
  }

  if (indices[indices.length - 1] !== html.length) {
    indices.push(html.length);
  }

  return indices;
}

/**
 * Optimized version of splitHtmlIntoPages
 * Uses the search function to split a long HTML into paginated blocks,
 * with a specific height for the first page, and another for the subsequent ones.
 */
export async function splitHtmlIntoPages({
  fullHtml,
  browser,
  firstPageMaxHeight,
  otherPagesMaxHeight,
  maxWidth,
}: {
  fullHtml: string;
  browser: Browser;
  firstPageMaxHeight: number;
  otherPagesMaxHeight: number;
  maxWidth: number;
}): Promise<string[]> {
  const blocks: string[] = [];
  let remainingHtml = fullHtml;
  let isFirstPage = true;

  while (remainingHtml.length > 0) {
    const cutoff = await findMaxHtmlLengthThatFits({
      fullHtml: remainingHtml,
      browser,
      maxHeight: isFirstPage ? firstPageMaxHeight : otherPagesMaxHeight,
      maxWidth
    });

    if (cutoff === 0) {
      // If no content fits, take at least one safe cut point
      const safePoints = getSafeCutPoints(remainingHtml);
      const minCutoff = safePoints.length > 1 ? safePoints[1] : remainingHtml.length;
      const block = remainingHtml.slice(0, minCutoff);
      blocks.push(block);
      remainingHtml = remainingHtml.slice(minCutoff);
    } else {
      const block = remainingHtml.slice(0, cutoff);
      blocks.push(block);
      remainingHtml = remainingHtml.slice(cutoff);
    }
    
    isFirstPage = false;
  }

  // If no content has been processed, ensure at least one block is returned
  if (blocks.length === 0) {
    blocks.push('');
  }

  return blocks;
}

export default {
  createTransformer
};
