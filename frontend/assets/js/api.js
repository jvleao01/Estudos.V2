/* Cliente da API. Lança Error com a mensagem em português vinda do servidor. */
async function apiFetch(caminho, opcoes = {}) {
  const config = { ...opcoes, headers: { ...(opcoes.headers || {}) } };
  if (config.body !== undefined && typeof config.body !== 'string') {
    config.headers['Content-Type'] = 'application/json';
    config.body = JSON.stringify(config.body);
  }
  let resposta;
  try {
    resposta = await fetch(caminho, config);
  } catch (_e) {
    throw new Error('Sem conexão com o servidor. O app Python (backend/app.py) está rodando?');
  }
  if (resposta.status === 204) return null;
  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    throw new Error((dados && dados.erro) || `Erro inesperado (${resposta.status}).`);
  }
  return dados;
}
