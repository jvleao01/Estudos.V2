# Matérias + backend inicial (design)

## Intenção
Primeira página com dados reais. O usuário (uso pessoal, sem login) cadastra matérias, acompanha as que está cursando e mantém um histórico das já cursadas, organizado por semestre. Esta etapa também cria a base do backend (Flask + MySQL do XAMPP) que as próximas páginas vão usar.

## Objetivos
- Página `materias.html` com duas abas: **Cursando** e **Já cursadas**.
- **Cursando:** cada matéria mostra cor, nome, semestre, **horas totais estudadas**, **número de trabalhos** e **datas das próximas provas**. Botão para adicionar a qualquer momento. Ação **Finalizar**, que move a matéria para "Já cursadas".
- **Já cursadas:** adicionar a qualquer momento, sem ter passado por "Cursando". Lista agrupada por semestre, do mais recente para o mais antigo.
- Campos: nome, semestre (formato `AAAA.1` ou `AAAA.2`), cor (escolhida na criação de matéria cursando; opcional em já cursada, com cor automática se não escolhida), situação.
- Backend Flask servindo o frontend e a API em `localhost:5000`. MySQL do XAMPP (banco `estudos`).

## Não-objetivos
- Páginas Cronômetro, Trabalhos e Calendário (as tabelas existem, mas sem interface).
- Ligar o Dashboard à API (continua com dados de exemplo; vira uma tarefa futura).
- Login e vários usuários.

## Abordagens
- **A (escolhida pelo usuário):** Flask serve as páginas estáticas e a API no mesmo endereço. XAMPP usado só para o MySQL. Um único processo, sem CORS, igual a como será publicado.
- **B (descartada):** Apache do XAMPP serve o frontend (`htdocs`) e o Flask só a API. Exige dois servidores, cópia/link da pasta e CORS.

## Banco (`backend/sql/bd.sql`)
- `materias(id PK, nome VARCHAR(80) NOT NULL, semestre CHAR(6) NOT NULL, cor CHAR(7) NOT NULL, status ENUM('cursando','cursada') NOT NULL, criado_em DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(nome, semestre))`
- `sessoes_estudo(id PK, materia_id FK, inicio DATETIME NOT NULL, minutos INT NOT NULL)` (preenchida no futuro pelo Cronômetro)
- `trabalhos(id PK, materia_id FK, titulo VARCHAR(120), entrega DATE NULL, concluido BOOLEAN DEFAULT 0)`
- `provas(id PK, materia_id FK, titulo VARCHAR(120), data DATE NOT NULL)`
- Todas as FKs com `ON DELETE CASCADE`. Charset `utf8mb4`.
- `backend/sql/seed.sql` opcional: algumas matérias, sessões, trabalhos e provas de exemplo.

## API (JSON)
- `GET /api/materias?status=cursando|cursada`: lista com `{id, nome, semestre, cor, status, minutosTotais, trabalhos, trabalhosPendentes, provas: [{titulo, data}]}`. Provas: só as de hoje em diante, ordenadas. Cursando ordenadas por nome; cursadas por semestre desc, depois nome.
- `POST /api/materias` `{nome, semestre, cor?, status}`: 201 com a matéria criada. Sem `cor`: atribui a próxima cor da paleta que ainda não está em uso.
- `PATCH /api/materias/<id>` com campos parciais (`nome`, `semestre`, `cor`, `status`). Finalizar = `{status: "cursada"}`.
- `DELETE /api/materias/<id>`: 204.
- Erros: 400 `{erro: "mensagem em português"}` para validação, 404 inexistente, 409 nome+semestre repetidos, 503 banco fora do ar ("Banco de dados indisponível. O MySQL do XAMPP está ligado?").
- Validação: nome 1 a 80 caracteres após trim; semestre `^\d{4}\.[12]$`; cor `^#[0-9a-fA-F]{6}$`; status no enum.

## Interface
- Mesmo tema escuro, ícones SVG e navegação inferior do Dashboard. Os links da navegação passam a funcionar entre `index.html` e `materias.html`.
- Topo: título "Matérias" e abas segmentadas `Cursando (n) | Já cursadas (n)`. A aba ativa é lembrada na URL (`#cursadas`).
- Card cursando: barra lateral na cor da matéria, nome, semestre, três indicadores com ícone (horas "12h 30min", trabalhos "3 (1 pendente)", provas como chips de data "18/11"; sem provas: "Sem provas marcadas"). Menu com Editar, Finalizar e Excluir.
- Lista já cursadas: grupos por semestre ("2026.1"), item com bolinha de cor e nome; menu com Editar e Excluir.
- Botão flutuante "+" acima da navegação: abre um painel inferior (bottom sheet) com o formulário: nome, semestre (pré-preenchido com o semestre atual: jan a jun → `.1`, jul a dez → `.2`) e cor (10 cores prontas + seletor livre). Na aba Já cursadas, a cor vem como "Automática" por padrão.
- Finalizar e Excluir pedem confirmação.
- Estados: carregando, lista vazia com chamada para adicionar, erro da API com botão "Tentar de novo".

## Estrutura
- `backend/app.py` (cria o app Flask, rotas estáticas), `backend/conexao/conexao.py` (conexão PyMySQL, config por variáveis de ambiente com padrão XAMPP: `root`, sem senha, `localhost:3306`, banco `estudos`), `backend/rotas/materias.py` (blueprint da API), `backend/requirements.txt` (Flask, PyMySQL, pytest).
- `frontend/materias.html`, `frontend/assetes/css/materias.css`, `frontend/assetes/js/api.js` (fetch + tratamento de erro), `frontend/assetes/js/materias.js`, `frontend/assetes/js/materias-utils.js` (funções puras).
- Testes: `pytest` contra o banco `estudos_test` no MySQL do XAMPP (criado e limpo pelos testes; pulados com aviso se o MySQL estiver desligado). Funções puras do frontend com `node --test`.

## Decisões minhas (o usuário pode corrigir)
- Editar e Excluir incluídos, para conseguir corrigir um cadastro errado.
- Mesmo nome no mesmo semestre é bloqueado (409); mesmo nome em semestres diferentes é permitido (matéria refeita).
- Uma matéria cursada pode voltar a cursando pelo Editar.
- "Número de trabalhos" mostra o total, com os pendentes entre parênteses.

## Deixado ao implementador
Paleta exata das 10 cores, animação do painel inferior, textos de ajuda.
