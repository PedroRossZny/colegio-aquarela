/**
 * Menu mobile: overlay full-screen com foco preso, Esc fecha,
 * fecha ao clicar num link e reseta ao voltar para desktop.
 */
export function initMenu() {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.site-nav');
  if (!toggle || !nav) return;

  const desktop = window.matchMedia('(min-width: 64em)');
  const focusable = () =>
    [...nav.querySelectorAll('a[href], button:not([disabled])')].filter((el) => el.offsetParent !== null);

  let isOpen = false;

  const open = () => {
    isOpen = true;
    nav.classList.add('is-open');
    document.body.classList.add('menu-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Fechar menu');
    focusable()[0]?.focus({ preventScroll: true });
  };

  const close = ({ returnFocus = true } = {}) => {
    isOpen = false;
    nav.classList.remove('is-open');
    document.body.classList.remove('menu-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Abrir menu');
    if (returnFocus) toggle.focus({ preventScroll: true });
  };

  toggle.addEventListener('click', () => (isOpen ? close() : open()));

  nav.addEventListener('click', (e) => {
    if (isOpen && e.target.closest('a')) close({ returnFocus: false });
  });

  document.addEventListener('keydown', (e) => {
    if (!isOpen) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === 'Tab') {
      // foco preso: alterna entre o botão do menu e os itens da navegação
      const items = [toggle, ...focusable()];
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  desktop.addEventListener('change', (e) => {
    if (e.matches && isOpen) close({ returnFocus: false });
  });
}
