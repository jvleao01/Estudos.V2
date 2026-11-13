/* Animação de entrada (fade-up) com AOS, compartilhada por todas as páginas.
   Expõe animarEntrada(elementos). Se o AOS não carregou (sem internet), não faz nada:
   o aos.css esconde [data-aos], então os atributos só são postos quando o script existe. */
(function () {
  const PASSO_MS = 80; // atraso entre um elemento e o próximo
  const ATRASO_MAX_MS = 400; // listas longas não esperam demais
  let iniciado = false;

  function animarEntrada(elementos) {
    if (typeof AOS === 'undefined') return;
    const lista = [...elementos];
    if (!lista.length) return;
    lista.forEach((e, i) => {
      e.setAttribute('data-aos', 'fade-up');
      e.setAttribute('data-aos-delay', String(Math.min(i * PASSO_MS, ATRASO_MAX_MS)));
    });
    // Força o navegador a aplicar o estado inicial (invisível) antes de animar; sem isso não há transição.
    void document.body.offsetHeight;
    if (!iniciado) {
      iniciado = true;
      AOS.init({
        duration: 600,
        once: true,
        disable: () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      });
    } else {
      AOS.refreshHard();
    }
  }

  window.animarEntrada = animarEntrada;
})();
