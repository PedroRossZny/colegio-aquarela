/**
 * Atividades Extras — card expandido com GSAP Flip.
 *
 * Ao clicar num card, a <picture> dele (o mesmo elemento) é movida para o
 * diálogo e "voa" da posição do card até a coluna da imagem; título e
 * descrição entram em stagger depois que a imagem termina de se posicionar.
 * Fechar faz o caminho inverso. Com prefers-reduced-motion vira um fade curto.
 *
 * Acessibilidade (mesmo padrão do menu mobile): Esc fecha, foco preso no
 * diálogo, foco volta ao card clicado, role="dialog" + aria-modal, e o resto
 * da página fica `inert` enquanto aberto. Clique fora (backdrop) fecha.
 */
import { gsap } from 'gsap';
import { Flip } from 'gsap/Flip';
import { prefersReducedMotion } from './utils/motion.js';

gsap.registerPlugin(Flip);

const FLIP_EASE = 'power3.inOut';

// Teto da espera pela foto antes de abrir (ver imageReady)
const DECODE_TIMEOUT = 120;

/**
 * Espera a foto do card estar decodificada — mas só quando ela ainda não está.
 *
 * A <picture> que voa para o diálogo é a MESMA do card, então quase sempre já
 * foi carregada (o usuário acabou de olhar para ela) e a função devolve null:
 * o diálogo abre no mesmo frame do clique, sem atraso nenhum. O caso que sobra
 * é o card com loading="lazy" clicado assim que entra na tela, ou uma conexão
 * ruim — aí o voo começaria com a moldura vazia. A espera tem teto curto: numa
 * conexão lenta é melhor abrir e deixar a foto entrar depois do que segurar o
 * clique esperando rede.
 */
function imageReady(picture) {
  const img = picture.querySelector('img');
  if (!img || img.complete) return null;
  return Promise.race([img.decode().catch(() => {}), new Promise((r) => setTimeout(r, DECODE_TIMEOUT))]);
}

export function initAtividades() {
  const grid = document.querySelector('.atividades__grid');
  const dialog = document.getElementById('ativ-dialog');
  if (!grid || !dialog) return;

  const panel = dialog.querySelector('.ativ-dialog__panel');
  const surface = dialog.querySelector('.ativ-dialog__surface');
  const backdrop = dialog.querySelector('.ativ-dialog__backdrop');
  const media = dialog.querySelector('.ativ-dialog__media');
  const iconWrap = dialog.querySelector('.ativ-dialog__icon');
  const iconUse = iconWrap.querySelector('use');
  const title = dialog.querySelector('.ativ-dialog__title');
  const text = dialog.querySelector('.ativ-dialog__text');
  const closeBtn = dialog.querySelector('.ativ-dialog__close');
  const textParts = [iconWrap, title, text];

  // tudo que fica inerte enquanto o diálogo está aberto
  const inertTargets = [...document.querySelectorAll('.skip-link, .site-header, main, .site-footer, .wa-fab')];

  let current = null; // { card, btn, picture } do card aberto
  let busy = false; // evita abrir/fechar no meio de uma animação

  const focusables = () =>
    [...panel.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter(
      (el) => el.offsetParent !== null,
    );

  /* ---------- abrir ---------- */
  async function open(card) {
    if (busy || current) return;
    const btn = card.querySelector('.ativ__btn');
    const wrap = card.querySelector('.ativ__media'); // wrapper da imagem (tem o zoom)
    const picture = wrap?.querySelector('picture');
    const tpl = card.querySelector('.ativ__detail');
    if (!btn || !wrap || !picture || !tpl) return;

    // trava antes de qualquer espera: segundo clique não abre outro card
    busy = true;

    // conteúdo do <template> do card (título + descrição) e acento/ícone do card.
    // Vem antes da medição do Flip de propósito: é o texto que define a altura
    // final do painel, então ele precisa já estar no lugar quando o Flip medir.
    title.textContent = tpl.content.querySelector('h3')?.textContent.trim() ?? '';
    // todos os parágrafos do template, não só o primeiro (a Musicalização tem dois)
    text.replaceChildren(
      ...[...tpl.content.querySelectorAll('p')].map((p) => {
        const el = document.createElement('p');
        el.textContent = p.textContent.trim();
        return el;
      }),
    );
    const accent = [...card.classList].find((c) => c.startsWith('accent-'));
    panel.className = `ativ-dialog__panel${accent ? ` ${accent}` : ''}`;
    const chipUse = card.querySelector('.chip use');
    if (chipUse) iconUse.setAttribute('href', chipUse.getAttribute('href'));

    // foto decodificada antes de o Flip medir (sem atraso quando já está pronta)
    const pending = imageReady(picture);
    if (pending) await pending;

    current = { card, btn, wrap, picture };

    const reduced = prefersReducedMotion();
    const state = reduced ? null : Flip.getState(picture, { props: 'borderRadius' });

    // move a imagem (mesmo elemento) para o diálogo e mostra o diálogo
    media.appendChild(picture);
    card.classList.add('is-empty');
    dialog.hidden = false;
    document.body.classList.add('dialog-open');
    inertTargets.forEach((el) => (el.inert = true));

    if (reduced) {
      gsap.set(textParts, { clearProps: 'all' });
      gsap.fromTo(dialog, { autoAlpha: 0 }, {
        autoAlpha: 1,
        duration: 0.2,
        onComplete: () => {
          busy = false;
          closeBtn.focus({ preventScroll: true });
        },
      });
      return;
    }

    gsap.set(dialog, { autoAlpha: 1 });
    gsap.set(textParts, { autoAlpha: 0, y: 18 });
    gsap.set(closeBtn, { opacity: 0 }); // só opacity: precisa continuar focável
    gsap.fromTo(backdrop, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.45, ease: 'power2.out' });
    gsap.fromTo(surface, { autoAlpha: 0, scale: 0.96 }, { autoAlpha: 1, scale: 1, duration: 0.55, ease: 'power3.out', delay: 0.08 });

    // a imagem "voa" do card até a coluna da imagem do diálogo
    Flip.from(state, {
      duration: 0.65,
      ease: FLIP_EASE,
      absolute: true,
      zIndex: 5,
      onComplete: () => {
        // texto entra só depois que a imagem terminou de se posicionar
        gsap.to(closeBtn, { opacity: 1, duration: 0.3 });
        gsap.to(textParts, {
          autoAlpha: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.09,
          ease: 'power3.out',
          onComplete: () => {
            busy = false;
          },
        });
        closeBtn.focus({ preventScroll: true });
      },
    });
  }

  /* ---------- fechar ---------- */
  function close() {
    if (busy || !current) return;
    busy = true;
    const { btn, card, wrap, picture } = current;

    const finish = () => {
      wrap.appendChild(picture); // volta para o wrapper da imagem do card
      gsap.set(picture, { clearProps: 'all' });
      card.classList.remove('is-empty');
      dialog.hidden = true;
      gsap.set([dialog, backdrop, surface, closeBtn, ...textParts], { clearProps: 'all' });
      document.body.classList.remove('dialog-open');
      inertTargets.forEach((el) => (el.inert = false));
      current = null;
      busy = false;
      btn.focus({ preventScroll: true }); // foco volta ao card clicado
    };

    if (prefersReducedMotion()) {
      gsap.to(dialog, { autoAlpha: 0, duration: 0.2, onComplete: finish });
      return;
    }

    // texto sai primeiro; a imagem voa de volta ao card enquanto o fundo some
    gsap.to([...textParts, closeBtn], { autoAlpha: 0, y: 10, duration: 0.2, stagger: 0.03 });
    gsap.to(surface, { autoAlpha: 0, scale: 0.97, duration: 0.45, ease: 'power3.in', delay: 0.1 });
    gsap.to(backdrop, { autoAlpha: 0, duration: 0.45, delay: 0.15 });
    Flip.fit(picture, wrap, {
      duration: 0.55,
      ease: FLIP_EASE,
      absolute: true,
      props: 'borderRadius',
      delay: 0.12,
      onComplete: finish,
    });
  }

  /* ---------- eventos ---------- */
  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.ativ__btn');
    if (btn) open(btn.closest('.ativ'));
  });

  dialog.addEventListener('click', (e) => {
    if (e.target.closest('[data-dialog-close]')) close();
  });

  document.addEventListener('keydown', (e) => {
    if (!current) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === 'Tab') {
      // foco preso dentro do diálogo
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
        e.preventDefault();
        first.focus();
      }
    }
  });
}
