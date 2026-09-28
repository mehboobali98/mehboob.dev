import { resolve } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import * as fontkit from 'fontkit';
import { accents, type CardMotif } from './cardMotif';

interface ShareCardOptions {
  eyebrow: string;
  title: string;
  detail: string;
  motif?: CardMotif;
  seed?: string;
}

type Motif<K extends CardMotif['motif']> = Extract<CardMotif, { motif: K }>;

const WIDTH = 1200;
const HEIGHT = 630;
const TEXT_X = 72;
const TEXT_WIDTH = 600;
const TITLE_TOP = 190;
const TITLE_BOTTOM = 508;
const TITLE_SIZES = [72, 66, 60, 54, 48];
const TITLE_LEADING = 1.04;
const TITLE_TRACKING = -0.02;
const MOTIF_LEFT = 720;
const MOTIF_RIGHT = 1156;
const MOTIF_MIDDLE = (TITLE_TOP + TITLE_BOTTOM) / 2;

const fontPath = (file: string) => resolve(process.cwd(), 'src/assets/fonts', file);
const displayFile = fontPath('Fraunces-SemiBold-Wonk.ttf');
const monoFile = fontPath('IBMPlexMono-Regular.ttf');
const sansFile = fontPath('IBMPlexSans-Medium.ttf');
const display = fontkit.openSync(displayFile) as fontkit.Font;
const mono = fontkit.openSync(monoFile) as fontkit.Font;
const sans = fontkit.openSync(sansFile) as fontkit.Font;

const color = {
  ground: '#0F1319',
  surface: '#202834',
  line: '#404A5A',
  lineStrong: '#556274',
  quiet: '#8590A2',
  paper: '#F0EDE6',
  signal: '#E0A84E',
  ember: '#8C5F1E',
  cool: '#2B4C7E',
};

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function measure(text: string, font: fontkit.Font, size: number, tracking = 0) {
  const advance = font.layout(text).advanceWidth / font.unitsPerEm;
  return (advance + tracking * Math.max(text.length - 1, 0)) * size;
}

function wrap(words: string[], size: number, width: number) {
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && measure(candidate, display, size, TITLE_TRACKING) > width) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function balance(words: string[], size: number, count: number) {
  let best = wrap(words, size, TEXT_WIDTH);
  for (let width = TEXT_WIDTH - 10; width > TEXT_WIDTH / 2; width -= 10) {
    const lines = wrap(words, size, width);
    if (lines.length > count) break;
    best = lines;
  }
  return best;
}

function titleHeight(size: number, lines: number) {
  return (display.capHeight / display.unitsPerEm) * size + (lines - 1) * size * TITLE_LEADING;
}

function fitTitle(title: string) {
  const words = title.trim().split(/\s+/);
  for (const maxLines of [3, 4]) {
    for (const size of TITLE_SIZES) {
      const lines = wrap(words, size, TEXT_WIDTH);
      const fits = lines.length <= maxLines
        && titleHeight(size, lines.length) <= TITLE_BOTTOM - TITLE_TOP
        && lines.every((line) => measure(line, display, size, TITLE_TRACKING) <= TEXT_WIDTH);
      if (fits) return { size, lines: balance(words, size, lines.length) };
    }
  }
  throw new Error(`Share card title does not fit in four lines: "${title}"`);
}

function assertFits(text: string, font: fontkit.Font, size: number, width: number, tracking = 0) {
  if (measure(text, font, size, tracking) > width) {
    throw new Error(`Share card text is wider than ${width}px: "${text}"`);
  }
}

function hash(value: string) {
  let h = 2166136261;
  for (const char of value) h = Math.imul(h ^ char.charCodeAt(0), 16777619) >>> 0;
  return h;
}

const glow = (markup: string, width: number) => `
  <g filter="url(#soft)" stroke-width="${width}" opacity="0.5">${markup}</g>
  ${markup}
`;

const meshNodes: Array<[number, number]> = [
  [746, 170], [842, 112], [938, 160], [1090, 102],
  [714, 336], [806, 264], [918, 306], [1030, 218], [1140, 276],
  [784, 474], [918, 520], [1050, 468], [1140, 516],
];
const meshEdges: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3],
  [4, 5], [5, 6], [6, 7], [7, 8],
  [5, 1], [6, 2], [7, 3],
  [4, 9], [9, 10], [10, 11], [11, 12],
];
const meshRoutes = [[4, 5, 6, 7], [0, 1, 2, 3], [4, 9, 10, 11], [5, 6, 7, 8], [9, 10, 11, 12]];
const labelSpots = [
  { x: 792, y: 250, anchor: 'end' },
  { x: 918, y: 340, anchor: 'middle' },
  { x: 1016, y: 204, anchor: 'end' },
];

function pathMotif(tint: string, labels: readonly string[] = [], seed = '') {
  const route = labels.length ? meshRoutes[0] : meshRoutes[hash(seed) % meshRoutes.length];
  const point = (index: number) => meshNodes[index].join(' ');
  const edges = meshEdges.map(([a, b]) => `M${point(a)} L${point(b)}`).join(' ');
  const dots = meshNodes.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" />`).join('');
  const highlight = route.map((index, i) => `${i ? 'L' : 'M'}${point(index)}`).join(' ');
  const stops = route.map((index) => `<circle cx="${meshNodes[index][0]}" cy="${meshNodes[index][1]}" r="8" />`).join('');
  const text = labels
    .map((label, i) => {
      const { x, y, anchor } = labelSpots[i];
      return `<text x="${x}" y="${y}" text-anchor="${anchor}">${escapeXml(label)}</text>`;
    })
    .join('');

  return `
    <path d="${edges}" stroke="${color.line}" stroke-width="2" fill="none" opacity="0.75" />
    <g fill="${color.lineStrong}">${dots}</g>
    ${glow(`<path d="${highlight}" stroke="${tint}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round" />`, 10)}
    <g fill="${tint}">${stops}</g>
    <g font-family="IBM Plex Mono" font-size="19" fill="${color.paper}" stroke="${color.ground}" stroke-width="6" paint-order="stroke">${text}</g>
  `;
}

function agentsMotif(tint: string, agents: Motif<'agents'>['agents']) {
  const x = 772;
  const rows = [204, 322, 470];
  const wall = 396;
  const nodes = agents
    .map(({ name, note }, i) => {
      const y = rows[i];
      const node = i < 2
        ? `<circle cx="${x}" cy="${y}" r="11" fill="${tint}" />`
        : `<circle cx="${x}" cy="${y}" r="10" fill="${color.ground}" stroke="${color.paper}" stroke-width="3" />`;
      return `
        ${node}
        <text x="${x + 32}" y="${y - 2}" font-size="28" fill="${color.paper}">${escapeXml(name)}</text>
        <text x="${x + 32}" y="${y + 30}" font-size="20" fill="${color.quiet}">${escapeXml(note)}</text>
      `;
    })
    .join('');

  return `
    ${glow(`<path d="M${x} ${rows[0]} L${x} ${rows[1]}" stroke="${tint}" stroke-width="4" stroke-linecap="round" />`, 10)}
    <path d="M${x} ${rows[1]} L${x} ${wall - 14}" stroke="${tint}" stroke-width="4" stroke-linecap="round" stroke-dasharray="2 10" />
    <path d="M736 ${wall} L1136 ${wall}" stroke="${color.lineStrong}" stroke-width="3" stroke-dasharray="14 10" />
    <g font-family="IBM Plex Mono">${nodes}</g>
  `;
}

function barsMotif(tint: string, { before, after }: Motif<'bars'>) {
  const x = 740;
  const full = 380;
  const afterWidth = Math.max((after.value / before.value) * full, 6);
  const row = (label: string, caption: string, y: number, bar: string, ink: string) => `
    <text x="${x}" y="${y}" font-family="Fraunces" font-weight="600" font-size="44" fill="${ink}">${escapeXml(label)}</text>
    <text x="${x + measure(label, display, 44) + 16}" y="${y}" font-family="IBM Plex Mono" font-size="20" fill="${color.quiet}">${escapeXml(caption)}</text>
    ${bar}
  `;

  return `
    ${row(before.label, 'before', 262, `<rect x="${x}" y="284" width="${full}" height="32" rx="3" fill="${color.lineStrong}" />`, color.paper)}
    ${row(after.label, 'after', 412, glow(`<rect x="${x}" y="434" width="${afterWidth}" height="32" rx="3" fill="${tint}" />`, 0), tint)}
  `;
}

function fitFan(hub: string | undefined, chips: Motif<'fan'>['chips'], minLeft: number) {
  for (const size of [24, 22, 20, 19, 18, 17]) {
    const pad = size * 0.8;
    const widths = chips.map(({ label }) => measure(label, sans, size) + pad * 2);
    const column = MOTIF_RIGHT - Math.max(...widths);
    const hubWidth = hub ? measure(hub, sans, size) + pad * 2 : 0;
    const room = column - minLeft - hubWidth;
    if (room >= 56) {
      const spoke = Math.min(room, hub ? 110 : 180);
      return { size, pad, widths, column, hubWidth, hubLeft: column - spoke - hubWidth };
    }
  }
  throw new Error(`Share card fan is too wide: "${hub}" and its chips`);
}

function fanMotif(tint: string, { hub, chips }: Motif<'fan'>, titleRight: number) {
  const { size, pad, widths, column, hubWidth, hubLeft } = fitFan(hub, chips, Math.max(titleRight + 56, 600));
  const height = size * 2.1;
  const step = height + 18;
  const hubRight = hubLeft + hubWidth;
  const firstY = MOTIF_MIDDLE - ((chips.length - 1) * step) / 2;
  const spokes = chips.map((chip, i) => {
    const cy = firstY + i * step;
    const ink = chip.accent ? accents[chip.accent] : tint;
    const d = `M${hubRight} ${MOTIF_MIDDLE} C${hubRight + 70} ${MOTIF_MIDDLE} ${column - 70} ${cy} ${column} ${cy}`;
    return {
      gradient: `
        <linearGradient id="spoke${i}" gradientUnits="userSpaceOnUse" x1="${hubRight}" y1="${MOTIF_MIDDLE}" x2="${column}" y2="${cy}">
          <stop offset="0" stop-color="${ink}" stop-opacity="0.2" /><stop offset="1" stop-color="${ink}" />
        </linearGradient>`,
      edge: `<path d="${d}" stroke="url(#spoke${i})" stroke-width="3" fill="none" />`,
      chip: `
        <rect x="${column}" y="${cy - height / 2}" width="${widths[i]}" height="${height}" rx="${height / 2}" fill="${ink}" fill-opacity="0.14" stroke="${ink}" stroke-opacity="0.85" stroke-width="1.5" />
        <circle cx="${column}" cy="${cy}" r="5" fill="${ink}" />
        <text x="${column + pad}" y="${cy + size * 0.35}">${escapeXml(chip.label)}</text>`,
    };
  });

  const hubMarkup = hub
    ? `<rect x="${hubLeft}" y="${MOTIF_MIDDLE - height / 2}" width="${hubWidth}" height="${height}" rx="${height / 2}" fill="${tint}" fill-opacity="0.28" stroke="${tint}" stroke-width="2" />
       <text x="${hubLeft + pad}" y="${MOTIF_MIDDLE + size * 0.35}">${escapeXml(hub)}</text>`
    : `<circle cx="${hubLeft}" cy="${MOTIF_MIDDLE}" r="9" fill="${tint}" />`;

  return `
    <defs>${spokes.map((s) => s.gradient).join('')}</defs>
    ${glow(spokes.map((s) => s.edge).join(''), 8)}
    <g font-family="IBM Plex Sans" font-weight="500" font-size="${size}" fill="${color.paper}">
      ${spokes.map((s) => s.chip).join('')}
      ${hubMarkup}
    </g>
  `;
}

function bitsMotif(tint: string, { call, column, flags }: Motif<'bits'>) {
  const x = 744;
  const cellsX = x + 26;
  const count = 6;
  const pitch = 60;
  const top = 296;
  if (flags.length > count) throw new Error(`Share card bits motif shows ${count} bits, got ${flags.length} flags`);
  const value = flags.reduce((sum, { on }, bit) => sum + (on ? 2 ** bit : 0), 0);
  const cells = Array.from({ length: count }, (_, i) => {
    const flag = flags[count - 1 - i];
    const cx = cellsX + i * pitch;
    const box = flag?.on
      ? glow(`<rect x="${cx}" y="${top}" width="46" height="56" rx="4" fill="${tint}" />`, 0)
      : `<rect x="${cx}" y="${top}" width="46" height="56" rx="4" fill="none" stroke="${color.lineStrong}" stroke-width="2" />`;
    const digit = `<text x="${cx + 23}" y="${top + 38}" text-anchor="middle" font-size="26" fill="${flag?.on ? color.ground : color.quiet}">${flag?.on ? 1 : 0}</text>`;
    const name = flag
      ? `<text x="${cx + 23}" y="${top + 86}" text-anchor="middle" font-size="17" fill="${flag.on ? color.paper : color.quiet}">${escapeXml(flag.name)}</text>`
      : '';
    return box + digit + name;
  }).join('');

  return `
    <text x="${x}" y="${top - 28}" font-family="IBM Plex Mono" font-size="19" fill="${color.quiet}">${escapeXml(call)}</text>
    <g font-family="IBM Plex Mono">
      <text x="${x}" y="${top + 38}" font-size="26" fill="${color.quiet}">…</text>
      ${cells}
    </g>
    <text x="${x}" y="${top + 156}" font-family="Fraunces" font-weight="600" font-size="46" fill="${color.paper}">${escapeXml(`${column} = ${value}`)}</text>
  `;
}

function logMotif(tint: string, { lines }: Motif<'log'>) {
  const size = 21;
  const leading = 38;
  const pad = 28;
  const width = MOTIF_RIGHT - MOTIF_LEFT;
  const height = pad * 2 + (lines.length - 1) * leading + 14;
  const top = MOTIF_MIDDLE - height / 2;
  const text = lines.map(({ text, tone = 'plain' }, i) => {
    assertFits(text, mono, size, width - pad * 2);
    const y = top + pad + 14 + i * leading;
    const fill = tone === 'accent' ? tint : tone === 'plain' ? color.paper : color.quiet;
    const strike = tone === 'struck'
      ? `<rect x="${MOTIF_LEFT + pad}" y="${y - 7}" width="${measure(text, mono, size)}" height="2" fill="${color.quiet}" />`
      : '';
    return `<text x="${MOTIF_LEFT + pad}" y="${y}" fill="${fill}" xml:space="preserve">${escapeXml(text)}</text>${strike}`;
  }).join('');

  return `
    <rect x="${MOTIF_LEFT}" y="${top}" width="${width}" height="${height}" rx="12" fill="${color.surface}" fill-opacity="0.7" stroke="${color.line}" stroke-width="1.5" />
    <rect x="${MOTIF_LEFT}" y="${top + 18}" width="4" height="${height - 36}" rx="2" fill="${tint}" />
    <g font-family="IBM Plex Mono" font-size="${size}">${text}</g>
  `;
}

function motifMarkup(motif: CardMotif | undefined, seed: string, titleRight: number) {
  const tint = accents[motif?.accent ?? 'signal'];
  switch (motif?.motif) {
    case 'agents': return agentsMotif(tint, motif.agents);
    case 'bars': return barsMotif(tint, motif);
    case 'fan': return fanMotif(tint, motif, titleRight);
    case 'bits': return bitsMotif(tint, motif);
    case 'log': return logMotif(tint, motif);
    case 'path': return pathMotif(tint, motif.labels, seed);
    default: return pathMotif(tint, [], seed);
  }
}

/** Renders a 1200x630 PNG share card in the site's type, on the LinkedIn banner's ground. */
export async function renderShareCard({ eyebrow, title, detail, motif, seed = title }: ShareCardOptions) {
  const eyebrowText = eyebrow.toUpperCase();
  assertFits(eyebrowText, mono, 17, TEXT_WIDTH, 0.07);
  assertFits(detail, mono, 18, TEXT_WIDTH);

  const { size, lines } = fitTitle(title);
  const height = titleHeight(size, lines.length);
  const titleRight = TEXT_X + Math.max(...lines.map((line) => measure(line, display, size, TITLE_TRACKING)));
  const firstBaseline = (TITLE_TOP + TITLE_BOTTOM - height) / 2 + (display.capHeight / display.unitsPerEm) * size;
  const titleMarkup = lines
    .map((line, i) => `<text x="${TEXT_X}" y="${(firstBaseline + i * size * TITLE_LEADING).toFixed(1)}">${escapeXml(line)}</text>`)
    .join('');

  const svg = `
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="warm" cx="150" cy="600" r="640" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="${color.ember}" stop-opacity="0.5" />
          <stop offset="0.45" stop-color="${color.ember}" stop-opacity="0.12" />
          <stop offset="1" stop-color="${color.ember}" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="cool" cx="1200" cy="0" r="720" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="${color.cool}" stop-opacity="0.6" />
          <stop offset="0.5" stop-color="${color.cool}" stop-opacity="0.15" />
          <stop offset="1" stop-color="${color.cool}" stop-opacity="0" />
        </radialGradient>
        <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      <rect width="${WIDTH}" height="${HEIGHT}" fill="${color.ground}" />
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#warm)" />
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#cool)" />
      <rect width="${WIDTH}" height="8" fill="${color.signal}" />

      <text x="${TEXT_X}" y="72" font-family="Fraunces" font-weight="600" font-size="30" fill="${color.paper}">Mehboob Ali</text>
      <text x="${TEXT_X}" y="132" font-family="IBM Plex Mono" font-size="17" letter-spacing="1.2" fill="${color.signal}">${escapeXml(eyebrowText)}</text>
      <rect x="${TEXT_X}" y="150" width="160" height="3" fill="${color.signal}" />

      <g font-family="Fraunces" font-weight="600" font-size="${size}" letter-spacing="${(TITLE_TRACKING * size).toFixed(2)}" fill="${color.paper}">${titleMarkup}</g>

      <text x="${TEXT_X}" y="554" font-family="IBM Plex Mono" font-size="18" fill="${color.quiet}">${escapeXml(detail)}</text>
      <text x="${TEXT_X}" y="590" font-family="IBM Plex Mono" font-size="18" fill="${color.signal}">mehboob.dev</text>

      ${motifMarkup(motif, seed, titleRight)}
    </svg>
  `;

  const png = new Resvg(svg, {
    font: {
      fontFiles: [displayFile, monoFile, sansFile],
      loadSystemFonts: false,
      defaultFontFamily: 'IBM Plex Mono',
    },
  }).render();
  return png.asPng();
}
