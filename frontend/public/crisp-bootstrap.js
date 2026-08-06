(function () {
  const hasVisiblePasswordResetToken =
    window.location.pathname === '/mot-de-passe/nouveau' &&
    window.location.hash.length > 1;
  if (hasVisiblePasswordResetToken) {
    return;
  }

  const clientUrl = 'https://client.crisp.chat/l.js';
  if (document.querySelector(`script[src="${clientUrl}"]`)) {
    return;
  }

  window.$crisp = window.$crisp || [];
  window.CRISP_WEBSITE_ID = '65781ccb-c386-4dbf-b614-5581c3a1ff7e';

  const script = document.createElement('script');
  script.src = clientUrl;
  script.async = true;
  document.head.appendChild(script);
})();
