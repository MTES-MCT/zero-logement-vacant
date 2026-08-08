import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { initCrisp } from '../crisp';

describe('Crisp', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should load the chat client when initialized by the application', () => {
    const appendChild = vi
      .spyOn(document.head, 'appendChild')
      .mockImplementation((node) => node);

    initCrisp();

    expect(window.CRISP_WEBSITE_ID).toBe(
      '65781ccb-c386-4dbf-b614-5581c3a1ff7e'
    );
    expect(appendChild).toHaveBeenCalledOnce();
    expect(appendChild.mock.calls[0][0]).toMatchObject({
      async: true,
      src: 'https://client.crisp.chat/l.js'
    });
  });

  it('should bootstrap the chat independently before the application bundle', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    const bootstrap = readFileSync(
      resolve(process.cwd(), 'public/crisp-bootstrap.js'),
      'utf8'
    );

    expect(html).toContain('<script src="/crisp-bootstrap.js"></script>');
    expect(html.indexOf('/crisp-bootstrap.js')).toBeLessThan(
      html.indexOf('src/index.tsx')
    );
    expect(bootstrap).toContain(
      "const clientUrl = 'https://client.crisp.chat/l.js'"
    );
    expect(bootstrap).toContain('document.head.appendChild(script)');
  });

  it('should guard the independent bootstrap while a reset token is visible', () => {
    const bootstrap = readFileSync(
      resolve(process.cwd(), 'public/crisp-bootstrap.js'),
      'utf8'
    );

    expect(bootstrap).toContain(
      "window.location.pathname === '/mot-de-passe/nouveau'"
    );
    expect(bootstrap).toContain('window.location.hash.length > 1');
    expect(bootstrap.indexOf('return;')).toBeLessThan(
      bootstrap.indexOf('document.head.appendChild(script)')
    );
  });

  it('should not initialize the chat twice when the independent bootstrap already loaded it', () => {
    const queue = [['set', 'session:segments', [['authenticated']]]];
    const existingScript = document.createElement('script');
    existingScript.src = 'https://client.crisp.chat/l.js';
    window.$crisp = queue;
    vi.spyOn(document, 'querySelector').mockReturnValue(existingScript);
    const appendChild = vi
      .spyOn(document.head, 'appendChild')
      .mockImplementation((node) => node);

    initCrisp();

    expect(appendChild).not.toHaveBeenCalled();
    expect(window.$crisp).toBe(queue);
  });
});
