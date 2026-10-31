/**
 * Motion: AOS para scroll reveal dos blocos de conteúdo e GSAP para as
 * transições mais elaboradas (entrada do hero, jornada dos segmentos,
 * parallax, stagger do grid). Com prefers-reduced-motion tudo fica estático.
 */
import AOS from 'aos';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { prefersReducedMotion } from './utils/motion.js';

export function initAnimations() {
  const reduced = prefersReducedMotion();

  AOS.init({
    disable: reduced, // remove os atributos data-aos → conteúdo visível
    once: true,
    duration: 750,
    easing: 'ease-out-cubic',
    offset: 60,
  });

  if (reduced) return;

  gsap.registerPlugin(ScrollTrigger, SplitText);
  gsap.defaults({ ease: 'power3.out' });

  heroIntro();
  floatingBlobs();
  segmentosJourney();
  atividadesGrid();
  espacosParallax();
  ctaParallax();

  // imagens/fontes carregadas → recalcula as posições dos triggers
  window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
}

/* ---------- Hero: timeline de entrada ---------- */
function heroIntro() {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  const q = gsap.utils.selector(hero);
  const el = (name) => q(`[data-hero="${name}"]`);
  const title = el('title')[0];
  const paint = title?.querySelector('.paint');
  const actions = el('actions')[0] ? [...el('actions')[0].children] : [];

  // Estado inicial definido por JS (o CSS só esconde enquanto html.js não tem .motion-ready,
  // com failsafe de 3s). Sem JS ou com reduced-motion nada fica escondido.
  gsap.set([...el('eyebrow'), ...el('lead'), ...el('pill'), ...actions], { autoAlpha: 0, y: 24 });
  gsap.set(el('media'), { autoAlpha: 0, scale: 0.92, transformOrigin: '50% 60%' });
  gsap.set(el('card'), { autoAlpha: 0, y: 30 });
  gsap.set('.site-header__inner', { y: -16, autoAlpha: 0 });
  gsap.set(title, { autoAlpha: 1 });
  if (paint) title.style.setProperty('--paint-scale', '0');
  document.documentElement.classList.add('motion-ready');

  const tl = gsap.timeline({ defaults: { duration: 0.9 }, paused: true });

  const start = () => {
    // autoSplit: se a fonte chegar depois, o SplitText re-divide as linhas e
    // mantém o tween sincronizado (por isso o tween é devolvido em onSplit).
    const split = SplitText.create(title, {
      type: 'lines',
      mask: 'lines',
      linesClass: 'hero__line',
      autoSplit: true,
      onSplit(self) {
        const tween = gsap.from(self.lines, { yPercent: 110, duration: 1.1, stagger: 0.11, ease: 'power4.out' });
        tl.add(tween, 0.25);
        return tween;
      },
    });

    // clearProps: transform residual criaria containing block e prenderia o menu mobile (fixed)
    tl.to('.site-header__inner', { y: 0, autoAlpha: 1, duration: 0.7, clearProps: 'transform' }, 0)
      .to(el('eyebrow'), { autoAlpha: 1, y: 0, duration: 0.6 }, 0.15)
      .to(el('media'), { autoAlpha: 1, scale: 1, duration: 1.1, ease: 'expo.out' }, 0.15)
      .to(el('lead'), { autoAlpha: 1, y: 0, duration: 0.7 }, 0.75)
      .to(el('pill'), { autoAlpha: 1, y: 0, duration: 0.6 }, 0.9)
      .to(actions, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.1 }, 1.0)
      .to(el('card'), { autoAlpha: 1, y: 0, duration: 0.8 }, 1.15);

    if (paint) tl.to(title, { '--paint-scale': 1, duration: 0.7, ease: 'power2.inOut' }, 1.0);

    tl.eventCallback('onComplete', () => {
      split.revert();
      // sem transform inline residual: o hover (translate/scale) fica só com o CSS
      gsap.set([...el('eyebrow'), ...el('lead'), ...el('pill'), ...actions, ...el('media'), ...el('card')], { clearProps: 'transform' });
    });
    tl.play();
  };

  // Espera as fontes no máximo 0,8s — o hero nunca fica vazio esperando rede.
  Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 800))]).then(start);
}

/* ---------- Hero: manchas de aquarela flutuando ---------- */
function floatingBlobs() {
  gsap.utils.toArray('.hero__blob').forEach((blob, i) => {
    gsap.to(blob, {
      x: 'random(-30, 30)',
      y: 'random(-40, 40)',
      rotation: 'random(-8, 8)',
      duration: 'random(7, 11)',
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      delay: i * 0.6,
    });
  });
}

/* ---------- Segmentos: linha da jornada, nós, números e parallax ---------- */
function segmentosJourney() {
  const list = document.querySelector('.segmentos__list');
  if (!list) return;

  const fill = list.querySelector('.segmentos__line-fill');
  if (fill) {
    gsap.to(fill, {
      scaleY: 1,
      ease: 'none',
      scrollTrigger: { trigger: list, start: 'top 55%', end: 'bottom 55%', scrub: 0.6 },
    });
  }

  gsap.utils.toArray('.segmento').forEach((seg) => {
    const img = seg.querySelector('[data-parallax]');
    const node = seg.querySelector('.segmento__node');
    const num = seg.querySelector('.segmento__num');
    const reverse = seg.classList.contains('segmento--reverse');

    if (img) {
      gsap.fromTo(
        img,
        { yPercent: -6 },
        { yPercent: 6, ease: 'none', scrollTrigger: { trigger: seg, start: 'top bottom', end: 'bottom top', scrub: true } },
      );
    }

    if (node) {
      gsap.from(node, {
        scale: 0,
        autoAlpha: 0,
        duration: 0.6,
        ease: 'back.out(2)',
        scrollTrigger: { trigger: seg, start: 'center 62%' },
      });
    }

    if (num) {
      gsap.from(num, {
        x: reverse ? 24 : -24,
        autoAlpha: 0,
        duration: 0.9,
        scrollTrigger: { trigger: seg, start: 'top 75%' },
      });
    }
  });
}

/* ---------- Espaços: parallax das fotos (mesmo tween dos segmentos) ---------- */
function espacosParallax() {
  gsap.utils.toArray('.espaco [data-parallax]').forEach((img) => {
    gsap.fromTo(
      img,
      { yPercent: -6 },
      { yPercent: 6, ease: 'none', scrollTrigger: { trigger: img.closest('.espaco'), start: 'top bottom', end: 'bottom top', scrub: true } },
    );
  });
}

/* ---------- Atividades: stagger de entrada do grid ---------- */
function atividadesGrid() {
  const grid = document.querySelector('.atividades__grid');
  if (!grid) return;
  gsap.from(grid.children, {
    y: 44,
    autoAlpha: 0,
    duration: 0.85,
    stagger: 0.09,
    scrollTrigger: { trigger: grid, start: 'top 82%', once: true },
  });
}

/* ---------- CTA: parallax suave da foto de fundo ---------- */
function ctaParallax() {
  const bg = document.querySelector('.cta__bg img');
  if (!bg) return;
  gsap.fromTo(
    bg,
    { yPercent: -5 },
    { yPercent: 5, ease: 'none', scrollTrigger: { trigger: '.cta', start: 'top bottom', end: 'bottom top', scrub: true } },
  );
}
