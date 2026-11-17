# Calendário (design)

## Intenção
O usuário (uso pessoal, sem login, estuda na Newton Paiva em Belo Horizonte) quer ver o mês de relance: dias de aula, provas e entregas de trabalho. Ele informa uma vez as datas do semestre e em que dias da semana cada matéria tem aula (ex.: Cálculo II às segundas e quartas). As aulas se repetem até o fim do semestre, somem nos feriados e podem ser desmarcadas num dia avulso (semana sem aula).

## Objetivos
- Página `frontend/pages/calendario.html`, título "Calendário", com o mês em grade e setas para navegar entre meses.
- Cada dia mostra marcadores: aula (bolinha na cor da matéria), prova (triângulo), entrega (quadrado) e feriado (dia destacado).
- Tocar num dia mostra a lista do dia: feriado (nome), aulas, provas e entregas.
- Folha **"Aulas da semana"**: datas de início e fim do semestre e uma grade matéria × dia da semana (seg a sáb) para marcar as aulas.
- **Desmarcar** uma aula num dia específico, e **Remarcar** se mudar de ideia.
- Feriados nacionais (incluindo os móveis) e os municipais de Belo Horizonte, calculados no app.
- Item "Calendário" no menu de todas as páginas.

## Não-objetivos
- Horário das aulas, sala, professor.
- Aula avulsa fora da regra semanal (ex.: reposição num sábado).
- Editar provas e trabalhos pelo calendário (só exibir).
- Feriados de outras cidades/estados, pontos facultativos além do Carnaval, recessos da faculdade (o usuário desmarca).
- Domingo como dia de aula.
- Mostrar aulas no Dashboard.
- Notificações.

## Anti-objetivos
- Desmarcações perdidas quando o semestre ou os dias de aula mudam.
- Aula marcada em feriado.
- Dia errado por fuso horário (usar data local, como `parseDataLocal`).
- Aula aparecendo fora do período do semestre.

## Abordagens
- **A (escolhida pelo usuário):** guardar a regra (semestre com início/fim, matéria × dia da semana) e as exceções (aulas desmarcadas); a API entrega os dados crus do mês e `calendario-utils.js` (funções puras, `node --test`) monta os dias de aula, calcula os feriados e aplica as exceções. Mudanças na regra valem na hora e as desmarcações sobrevivem.
- **B (descartada):** gerar uma linha por aula no banco. Toda mudança exige regerar e as desmarcações se perdem.
- **C (descartada):** mesmo modelo de A com cálculo no servidor. Foge do padrão do projeto (API entrega dados, regras nos `*-utils.js`).

## Banco
Acrescentar em `backend/sql/bd.sql` (`CREATE TABLE IF NOT EXISTS`, pode rodar de novo sem apagar dados):
- `semestres (semestre CHAR(6) PRIMARY KEY, inicio DATE NOT NULL, fim DATE NOT NULL)` — o texto do semestre é o mesmo de `materias.semestre` ("2026.2").
- `aulas_semana (materia_id INT, dia_semana TINYINT, PRIMARY KEY (materia_id, dia_semana), FK materias ON DELETE CASCADE)` — `dia_semana` 1 = segunda … 6 = sábado (mesma numeração de `Date.getDay()`).
- `aulas_desmarcadas (materia_id INT, data DATE, PRIMARY KEY (materia_id, data), FK materias ON DELETE CASCADE)`.
- `seed.sql`: semestre 2026.2 (03/08/2026 a 12/12/2026), dias de aula para as matérias cursando, uma aula desmarcada. **O seed nunca é rodado no banco real sem o usuário pedir.**
- `conftest.py`: as tabelas novas entram na lista de `TRUNCATE` dos testes.

## API (JSON)
Erros como nas outras rotas: 400 `{erro}` em português, 404 para inexistente, 503 com o banco fora.

**`GET /api/calendario?mes=AAAA-MM`** (blueprint `rotas/calendario.py`)
- `mes` obrigatório e válido (senão 400 "Mês inválido. Use o formato AAAA-MM.").
- Resposta:
  - `semestres`: `[{semestre, inicio, fim}]` cujo período cruza o mês.
  - `aulas`: `[{materiaId, nome, cor, semestre, dias: [1, 3]}]` das matérias desses semestres que têm ao menos um dia marcado.
  - `desmarcadas`: `[{materiaId, data}]` dentro do mês.
  - `provas`: `[{id, materiaId, materia: {nome, cor}, titulo, data, concluido, simulado}]` com data no mês.
  - `trabalhos`: `[{id, materiaId, materia: {nome, cor}, titulo, data, concluido}]` com entrega no mês (campo `data`).
- Listas ordenadas por data, depois id (aulas por nome).

**`GET /api/semestres/<semestre>`** — `semestre` no formato `\d{4}\.[12]` (senão 400).
- `{semestre, inicio, fim, materias: [{id, nome, cor, status, dias: [...]}]}` com todas as matérias daquele semestre (cursando e cursadas), por nome. Sem datas cadastradas: `inicio`/`fim` `null` (não é 404).

**`PUT /api/semestres/<semestre>`** com `{inicio, fim, aulas: {"<materiaId>": [1, 3], ...}}`
- Grava as datas e **substitui** os dias de aula das matérias enviadas, numa transação. Matérias do semestre não enviadas ficam como estão.
- Validação: datas `AAAA-MM-DD` válidas; `inicio` < `fim` ("O início deve ser antes do fim."); período de até 200 dias ("O semestre pode ter no máximo 200 dias."); `aulas` objeto; cada lista com inteiros de 1 a 6 sem repetição ("Dia da semana inválido."); cada matéria existe e é daquele semestre ("Matéria não pertence a esse semestre.").
- Resposta: igual ao `GET`.

**`POST /api/aulas/desmarcadas`** com `{materiaId, data}` → 201 `{materiaId, data}`; repetir é aceito (idempotente, 201). Matéria inexistente → 400 "Matéria não encontrada.".
**`DELETE /api/aulas/desmarcadas/<materiaId>/<data>`** → 204; inexistente → 404 "Aula desmarcada não encontrada.".
A API não confere se a data é mesmo um dia de aula (a interface só oferece o botão nesses dias).

## Regras de cálculo (`calendario-utils.js`)
- `pascoa(ano)`: algoritmo de Meeus/Jones/Butcher (calendário gregoriano).
- `feriados(ano) -> Map<'AAAA-MM-DD', nome>`:
  - Nacionais fixos: 01/01 Confraternização Universal, 21/04 Tiradentes, 01/05 Dia do Trabalho, 07/09 Independência, 12/10 Nossa Senhora Aparecida, 02/11 Finados, 15/11 Proclamação da República, 20/11 Consciência Negra, 25/12 Natal.
  - Móveis: Carnaval (segunda e terça, Páscoa − 48 e − 47), Sexta-feira Santa (Páscoa − 2), Corpus Christi (Páscoa + 60).
  - Belo Horizonte: 15/08 Assunção de Nossa Senhora, 08/12 Imaculada Conceição.
- `diasDoMes(ano, mes, dados) -> Map<'AAAA-MM-DD', {feriado: string|null, aulas: [...], provas: [...], trabalhos: [...]}>`:
  - Aula da matéria M no dia D quando: D está entre `inicio` e `fim` (inclusive) do semestre de M; `D.getDay()` está nos dias de M; D não é feriado. Cada aula traz `{materiaId, nome, cor, desmarcada: boolean}` (desmarcada continua na lista do dia, para poder remarcar, mas não gera marcador na grade).
  - Provas e entregas entram no dia da data, mesmo em feriado.
- `gradeDoMes(ano, mes)`: semanas de domingo a sábado, com os dias de fora do mês como `null` (células vazias).

## Interface
- Mesmo tema, componentes de `ui.js`/`componentes.css`, estados (carregando, erro com "Tentar de novo"), animação AOS na primeira carga.
- **Topo:** sub "Agenda", título "Calendário"; botão "Aulas da semana" (ícone de calendário) ao lado.
- **Navegação:** `‹ Novembro 2026 ›` e botão "Hoje" quando o mês exibido não é o atual. O mês fica na URL (`#2026-11`) para recarregar no mesmo lugar.
- **Grade:** cabeçalho dom … sáb; hoje com contorno; dia selecionado destacado; feriado com o número em cor de destaque e fundo suave; até 3 marcadores por dia e "+N" se houver mais. Cada célula é um botão com `aria-label` completo (ex.: "Quarta, 18 de novembro: 1 aula, 1 prova").
- **Lista do dia** (abaixo da grade no celular, ao lado no computador ≥ 900px): título "Quarta, 18/11"; feriado com o nome; aulas com o nome da matéria e botão "Desmarcar" (desmarcada: texto riscado "Sem aula" e botão "Remarcar"); provas ("Prova", ou "Simulado") e entregas ("Entrega"), concluídas mais apagadas. Dia vazio: "Nada neste dia.". Ao abrir a página, o dia selecionado é hoje (ou o dia 1 se o mês exibido não for o atual).
- **Desmarcar/Remarcar:** sem confirmação; toast "Aula desmarcada." com "Desfazer".
- **Aviso de semestre:** se o mês exibido cai num semestre (pelo `semestreAtual` do dia 15 do mês) sem datas cadastradas, faixa "Defina as datas do semestre 2026.2 para ver as aulas." com botão que abre a folha.
- **Folha "Aulas da semana":** semestre do mês exibido (`semestreAtual` do dia 15); campos Início e Fim (`type="date"`); grade com as matérias daquele semestre × seg ter qua qui sex sáb (checkboxes com `aria-label` "Cálculo II, segunda"). Sem matérias nesse semestre: aviso com link para Matérias (as datas ainda podem ser salvas). Salvar → `PUT`, toast "Aulas salvas.", recarrega o mês. Erros da API aparecem na folha.
- **Menu:** item "Calendário" depois de "Notas", em todas as páginas; ícone de calendário. Menu com 7 itens: conferir em 360px; se os rótulos cortarem demais, reduzir a fonte do rótulo só no celular estreito.

## Estrutura
- `backend/rotas/calendario.py` (`/api/calendario`, `/api/semestres`, `/api/aulas/desmarcadas` no mesmo blueprint ou em blueprints pequenos registrados em `app.py`); validações em `rotas/validacao.py` quando reaproveitáveis (`validar_data` já existe).
- `frontend/pages/calendario.html`, `frontend/assets/js/calendario.js`, `frontend/assets/js/calendario-utils.js`, `frontend/assets/css/calendario.css`.
- Testes: pytest para as rotas (formato, filtro por mês, validações, substituição dos dias, desmarcar idempotente, cascade ao excluir matéria); `node --test` para `pascoa` (anos conhecidos: 2024 → 31/03, 2025 → 20/04, 2026 → 05/04, 2027 → 28/03), `feriados` (Carnaval 2026 = 16 e 17/02, Corpus Christi 2026 = 04/06, BH), `diasDoMes` (limites do semestre, feriado sem aula, desmarcada) e `gradeDoMes` (mês começando no domingo e no sábado, fevereiro bissexto).

## Decisões minhas (o usuário pode corrigir)
- Feriados de BH incluídos; Carnaval conta como feriado (segunda e terça).
- Dias de aula de segunda a sábado (sem domingo).
- Datas do semestre e dias de aula na mesma folha, escolhendo o semestre pelo mês exibido.
- Aula desmarcada continua listada no dia (para remarcar), mas sem marcador na grade.
- Desmarcar sem confirmação, com "Desfazer".
- Provas e trabalhos concluídos aparecem mais apagados.
- Mês exibido guardado na URL.
- Item do menu depois de "Notas".

## Deixado ao implementador
Ícones exatos, cores dos marcadores de prova/entrega, layout fino no computador, animação ao trocar de mês, textos de ajuda.
