/* Only public identifiers. Never add app secrets, tokens or spreadsheet data. */
(() => {
  'use strict';
  const button = document.getElementById('connect');
  const status = document.getElementById('status');
  const trustedOrigins = new Set(['https://www.facebook.com', 'https://web.facebook.com']);
  let active = false;
  let codeReceived = false;
  let finished = false;
  let timer;
  const show = text => { status.textContent = text; };
  function stop(text) {
    active = false;
    clearTimeout(timer);
    button.disabled = false;
    show(text);
  }
  function progress() {
    if (finished && codeReceived) {
      stop('Fluxo da Meta concluído e código recebido. A integração no servidor ainda está pendente; a automação não foi ativada.');
    } else {
      show('Retorno parcial recebido. Aguardando a conclusão do fluxo da Meta.');
    }
  }
  window.addEventListener('message', event => {
    if (!active || !trustedOrigins.has(event.origin)) return;
    let payload;
    try { payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data; }
    catch { return; }
    if (!payload || payload.type !== 'WA_EMBEDDED_SIGNUP') return;
    if (payload.event === 'FINISH' || payload.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING') {
      finished = true;
      progress();
    } else if (payload.event === 'CANCEL') {
      stop('Conexão cancelada. Você pode tentar novamente.');
    } else if (payload.event === 'ERROR') {
      stop('A Meta informou um erro. Revise as permissões, a configuração de coexistência e o domínio autorizado.');
    }
  });
  button.addEventListener('click', () => {
    if (active || !window.FB) return;
    active = true;
    finished = codeReceived = false;
    button.disabled = true;
    show('Conclua as etapas na janela da Meta.');
    timer = setTimeout(() => stop('Não foi possível confirmar a conclusão. Verifique a janela da Meta antes de tentar novamente.'), 10 * 60 * 1000);
    try {
      window.FB.login(response => {
        if (!active) return;
        if (typeof response?.authResponse?.code === 'string' && response.authResponse.code.length > 0) {
          // Diagnostic-only stage: deliberately discard the one-use authorization code.
          // Server-side exchange must be integrated before end-to-end activation.
          codeReceived = true;
          progress();
        } else {
          stop('Autorização não concluída. Verifique se o navegador permitiu a janela da Meta.');
        }
      }, {
        config_id: '1585444106446034',
        response_type: 'code',
        override_default_response_type: true,
        extras: { setup: {}, featureType: 'whatsapp_business_app_onboarding', sessionInfoVersion: '3' }
      });
    } catch {
      stop('Não foi possível abrir a Meta. Recarregue a página e tente novamente.');
    }
  });
  if (window.location.protocol !== 'https:') {
    show('Abra a página publicada em HTTPS para iniciar a conexão.');
    button.textContent = 'Conectar WhatsApp Business';
    return;
  }
  const loadTimer = setTimeout(() => show('A Meta não carregou. Verifique a conexão ou bloqueadores e recarregue a página.'), 20000);
  window.fbAsyncInit = () => {
    clearTimeout(loadTimer);
    try {
      window.FB.init({ appId: '1438322484789945', cookie: false, xfbml: false, version: 'v26.0' });
      button.disabled = false;
      button.textContent = 'Conectar WhatsApp Business';
      show('Pronto para iniciar a conexão com a Meta.');
    } catch { show('Falha ao iniciar a Meta. Revise a versão da API e a configuração do aplicativo.'); }
  };
  const sdk = document.createElement('script');
  sdk.src = 'https://connect.facebook.net/pt_BR/sdk.js';
  sdk.async = true;
  sdk.onerror = () => { clearTimeout(loadTimer); show('Não foi possível carregar a Meta. Verifique sua conexão e recarregue a página.'); };
  document.head.appendChild(sdk);
})();
