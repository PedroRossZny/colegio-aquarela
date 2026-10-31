/**
 * Gera as imagens otimizadas do site a partir de content/ → public/.
 *
 *   npm run images                 # tudo
 *   npm run images -- vestibulinho # só a foto do Vestibulinho (ou qualquer nome de foto)
 *
 * - Fotos (content/fotos): WebP + JPG em larguras responsivas. As fotos já
 *   vêm cortadas no tamanho exato de cada seção — aqui só redimensiona para
 *   baixo e recomprime, nunca recorta.
 * - Foto do Vestibulinho: recortada do banner do processo seletivo
 *   (VESTIBULINHO_BANNER) — ver processVestibulinho(), a única com recorte.
 *   O banner não é versionado: sem o arquivo, a etapa é pulada sem erro.
 * - Logo do cabeçalho (*-web-header.png, transparente): WebP + PNG.
 * - Dupla de personagens da logo mascote (sem o letreiro), isolada a partir do
 *   SVG master — ver processMascotePersonagens().
 * - Logo do Sistema de Ensino Positivo (marca de terceiro, usada como está) —
 *   ver processLogoPositivo().
 * - Favicons .ico, apple-touch, ícones PWA e imagem de OG: já são finais —
 *   COPIADOS byte a byte (sharp não gera .ico).
 */
import sharp from 'sharp';
import { mkdir, copyFile, stat, readFile } from 'node:fs/promises';
import path from 'node:path';

// filtro opcional por nome de foto: `npm run images -- hero vestibulinho`
const only = new Set(process.argv.slice(2));
const wanted = (name) => only.size === 0 || only.has(name);

const SRC_FOTOS = 'content/fotos';
const SRC_LOGOS = 'content/logos';
const OUT_IMG = 'public/img';
const OUT_LOGOS = 'public/logos';

const WEBP = { quality: 74, effort: 6 };
const JPG = { quality: 78, mozjpeg: true, progressive: true };

/** foto → larguras de saída (nunca acima do original) */
const fotos = {
  hero: [1920, 1280, 768],
  'cta-final': [1920, 1280, 768],
  bercario: [1000, 800, 600],
  fundamental: [1000, 800, 600],
  'ensino-medio': [1000, 800, 600],
  informatica: [800, 480],
  ballet: [800, 480],
  judo: [800, 480],
  'cozinha-experimental': [800, 480],
  artesanato: [800, 480],
  horticultura: [800, 480],
  musicalizacao: [800, 480],
  // Espaços (mesmo padrão dos segmentos)
  'espaco-playground': [1000, 800, 600],
  'espaco-quadra-coberta': [1000, 800, 600],
};

const LOGO_VARIANTS = ['vetorial', 'mascote'];
const LOGO_WIDTHS = [200, 400];
const COPY_AS_IS = [
  'favicon-16.ico',
  'favicon-32.ico',
  'apple-touch-icon-180.png',
  'icon-192.png',
  'icon-512.png',
  'og-image-1200x630.png',
];

const kb = async (file) => `${((await stat(file)).size / 1024).toFixed(0)} KB`;

async function writeSizes(name, input, widths) {
  const meta = await sharp(input).metadata();
  for (const w of widths) {
    if (w > meta.width) continue;
    const base = sharp(input).resize({ width: w, withoutEnlargement: true });
    const webp = path.join(OUT_IMG, `${name}-${w}.webp`);
    const jpg = path.join(OUT_IMG, `${name}-${w}.jpg`);
    await base.clone().webp(WEBP).toFile(webp);
    await base.clone().jpeg(JPG).toFile(jpg);
    console.log(`  ${name}-${w}: webp ${await kb(webp)} · jpg ${await kb(jpg)}`);
  }
}

/**
 * Arquivo-fonte de uma foto: .jpg é o padrão, mas .jpeg e .png também valem.
 * A saída é sempre JPG + WebP, igual para todas.
 */
async function fotoSource(name) {
  for (const ext of ['jpg', 'jpeg', 'png']) {
    const file = path.join(SRC_FOTOS, `${name}.${ext}`);
    try {
      await stat(file);
      return file;
    } catch {
      // tenta a próxima extensão
    }
  }
  throw new Error(`foto não encontrada: ${SRC_FOTOS}/${name}.{jpg,jpeg,png}`);
}

async function processFoto(name, widths) {
  const file = await fotoSource(name);
  // PNG pode vir com transparência: sem o flatten, o JPG sairia com fundo preto
  const input = file.endsWith('.png') ? await sharp(file).flatten({ background: '#ffffff' }).toBuffer() : file;
  await writeSizes(name, input, widths);
}

/**
 * Banner do Vestibulinho (1600×900). Não fica no repositório: para gerar a foto
 * da seção, coloque o arquivo neste caminho e rode `npm run images -- vestibulinho`.
 */
const VESTIBULINHO_BANNER = 'content/vestibulinho/banner.jpeg';

/**
 * Vestibulinho — foto dos quatro alunos, recortada do banner (1600×900).
 * O banner tem a arte "Vestibulinho Colégio Aquarela 2027" à esquerda; o site
 * usa só a foto (o título é texto real, na tipografia do site). Recorte:
 *   - x a partir de 842: primeira coluna limpa depois da arte (a pincelada
 *     amarela do "2027" chega a x≈840, encostada no ombro do primeiro aluno);
 *   - quadrado alinhado ao topo (758×758): mostra os quatro da cintura para cima
 *     e deixa de fora as pinceladas rosa/amarela do canto inferior direito.
 * A pincelada azul do topo (x 1020–1600, y 0–160, acima das cabeças) é coberta
 * com o próprio fundo aquarelado do banner (faixa limpa esticada, desfocada e
 * com bordas suavizadas): dentro da máscara orgânica do site ela pareceria um
 * defeito, não um enfeite.
 */
async function processVestibulinho() {
  const input = VESTIBULINHO_BANNER;
  try {
    await stat(input);
  } catch {
    console.log(`  vestibulinho: pulado (${input} não encontrado)`);
    return;
  }
  const patchArea = { left: 1020, top: 0, width: 580, height: 160 };
  const patch = await sharp(input)
    .extract({ left: 1020, top: 0, width: 40, height: 160 })
    .resize({ width: patchArea.width, height: patchArea.height, fit: 'fill' })
    .blur(10)
    .toBuffer();
  // feather: some suave na borda esquerda e na de baixo, para não marcar emenda
  const feather = Buffer.from(`<svg width="${patchArea.width}" height="${patchArea.height}">
    <defs>
      <linearGradient id="y" x1="0" y1="0" x2="0" y2="1"><stop offset="0.7" stop-color="white"/><stop offset="1" stop-color="black"/></linearGradient>
      <linearGradient id="x" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="black"/><stop offset="0.08" stop-color="white"/></linearGradient>
      <mask id="m"><rect width="100%" height="100%" fill="url(#y)"/><rect width="100%" height="100%" fill="url(#x)" style="mix-blend-mode:multiply"/></mask>
    </defs>
    <rect width="100%" height="100%" fill="white" mask="url(#m)"/>
  </svg>`);
  const patchSoft = await sharp(patch).ensureAlpha().composite([{ input: feather, blend: 'dest-in' }]).png().toBuffer();
  // em duas etapas: no pipeline do sharp o extract roda ANTES do composite
  const clean = await sharp(input).composite([{ input: patchSoft, left: patchArea.left, top: patchArea.top }]).png().toBuffer();
  const foto = await sharp(clean).extract({ left: 842, top: 0, width: 758, height: 758 }).png().toBuffer();
  await writeSizes('vestibulinho', foto, [758, 560]);
}

async function processLogo(variant) {
  const dir = path.join(OUT_LOGOS, variant);
  await mkdir(dir, { recursive: true });
  const header = path.join(SRC_LOGOS, variant, `${variant}-web-header.png`);
  for (const w of LOGO_WIDTHS) {
    const out = path.join(dir, `logo-${w}.webp`);
    await sharp(header).resize({ width: w, withoutEnlargement: true }).webp({ quality: 82, effort: 6 }).toFile(out);
    console.log(`  ${variant}/logo-${w}.webp ${await kb(out)}`);
  }
  const png = path.join(dir, 'logo-400.png');
  await sharp(header).resize({ width: 400 }).png({ compressionLevel: 9, palette: true }).toFile(png);
  console.log(`  ${variant}/logo-400.png ${await kb(png)}`);

  for (const file of COPY_AS_IS) {
    await copyFile(path.join(SRC_LOGOS, variant, `${variant}-${file}`), path.join(dir, file));
    console.log(`  ${variant}/${file} (copiado)`);
  }
}

/**
 * Logo mascote — só a dupla de personagens (menino com pincel, menina com
 * paleta), sem o "Colégio Aquarela" embaixo: o site usa a logo vetorial para
 * esse papel, e a dupla entra como ícone (card do Berçário, CTA final).
 *
 * O master é um SVG traçado automaticamente: 102 caminhos preenchidos. As
 * letras são caminhos próprios, mas o contorno branco (caminho 10) é um só
 * para tudo, e o traço preto do menino (2) arrasta junto o traço do "A".
 * Então: renderiza só os caminhos dos personagens, refaz um contorno branco
 * mais fino dilatando a silhueta deles, e mantém o traço preto só onde ele
 * está colado num personagem — o laço do "A" fica de fora. Os índices abaixo
 * foram conferidos um a um (bounding box + render isolado).
 */
async function processMascotePersonagens() {
  const W = 2000, H = 1416; // tamanho do master
  const svg = await readFile(path.join(SRC_LOGOS, 'mascote', 'mascote-master.svg'), 'utf8');
  const paths = [...svg.matchAll(/<path\b[^>]*\/?>/g)].map((m) => m[0]);
  const FUNDO = 0, CONTORNO_BRANCO = 10, TRACO_PRETO = [1, 2];
  const LETRAS = new Set([3, 12, 15, 16, 18, 19, 20, 21, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 37, 45, 46, 47, 48, 49, 50, 51, 75, 76, 77, 78]);
  const RESPINGO = 6; // pontinho solto abaixo da paleta
  const pick = (keep) => paths.filter((_, i) => keep(i));
  const render = (list) =>
    sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${list.join('')}</svg>`))
      .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const alphaOf = (rgba) => { const a = Buffer.alloc(W * H); for (let i = 0; i < W * H; i++) a[i] = rgba[i * 4 + 3]; return a; };
  // dilatação aproximada (blur + limiar). extractChannel: na saída o sharp
  // expande 1 canal para 3 (sRGB), então fica só o primeiro.
  const dilate = async (alpha, radius) => {
    const blurred = await sharp(alpha, { raw: { width: W, height: H, channels: 1 } }).blur(radius).extractChannel(0).raw().toBuffer();
    const out = Buffer.alloc(W * H);
    for (let i = 0; i < out.length; i++) out[i] = blurred[i] > 6 ? 255 : 0;
    return out;
  };

  // 1) preenchimentos dos personagens
  const fills = await render(pick((i) => i !== FUNDO && i !== CONTORNO_BRANCO && i !== RESPINGO && !LETRAS.has(i) && !TRACO_PRETO.includes(i)));
  const fillsA = alphaOf(fills.data);
  // 2) traço preto, só onde encosta nos preenchimentos (some o laço do "A")
  const traco = await render(pick((i) => TRACO_PRETO.includes(i)));
  const perto = await dilate(fillsA, 14);
  for (let i = 0; i < W * H; i++) if (!perto[i]) traco.data[i * 4 + 3] = 0;
  // 3) contorno branco novo: silhueta (preenchimentos ∪ traço) dilatada
  const silhueta = Buffer.alloc(W * H);
  for (let i = 0; i < W * H; i++) silhueta[i] = Math.max(fillsA[i], traco.data[i * 4 + 3]);
  const contornoA = await dilate(silhueta, 11);
  // 4) nenhum resquício de letra (preenchimentos das letras, levemente dilatados)
  const letrasA = await dilate(alphaOf((await render(pick((i) => LETRAS.has(i)))).data), 3);
  for (let i = 0; i < W * H; i++) if (letrasA[i]) { contornoA[i] = 0; traco.data[i * 4 + 3] = 0; fills.data[i * 4 + 3] = 0; }
  const contorno = Buffer.alloc(W * H * 4, 255);
  for (let i = 0; i < W * H; i++) contorno[i * 4 + 3] = contornoA[i];

  const raw = { width: W, height: H, channels: 4 };
  const dupla = await sharp(contorno, { raw })
    .composite([{ input: traco.data, raw }, { input: fills.data, raw }])
    .png().toBuffer();
  const recortada = await sharp(dupla).trim().png().toBuffer();

  const dir = path.join(OUT_LOGOS, 'mascote');
  await mkdir(dir, { recursive: true });
  for (const w of [200, 400]) {
    const base = sharp(recortada).resize({ width: w });
    const png = path.join(dir, `personagens-${w}.png`);
    const webp = path.join(dir, `personagens-${w}.webp`);
    await base.clone().png({ compressionLevel: 9, palette: true }).toFile(png);
    await base.clone().webp({ quality: 88, effort: 6, alphaQuality: 90 }).toFile(webp);
    console.log(`  mascote/personagens-${w}: png ${await kb(png)} · webp ${await kb(webp)}`);
  }
}

/**
 * Logo do Sistema de Ensino Positivo — marca de terceiro, usada como veio (só
 * redimensionada). O master tem uma moldura transparente larga, então passa por
 * trim() antes: assim a caixa do <img> é a própria marca, e o espaçamento fica
 * no CSS, não embutido na imagem.
 *
 * O letreiro é preto: a logo só funciona sobre fundo claro (por isso a seção do
 * site é clara e a logo fica num cartão branco).
 */
async function processLogoPositivo() {
  const input = path.join(SRC_LOGOS, 'positivo', 'positivo-master.png');
  const recortada = await sharp(input).trim().png().toBuffer();
  const dir = path.join(OUT_LOGOS, 'positivo');
  await mkdir(dir, { recursive: true });
  for (const w of [280, 560]) {
    const base = sharp(recortada).resize({ width: w });
    const png = path.join(dir, `logo-${w}.png`);
    const webp = path.join(dir, `logo-${w}.webp`);
    await base.clone().png({ compressionLevel: 9 }).toFile(png);
    await base.clone().webp({ quality: 90, effort: 6, alphaQuality: 92 }).toFile(webp);
    console.log(`  positivo/logo-${w}: png ${await kb(png)} · webp ${await kb(webp)}`);
  }
}

await mkdir(OUT_IMG, { recursive: true });
console.log('Fotos:');
for (const [name, widths] of Object.entries(fotos)) if (wanted(name)) await processFoto(name, widths);
if (wanted('vestibulinho')) await processVestibulinho();
if (only.size === 0) {
  console.log('Logos:');
  for (const v of LOGO_VARIANTS) await processLogo(v);
}
if (only.size === 0 || wanted('mascote')) await processMascotePersonagens();
if (only.size === 0 || wanted('positivo')) await processLogoPositivo();
console.log('OK');
