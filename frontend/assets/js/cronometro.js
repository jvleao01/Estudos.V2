/* Página Cronômetro.
   Depende de: dashboard-utils.js (formatMinutos), cronometro-utils.js, api.js, ui.js
   A sessão vive só na memória da página: fechar ou recarregar perde o tempo (decisão do usuário). */
(function () {
  const $ = (id) => document.getElementById(id);
  const TITULO = 'Estudos · Cronômetro';

  // fase: 'parado' | 'rodando' | 'pausado'
  const estado = { materias: [], fase: 'parado', acumuladoMs: 0, inicioTrecho: null, inicioSessao: null };

  const decorrido = () => decorridoMs(estado, Date.now());
  const emSessao = () => estado.fase !== 'parado';
  const materiaAtual = () => estado.materias.find((m) => String(m.id) === $('materia').value) || null;

  // ---------- tela ----------
  function tick() {
    const texto = formatarRelogio(decorrido());
    $('relogio').textContent = texto;
    document.title = emSessao() ? `${texto} · Cronômetro` : TITULO;
  }

  function atualizarTela() {
    const { fase } = estado;
    $('btn-iniciar').hidden = fase !== 'parado';
    $('btn-iniciar').disabled = !materiaAtual();
    $('btn-pausar').hidden = fase === 'parado';
    $('btn-pausar').textContent = fase === 'pausado' ? 'Retomar' : 'Pausar';
    $('btn-finalizar').hidden = fase === 'parado';
    $('btn-cancelar').hidden = fase === 'parado';
    $('materia').disabled = fase !== 'parado';
    $('mostrador').classList.toggle('crono__mostrador--pausado', fase === 'pausado');
    $('mostrador').classList.toggle('crono__mostrador--rodando', fase === 'rodando');
    $('estado-texto').textContent = fase === 'pausado' ? 'Pausado' : '';
    const m = materiaAtual();
    $('materia-cor').style.setProperty('--cor', m ? m.cor : 'var(--borda)');
    tick();
  }

  function mostrarHoje(minutos) {
    $('hoje').textContent = `Hoje: ${formatMinutos(minutos)} estudadas`;
  }

  // ---------- carregamento ----------
  async function carregarHoje() {
    const r = await apiFetch(`/api/sessoes/resumo?data=${dataLocalISO(new Date())}`);
    mostrarHoje(r.minutos);
  }

  async function carregar() {
    $('painel-erro').replaceChildren();
    try {
      const [materias] = await Promise.all([apiFetch('/api/materias?status=cursando'), carregarHoje()]);
      estado.materias = materias.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      const escolhida = $('materia').value;
      $('materia').replaceChildren(
        el('option', { value: '' }, 'Escolha a matéria'),
        ...estado.materias.map((m) => el('option', { value: m.id, selected: String(m.id) === escolhida }, m.nome)),
      );
      $('area').hidden = false;
      $('painel-vazio').hidden = estado.materias.length > 0;
      atualizarTela();
    } catch (e) {
      $('area').hidden = true;
      $('painel-vazio').hidden = true;
      $('painel-erro').replaceChildren(el('div', { class: 'estado estado--erro' }, icone('alerta'), el('p', {}, e.message),
        el('button', { class: 'btn', type: 'button', onclick: carregar }, 'Tentar de novo')));
    }
  }

  // ---------- controles ----------
  function iniciar() {
    if (!materiaAtual()) return;
    Object.assign(estado, { fase: 'rodando', acumuladoMs: 0, inicioTrecho: Date.now(), inicioSessao: new Date() });
    atualizarTela();
  }

  function pausar() {
    if (estado.fase !== 'rodando') return;
    Object.assign(estado, { fase: 'pausado', acumuladoMs: decorrido(), inicioTrecho: null });
    atualizarTela();
  }

  function retomar() {
    Object.assign(estado, { fase: 'rodando', inicioTrecho: Date.now() });
    atualizarTela();
  }

  function zerar() {
    Object.assign(estado, { fase: 'parado', acumuladoMs: 0, inicioTrecho: null, inicioSessao: null });
    atualizarTela();
  }

  function finalizar() {
    pausar();
    const minutos = arredondarMinutos(decorrido());
    $('resumo-titulo').textContent = `Sessão de ${materiaAtual().nome}`;
    $('resumo-tempo').textContent = formatMinutos(minutos);
    $('resumo-aviso').hidden = minutos > 0;
    $('btn-salvar').disabled = minutos === 0;
    $('dlg-resumo').showModal();
  }

  async function salvar() {
    const m = materiaAtual();
    const minutos = arredondarMinutos(decorrido());
    const botao = $('btn-salvar');
    botao.disabled = true;
    try {
      await apiFetch('/api/sessoes', {
        method: 'POST',
        body: { materiaId: m.id, inicio: dataHoraLocalISO(estado.inicioSessao), minutos },
      });
      $('dlg-resumo').close();
      zerar();
      toast(`${formatMinutos(minutos)} salvos em ${m.nome}.`);
      carregarHoje().catch(() => {}); // o total do dia é só informativo
    } catch (e) {
      toast(e.message, { erro: true }); // o resumo continua aberto e o tempo não se perde
    } finally {
      botao.disabled = minutos === 0;
    }
  }

  async function descartar(tituloConfirmacao) {
    const sim = await confirmar({
      titulo: tituloConfirmacao, texto: 'O tempo desta sessão será perdido.', botao: 'Descartar', perigo: true,
    });
    if (!sim) return;
    $('dlg-resumo').close();
    zerar();
  }

  // ---------- eventos ----------
  $('materia').addEventListener('change', atualizarTela);
  $('btn-iniciar').addEventListener('click', iniciar);
  $('btn-pausar').addEventListener('click', () => (estado.fase === 'rodando' ? pausar() : retomar()));
  $('btn-finalizar').addEventListener('click', finalizar);
  $('btn-cancelar').addEventListener('click', () => descartar('Cancelar sessão?'));
  $('btn-continuar').addEventListener('click', () => $('dlg-resumo').close());
  $('btn-salvar').addEventListener('click', salvar);
  $('btn-descartar').addEventListener('click', () => descartar('Descartar sessão?'));
  ligarDialogs();

  // Sair da página com sessão em andamento: o navegador pede confirmação (texto padrão dele).
  window.addEventListener('beforeunload', (e) => {
    if (!emSessao()) return;
    e.preventDefault();
    e.returnValue = '';
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') tick(); });
  setInterval(tick, 250);

  carregar();
})();
