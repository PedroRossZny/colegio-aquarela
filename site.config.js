/**
 * Constantes do site — Colégio Aquarela
 *
 * Tudo que é "dado da escola" fica aqui, num lugar só. O vite.config.js injeta
 * esses valores no index.html (tokens {{NOME}}) e no JS (global __SITE__).
 */
export const site = {
  /**
   * Qual logo usar em TODO o site (cabeçalho, rodapé, favicons, ícones PWA,
   * imagem de Open Graph). Basta trocar aqui:
   *   'vetorial' → content/logos/vetorial/  (A navy com pinceladas)
   *   'mascote'  → content/logos/mascote/   (menino e menina)
   */
  logo: 'vetorial',

  name: 'Colégio Aquarela',
  title: 'Colégio Aquarela — Plantamos conhecimento e cultivamos futuro.',
  description:
    'Uma educação que acolhe, ensina e prepara para a vida, acompanhando cada aluno em sua jornada de descobertas e aprendizados.',

  /**
   * WhatsApp da escola (o mesmo número do telefone fixo).
   * Formato: DDI + DDD + número, só dígitos.
   */
  whatsapp: '551733315435',
  whatsappMessage: 'Olá! Gostaria de agendar uma visita ao Colégio Aquarela.',
  // mensagem pré-preenchida do botão "Dúvidas no WhatsApp" da seção do Vestibulinho
  whatsappVestibulinhoMessage: 'Olá! Tenho uma dúvida sobre o Vestibulinho 2027 do Colégio Aquarela.',

  phone: '(17) 3331-5435',
  phoneHref: 'tel:+551733315435',

  address: 'Av. 9, nº 901 – Centro – Guaíra/SP',
  mapsUrl:
    'https://www.google.com/maps/search/?api=1&query=' +
    encodeURIComponent('Avenida 9, 901, Centro, Guaíra - SP'),

  instagram: 'https://www.instagram.com/colegioaquarelaguaira_/',
  facebook: 'https://www.facebook.com/escolaaquarelaguaira/',

  /**
   * Domínio do site. Fonte única da URL: canonical, og:url, og:image,
   * twitter:image, o sitemap.xml e a linha `Sitemap:` do robots.txt nascem
   * daqui — não repetir o domínio em outro lugar.
   * Com `www`: é o domínio primário na hospedagem (o apex responde 308 e
   * redireciona para cá), então canonical e sitemap apontam para esta forma.
   * Sem barra no fim: quem usa o valor acrescenta o caminho (`{{SITE_URL}}/`).
   */
  siteUrl: 'https://www.colegioaquarelaguaira.com.br',

  /**
   * Vestibulinho — módulo sazonal. As datas exibidas no HTML e o alvo do
   * contador nascem daqui (tokens VEST_*). Os valores abaixo são os do ciclo
   * 2027, mantidos como exemplo do formato.
   */
  vestibulinho: {
    /**
     * Interruptor do módulo inteiro. Com false, nada do Vestibulinho vai para o
     * build: a seção, o item do menu e do rodapé, o contador (countdown.js), os
     * estilos, a foto e o link do formulário. Código e dados ficam no projeto
     * para o próximo processo seletivo — ver "Reativar o Vestibulinho" no README.
     */
    enabled: false,

    name: 'Vestibulinho 2027',
    // Data e hora da prova, com fuso de Brasília explícito: o contador conta
    // certo para qualquer visitante, em qualquer fuso.
    examDate: '2026-10-06T17:00:00-03:00',
    enrollmentStart: '2026-09-21', // primeiro dia de inscrição
    enrollmentEnd: '2026-10-05', // último dia de inscrição
    scholarship: 'até 50%', // bolsa de estudo (desconto)
    /**
     * Link do formulário de inscrição (externo, ex.: Google Forms — não há
     * formulário no site). Configurável: o valor abaixo é um placeholder; troque
     * pelo link real ao reativar o módulo. O botão abre em nova aba, para não
     * tirar a pessoa do site.
     */
    formUrl: 'https://forms.gle/EXEMPLO',
  },

  /**
   * Google Analytics (GA4) — configurável. Enquanto o ID for exatamente o
   * placeholder abaixo, o snippet do index.html fica de fora do build (não sai
   * nenhuma requisição, sem erro no console). Com um ID real ("ID da métrica"
   * em analytics.google.com), o snippet padrão passa a funcionar sem mexer no
   * HTML.
   */
  tracking: {
    ga4Id: 'G-XXXXXXXXXX',
  },
};

/**
 * Crédito de desenvolvimento do rodapé.
 *
 * Este WhatsApp é o do desenvolvedor e existe só para este link: quem clica no
 * crédito quer falar com quem fez o site, não com a escola. Todo o resto do
 * site (cabeçalho, Vestibulinho, CTA final, rodapé e botão flutuante) usa
 * `site.whatsapp`, o número da escola. Não trocar um pelo outro.
 */
export const developer = {
  name: 'Pedro Ross',
  whatsappUrl: 'https://wa.me/5517999760021',
};

export const whatsappUrl = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(site.whatsappMessage)}`;
export const whatsappVestibulinhoUrl = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(site.whatsappVestibulinhoMessage)}`;

/** Placeholder de rastreamento: com ele no lugar, o snippet fica inerte. */
export const TRACKING_PLACEHOLDERS = {
  ga4Id: 'G-XXXXXXXXXX',
};
