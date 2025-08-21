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
 * Enhanced version that tries to fit content intelligently
 * Prioritizes keeping paragraphs intact and only splits when absolutely necessary
 */
export async function findMaxParagraphsThatFit({
  paragraphs,
  browser,
  maxHeight,
  maxWidth,
  containerId = 'block'
}: FindFitOptions): Promise<number> {
  // Ensure paragraphs is a real array and cap its length
  const MAX_PARAGRAPHS = 1000;
  if (!Array.isArray(paragraphs)) {
    return 0;
  }
  if (paragraphs.length === 0) return 0;
  if (paragraphs.length > MAX_PARAGRAPHS) {
    paragraphs = paragraphs.slice(0, MAX_PARAGRAPHS);
  }

  const testPage = await browser.newPage();
  testPage.setDefaultTimeout(BROWSER_CONFIG.pageTimeout);
  await testPage.addStyleTag({ content: fontCss });

  try {
    // Helper function to measure a single paragraph
    const measureParagraph = async (content: string): Promise<number> => {
      try {
        await testPage.setContent(
          `<div id="${containerId}" style="margin: 0; padding: 0; display: inline-block; width: ${maxWidth}px;">${content}</div>`
        );
        await testPage.addStyleTag({ content: fontCss });

        try {
          await testPage.waitForSelector(`#${containerId}`, { timeout: 1000 });
        } catch {
          // Continue even if selector is not found
        }

        const element = await testPage.$(`#${containerId}`);
        const box = await element?.boundingBox();
        return box?.height ?? LINE_HEIGHT;
      } catch (error) {
        return LINE_HEIGHT;
      }
    };

    // Strategy: Try to fit as many complete paragraphs as possible
    let cumulativeHeight = 0;
    let maxCompleteParagraphs = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraphHeight = await measureParagraph(paragraphs[i]);
      const newHeight = cumulativeHeight + paragraphHeight;
      
      if (newHeight <= maxHeight) {
        cumulativeHeight = newHeight;
        maxCompleteParagraphs = i + 1;
      } else {
        break;
      }
    }

    // Return the number of complete paragraphs that fit
    // Even if it's 0, we'll handle the splitting in splitHtmlIntoPages
    return maxCompleteParagraphs;

  } finally {
    await testPage.close();
  }
}

/**
 * Parse HTML into smaller units preserving paragraph integrity
 * Splits only when absolutely necessary and at natural breakpoints
 */
function parseHtmlIntoParagraphs(html: string): string[] {
  if (!html.trim()) return [];

  // First, check if the HTML is already well-structured
  const hasBlockElements = /<(?:p|div|h[1-6]|blockquote|ul|ol|table|pre|article|section)[^>]*>/i.test(html);
  
  if (!hasBlockElements) {
    // If it's just plain text, keep as single paragraph
    return [`<p>${html.trim()}</p>`];
  }

  // Normalize HTML but preserve more structure
  let cleanHtml = html
    .replace(/\n\s*\n/g, '\n')  // Normalize multiple line breaks
    .replace(/\s+/g, ' ')       // Normalize multiple spaces
    .trim();
  
  const paragraphs: string[] = [];
  
  // Regex to identify complete block elements
  const blockElementRegex = /<(?:p|div|h[1-6]|blockquote|ul|ol|li|table|tr|td|th|pre|article|section)[^>]*>[\s\S]*?<\/(?:p|div|h[1-6]|blockquote|ul|ol|li|table|tr|td|th|pre|article|section)>/gi;
  
  let lastIndex = 0;
  let match;
  
  // Go through all found block elements
  while ((match = blockElementRegex.exec(cleanHtml)) !== null) {
    // Process text before this block element
    if (match.index > lastIndex) {
      const beforeText = cleanHtml.slice(lastIndex, match.index).trim();
      if (beforeText) {
        paragraphs.push(`<p>${beforeText}</p>`);
      }
    }
    
    // Process the block element itself - keep intact unless extremely long
    const blockElement = match[0];
    
    // For lists, only split if really necessary
    if (blockElement.includes('<li>')) {
      const listItems = blockElement.match(/<li[^>]*>[\s\S]*?<\/li>/gi);
      if (listItems && listItems.length > 10) { // Higher threshold
        // Extract list structure
        const listStart = blockElement.substring(0, blockElement.indexOf('<li'));
        const listEnd = blockElement.substring(blockElement.lastIndexOf('</li>') + 5);
        
        // Group more elements together
        const itemsPerGroup = 5;
        for (let i = 0; i < listItems.length; i += itemsPerGroup) {
          const groupItems = listItems.slice(i, i + itemsPerGroup);
          paragraphs.push(listStart + groupItems.join('') + listEnd);
        }
      } else {
        // Keep the entire list together
        paragraphs.push(blockElement);
      }
    } else {
      // Keep paragraphs intact - don't split unless absolutely massive
      paragraphs.push(blockElement);
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // Process remaining text after the last block element
  if (lastIndex < cleanHtml.length) {
    const remainingText = cleanHtml.slice(lastIndex).trim();
    if (remainingText) {
      paragraphs.push(`<p>${remainingText}</p>`);
    }
  }

  // If no block elements were found, keep all content together
  if (paragraphs.length === 0 && cleanHtml) {
    paragraphs.push(`<p>${cleanHtml}</p>`);
  }

  // Filter empty paragraphs and clean
  return paragraphs
    .filter(p => p && p.trim().length > 0)
    .map(p => p.trim());
}

/**
 * Enhanced version of splitHtmlIntoPages with intelligent paragraph preservation
 * Prioritizes keeping paragraphs intact and only splits when absolutely necessary
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

  // Parse HTML into distinct paragraphs (now more conservative)
  const allParagraphs = parseHtmlIntoParagraphs(fullHtml);
  
  if (allParagraphs.length === 0) return [''];

  const pages: string[] = [];
  let currentParagraphIndex = 0;
  let isFirstPage = true;

  // Helper function to measure content height
  const measureContentHeight = async (content: string): Promise<number> => {
    const testPage = await browser.newPage();
    testPage.setDefaultTimeout(BROWSER_CONFIG.pageTimeout);
    await testPage.addStyleTag({ content: fontCss });
    
    try {
      await testPage.setContent(
        `<div id="measure" style="margin: 0; padding: 0; display: inline-block; width: ${maxWidth}px;">${content}</div>`
      );
      await testPage.addStyleTag({ content: fontCss });
      
      const element = await testPage.$('#measure');
      const box = await element?.boundingBox();
      return box?.height ?? LINE_HEIGHT;
    } catch {
      return LINE_HEIGHT;
    } finally {
      await testPage.close();
    }
  };

  // Simple but effective splitting function
  const splitParagraphIfNeeded = async (paragraph: string, maxHeight: number): Promise<string[]> => {
    const fullHeight = await measureContentHeight(paragraph);
    if (fullHeight <= maxHeight) {
      return [paragraph];
    }

    // Extract text content from HTML
    const textContent = paragraph.replace(/<[^>]*>/g, '');
    
    // Try splitting by sentences first
    const sentences = textContent.split(/(?<=[.!?])\s+/);
    
    if (sentences.length > 1) {
      // Find the best split point by testing from 80% down to 20%
      for (let percentage = 0.8; percentage >= 0.2; percentage -= 0.1) {
        const splitPoint = Math.floor(sentences.length * percentage);
        if (splitPoint === 0) continue;
        
        const firstPart = sentences.slice(0, splitPoint).join(' ');
        const secondPart = sentences.slice(splitPoint).join(' ');
        
        // Reconstruct HTML structure
        const firstPartHtml = paragraph.replace(textContent, firstPart);
        const secondPartHtml = paragraph.replace(textContent, secondPart);
        
        const firstHeight = await measureContentHeight(firstPartHtml);
        
        if (firstHeight <= maxHeight) {
          // Recursively split the second part if needed
          const remainingSplits = await splitParagraphIfNeeded(secondPartHtml, maxHeight);
          return [firstPartHtml, ...remainingSplits];
        }
      }
    }

    // Fallback: split by words
    const allWords = textContent.split(' ');
    if (allWords.length > 10) {
              // Try to keep 60% of content together, then 40%, etc.
      for (let percentage = 0.6; percentage >= 0.2; percentage -= 0.1) {
        const wordCount = Math.floor(allWords.length * percentage);
        if (wordCount === 0) continue;
        
        const firstPart = allWords.slice(0, wordCount).join(' ');
        const secondPart = allWords.slice(wordCount).join(' ');
        
        const firstPartHtml = paragraph.replace(textContent, firstPart);
        const secondPartHtml = paragraph.replace(textContent, secondPart);
        
        const firstHeight = await measureContentHeight(firstPartHtml);
        
        if (firstHeight <= maxHeight) {
          const remainingSplits = await splitParagraphIfNeeded(secondPartHtml, maxHeight);
          return [firstPartHtml, ...remainingSplits];
        }
      }
    }

    // Last resort: split in half
    const halfWords = textContent.split(' ');
    const midPoint = Math.floor(halfWords.length / 2);
    const firstPart = halfWords.slice(0, midPoint).join(' ');
    const secondPart = halfWords.slice(midPoint).join(' ');
    
    const firstPartHtml = paragraph.replace(textContent, firstPart);
    const secondPartHtml = paragraph.replace(textContent, secondPart);
    
    const remainingSplits = await splitParagraphIfNeeded(secondPartHtml, maxHeight);
    return [firstPartHtml, ...remainingSplits];
  };

  while (currentParagraphIndex < allParagraphs.length) {
    const remainingParagraphs = allParagraphs.slice(currentParagraphIndex);
    const maxHeight = isFirstPage ? firstPageMaxHeight : otherPagesMaxHeight;

    // Try to fit complete paragraphs first
    const maxParagraphsForThisPage = await findMaxParagraphsThatFit({
      paragraphs: remainingParagraphs,
      browser,
      maxHeight,
      maxWidth
    });

    if (maxParagraphsForThisPage === 0) {
      // No complete paragraphs fit, we MUST split the first one
      const firstParagraph = remainingParagraphs[0];
      const splitParts = await splitParagraphIfNeeded(firstParagraph, maxHeight);
      
      // Take the first part for this page
      pages.push(splitParts[0]);
      
      // Important: Remove the original paragraph and add the remaining parts
      allParagraphs.splice(currentParagraphIndex, 1); // Remove original
      
      // Add remaining parts at the current position
      if (splitParts.length > 1) {
        allParagraphs.splice(currentParagraphIndex, 0, ...splitParts.slice(1));
      }
      
      // Don't increment currentParagraphIndex since we're processing the split parts next
      
    } else {
      // We can fit some complete paragraphs
      const pageContent = remainingParagraphs
        .slice(0, maxParagraphsForThisPage)
        .join('');
      pages.push(pageContent);
      currentParagraphIndex += maxParagraphsForThisPage;
    }

    isFirstPage = false;
    
    // Safety check to avoid infinite loops
    if (pages.length > 100) {
      break;
    }
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
