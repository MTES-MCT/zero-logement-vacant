// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
global.ReadableStream = require('node:stream/web').ReadableStream;
import * as handlebars from 'handlebars';
import path from 'node:path';
import puppeteer from 'puppeteer';
const { PDFDocument } = require('pdf-lib');

handlebars.registerHelper('localdate', (date: string) => {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
});

async function compile<T>(html: string, data?: T): Promise<string> {
  const compiled = handlebars.compile(html);
  return compiled(data);
}

async function fromHTML(
  htmlArray: string[],
  template: 'draft' | 'release'
): Promise<Buffer> {
  // Launch the browser and open a new blank page
  const browser = await puppeteer.launch({
    args: ['--no-sandbox'],
  });

  const pdfDocs = [];

  for (const html of htmlArray) {
    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: 'networkidle0',
    });
    await page.addStyleTag({
      path: path.join(__dirname, '..', 'templates', 'dsfr.min.css'),
    });
    await page.addStyleTag({
      path: path.join(
        __dirname,
        '..',
        'templates',
        template,
        `${template}.css`
      ),
    });
    const pdfBuffer = await page.pdf({ format: 'A4' });
    pdfDocs.push(pdfBuffer);
    await page.close();
  }
  browser.close();

  const mergedPdf = await PDFDocument.create();

  for (const pdfBuffer of pdfDocs) {
    const pdf = await PDFDocument.load(pdfBuffer);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page: any) => mergedPdf.addPage(page));
  }

  const mergedPdfFile = await mergedPdf.save();

  return Buffer.from(mergedPdfFile);
}

export default {
  compile,
  fromHTML,
};
