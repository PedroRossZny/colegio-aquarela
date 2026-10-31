/**
 * Vestibulinho — contador regressivo até a prova.
 *
 * Alvo: site.config.js → vestibulinho.examDate (ISO com fuso de Brasília),
 * injetado como __SITE__.vestibulinho.examDate — o mesmo dado que gera as datas
 * do HTML, então nunca desencontram.
 *
 * Motion (GSAP): na primeira vez que o card entra na tela os quatro blocos
 * sobem em stagger e os números "rolam" para dentro; depois, a cada mudança,
 * o número velho sobe e some AO MESMO TEMPO que o novo entra por baixo — são
 * dois elementos empilhados dentro da máscara (.countdown__digits), animados
 * na mesma timeline, os dois a partir da posição 0, para que nunca exista um
 * quadro em que o número troque sem transição. Com prefers-reduced-motion só
 * troca o texto.
 *
 * Acessibilidade: os blocos que mudam a cada segundo são aria-hidden; um
 * resumo em texto (visually-hidden, role="timer") é atualizado a cada minuto
 * sem anúncio automático — o leitor de tela lê quando o usuário chega nele.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from './utils/motion.js';

gsap.registerPlugin(ScrollTrigger);

const UNITS = ['days', 'hours', 'minutes', 'seconds'];
const MS = { days: 86_400_000, hours: 3_600_000, minutes: 60_000, seconds: 1000 };

// Troca de número: os dois tweens (saída e entrada) usam exatamente isto, para
// saírem e chegarem juntos — qualquer diferença abriria um vão entre eles.
const ROLL = { duration: 0.45, ease: 'power2.inOut' };

export function initCountdown() {
  const root = document.querySelector('[data-countdown]');
  if (!root) return;

  const target = new Date(__SITE__.vestibulinho.examDate).getTime();
  if (Number.isNaN(target)) return;

  // Um "slot" por unidade: o dígito visível agora (`el`, trocado a cada rolagem)
  // e a timeline da troca em curso (`tl`), se houver.
  const slots = Object.fromEntries(
    UNITS.map((u) => {
      const el = root.querySelector(`[data-unit="${u}"]`);
      return [u, el ? { el, tl: null } : null];
    }),
  );
  const label = root.querySelector('[data-countdown-label]');
  const summary = root.querySelector('[data-countdown-summary]');
  const reduced = prefersReducedMotion();

  const pad = (n) => String(n).padStart(2, '0');

  // tempo restante quebrado em dias/horas/min/seg (zera depois da prova)
  const remaining = () => {
    let diff = Math.max(0, target - Date.now());
    const out = {};
    for (const u of UNITS) {
      out[u] = Math.floor(diff / MS[u]);
      diff -= out[u] * MS[u];
    }
    return out;
  };

  let entered = reduced; // sem motion não há animação de entrada: já pode rolar direto
  let timer = null;

  /* ---------- troca de número com "roll" ---------- */

  /**
   * Encerra uma troca ainda em curso (o relógio não espera a animação).
   * Só mexe quando existe timeline de rolagem: a animação de entrada do card
   * não é registrada em `tl` e por isso passa intacta por aqui.
   */
  function settle(slot) {
    if (!slot.tl) return;
    slot.tl.kill();
    slot.tl = null;
    // o dígito que estava saindo some na hora; fica só o atual
    for (const node of [...slot.el.parentNode.children]) if (node !== slot.el) node.remove();
    gsap.set(slot.el, { clearProps: 'transform,opacity,visibility' });
  }

  function roll(slot, next) {
    if (slot.el.textContent === next) return;
    settle(slot);

    // fora da tela (aba escondida, ou ainda antes da entrada) só troca o texto
    if (reduced || document.hidden || !entered) {
      slot.el.textContent = next;
      return;
    }

    // O número novo entra num elemento próprio, empilhado sobre o que sai (os
    // dois na mesma célula do grid da máscara, ver _vestibulinho.scss).
    const outgoing = slot.el;
    const incoming = outgoing.cloneNode(false);
    incoming.removeAttribute('style'); // sem herdar transform/opacity do GSAP
    incoming.textContent = next;
    outgoing.after(incoming);
    slot.el = incoming;

    // Os dois tweens na posição 0: o antigo sobe para fora da máscara no mesmo
    // intervalo em que o novo sobe de baixo até o lugar dele.
    slot.tl = gsap
      .timeline({
        onComplete: () => {
          outgoing.remove();
          slot.tl = null;
        },
      })
      .to(outgoing, { yPercent: -100, autoAlpha: 0, ...ROLL }, 0)
      .fromTo(incoming, { yPercent: 100, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, ...ROLL }, 0);
  }

  /* ---------- resumo acessível (uma vez por minuto) ---------- */
  let lastMinute = -1;
  function updateSummary(r, over) {
    if (!summary) return;
    const minute = r.days * 1440 + r.hours * 60 + r.minutes;
    if (minute === lastMinute) return;
    lastMinute = minute;
    if (over) {
      summary.textContent = 'A prova do Vestibulinho já aconteceu.';
      return;
    }
    const parts = [];
    if (r.days) parts.push(`${r.days} ${r.days === 1 ? 'dia' : 'dias'}`);
    if (r.hours) parts.push(`${r.hours} ${r.hours === 1 ? 'hora' : 'horas'}`);
    parts.push(`${r.minutes} ${r.minutes === 1 ? 'minuto' : 'minutos'}`);
    const text = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} e ${parts.at(-1)}` : parts[0];
    summary.textContent = `Faltam ${text} para a prova.`;
  }

  /* ---------- tick ---------- */
  function tick() {
    const r = remaining();
    const over = target - Date.now() <= 0;
    for (const u of UNITS) if (slots[u]) roll(slots[u], pad(r[u]));
    updateSummary(r, over);

    if (over) {
      root.classList.add('is-over');
      if (label) label.textContent = 'A prova já aconteceu';
      clearInterval(timer);
      timer = null;
    }
  }

  // primeiro valor já no HTML (sem "00" piscando), depois um tick por segundo
  // alinhado com a virada do relógio
  tick();
  setTimeout(() => {
    tick();
    timer = setInterval(tick, 1000);
  }, 1000 - (Date.now() % 1000));

  /* ---------- entrada do card: blocos em stagger + números rolando ---------- */
  if (reduced) return;

  const tiles = root.querySelectorAll('.countdown__tile');
  // a entrada acontece antes de qualquer rolagem, então `el` ainda é o dígito do HTML
  const values = UNITS.map((u) => slots[u]?.el).filter(Boolean);
  gsap.set(tiles, { y: 22, autoAlpha: 0 });
  gsap.set(values, { yPercent: 80, autoAlpha: 0 });

  ScrollTrigger.create({
    trigger: root,
    start: 'top 78%',
    once: true,
    onEnter() {
      gsap
        .timeline({ onComplete: () => (entered = true) })
        .to(tiles, { y: 0, autoAlpha: 1, duration: 0.6, stagger: 0.08, ease: 'back.out(1.7)' }, 0.15)
        .to(values, { yPercent: 0, autoAlpha: 1, duration: 0.55, stagger: 0.08, ease: 'power3.out' }, 0.35);
    },
  });
}
