declare global {
  interface Window {
    $crisp: unknown[];
    CRISP_WEBSITE_ID: string;
  }
}

export function initCrisp(): void {
  window.$crisp = [];
  window.CRISP_WEBSITE_ID = '65781ccb-c386-4dbf-b614-5581c3a1ff7e';

  const script = document.createElement('script');
  script.src = 'https://client.crisp.chat/l.js';
  script.async = true;
  document.head.appendChild(script);
}
