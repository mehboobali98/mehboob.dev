import { resolve } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import * as fontkit from 'fontkit';
import type { CardMotif } from './cardMotif';

interface ShareCardOptions {
  eyebrow: string;
  title: string;
  detail: string;
  motif?: CardMotif;
  seed?: string;
}

const WIDTH = 1200;
const HEIGHT = 630;
const TEXT_X = 72;
const TEXT_WIDTH = 600;
const TITLE_TOP = 190;
const TITLE_BOTTOM = 508;
const TITLE_SIZES = [72, 66, 60, 54, 48];
const TITLE_LEADING = 1.04;
const TITLE_TRACKING = -0.02;

const fontPath = (file: string) => resolve(process.cwd(), 'src/assets/fonts', file);
const displayFile = fontPath('Fraunces-SemiBold-Wonk.ttf');
const monoFile = fontPath('IBMPlexMono-Regular.ttf');
const display = fontkit.openSync(displayFile) as fontkit.Font;
const mono = fontkit.openSync(monoFile) as fontkit.Font;

const color = {
  ground: '#07090C',
  line: '#404A5A',
  lineStrong: '#556274',
  quiet: '#8590A2',
  paper: '#F0EDE6',
  signal: '#E0A84E',
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

function assertFits(text: string, font: fontkit.Font, size: number, tracking = 0) {
  if (measure(text, font, size, tracking) > TEXT_WIDTH) {
    throw new Error(`Share card text is wider than ${TEXT_WIDTH}px: "${text}"`);
  }
}

function hash(value: string) {
  let h = 2166136261;
  for (const char of value) h = Math.imul(h ^ char.charCodeAt(0), 16777619) >>> 0;
  return h;
}

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

function pathMotif(labels: readonly string[] = [], seed = '') {
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
    <path d="${highlight}" stroke="${color.signal}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round" />
    <g fill="${color.signal}">${stops}</g>
    <g font-family="IBM Plex Mono" font-size="19" fill="${color.paper}" stroke="${color.ground}" stroke-width="6" paint-order="stroke">${text}</g>
  `;
}

function agentsMotif(agents: Extract<CardMotif, { motif: 'agents' }>['agents']) {
  const x = 772;
  const rows = [204, 322, 470];
  const wall = 396;
  const nodes = agents
    .map(({ name, note }, i) => {
      const y = rows[i];
      const node = i < 2
        ? `<circle cx="${x}" cy="${y}" r="11" fill="${color.signal}" />`
        : `<circle cx="${x}" cy="${y}" r="10" fill="${color.ground}" stroke="${color.paper}" stroke-width="3" />`;
      return `
        ${node}
        <text x="${x + 32}" y="${y - 2}" font-size="28" fill="${color.paper}">${escapeXml(name)}</text>
        <text x="${x + 32}" y="${y + 30}" font-size="20" fill="${color.quiet}">${escapeXml(note)}</text>
      `;
    })
    .join('');

  return `
    <path d="M${x} ${rows[0]} L${x} ${rows[1]}" stroke="${color.signal}" stroke-width="4" stroke-linecap="round" />
    <path d="M${x} ${rows[1]} L${x} ${wall - 14}" stroke="${color.signal}" stroke-width="4" stroke-linecap="round" stroke-dasharray="2 10" />
    <path d="M736 ${wall} L1136 ${wall}" stroke="${color.lineStrong}" stroke-width="3" stroke-dasharray="14 10" />
    <g font-family="IBM Plex Mono">${nodes}</g>
  `;
}

function barsMotif({ before, after }: Extract<CardMotif, { motif: 'bars' }>) {
  const x = 740;
  const full = 380;
  const afterWidth = Math.max((after.value / before.value) * full, 6);
  const row = (label: string, caption: string, y: number, width: number, fill: string, ink: string) => `
    <text x="${x}" y="${y}" font-family="Fraunces" font-weight="600" font-size="44" fill="${ink}">${escapeXml(label)}</text>
    <text x="${x + measure(label, display, 44) + 16}" y="${y}" font-family="IBM Plex Mono" font-size="20" fill="${color.quiet}">${escapeXml(caption)}</text>
    <rect x="${x}" y="${y + 22}" width="${width}" height="32" rx="3" fill="${fill}" />
  `;

  return `
    ${row(before.label, 'before', 262, full, color.lineStrong, color.paper)}
    ${row(after.label, 'after', 412, afterWidth, color.signal, color.signal)}
  `;
}

function motifMarkup(motif: CardMotif | undefined, seed: string) {
  switch (motif?.motif) {
    case 'agents': return agentsMotif(motif.agents);
    case 'bars': return barsMotif(motif);
    case 'path': return pathMotif(motif.labels, seed);
    default: return pathMotif([], seed);
  }
}

/** Renders a 1200x630 PNG share card in the site's type and palette. */
export async function renderShareCard({ eyebrow, title, detail, motif, seed = title }: ShareCardOptions) {
  const eyebrowText = eyebrow.toUpperCase();
  assertFits(eyebrowText, mono, 17, 0.07);
  assertFits(detail, mono, 18);

  const { size, lines } = fitTitle(title);
  const height = titleHeight(size, lines.length);
  const firstBaseline = (TITLE_TOP + TITLE_BOTTOM - height) / 2 + (display.capHeight / display.unitsPerEm) * size;
  const titleMarkup = lines
    .map((line, i) => `<text x="${TEXT_X}" y="${(firstBaseline + i * size * TITLE_LEADING).toFixed(1)}">${escapeXml(line)}</text>`)
    .join('');

  const svg = `
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="glow" cx="930" cy="300" r="440" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="${color.signal}" stop-opacity="0.10" />
          <stop offset="1" stop-color="${color.signal}" stop-opacity="0" />
        </radialGradient>
      </defs>

      <rect width="${WIDTH}" height="${HEIGHT}" fill="${color.ground}" />
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)" />
      <rect width="${WIDTH}" height="8" fill="${color.signal}" />

      <text x="${TEXT_X}" y="72" font-family="Fraunces" font-weight="600" font-size="30" fill="${color.paper}">Mehboob Ali</text>
      <text x="${TEXT_X}" y="132" font-family="IBM Plex Mono" font-size="17" letter-spacing="1.2" fill="${color.signal}">${escapeXml(eyebrowText)}</text>
      <rect x="${TEXT_X}" y="150" width="160" height="3" fill="${color.signal}" />

      <g font-family="Fraunces" font-weight="600" font-size="${size}" letter-spacing="${(TITLE_TRACKING * size).toFixed(2)}" fill="${color.paper}">${titleMarkup}</g>

      <text x="${TEXT_X}" y="554" font-family="IBM Plex Mono" font-size="18" fill="${color.quiet}">${escapeXml(detail)}</text>
      <text x="${TEXT_X}" y="590" font-family="IBM Plex Mono" font-size="18" fill="${color.signal}">mehboob.dev</text>

      ${motifMarkup(motif, seed)}
    </svg>
  `;

  const png = new Resvg(svg, {
    font: { fontFiles: [displayFile, monoFile], loadSystemFonts: false, defaultFontFamily: 'IBM Plex Mono' },
  }).render();
  return png.asPng();
}
