import path from 'path';
import fs from 'fs';
import { generate } from '@pdfme/generator';
import { Template, BLANK_PDF, Font, Schema, PDFRenderProps } from '@pdfme/common';
import { Logger } from '@zerologementvacant/utils';
import { text, image } from '@pdfme/schemas';
const { PDFDocument, PDFPage } = require('pdf-lib');
const puppeteer = require('puppeteer');
import { format } from 'date-fns';
import { fr as frLocale } from 'date-fns/locale';
import { pdfPlugin } from './pdfPlugin';

interface TransformerOptions {
  logger: Logger;
}

const pixelsToPointsPNG = (px: number) => px * 72 / 340;
const pixelsToPointsPDF = (px: number) => px * 0.65;

const MARGIN_RIGHT = 50; // pixels
const MARGIN_TOP = 40; // pixels
const LOGO_WIDTH = 140; // pixels
const BODY_WIDTH = 820; // pixels
const FIRST_PAGE_BODY_HEIGHT = 800; // pixels
const OTHER_PAGE_BODY_HEIGHT = 1000; // pixels
const LINE_HEIGHT = 22; // pixels

const regularBuffer = fs.readFileSync(path.join(__dirname, 'fonts', 'Marianne-Regular.otf'));
const boldBuffer = fs.readFileSync(path.join(__dirname, 'fonts', 'Marianne-Bold.otf'));

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

body { font-family: Marianne; font-size: 0.8rem; }
`;

function createTransformer(opts: TransformerOptions) {
  const { logger } = opts;

  return {
    async generatePDF(data: any): Promise<Buffer> {
      logger.info('Generating the PDF...');

      const browser = await puppeteer.launch();

      const textBlocks =  await splitHtmlIntoPages({ fullHtml: data.body, browser, maxWidth: BODY_WIDTH, firstPageMaxHeight: FIRST_PAGE_BODY_HEIGHT, otherPagesMaxHeight: OTHER_PAGE_BODY_HEIGHT });
      logger.info(`Number of pages generated: ${textBlocks.length}`);

      const templates: any[] = [];
      const inputs: any[] = [];
      
        function formatWrittenInfo(writtenFrom?: string | Date, writtenAt?: string): string {
          if (!writtenAt) return '';
        
          let formattedDate = '';
          if (writtenFrom) {
            const date = typeof writtenFrom === 'string' ? new Date(writtenFrom) : writtenFrom;
            formattedDate = format(date, 'd MMMM yyyy', { locale: frLocale });
          }
        
          return formattedDate
            ? `À ${writtenAt}, le ${formattedDate}`
            : `À ${writtenAt}`;
        }
       
        function formatImageContent(image: { content: string } | undefined): string {
          return image?.content
            ? image.content.replace(/^data:image\/(jpeg|png)(;charset=utf-8)?;base64,/, (match: string, format: string) => {
          return `data:image/${format};base64,`;
              }).replace(/\s/g, '')
            : '';
        }

        const logo1: string = formatImageContent(data.logo[0]);
        const logo2: string = formatImageContent(data.logo[1]);

        // Expéditeur
        const senderPage = await browser.newPage();
        await senderPage.setViewport({ width: 300, height: 300 });
        let senderHTML = "<div style='text-align: end; font-style: normal;font-weight: 400'>";
        if(data.sender.name) {
          senderHTML += `${data.sender.name}`;
        }
        if(data.sender.service) {
          senderHTML += `<br />${data.sender.service}`;
        }
        if(data.sender.firstName || data.sender.lastName) {
          senderHTML += `<br />${data.sender.firstName} ${data.sender.lastName}`;
        }
        if(data.sender.address) {
          senderHTML += `<br />${data.sender.address}`;
        }
        if(data.sender.email) {
          senderHTML += `<br />${data.sender.email}`;
        }
        if(data.sender.phone) {
          senderHTML += `<br />${data.sender.phone}`;
        }
        senderHTML += '</div>';
        await senderPage.setContent(senderHTML);
        await senderPage.addStyleTag({ content: `${fontCss}` });
        const sender = await senderPage.pdf({
          printBackground: true,
          width: `300px`,
          height: `300px`,
          pageRanges: '1',
        });

        // Objet
        const subjectPage = await browser.newPage();
        await subjectPage.setViewport({ width: BODY_WIDTH, height: LINE_HEIGHT * 2 });
        let subjectHTML = `<div id='block' style='margin: 0; padding: 0; display: inline-block;'>${data.subject}</div>`;
        await subjectPage.setContent(subjectHTML);
        await subjectPage.addStyleTag({ content: `${fontCss}` });
        const subject = await subjectPage.pdf({
          printBackground: true,
          width: `${BODY_WIDTH}px`,
          height: `${LINE_HEIGHT * 2}px`,
          pageRanges: '1',
        });

        // Date et lieu
        const writtenInfoPage = await browser.newPage();
        await writtenInfoPage.setViewport({ width: BODY_WIDTH, height: LINE_HEIGHT * 2 });
        let dateHTML = `<div id='block' style='margin: 0; padding: 0; display: inline-block;'>${formatWrittenInfo(data.writtenAt, data.writtenFrom)}</div>`;
        await writtenInfoPage.setContent(dateHTML);
        await writtenInfoPage.addStyleTag({ content: `${fontCss}` });
        const writtenInfo = await writtenInfoPage.pdf({
          printBackground: true,
          width: `${BODY_WIDTH}px`,
          height: `${LINE_HEIGHT * 2}px`,
          pageRanges: '1',
        });

        // Destinataire
        const recipientPage = await browser.newPage();
        await recipientPage.setViewport({ width: 300, height: 300 });
        let recipientHTML = `<div style='font-style: normal;font-weight: 400'><strong>À l'attention de</strong>`;
        if(data.owner.fullName) {
          recipientHTML += `<br />${data.owner.fullName}`;
        }
        if(data.owner.address) {
          recipientHTML += `<br />${data.owner.address.join('<br>')}`;
        }
        recipientHTML += '</div>';
        await recipientPage.setContent(recipientHTML);
        await recipientPage.addStyleTag({ content: `${fontCss}` });
        const recipient = await recipientPage.pdf({
          printBackground: true,
          width: `300px`,
          height: `300px`,
          pageRanges: '1',
        });

        // Signatures
        const signatoryPage = await browser.newPage();
        await signatoryPage.setViewport({ width: 400, height: 200 });
        let signatoryHTML = "";

        if (data.sender.signatories && data.sender.signatories.length > 0) {
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
              const signatoryImage = formatImageContent(signatory.file.content);       
              block += `<img src="${signatoryImage}" alt="Signature" style="width: 100px; margin: 10px" /><br />`;
            }

            block += `</div>`;
            signatoryHTML += block;
          }
        
          signatoryHTML += `</div>`;
        }

        await signatoryPage.setContent(signatoryHTML);
        await signatoryPage.addStyleTag({ content: `${fontCss}` });
        const signatory = await signatoryPage.pdf({
          printBackground: true,
          width: `400px`,
          height: `200px`,
          pageRanges: '1',
        });

        const firstPageSchema = [{
          name: "logo1",
          type: "image",
          position: { x: pixelsToPointsPNG(MARGIN_RIGHT), y: pixelsToPointsPNG(MARGIN_TOP) },
          width: pixelsToPointsPNG(LOGO_WIDTH),
          height: pixelsToPointsPNG(LOGO_WIDTH)
        },
          {
            name: "logo2",
            type: "image",
            position: { x: pixelsToPointsPNG(MARGIN_RIGHT), y: pixelsToPointsPNG(MARGIN_TOP + 5 + LOGO_WIDTH) },
            width: pixelsToPointsPNG(LOGO_WIDTH),
            height: pixelsToPointsPNG(LOGO_WIDTH)
          },
          {
            name: 'sender',
            type: 'pdf',
            position: { x: pixelsToPointsPDF(580), y: pixelsToPointsPDF(MARGIN_TOP) },
            width: pixelsToPointsPDF(300),
            height: pixelsToPointsPDF(300),

          },
          {
            name: 'recipient',
            type: 'pdf',
            position: { x: pixelsToPointsPDF(500), y: pixelsToPointsPDF(200) },
            width: pixelsToPointsPDF(300),
            height: pixelsToPointsPDF(300),

          },
          {
            name: "written_location",
            type: "pdf",
            position: { "x": pixelsToPointsPDF(MARGIN_RIGHT), "y": pixelsToPointsPDF(395) },
            width: pixelsToPointsPDF(BODY_WIDTH),
            height: pixelsToPointsPDF(LINE_HEIGHT * 2),
          },
          {
          name: "subject",
          type: "pdf",
          position: { "x": pixelsToPointsPDF(MARGIN_RIGHT), "y": pixelsToPointsPDF(360) },
          width: pixelsToPointsPDF(BODY_WIDTH),
          height: pixelsToPointsPDF(LINE_HEIGHT * 2),
        }];

        const pagesSchema = [{
          name: 'body',
          type: 'pdf',
          width: pixelsToPointsPDF(BODY_WIDTH),
          height: 0, // height will be replaced by calculated height
          position: { x : 0, y: 0}, // will be replaced by calculated position
      }]

        const lastPageSchema = [{
          name: 'signatory',
          type: 'pdf',
          position: { x: pixelsToPointsPDF(400), y: pixelsToPointsPDF(1100) },
          width: pixelsToPointsPDF(400),
          height: pixelsToPointsPDF(200),
        }];

        for (let i = 0; i < textBlocks.length; i++) {
          let schema = [];
          let bodySchema: Schema;
          if (i === 0) {
            schema.push(...firstPageSchema);
            bodySchema = Object.assign({}, pagesSchema[0]);
            bodySchema.width = pixelsToPointsPDF(BODY_WIDTH);
            bodySchema.height = pixelsToPointsPDF(FIRST_PAGE_BODY_HEIGHT + LINE_HEIGHT);
            bodySchema.position = { x: pixelsToPointsPDF(MARGIN_RIGHT), y: pixelsToPointsPDF(410) };
            schema.push(bodySchema);
          } else if (i > 0) {
            bodySchema = Object.assign({}, pagesSchema[0]);
            bodySchema.width = pixelsToPointsPDF(BODY_WIDTH);
            bodySchema.height = pixelsToPointsPDF(OTHER_PAGE_BODY_HEIGHT + LINE_HEIGHT);
            bodySchema.position = { x: pixelsToPointsPDF(MARGIN_RIGHT), y: pixelsToPointsPDF(100) };
            schema.push(bodySchema);
          }
          if (i == textBlocks.length - 1) {
            schema.push(...lastPageSchema);
          }
          const template: Template = {
            basePdf: BLANK_PDF,
            schemas: [
              schema
            ],
          };
          templates.push(template);

          const page = await browser.newPage();
          await page.setViewport({ width: BODY_WIDTH, height: i === 0 ? FIRST_PAGE_BODY_HEIGHT : OTHER_PAGE_BODY_HEIGHT });
          await page.setContent(`<div id='block' style='margin: 0; padding: 0; display: inline-block; font-size: 0.75rem'>${textBlocks[i]}</div>`);
          await page.addStyleTag({ content: `${fontCss}` });
          const pdfBuffer = await page.pdf({
            printBackground: true,
            width: `${BODY_WIDTH}px`,
            height: `${i === 0 ? FIRST_PAGE_BODY_HEIGHT : OTHER_PAGE_BODY_HEIGHT}px`,
            pageRanges: '1',
          });

          const inputsData = {
            logo1: logo1,
            logo2: logo2,
            sender: `data:application/pdf;base64,${sender.toString('base64')}`,
            recipient: `data:application/pdf;base64,${recipient.toString('base64')}`,
            written_location: `data:application/pdf;base64,${writtenInfo.toString('base64')}`,
            subject: `data:application/pdf;base64,${subject.toString('base64')}`,
            body: `data:application/pdf;base64,${pdfBuffer.toString('base64')}`,
            signatory: `data:application/pdf;base64,${signatory.toString('base64')}`,
          }
          inputs.push(inputsData);
        }
      await browser.close();
      // Generate PDF pages one by one
      const pdfBuffers: Buffer[] = [];
      for (let i = 0; i < templates.length; i++) {
        const pdfBuffer = await generate({ template: templates[i], inputs: [inputs[i]], plugins: {
          text,
          image,
          pdf: pdfPlugin,
        } });
        pdfBuffers.push(Buffer.from(pdfBuffer));
      }

      // Merge all PDFs
      const finalDoc = await PDFDocument.create();

      for (const buffer of pdfBuffers) {
        const docToMerge = await PDFDocument.load(buffer);
        const pages = await finalDoc.copyPages(docToMerge, docToMerge.getPageIndices());
        pages.forEach((page: typeof PDFPage) => finalDoc.addPage(page));
      }
      
      const finalPDF = await finalDoc.save();

      logger.info('Final PDF successfully generated!');

      return Buffer.from(finalPDF);
    }
  };
}

interface FindFitOptions {
  fullHtml: string;
  browser: typeof puppeteer.Browser;
  maxHeight: number;
  maxWidth: number;
  containerId?: string;
}

/**
 * Returns the maximum number of HTML characters that fit within a given area
 * without breaking the HTML code (properly closed tags).
 */
export async function findMaxHtmlLengthThatFits({
  fullHtml,
  browser,
  maxHeight,
  maxWidth,
  containerId = 'block',
}: FindFitOptions): Promise<number> {
  const safeIndices = getSafeCutPoints(fullHtml);
  let low = 0;
  let high = safeIndices.length - 1;
  let bestLength = 0;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const cutoffIndex = safeIndices[mid];
    const partialHtml = fullHtml.slice(0, cutoffIndex);

    const page = await browser.newPage();
    await page.setContent(`<div id="${containerId}" style="margin: 0; padding: 0; display: inline-block">${partialHtml}</div>`);
    await page.addStyleTag({ content: `${fontCss}` });
    const element = await page.$(`#${containerId}`);
    const box = await element?.boundingBox();

    if (box && box.height <= maxHeight && box.width <= maxWidth) {
      bestLength = cutoffIndex;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
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

export default {
  createTransformer
};

/**
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
  browser: typeof puppeteer.Browser;
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
      break;
    }

    const block = remainingHtml.slice(0, cutoff);
    blocks.push(block);
    remainingHtml = remainingHtml.slice(cutoff);
    isFirstPage = false;
  }

  return blocks;
}
