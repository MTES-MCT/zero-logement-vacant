// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
global.ReadableStream = require('node:stream/web').ReadableStream;
import * as handlebars from 'handlebars';
import path from 'node:path';
import puppeteer from 'puppeteer';

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

async function fromHTML(html: string): Promise<Buffer> {
  // Launch the browser and open a new blank page
  const browser = await puppeteer.launch({
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();

  await page.setContent(html, {
    waitUntil: 'domcontentloaded',
  });
  await page.addStyleTag({
    path: path.join(__dirname, '..', 'templates', 'dsfr.min.css'),
  });
  await page.addStyleTag({
    path: path.join(__dirname, '..', 'templates', 'draft.css'),
  });

  const buffer = await page.pdf({
    format: 'A4',
  });

  await browser.close();

  return buffer;
}

export default {
  compile,
  fromHTML,
};
