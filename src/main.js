import 'aos/dist/aos.css';
import './styles/main.scss';

import { initHeader } from './js/header.js';
import { initMenu } from './js/menu.js';
import { initAnimations } from './js/animations.js';
import { initAtividades } from './js/atividades.js';
// Contador do Vestibulinho: os blocos saem do build com vestibulinho.enabled: false (ver vite.config.js)
// {{#VESTIBULINHO}}
import { initCountdown } from './js/countdown.js';
// {{/VESTIBULINHO}}

initHeader();
initMenu();
initAnimations();
initAtividades();
// {{#VESTIBULINHO}}
initCountdown();
// {{/VESTIBULINHO}}
