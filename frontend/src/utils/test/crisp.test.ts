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
});
