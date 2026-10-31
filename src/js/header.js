/**
 * Cabeçalho: estado compacto ao rolar e botão flutuante de WhatsApp
 * visível depois do hero. (Sem scroll-spy: o destaque do menu é só :hover.)
 */
export function initHeader() {
  const header = document.querySelector('.site-header');
  const hero = document.querySelector('#inicio');
  const fab = document.querySelector('.wa-fab');

  // --- compacta o header depois de 24px ---
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      header.classList.toggle('is-scrolled', window.scrollY > 24);
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // --- FAB aparece quando o hero sai da tela ---
  if (hero && fab) {
    new IntersectionObserver(
      ([entry]) => fab.classList.toggle('is-visible', !entry.isIntersecting),
      { rootMargin: '-40% 0px 0px 0px' },
    ).observe(hero);
  }
}
