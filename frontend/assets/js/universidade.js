/* Atalho "Faculdade" do menu: portal do aluno no computador, app Minha Wyden (App Store) no celular.
   O link no HTML já aponta para o portal; aqui só troca para a App Store em celular/tablet. */
(function (root) {
  const URL_PORTAL = 'https://portal.siaaluno.com.br/sianet/Logon';
  const URL_APP = 'https://apps.apple.com/br/app/integrees/id1541892299';

  // iPad com iPadOS 13+ diz ser "Macintosh"; o que o diferencia de um Mac é a tela de toque.
  function ehMovel(userAgent, maxTouchPoints) {
    if (/iPhone|iPod|iPad|Android/i.test(userAgent)) return true;
    return /Macintosh/.test(userAgent) && maxTouchPoints > 1;
  }

  const api = { ehMovel, URL_PORTAL, URL_APP };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
    return;
  }
  Object.assign(root, api);
  if (ehMovel(navigator.userAgent, navigator.maxTouchPoints || 0)) {
    document.querySelectorAll('a[data-faculdade]').forEach((a) => { a.href = URL_APP; });
  }
})(typeof window !== 'undefined' ? window : globalThis);
