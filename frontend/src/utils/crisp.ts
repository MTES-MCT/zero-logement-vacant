declare global {
  interface Window {
    $crisp: unknown[];
    CRISP_WEBSITE_ID: string;
  }
}

const CRISP_CLIENT_URL = 'https://client.crisp.chat/l.js';

export function initCrisp(): void {
  if (document.querySelector(`script[src="${CRISP_CLIENT_URL}"]`)) {
    return;
  }

  window.$crisp ??= [];
  window.CRISP_WEBSITE_ID = '65781ccb-c386-4dbf-b614-5581c3a1ff7e';

  const script = document.createElement('script');
  script.src = CRISP_CLIENT_URL;
  script.async = true;
  document.head.appendChild(script);
}
