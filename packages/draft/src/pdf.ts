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
  retryDelay: 1000 // 1 second
};

const pixelsToPointsPNG = (px: number) => (px * 72) / 340;
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
        headless: true
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
        await reusablePage.close();

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
        await browser.close();
      }
    }
  };
}

interface FindFitOptions {
  paragraphs: string[];
  browser: Browser;
  maxHeight: number;
  maxWidth: number;
  containerId?: string;
}

interface ParagraphInfo {
  content: string;
  height: number;
  index: number;
}

/**
 * Handling of overly long paragraphs
 */
export async function findMaxParagraphsThatFit({
  paragraphs,
  browser,
  maxHeight,
  maxWidth,
  containerId = 'block'
}: FindFitOptions): Promise<number> {
  if (paragraphs.length === 0) return 0;

  // Create a single page for all measurements
  const testPage = await browser.newPage();
  testPage.setDefaultTimeout(BROWSER_CONFIG.pageTimeout);
  await testPage.addStyleTag({ content: fontCss });

  try {
    const paragraphInfos: ParagraphInfo[] = [];

    // Step 1: Measure the height of each paragraph individually
    for (let i = 0; i < paragraphs.length; i++) {
      try {
        await testPage.setContent(
          `<div id="${containerId}" style="margin: 0; padding: 0; display: inline-block; width: ${maxWidth}px;">${paragraphs[i]}</div>`
        );
        await testPage.addStyleTag({ content: fontCss });

        try {
          await testPage.waitForSelector(`#${containerId}`, { timeout: 1000 });
        } catch {
          // Continue even if selector is not found
        }

        const element = await testPage.$(`#${containerId}`);
        const box = await element?.boundingBox();
        
        if (box) {
          paragraphInfos.push({
            content: paragraphs[i],
            height: box.height,
            index: i
          });
        } else {
          // If we can't measure, assign a default height
          paragraphInfos.push({
            content: paragraphs[i],
            height: LINE_HEIGHT,
            index: i
          });
        }
      } catch (error) {
        // In case of error, assign a default height
        paragraphInfos.push({
          content: paragraphs[i],
          height: LINE_HEIGHT,
          index: i
        });
      }
    }

    // Step 2: Calculate how many paragraphs fit based on heights
    let cumulativeHeight = 0;
    let maxParagraphs = 0;

    for (let i = 0; i < paragraphInfos.length; i++) {
      const newHeight = cumulativeHeight + paragraphInfos[i].height;
      
      if (newHeight <= maxHeight) {
        cumulativeHeight = newHeight;
        maxParagraphs = i + 1;
      } else {
        // If it's the first paragraph and it doesn't fit, force it anyway
        if (i === 0) {
          maxParagraphs = 1;
        }
        break;
      }
    }

    // If no paragraph fits according to calculation, take at least the first one
    if (maxParagraphs === 0 && paragraphs.length > 0) {
      maxParagraphs = 1;
    }

    return maxParagraphs;
  } finally {
    await testPage.close();
  }
}

/**
 * Parse HTML into smaller units with forced splitting of long paragraphs
 * Guarantees that no content is lost even for very long texts
 */
function parseHtmlIntoParagraphs(html: string): string[] {
  if (!html.trim()) return [];

  // Normalize HTML
  let cleanHtml = html
    .replace(/\n\s*\n/g, '\n')  // Normalize multiple line breaks
    .replace(/\s+/g, ' ')       // Normalize multiple spaces
    .trim();
  
  const paragraphs: string[] = [];
  
  // Regex to identify complete block elements (without capture group)
  const blockElementRegex = /<(?:p|div|h[1-6]|blockquote|ul|ol|li|table|tr|td|th|pre|article|section)[^>]*>[\s\S]*?<\/(?:p|div|h[1-6]|blockquote|ul|ol|li|table|tr|td|th|pre|article|section)>/gi;
  
  let lastIndex = 0;
  let match;
  
  // Go through all found block elements
  while ((match = blockElementRegex.exec(cleanHtml)) !== null) {
    // Process text before this block element
    if (match.index > lastIndex) {
      const beforeText = cleanHtml.slice(lastIndex, match.index).trim();
      if (beforeText) {
        paragraphs.push(...splitLongText(beforeText));
      }
    }
    
    // Process the block element itself
    const blockElement = match[0];
    
    // For lists, try to divide by <li> elements
    if (blockElement.includes('<li>')) {
      const listItems = blockElement.match(/<li[^>]*>[\s\S]*?<\/li>/gi);
      if (listItems && listItems.length > 3) { // Only if more than 3 elements
        // Extract list structure
        const listStart = blockElement.substring(0, blockElement.indexOf('<li'));
        const listEnd = blockElement.substring(blockElement.lastIndexOf('</li>') + 5);
        
        // Group elements by 2-3 to avoid too much fragmentation
        const itemsPerGroup = 2;
        for (let i = 0; i < listItems.length; i += itemsPerGroup) {
          const groupItems = listItems.slice(i, i + itemsPerGroup);
          paragraphs.push(listStart + groupItems.join('') + listEnd);
        }
      } else {
        paragraphs.push(blockElement);
      }
    } else {
      // Check if the block element is very long and split if necessary
      if (blockElement.length > 800) {
        const innerContent = blockElement.replace(/<[^>]*>/g, ''); // Extract text
        if (innerContent.length > 600) {
          // If textual content is very long, split the element
          const tagMatch = blockElement.match(/^<([^>]+)>/);
          const tagName = tagMatch ? tagMatch[0] : '<p>';
          const closingTag = tagMatch ? `</${tagMatch[1].split(' ')[0]}>` : '</p>';
          
          const textChunks = splitLongText(innerContent);
          for (const chunk of textChunks) {
            paragraphs.push(`${tagName}${chunk}${closingTag}`);
          }
        } else {
          paragraphs.push(blockElement);
        }
      } else {
        paragraphs.push(blockElement);
      }
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // Process remaining text after the last block element
  if (lastIndex < cleanHtml.length) {
    const remainingText = cleanHtml.slice(lastIndex).trim();
    if (remainingText) {
      paragraphs.push(...splitLongText(remainingText));
    }
  }

  // If no block elements were found, process all content
  if (paragraphs.length === 0 && cleanHtml) {
    paragraphs.push(...splitLongText(cleanHtml));
  }

  // Filter empty paragraphs and clean
  return paragraphs
    .filter(p => p && p.trim().length > 0)
    .map(p => p.trim());
}

/**
 * Utility function to split long text into smaller chunks
 * Tries to split on sentences first, then on words if necessary
 */
function splitLongText(text: string): string[] {
  if (!text || text.length <= 300) {
    return text ? [`<p>${text}</p>`] : [];
  }

  const chunks: string[] = [];
  
  // Try to split on sentences first
  const sentences = text.split(/(?<=[.!?])\s+/);
  
  if (sentences.length > 1) {
    let currentChunk = '';
    
    for (const sentence of sentences) {
      const testChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;
      
      if (testChunk.length > 300 && currentChunk) {
        chunks.push(`<p>${currentChunk.trim()}</p>`);
        currentChunk = sentence;
      } else {
        currentChunk = testChunk;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(`<p>${currentChunk.trim()}</p>`);
    }
  } else {
    // If no distinct sentences, split by words
    const words = text.split(' ');
    let currentChunk = '';
    
    for (const word of words) {
      const testChunk = currentChunk + (currentChunk ? ' ' : '') + word;
      
      if (testChunk.length > 300 && currentChunk) {
        chunks.push(`<p>${currentChunk.trim()}</p>`);
        currentChunk = word;
      } else {
        currentChunk = testChunk;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(`<p>${currentChunk.trim()}</p>`);
    }
  }
  
  // If no chunks were created (very rare case), force at least one
  if (chunks.length === 0) {
    chunks.push(`<p>${text.substring(0, 300)}</p>`);
    if (text.length > 300) {
      chunks.push(...splitLongText(text.substring(300)));
    }
  }
  
  return chunks;
}

/**
 * Optimized version of splitHtmlIntoPages that works with complete paragraphs
 */
export async function splitHtmlIntoPages({
  fullHtml,
  browser,
  firstPageMaxHeight,
  otherPagesMaxHeight,
  maxWidth
}: {
  fullHtml: string;
  browser: Browser;
  firstPageMaxHeight: number;
  otherPagesMaxHeight: number;
  maxWidth: number;
}): Promise<string[]> {
  if (!fullHtml.trim()) return [''];

  // Parse HTML into distinct paragraphs
  const allParagraphs = parseHtmlIntoParagraphs(fullHtml);
  
  if (allParagraphs.length === 0) return [''];

  const pages: string[] = [];
  let currentParagraphIndex = 0;
  let isFirstPage = true;

  while (currentParagraphIndex < allParagraphs.length) {
    const remainingParagraphs = allParagraphs.slice(currentParagraphIndex);
    const maxHeight = isFirstPage ? firstPageMaxHeight : otherPagesMaxHeight;

    const maxParagraphsForThisPage = await findMaxParagraphsThatFit({
      paragraphs: remainingParagraphs,
      browser,
      maxHeight,
      maxWidth
    });

    if (maxParagraphsForThisPage === 0) {
      // If even a single paragraph doesn't fit, take it anyway to avoid infinite loop
      pages.push(remainingParagraphs[0]);
      currentParagraphIndex += 1;
    } else {
      // Take the maximum number of paragraphs that fit
      const pageContent = remainingParagraphs
        .slice(0, maxParagraphsForThisPage)
        .join('');
      pages.push(pageContent);
      currentParagraphIndex += maxParagraphsForThisPage;
    }

    isFirstPage = false;
  }

  // Ensure there's at least one page
  if (pages.length === 0) {
    pages.push('');
  }

  return pages;
}

export default {
  createTransformer
};