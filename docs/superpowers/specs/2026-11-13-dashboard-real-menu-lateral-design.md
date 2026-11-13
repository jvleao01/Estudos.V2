# Dashboard com dados reais + menu lateral (design)

## Intenção
Fechar o app: o Dashboard passa a mostrar os dados das outras páginas (sessões do Cronômetro e provas de Trabalhos e Provas) em vez de dados de exemplo, o Calendário sai do app, e no computador a navegação vira um menu lateral recolhido com efeito de vidro.

## Objetivos
- **Calendário** removido da navegação de todas as páginas (a barra de baixo fica com 4 itens: Início, Matérias, Trabalhos, Cronômetro).
- **Dashboard** com os mesmos cards de hoje, com dados reais da semana atual (segunda a domingo, data local do navegador):
  - Total na semana, Tempo por matéria (barras), Ranking e Distribuição (rosca): soma de `sessoes_estudo` da semana por matéria. Só entram matérias com tempo > 0 na semana.
  - Horas na semana (linha): minutos por dia, segunda a domingo.
  - Próximas provas: provas não feitas, de hoje em diante, até 5 (regra atual de `proximasProvas`), com nome e cor da matéria mesmo que ela não tenha tempo na semana.
  - Semana sem estudo: os cards de tempo mostram o vazio que já existe ("Nenhum estudo registrado nesta semana").
  - Erro da API: os cards mostram a mensagem de erro (mesmo estilo do vazio).
- **Menu lateral no computador** (largura ≥ 900px): a mesma `nav.bottom-nav` vira uma coluna fixa à esquerda, recolhida só com os ícones; ao passar o mouse (ou com foco do teclado dentro dela) se expande mostrando os nomes, **por cima do conteúdo** (não empurra a página). Fundo de vidro: translúcido + `backdrop-filter: blur` + borda clara sutil. Item da página atual destacado.
- No celular (< 900px) a barra de baixo continua como está (sem mudança visual além de perder o Calendário).

## Não-objetivos
- Novos cards no Dashboard (trabalhos, cronômetro etc.).
- Vidro nos botões ou em outros elementos.
- `expo-glass-effect`: é um componente React Native/Expo; o site é HTML/CSS/JS puro, então o vidro é feito com CSS (`backdrop-filter`). Explicado ao usuário, que concordou.

## Abordagens
- **Dados do Dashboard (escolhida):** endpoint `GET /api/dashboard?inicio=AAAA-MM-DD` que devolve o contrato já usado por `getDashboardData()` (do design original), e `data.js` passa a buscar dele. O visual quase não muda.
  - Descartada: montar no navegador a partir das APIs existentes: elas não têm minutos por semana nem por dia.
- **Menu (escolhida):** só CSS sobre a `nav` que já existe em cada página (media query ≥ 900px).
  - Descartada: gerar o menu por JavaScript a partir de um arquivo único — evita repetir o HTML em 4 páginas, mas é uma reescrita maior que o pedido não exige.

## API — `backend/rotas/dashboard.py`
`GET /api/dashboard?inicio=AAAA-MM-DD` (segunda-feira da semana, calculada no navegador) →
```json
{
  "semana": {"inicio": "2026-11-09", "fim": "2026-11-15"},
  "materias": [{"id": 1, "nome": "Cálculo II", "cor": "#6c8cff", "minutosSemana": 120}],
  "porDia": [{"dia": "Seg", "minutos": 0}, "... 7 itens, Seg..Dom"],
  "provas": [{"materiaId": 1, "titulo": "P2", "data": "2026-11-15", "materia": {"nome": "Cálculo II", "cor": "#6c8cff"}}]
}
```
- `materias`: só com minutos > 0 entre `inicio` e `inicio + 6` (por `DATE(inicio)` da sessão), ordenadas por nome.
- `provas`: `concluido = 0` e `data >= inicio`, ordenadas por data (o navegador filtra de hoje em diante e limita a 5).
- `inicio` ausente ou inválido → 400 com a mensagem de data de `validacao.py`.

## Frontend
- `data.js`: `getDashboardData()` vira `async`, calcula a segunda-feira local e chama `apiFetch('/api/dashboard?inicio=...')`. `index.html` passa a carregar `api.js`.
- `proximasProvas` usa a matéria da própria prova quando ela não está em `materias`.
- `app.js`: espera os dados; em erro, mostra a mensagem nos cards.
- `style.css`: grade da barra com 4 colunas; bloco ≥ 900px com o menu lateral (largura recolhida ~72px, aberto ~220px, transição curta, respeitando `prefers-reduced-motion`), e o conteúdo das páginas com margem à esquerda igual à largura recolhida.

## Decisões minhas (o usuário aprovou na conversa)
- Matérias com 0 min na semana ficam fora dos gráficos.
- Semana pela data do computador.
- Menu abre por cima do conteúdo; também abre com Tab.

## Deixado ao implementador
Larguras exatas, duração da transição, intensidade do desfoque.
