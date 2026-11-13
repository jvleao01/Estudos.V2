# Cronômetro (design)

## Intenção
Registrar o tempo de estudo de cada matéria. O usuário (uso pessoal, sem login) escolhe a matéria, liga o cronômetro, pode pausar, e ao final salva a sessão. O tempo salvo alimenta o "horas estudadas" dos cards de Matérias (e, no futuro, o Dashboard). A regra é simples e explícita: só conta o que foi finalizado e salvo; fechar o app perde a sessão.

## Objetivos
- Página `frontend/pages/cronometro.html` com um cronômetro progressivo (conta para cima).
- Antes de iniciar, escolher a matéria (obrigatório). Durante a sessão a matéria fica travada.
- Controles: Iniciar; durante a sessão, Pausar/Retomar, Finalizar e Cancelar.
- Finalizar mostra um resumo com o tempo arredondado ao minuto mais próximo (55min54s → 56min) e exibido em horas e minutos (90min → "1h 30min"), com Salvar, Continuar e Descartar.
- Só Salvar grava a sessão no banco.
- Linha "Hoje: Xh Ymin estudadas" com a soma das sessões salvas no dia.
- Remover "Notas" da navegação inferior de todas as páginas.

## Não-objetivos
- Recuperar uma sessão depois de fechar ou recarregar a página.
- Histórico/listagem de sessões, edição ou exclusão de sessões.
- Pomodoro, contagem regressiva, alarmes, notificações.
- Ligar o Dashboard à API (fica para o final, por decisão do usuário).

## Anti-objetivos
- Tempo errado por a aba ficar em segundo plano (o celular de lado com a tela apagada).
- Salvar uma sessão sem o usuário pedir, ou perder uma sessão sem avisar quando a saída é pela própria navegação do app.

## Abordagens
- **Escolhida (única sensata):** o cronômetro vive no navegador, em memória (horário do trecho atual + tempo acumulado das pausas). Ao salvar, `POST /api/sessoes`.
- **Descartada:** sessão no servidor desde o início (iniciar/pausar/finalizar gravados). Serve para sobreviver ao fechamento, que o usuário não quer, e deixa sessões abandonadas no banco.
- **Descartada:** sessão no armazenamento do navegador. Contradiz "fechou, perdeu" e cria sessões antigas reaparecendo.

## Banco
Sem mudanças. Usa `sessoes_estudo(id, materia_id FK ON DELETE CASCADE, inicio DATETIME NOT NULL, minutos INT NOT NULL)`, que `rotas/materias.py` já soma em `minutosTotais`.

## API (JSON) — `backend/rotas/sessoes.py`, blueprint registrado em `app.py`
- `POST /api/sessoes` com `{materiaId, inicio, minutos}` → 201 `{id, materiaId, inicio, minutos}`.
  - `materiaId`: inteiro (bool não conta) de matéria existente; erros "Matéria inválida." / "Matéria não encontrada." (reusar `rotas/validacao.py`).
  - `inicio`: data e hora local `AAAA-MM-DDTHH:MM:SS`; inválido → 400 "Início inválido. Use o formato AAAA-MM-DDTHH:MM:SS.".
  - `minutos`: inteiro de 1 a 1440; fora disso → 400 "Os minutos devem ser um número inteiro entre 1 e 1440.".
  - JSON ausente → 400 "Envie os dados em JSON.".
- `GET /api/sessoes/resumo?data=AAAA-MM-DD` → `{data, minutos}`: soma dos minutos das sessões cujo `inicio` cai nessa data (0 se nenhuma). `data` ausente ou inválida → 400 com a mensagem de data de `validacao.py`. A data vem do navegador (data local de hoje).
- Erros e 503 seguem o padrão das outras APIs.

## Interface
- Mesmo tema escuro, componentes de `ui.js`/`componentes.css`, toast e diálogos das outras páginas. Sem emojis.
- Topo: "Cronômetro". Abaixo, o campo Matéria (`<select>` com as matérias `cursando`, por nome, mostrando a bolinha de cor da selecionada).
- Relógio grande `HH:MM:SS` no centro, com números de largura fixa (tabular).
- Estados e botões:
  - **Parado:** Iniciar (desativado sem matéria escolhida). Matéria editável.
  - **Rodando:** Pausar, Finalizar; link/botão secundário Cancelar. Matéria travada.
  - **Pausado:** Retomar, Finalizar; Cancelar. Relógio com indicação visual de pausado (por exemplo, opacidade e o texto "Pausado").
- **Finalizar** pausa o relógio e abre o painel inferior: "Sessão de {matéria}", tempo arredondado em destaque (`formatMinutos`), botões Salvar e Continuar, e Descartar como ação secundária. Continuar fecha o painel e mantém o cronômetro pausado (o usuário retoma quando quiser).
- **Menos de 30 segundos** (arredonda para 0): Salvar desativado e o texto "Sessão muito curta para salvar."
- **Salvar:** `POST`, toast "{56min} salvos em {matéria}.", cronômetro volta a parado (zerado, mesma matéria selecionada), linha "Hoje" atualizada. Em erro da API: toast de erro e o painel continua aberto, sem perder o tempo.
- **Cancelar / Descartar:** confirmação ("Descartar sessão?" / "O tempo desta sessão será perdido."), depois volta a parado e zerado.
- **Sair da página com sessão em andamento (rodando ou pausada):** `beforeunload` pede confirmação ao navegador. O texto da janela é o padrão do navegador (não dá para personalizar).
- **Sem matérias cursando:** estado vazio "Cadastre uma matéria em Matérias para começar." com link para `materias.html`; Iniciar desativado.
- **Erro ao carregar** (matérias ou resumo): estado de erro com "Tentar de novo", igual às outras páginas.
- Tempo medido por relógio (`Date.now()`): decorrido = acumulado + (agora − início do trecho, se rodando). A tela atualiza a cada ~250 ms; ao voltar para a aba (`visibilitychange`), a tela se atualiza na hora.
- O `inicio` enviado é a data e hora local do primeiro Iniciar da sessão.
- Título da aba do navegador mostra o tempo enquanto roda ("00:12:05 · Cronômetro").
- Navegação inferior: remover "Notas" em `index.html`, `pages/materias.html` e `pages/trabalhos.html`; "Cronômetro" aponta para `cronometro.html` e fica ativo na nova página.

## Estrutura
- `backend/rotas/sessoes.py`; `backend/tests/test_sessoes.py`.
- `frontend/pages/cronometro.html`, `frontend/assets/js/cronometro.js`, `frontend/assets/css/cronometro.css`.
- `frontend/assets/js/cronometro-utils.js` (funções puras, padrão UMD dos outros utils) + `tests/cronometro-utils.test.js`:
  - `decorridoMs(estado, agora)` com `estado = {acumuladoMs, inicioTrecho|null}`;
  - `arredondarMinutos(ms)` (minuto mais próximo; 29s → 0, 30s → 1, 55min54s → 56);
  - `formatarRelogio(ms)` → `HH:MM:SS` (passa de 99h sem quebrar);
  - `dataHoraLocalISO(date)` → `AAAA-MM-DDTHH:MM:SS` e `dataLocalISO(date)` → `AAAA-MM-DD`.
- Reusar `formatMinutos` de `dashboard-utils.js` para "1h 30min".

## Decisões minhas (o usuário aprovou na conversa)
- Matérias só `cursando`; matéria travada durante a sessão.
- Resumo ao finalizar com Continuar para desfazer um finalizar sem querer.
- Confirmação em Cancelar e Descartar.
- Sessões que arredondam para 0 não podem ser salvas.
- Aviso do navegador ao sair com sessão em andamento.
- Linha "Hoje" com o total do dia; nada de histórico.
- Medição pelo relógio, para não atrasar em segundo plano.

## Decisões minhas de detalhe (não discutidas)
- Limite de 1440 minutos (24 h) por sessão na API.
- Continuar deixa o cronômetro pausado, não rodando.
- A sessão conta para o dia em que começou.

## Deixado ao implementador
Tamanho e tipografia do relógio, animações, ícones dos botões, layout em telas largas.
