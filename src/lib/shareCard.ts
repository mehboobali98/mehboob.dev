import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

interface ShareCardOptions {
  eyebrow: string;
  title: string;
  detail: string;
  labels?: [string, string, string];
}

const WIDTH = 1200;
const HEIGHT = 630;

// Embed the same two faces used by the site so the generated PNG does not depend on
// whichever fonts happen to be installed on the build machine.
const displayFont = readFileSync(
  resolve(process.cwd(), 'node_modules/@fontsource-variable/fraunces/files/fraunces-latin-wonk-normal.woff2'),
).toString('base64');
const monoFont = readFileSync(
  resolve(process.cwd(), 'node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2'),
).toString('base64');

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function wrapTitle(title: string, maxCharacters = 19, maxLines = 3) {
  const words = title.trim().split(/\s+/);
  const lines: string[] = [];
  let line = '';

  for (const [wordIndex, word] of words.entries()) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= maxCharacters || !line) {
      line = candidate;
      continue;
    }

    lines.push(line);
    line = word;

    if (lines.length === maxLines - 1) {
      const rest = [line, ...words.slice(wordIndex + 1)].join(' ');
      line = rest.length > maxCharacters + 5
        ? `${rest.slice(0, maxCharacters + 2).trimEnd()}…`
        : rest;
      break;
    }
  }

  if (line) lines.push(line);
  return lines.slice(0, maxLines);
}

export async function renderShareCard({
  eyebrow,
  title,
  detail,
  labels = ['problem', 'decision', 'result'],
}: ShareCardOptions) {
  const lines = wrapTitle(title);
  const fontSize = lines.length === 1 ? 76 : lines.length === 2 ? 68 : 60;
  const lineHeight = fontSize * 0.98;
  const titleStart = lines.length === 1 ? 270 : lines.length === 2 ? 230 : 190;
  const titleMarkup = lines
    .map((line, index) => (
      `<text x="72" y="${titleStart + index * lineHeight}" class="title">${escapeXml(line)}</text>`
    ))
    .join('');

  const [first, second, third] = labels.map(escapeXml);
  const svg = `
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <style>
        @font-face {
          font-family: 'Share Display';
          src: url(data:font/woff2;base64,${displayFont}) format('woff2');
          font-weight: 100 900;
        }
        @font-face {
          font-family: 'Share Mono';
          src: url(data:font/woff2;base64,${monoFont}) format('woff2');
          font-weight: 400;
        }
        .title { font-family: 'Share Display', Georgia, serif; font-size: ${fontSize}px; font-weight: 760; fill: #F0EDE6; letter-spacing: -1.5px; }
        .mono { font-family: 'Share Mono', monospace; letter-spacing: 1.5px; }
      </style>

      <rect width="1200" height="630" fill="#07090C" />
      <rect x="0" y="0" width="1200" height="8" fill="#E0A84E" />

      <text x="72" y="72" font-family="'Share Display', Georgia, serif" font-size="30" font-weight="650" fill="#F0EDE6">Mehboob Ali</text>
      <text x="72" y="132" class="mono" font-size="15" fill="#E0A84E">${escapeXml(eyebrow.toUpperCase())}</text>
      <line x1="72" y1="151" x2="232" y2="151" stroke="#E0A84E" stroke-width="3" />

      ${titleMarkup}

      <text x="72" y="556" class="mono" font-size="16" fill="#8590A2">${escapeXml(detail)}</text>
      <text x="72" y="590" class="mono" font-size="14" fill="#E0A84E">mehboob.dev</text>

      <g opacity="0.75" stroke="#404A5A" stroke-width="2" fill="none">
        <path d="M746 170 L842 112 L938 160 L1090 102" />
        <path d="M714 336 L806 264 L918 306 L1030 218 L1140 276" />
        <path d="M806 264 L842 112 M918 306 L938 160 M1030 218 L1090 102" />
        <path d="M714 336 L784 474 L918 520 L1050 468 L1140 516" />
      </g>
      <g fill="#556274">
        <circle cx="746" cy="170" r="4" /><circle cx="842" cy="112" r="4" />
        <circle cx="938" cy="160" r="4" /><circle cx="1090" cy="102" r="4" />
        <circle cx="714" cy="336" r="4" /><circle cx="806" cy="264" r="4" />
        <circle cx="918" cy="306" r="4" /><circle cx="1030" cy="218" r="4" />
        <circle cx="1140" cy="276" r="4" /><circle cx="784" cy="474" r="4" />
        <circle cx="918" cy="520" r="4" /><circle cx="1050" cy="468" r="4" />
        <circle cx="1140" cy="516" r="4" />
      </g>

      <path d="M714 336 L806 264 L918 306 L1030 218" stroke="#E0A84E" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round" />
      <g fill="#E0A84E">
        <circle cx="714" cy="336" r="8" /><circle cx="806" cy="264" r="8" />
        <circle cx="918" cy="306" r="8" /><circle cx="1030" cy="218" r="8" />
      </g>
      <g class="mono" font-size="14" fill="#F0EDE6">
        <text x="730" y="329">${first}</text>
        <text x="822" y="257">${second}</text>
        <text x="934" y="299">${third}</text>
      </g>
    </svg>
  `;

  return sharp(Buffer.from(svg)).png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
}
