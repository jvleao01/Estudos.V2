# Dashboard — parte visual (design)

## Intenção
Webapp pessoal (uso único, sem login) para controlar estudos: matérias, provas, trabalhos, notas e tempo de estudo. Pensado primeiro para celular. Esta etapa entrega **apenas o visual do Dashboard**, com dados de exemplo; os dados reais virão das outras abas (Matérias, Cronômetro, Calendário) quando forem construídas.

## Objetivos
- Dashboard completo e responsivo (mobile-first), tema escuro.
- Dados isolados em um único módulo (`data.js`) com o mesmo formato que a futura API Python devolverá — trocar dados de exemplo por `fetch` não deve mexer no visual.

## Não-objetivos
- Backend (Flask/MySQL), banco, outras páginas — ficam para depois.

## Abordagens
- **A (escolhida):** frontend puro com dados de exemplo em `data.js`, função `getDashboardData()` como ponto único de troca para a API.
- **B (descartada):** API Flask + tabelas MySQL agora — prematuro, o modelo de dados depende das outras abas ainda não definidas.

## Decisões
- Stack: HTML, CSS, JavaScript puro; Chart.js via CDN (cdnjs, versão fixa).
- Tema escuro, uma cor de destaque. **Cada matéria tem uma cor fixa**, usada igual em todos os gráficos e listas.
- **Sem emojis** — ícones SVG inline (traço, estilo Lucide).
- Cards, de cima para baixo:
  1. Cabeçalho (saudação + semana atual).
  2. **Gráfico de barras: tempo de estudo por matéria na semana** (substitui os cards "mais/menos estudada"; cada barra na cor da matéria).
  3. Próximas provas (data, matéria, dias restantes; ≤ 3 dias em destaque).
  4. Gráfico de linha: horas estudadas por dia da semana.
  5. Ranking de matérias (posição, barra de progresso relativa, horas).
  6. Gráfico de pizza/rosca: distribuição do tempo por matéria.
- Navegação inferior fixa com 6 itens (Dashboard, Matérias, Trabalhos, Notas, Cronômetro, Calendário); só Dashboard ativo.
- Desktop: grade de 2 colunas a partir de ~900px.
- Arquivos: `frontend/index.html`, `frontend/assetes/css/style.css`, `frontend/assetes/js/app.js`, novo `frontend/assetes/js/data.js`.

## Contrato de dados (`getDashboardData()`)
```js
{
  semana: { inicio: "2026-11-09", fim: "2026-11-15" },
  materias: [{ id, nome, cor, minutosSemana }],
  porDia: [{ dia: "Seg", minutos }],        // 7 itens
  provas: [{ materiaId, titulo, data: "YYYY-MM-DD" }]
}
```
Ranking, mais/menos estudada e pizza são derivados de `materias`.

## Deixado ao implementador
Paleta exata, tipografia, espaçamentos, animações leves.
