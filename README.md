# Estudos

Webapp pessoal para organizar a faculdade: matérias, trabalhos, provas, notas, calendário de aulas e tempo de estudo, tudo num só lugar. Feito primeiro para o celular, mas funciona também no computador.

Uso pessoal, sem login: roda no próprio computador e é aberto pelo navegador em `http://localhost:5000`.

---

## Sumário

- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Como rodar](#como-rodar)
- [Testes](#testes)
- [Estrutura do projeto](#estrutura-do-projeto)
- [API](#api)
- [Banco de dados](#banco-de-dados)

---

## Funcionalidades

### Início (Dashboard)
Resumo da semana atual (segunda a domingo):
- **Total estudado na semana**, **tempo por matéria** (barras), **horas por dia** (linha) e **distribuição do tempo** (rosca).
- **Ranking de matérias** pelo tempo estudado.
- **Próximas provas**, com destaque para as que estão a 3 dias ou menos.
- **Notas:** quanto falta para ser aprovado em cada matéria, com quem precisa de mais pontos no topo.
- **Esta semana:** aulas, provas, entregas e feriados de cada dia.

### Matérias
- Abas **Cursando** e **Já cursadas** (agrupadas por semestre).
- Cada matéria tem nome, semestre (`2026.2`), cor, **nota mínima** e **total de pontos**.
- O card mostra horas estudadas, trabalhos (e quantos estão pendentes) e as datas das próximas provas.
- Ações: editar, finalizar (move para "Já cursadas") e excluir.

### Trabalhos e Provas
- Duas abas, cada uma com matéria, data, descrição e **valor em pontos**.
- Provas podem ser do tipo **Simulado** (a nota vale como ponto bônus).
- Contagem de dias ("Faltam 5 dias", "Amanhã", "Atrasado há 2 dias"), em vermelho com 7 dias ou menos.
- Marcar como **entregue** / **feita** (com "Desfazer"); os concluídos vão para uma seção recolhida.

### Notas
- Um card por matéria cursando: pontos obtidos, bônus de simulados, nota final, **quanto falta para o mínimo** e **pontos ainda em jogo**.
- Situação: **Aprovado**, **Faltam N pontos** ou **Não dá mais** (quando nem tirando o máximo no que resta dá para chegar ao mínimo).
- A nota só pode ser lançada depois que a prova/trabalho foi concluído, mas pode ser lançada a qualquer momento depois.
- Regras: a nota não passa do valor do item; o bônus ajuda a atingir o mínimo, mas a nota final nunca passa do total da matéria.

### Calendário
- Mês em grade com marcadores: **aula** (bolinha), **prova** (triângulo) e **entrega** (quadrado), na cor da matéria.
- **Aulas da semana:** informe o início e o fim do semestre e os dias de aula de cada matéria (ex.: Cálculo às segundas e quartas). As aulas se repetem até o fim do semestre.
- **Feriados** nacionais (inclusive Carnaval, Sexta-feira Santa e Corpus Christi, calculados pela Páscoa) e municipais de Belo Horizonte. Não há aula em feriado.
- Tocar num dia mostra a lista do dia, com **Desmarcar** / **Remarcar** aula avulsa (semana sem aula).

### Cronômetro
- Escolha a matéria, inicie, pause e retome. Ao finalizar, o tempo é arredondado ao minuto e só é gravado se você **salvar**.
- Mostra quanto já foi estudado hoje.

### Faculdade
- Atalho no menu: no computador abre o **portal do aluno**; no celular abre o app **Minha Wyden** na App Store.

### Menu
- **Celular:** botão ☰ no canto superior esquerdo abre o menu lateral; fecha ao escolher uma página, no ✕, no fundo escuro ou com Esc.
- **Computador:** menu lateral fixo, que se expande ao passar o mouse.

---

## Tecnologias

| Camada | Tecnologia | Para quê |
|---|---|---|
| Frontend | **HTML, CSS e JavaScript puro** (sem framework) | Páginas, visual (tema escuro) e interação |
| Gráficos | **Chart.js** (via CDN) | Gráficos do Dashboard |
| Animação | **AOS** (via CDN) | Efeito de entrada (fade-up) dos cards |
| Fonte | **Inter** (Google Fonts) | Tipografia |
| Backend | **Python 3 + Flask** | API REST em JSON e servidor das páginas |
| Banco | **MariaDB/MySQL** do XAMPP + **PyMySQL** | Armazenamento dos dados |
| Testes | **pytest** (API) e **node --test** (funções JS) | Testes automáticos |
| Atalho | **Windows Batch** (`iniciar.bat`) | Liga o banco e o servidor com dois cliques |

---

## Como rodar

O XAMPP é usado **só como banco de dados** (MariaDB na porta **8000**; a 3306 é do MySQL 8). O Apache do XAMPP não é usado: o Flask entrega as páginas e a API no mesmo endereço.

### Primeira vez

1. **Ambiente Python:**
   ```
   python -m venv .venv
   .venv\Scripts\python -m pip install -r backend\requirements.txt
   ```
2. **Ligue o banco:** pelo painel do XAMPP (só o **MySQL**) ou direto:
   ```
   c:\xampp\mysql\bin\mysqld.exe --defaults-file=c:\xampp\mysql\bin\my.ini --standalone --console
   ```
3. **Crie o banco:**
   ```
   c:\xampp\mysql\bin\mysql -uroot -h127.0.0.1 -P8000 < backend\sql\bd.sql
   ```
   Opcional, **dados de exemplo** (⚠️ **apaga todos os dados atuais**, use só num banco novo):
   ```
   c:\xampp\mysql\bin\mysql -uroot -h127.0.0.1 -P8000 estudos < backend\sql\seed.sql
   ```

### Dia a dia

Dê dois cliques em **`iniciar.bat`**: ele liga o MariaDB (se ainda não estiver ligado), inicia o servidor e abre `http://localhost:5000`. Para parar, feche a janela do servidor.

Ou manualmente:
```
.venv\Scripts\python backend\app.py
```

### Atualizou o projeto?
Rode o `bd.sql` de novo para criar as tabelas e colunas novas. Ele **não apaga dados**.

### Configuração
- Banco, por variáveis de ambiente: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (padrões: `127.0.0.1`, `8000`, `root`, vazio, `estudos`).
- XAMPP fora de `c:\xampp`: defina `XAMPP_DIR` antes de usar o `iniciar.bat`.
- Links da faculdade: constantes no topo de `frontend/assets/js/universidade.js`.

---

## Testes

```
.venv\Scripts\python -m pytest backend\tests -q
node --test tests/*.test.js
```

Os testes da API usam um banco separado (`estudos_test`), criado e apagado automaticamente; seus dados não são tocados.

---

## Estrutura do projeto

```
Estudos.V2/
├── index.html              Dashboard (página inicial)
├── iniciar.bat             Liga o banco e o servidor
├── backend/                API em Python (Flask)
│   ├── app.py
│   ├── conexao/
│   ├── rotas/
│   ├── sql/
│   └── tests/
├── frontend/
│   ├── pages/              Demais páginas
│   └── assets/
│       ├── css/
│       ├── js/
│       └── image/
├── tests/                  Testes das funções JavaScript
└── docs/superpowers/       Documentos de design e planos de cada funcionalidade
```

### Raiz

| Arquivo | Função principal |
|---|---|
| `index.html` | Página inicial (Dashboard) com gráficos, provas, notas e a semana |
| `iniciar.bat` | Atalho do Windows: liga o MariaDB do XAMPP, inicia o Flask e abre o navegador |
| `README.md` | Este documento |

### Backend (`backend/`)

| Arquivo | Função principal |
|---|---|
| `app.py` | Cria o servidor Flask, registra as rotas da API e entrega as páginas (só `index.html` da raiz e a pasta `frontend/`) |
| `requirements.txt` | Dependências Python (Flask, PyMySQL, pytest) |
| `conexao/conexao.py` | Abre a conexão com o banco usando as variáveis de ambiente; avisa quando o banco está fora do ar |
| `rotas/validacao.py` | Validações compartilhadas (datas, pontos com 1 casa decimal, regras de nota) e o formato das mensagens de erro |
| `rotas/materias.py` | API de matérias: listar, criar, editar, finalizar e excluir; calcula horas, trabalhos e próximas provas |
| `rotas/trabalhos.py` | API de trabalhos: CRUD, entregue/pendente, valor e nota |
| `rotas/provas.py` | API de provas: CRUD, feita/pendente, valor, nota e simulado |
| `rotas/notas.py` | Entrega, por matéria cursando, todas as provas e trabalhos com valor e nota (dados da página Notas) |
| `rotas/calendario.py` | Datas do semestre e dias de aula, aulas desmarcadas e os dados de um mês para o calendário |
| `rotas/sessoes.py` | Grava as sessões do Cronômetro e o resumo de tempo estudado |
| `rotas/dashboard.py` | Dados da semana para o Dashboard (tempo por matéria e por dia, próximas provas) |
| `sql/bd.sql` | Cria o banco e as tabelas; pode rodar de novo sem apagar dados |
| `sql/seed.sql` | Dados de exemplo (⚠️ apaga os dados atuais) |
| `tests/conftest.py` | Prepara o banco de teste `estudos_test` e limpa as tabelas a cada teste |
| `tests/test_*.py` | Testes de cada rota da API, do banco e do servidor |

### Páginas (`frontend/pages/`)

| Arquivo | Função principal |
|---|---|
| `materias.html` | Página Matérias (abas Cursando / Já cursadas e formulário) |
| `trabalhos.html` | Página Trabalhos e Provas (abas, contagem de dias e formulário) |
| `notas.html` | Página Notas (cards por matéria e folha para lançar nota) |
| `calendario.html` | Página Calendário (grade do mês, lista do dia e folha "Aulas da semana") |
| `cronometro.html` | Página Cronômetro |

### JavaScript (`frontend/assets/js/`)

Os arquivos `*-utils.js` têm só **funções puras** (contas e regras, sem mexer na tela) e são os que têm testes em `tests/`. Os demais montam a tela e conversam com a API.

| Arquivo | Função principal |
|---|---|
| `api.js` | `apiFetch()`: chama a API e transforma erros em mensagens em português |
| `ui.js` | Componentes compartilhados: criar elementos, ícones, toast, menu de ações, diálogos e abas |
| `menu.js` | Menu do celular: botão ☰, gaveta lateral e quando ela fecha |
| `animacoes.js` | Animação de entrada (fade-up) com AOS |
| `universidade.js` | Atalho Faculdade: portal no computador, App Store no celular |
| `app.js` | Monta o Dashboard: gráficos, provas, ranking e os cards Notas e Esta semana |
| `data.js` | Busca os dados da semana do Dashboard (começando na segunda-feira) |
| `dashboard-utils.js` | Contas do Dashboard: formatar minutos, ranking, próximas provas, datas locais |
| `dashboard-resumo.js` | Contas dos cards Notas (ordem por pontos faltando) e Esta semana (dias de segunda a domingo) |
| `materias.js` | Página Matérias |
| `materias-utils.js` | Semestre atual, agrupamento por semestre e textos dos cards |
| `trabalhos.js` | Página Trabalhos e Provas |
| `trabalhos-utils.js` | Dias até a data, texto do selo de prazo, separação pendentes/concluídos |
| `notas.js` | Página Notas |
| `notas-utils.js` | Contas das notas: obtidos, bônus, final, quanto falta, em jogo, situação (em décimos, sem erro de arredondamento) |
| `calendario.js` | Página Calendário |
| `calendario-utils.js` | Páscoa, feriados, grade do mês e dias de aula (respeitando semestre, feriados e desmarcações) |
| `cronometro.js` | Página Cronômetro |
| `cronometro-utils.js` | Contas do cronômetro: tempo decorrido com pausas e arredondamento |

### CSS (`frontend/assets/css/`)

| Arquivo | Função principal |
|---|---|
| `style.css` | Base de todas as páginas: cores (tema escuro), tipografia, Dashboard e menu (gaveta no celular, lateral no computador) |
| `componentes.css` | Componentes compartilhados: botões, abas, formulários, folhas (bottom sheet), toast, selos |
| `materias.css`, `trabalhos.css`, `notas.css`, `calendario.css`, `cronometro.css` | Visual específico de cada página |

### Outros

| Arquivo | Função principal |
|---|---|
| `frontend/assets/image/logo.png` | Ícone da aba do navegador |
| `tests/*.test.js` | Testes das funções puras de JavaScript (`node --test`) |
| `docs/superpowers/specs/` | Documento de design de cada funcionalidade (o que e por quê) |
| `docs/superpowers/plans/` | Plano de implementação de cada funcionalidade (passo a passo) |

---

## API

Todas as respostas são JSON. Erros vêm como `{"erro": "mensagem em português"}` (400 para dado inválido, 404 para não encontrado, 503 se o banco estiver fora do ar).

| Método e rota | O que faz |
|---|---|
| `GET /api/materias` (`?status=cursando\|cursada`) | Lista matérias com horas, trabalhos e próximas provas |
| `POST /api/materias` · `PATCH/DELETE /api/materias/<id>` | Cria, edita ou exclui matéria |
| `GET /api/trabalhos` · `POST` · `PATCH/DELETE /api/trabalhos/<id>` | Trabalhos (inclui `valor`, `nota`, `concluido`) |
| `GET /api/provas` · `POST` · `PATCH/DELETE /api/provas/<id>` | Provas (inclui `valor`, `nota`, `simulado`, `concluido`) |
| `GET /api/notas` | Matérias cursando com todos os itens, para a página Notas |
| `GET /api/semestres/<semestre>` · `PUT` | Lê ou grava datas do semestre e dias de aula |
| `POST /api/aulas/desmarcadas` · `DELETE /api/aulas/desmarcadas/<id>/<data>` | Desmarca ou remarca uma aula num dia |
| `GET /api/calendario?mes=AAAA-MM` | Semestres, aulas, desmarcações, provas e entregas do mês |
| `POST /api/sessoes` · `GET /api/sessoes/resumo` | Grava sessão do cronômetro e resumo de tempo |
| `GET /api/dashboard?inicio=AAAA-MM-DD` | Dados da semana para o Dashboard |
| `GET /api/saude` | Confere se o servidor e o banco estão respondendo |

---

## Banco de dados

Banco `estudos` (MariaDB), criado por `backend/sql/bd.sql`:

| Tabela | Guarda |
|---|---|
| `materias` | Nome, semestre, cor, situação (cursando/cursada), nota mínima e total de pontos |
| `trabalhos` | Trabalhos de cada matéria: descrição, data de entrega, entregue, valor e nota |
| `provas` | Provas e simulados: descrição, data, feita, valor, nota e se é simulado |
| `sessoes_estudo` | Sessões do cronômetro: matéria, início e minutos |
| `semestres` | Início e fim de cada semestre (`2026.2`) |
| `aulas_semana` | Dias da semana em que cada matéria tem aula (1 = segunda … 6 = sábado) |
| `aulas_desmarcadas` | Aulas canceladas num dia específico |

Excluir uma matéria apaga junto seus trabalhos, provas, sessões e aulas.
