import { defineConfig } from 'vite';
import { readFileSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { site, developer, whatsappUrl, whatsappVestibulinhoUrl, TRACKING_PLACEHOLDERS } from './site.config.js';

/**
 * Tokens substituídos no index.html. Manter em sincronia com site.config.js.
 * Usa {{TOKEN}} (e não %TOKEN%) para não colidir com a substituição nativa de
 * variáveis de ambiente do Vite.
 */
// Dimensões do logo gerado (public/logos/<variante>/logo-400.png), lidas do
// cabeçalho IHDR do PNG — width/height explícitos no <img> (sem CLS).
function pngSize(file) {
  const buf = readFileSync(file);
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}
const logoSize = pngSize(`public/logos/${site.logo}/logo-400.png`);

// Datas do Vestibulinho formatadas em pt-BR, sempre no fuso de Brasília — o
// que aparece no HTML nasce da mesma constante que o contador usa no JS.
const ptBR = (date, opts) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', ...opts }).format(date);
// período de inscrição é só data (sem hora): formata em UTC para não deslizar um dia
const dayMonth = (iso, withYear) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', ...(withYear && { year: 'numeric' }) }).format(new Date(iso));

/**
 * Blocos condicionais: o miolo entre os marcadores só fica no build quando a
 * chave abaixo é true. Cada marcador ocupa uma linha inteira e sai sempre —
 * com a chave true, o arquivo fica exatamente como seria sem os marcadores.
 *   index.html                <!-- {{#NOME}} --> … <!-- {{/NOME}} -->
 *   JS de src/ e main.scss    // {{#NOME}} … // {{/NOME}}
 * No Sass só vale no main.scss: os parciais do @use não passam pelo Vite.
 */
const blocks = {
  // Rastreamento: o snippet padrão fica verbatim no index.html e só entra no
  // HTML final quando o ID deixou de ser o placeholder (configurável).
  GA4: site.tracking.ga4Id !== TRACKING_PLACEHOLDERS.ga4Id,
  // Vestibulinho: interruptor do módulo inteiro (site.config.js → vestibulinho.enabled)
  VESTIBULINHO: site.vestibulinho.enabled,
};

const BLOCK = /^[ \t]*(?:<!--|\/\/) \{\{#([A-Z0-9_]+)\}\}(?: -->)?(?:\r?\n|$)([\s\S]*?)^[ \t]*(?:<!--|\/\/) \{\{\/\1\}\}(?: -->)?(?:\r?\n|$)/gm;

function stripBlocks(text, file) {
  const out = text.replace(BLOCK, (match, key, inner) => {
    if (!(key in blocks)) throw new Error(`${file}: bloco condicional desconhecido {{#${key}}}`);
    // sem isso, um {{/NOME}} esquecido faria o bloco ir até o fechamento do
    // bloco seguinte — e desligado ele apagaria tudo o que há entre os dois
    if (inner.includes(`{{#${key}}}`)) throw new Error(`${file}: falta um {{/${key}}} antes do {{#${key}}} seguinte`);
    return blocks[key] ? stripBlocks(inner, file) : '';
  });
  // marcador que sobrou é bloco sem par ou com o nome trocado: melhor parar o
  // build do que publicar a página pela metade
  const stray = out.match(/\{\{[#/][A-Z0-9_]+\}\}/);
  if (stray) throw new Error(`${file}: marcador ${stray[0]} sem par`);
  return out;
}

/**
 * Com o Vestibulinho desligado sai também todo comentário do HTML que fale
 * dele fora dos blocos condicionais. Não dá para pôr um marcador no meio de um
 * comentário (o --> do marcador o fecharia antes da hora).
 */
const dropVestibulinhoComments = (html) =>
  html.replace(/[ \t]*<!--[\s\S]*?-->(?:\r?\n)?/g, (comment) => (/vestibulinho/i.test(comment) ? '' : comment));

/**
 * Tokens VEST_* (ver site.config.js → vestibulinho). Só são calculados com o
 * módulo ligado: desligado, os dados do próximo processo podem estar pela
 * metade sem quebrar o build.
 */
function vestibulinhoTokens() {
  const v = site.vestibulinho;
  const examDate = new Date(v.examDate);
  const examParts = Object.fromEntries(
    new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
      .formatToParts(examDate)
      .map((p) => [p.type, p.value]),
  );
  // "17h" ou "9h30" — do jeito que se escreve horário no Brasil
  const examTime = `${Number(examParts.hour)}h${examParts.minute === '00' ? '' : examParts.minute}`;

  return {
    WHATSAPP_VEST_URL: whatsappVestibulinhoUrl,
    VEST_NAME: v.name,
    VEST_FORM_URL: v.formUrl,
    VEST_DATETIME: v.examDate, // atributo datetime do <time>
    VEST_DATE_SHORT: ptBR(examDate, { day: '2-digit', month: '2-digit' }), // 06/10
    VEST_DATE_LONG: ptBR(examDate, { day: 'numeric', month: 'long', year: 'numeric' }), // 6 de outubro de 2026
    VEST_WEEKDAY: ptBR(examDate, { weekday: 'long' }), // terça-feira
    VEST_TIME: examTime, // 17h
    VEST_ENROLL_START_DT: v.enrollmentStart, // atributo datetime do <time>
    VEST_ENROLL_END_DT: v.enrollmentEnd,
    VEST_ENROLL_START: dayMonth(v.enrollmentStart, false), // 21/09
    VEST_ENROLL_END: dayMonth(v.enrollmentEnd, true), // 05/10/2026
    VEST_SCHOLARSHIP: v.scholarship, // até 50%
  };
}

const tokens = {
  LOGO: site.logo,
  LOGO_W: logoSize.w,
  LOGO_H: logoSize.h,
  NAME: site.name,
  TITLE: site.title,
  DESCRIPTION: site.description,
  WHATSAPP_URL: whatsappUrl,
  // crédito do rodapé: WhatsApp do desenvolvedor, só aqui (ver site.config.js → developer)
  DEV_NAME: developer.name,
  DEV_WHATSAPP_URL: developer.whatsappUrl,
  PHONE: site.phone,
  PHONE_HREF: site.phoneHref,
  ADDRESS: site.address,
  MAPS_URL: site.mapsUrl,
  INSTAGRAM: site.instagram,
  FACEBOOK: site.facebook,
  SITE_URL: site.siteUrl,
  YEAR: String(new Date().getFullYear()),

  // Vestibulinho (ver site.config.js → vestibulinho)
  ...(blocks.VESTIBULINHO && vestibulinhoTokens()),

  // Rastreamento (ID configurável em site.config.js → tracking.ga4Id)
  GA4_ID: site.tracking.ga4Id,
};

const escapeHtml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Substitui os {{TOKENS}} em texto puro (sem escape de HTML). Usado no
 * robots.txt, para a linha `Sitemap:` sair do mesmo site.siteUrl que gera o
 * canonical e o sitemap — uma troca de domínio não deixa o robots.txt para trás.
 */
const fillTokens = (text) =>
  text.replace(/\{\{([A-Z0-9_]+)\}\}/g, (match, key) => (key in tokens ? String(tokens[key]) : match));

/**
 * sitemap.xml — uma entrada só: a página é única, e as seções (#segmentos,
 * #vestibulinho, …) são âncoras da MESMA URL, não URLs próprias.
 *
 * O domínio vem de site.siteUrl, a mesma constante do canonical e do og:url —
 * trocar o domínio no site.config.js é suficiente, não há domínio repetido aqui.
 * `lastmod` é a data do build (fuso de Brasília): sendo uma página só, cada
 * publicação é de fato uma atualização dela.
 *
 * O robots.txt da raiz aponta para este arquivo na linha `Sitemap:`.
 */
function sitemap() {
  const lastmod = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${site.siteUrl}/</loc>
    <lastmod>${lastmod}</lastmod>
  </url>
</urlset>
`;
}

function siteTokens() {
  return {
    name: 'aquarela-site-tokens',
    transformIndexHtml(html) {
      let out = stripBlocks(html, 'index.html');
      if (!blocks.VESTIBULINHO) out = dropVestibulinhoComments(out);
      return out.replace(/\{\{([A-Z0-9_]+)\}\}/g, (match, key) => (key in tokens ? escapeHtml(tokens[key]) : match));
    },
    generateBundle() {
      // robots.txt vive na raiz do repositório (fonte única) e é copiado
      // para o dist/ aqui, sem duplicar o arquivo em public/. Passa pelo
      // fillTokens por causa do {{SITE_URL}} da linha `Sitemap:`.
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: fillTokens(readFileSync('robots.txt', 'utf8')) });

      // sitemap.xml gerado a partir de site.siteUrl (ver sitemap()).
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap() });

      // Manifest gerado a partir da logo escolhida.
      const manifest = {
        name: site.name,
        short_name: 'Aquarela',
        description: site.description,
        lang: 'pt-BR',
        start_url: '/',
        display: 'standalone',
        background_color: '#F7F8FC',
        theme_color: '#001870',
        icons: [
          { src: `/logos/${site.logo}/icon-192.png`, sizes: '192x192', type: 'image/png' },
          { src: `/logos/${site.logo}/icon-512.png`, sizes: '512x512', type: 'image/png' },
        ],
      };
      this.emitFile({ type: 'asset', fileName: 'site.webmanifest', source: JSON.stringify(manifest, null, 2) });
    },
    // A public/ vai inteira para o dist/. Se a foto do Vestibulinho existir em
    // public/img (gerada por `npm run images`), com o módulo desligado ela sai do build.
    writeBundle({ dir }) {
      if (blocks.VESTIBULINHO) return;
      for (const file of readdirSync('public/img')) {
        if (file.startsWith('vestibulinho-')) rmSync(path.join(dir, 'img', file), { force: true });
      }
    },
    // Em dev o manifest, o robots.txt e o sitemap.xml não passam por generateBundle — serve direto.
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/robots.txt') {
          res.setHeader('Content-Type', 'text/plain');
          return res.end(fillTokens(readFileSync('robots.txt', 'utf8')));
        }
        if (req.url === '/sitemap.xml') {
          res.setHeader('Content-Type', 'application/xml');
          return res.end(sitemap());
        }
        if (req.url === '/site.webmanifest') {
          res.setHeader('Content-Type', 'application/manifest+json');
          return res.end(JSON.stringify({ name: site.name, icons: [] }));
        }
        next();
      });
    },
  };
}

/**
 * Os mesmos blocos condicionais nos fontes JS e Sass: é por eles que o contador
 * (import e chamada no main.js) e os estilos (@use no main.scss) do Vestibulinho
 * saem do build. `enforce: 'pre'` para o Sass chegar ao compilador já sem o bloco.
 */
function siteBlocks() {
  return {
    name: 'aquarela-site-blocks',
    enforce: 'pre',
    transform(code, id) {
      const file = id.split('?')[0];
      if (file.includes('/node_modules/') || !/\.(?:js|scss)$/.test(file) || !/\{\{[#/]/.test(code)) return null;
      return stripBlocks(code, file);
    },
  };
}

export default defineConfig({
  plugins: [siteTokens(), siteBlocks()],
  define: {
    __SITE__: JSON.stringify({
      logo: site.logo,
      whatsappUrl,
      // o contador lê a mesma constante que gera as datas do HTML
      ...(blocks.VESTIBULINHO && { vestibulinho: { examDate: site.vestibulinho.examDate } }),
    }),
  },
  build: {
    target: 'es2020',
    cssMinify: true,
    assetsInlineLimit: 4096,
  },
});
