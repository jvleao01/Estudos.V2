# Universidade (design curto)

## Intenção
Um atalho no menu para a faculdade (Newton Paiva / Wyden). No computador abre o portal do aluno; no celular abre a página do app Minha Wyden na App Store, onde aparece "Abrir" (o app já está instalado no iPhone do usuário).

## Objetivos
- Item "Faculdade" no fim do menu de todas as páginas (depois de Cronômetro), com ícone de link externo, abrindo em aba nova.
- Computador: `https://portal.siaaluno.com.br/sianet/Logon`.
- Celular/tablet (iPhone, iPad, Android): `https://apps.apple.com/br/app/integrees/id1541892299`.

## Não-objetivos
- Página própria de Universidade.
- Abrir o app direto por esquema de URL (o esquema do Minha Wyden é desconhecido).
- Link da Play Store para Android (o usuário usa iPhone; Android recebe o mesmo link da App Store — decisão minha).

## Abordagens
- **Escolhida:** link no menu apontando para o portal; `universidade.js` (carregado em todas as páginas) troca o `href` para a App Store em celular/tablet. Sem JavaScript, continua indo para o portal.
- Descartada: página com dois botões (toque extra sem ganho).
- Descartada: esquema de URL do app (desconhecido; erro "endereço inválido" se errado).

## Design
- `frontend/assets/js/universidade.js`: constantes `URL_PORTAL` e `URL_APP`; função pura `ehMovel(userAgent, maxTouchPoints)` (iPhone/iPod/iPad/Android no user agent, ou "Macintosh" com `maxTouchPoints > 1` = iPad); no navegador, troca o `href` de `a[data-faculdade]`. Exporta para `node --test`.
- Rótulo "Faculdade" (cabe no menu de 7 itens que virá com o Calendário). `target="_blank" rel="noopener"`.
- Menu: `grid-template-columns` de 5 para 6.
- Testes: `tests/universidade.test.js` (iPhone, iPad antigo, iPad que se apresenta como Mac, Android, Windows, Mac); conferência de links das páginas pelo servidor.
