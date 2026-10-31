const query = window.matchMedia('(prefers-reduced-motion: reduce)');

/** true quando o usuário pediu menos movimento no sistema. */
export const prefersReducedMotion = () => query.matches;
