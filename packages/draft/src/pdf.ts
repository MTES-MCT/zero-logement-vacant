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

function createTransformer(opts: TransformerOptions) {
  const { logger } = opts;
  const cache = new Map<string, (data: unknown) => string>();

  return {
    compile<T>(template: string, data?: T): string {
      const render = cache.get(template) ?? handlebars.compile(template);
      if (!cache.has(template)) {
        cache.set(template, render);
      }
      return render(data);
    },
    async fromHTML(htmls: string[]): Promise<Buffer> {
      // Launch the browser and open a new blank page
      const browser = await puppeteer.launch({
        args: ['--no-sandbox']
      });

      let index = 1;
      const document = await PDFDocument.create();
      await async.forEachSeries(htmls, async (html) => {
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
        const buffer = await tab.pdf({ format: 'A4' });
        await tab.close();
        const chunk = await PDFDocument.load(buffer);
        const pages = await document.copyPages(chunk, chunk.getPageIndices());
        pages.forEach((page) => {
          document.addPage(page);
        });
      });

      const mergedPDF = await document.save();
      logger.info('Saved generated PDF');
      return Buffer.from(mergedPDF);
    }
  };
}

export default {
  createTransformer
};
