// Fails if the source (or the production bundle, when present) contains SVG
// animation: SMIL tags, stroke-dash tricks, or CSS/JS animating svg/path nodes.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const targets = [join(root, 'src'), join(root, 'dist')].filter((p) => existsSync(p));

const RULES = [
  { name: 'SMIL <animate*> element', re: /<animate(Transform|Motion)?[\s>]/i },
  { name: 'SMIL <set> element', re: /<set\s[^>]*attributeName/i },
  // Any stroke-dash usage in our own code or CSS is suspicious; bundled JS legitimately
  // contains React DOM's attribute-name table, so there only animated usage counts.
  {
    name: 'stroke-dash usage',
    re: /stroke-?dash(array|offset)/i,
    skip: (p) => p.includes('dist') && p.endsWith('.js'),
  },
  {
    name: 'stroke-dash animation in bundle',
    re: /(@keyframes[^}]*|\.animate\(\s*\[[^\]]*)stroke-?dash/i,
  },
  {
    name: 'CSS animation on svg/path',
    re: /(^|[\s,}>])(svg|path|circle|polyline|polygon|line|g)(\s|\.|:|\[)[^{}]*\{[^}]*(animation|transition)\s*:/im,
  },
  {
    name: 'JS animating svg nodes',
    re: /querySelector(All)?\(\s*['"`][^'"`]*\b(svg|path)\b[^)]*\)\s*\.animate/i,
  },
  { name: 'SVG <animate> via createElementNS', re: /createElementNS\([^)]*svg[^)]*['"`]animate/i },
];

const EXT = new Set(['.ts', '.tsx', '.css', '.js', '.mjs', '.html']);
const problems = [];
let scanned = 0;

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (EXT.has(extname(p))) {
      scanned++;
      const text = readFileSync(p, 'utf8');
      for (const rule of RULES) {
        if (rule.skip?.(p)) continue;
        if (rule.re.test(text)) problems.push(`${relative(root, p)}: ${rule.name}`);
      }
    }
  }
}

targets.forEach(walk);

if (problems.length) {
  console.error('SVG animation check failed:\n' + problems.map((p) => `  - ${p}`).join('\n'));
  process.exit(1);
}
console.log(`SVG animation check passed (${scanned} files scanned, no SVG animation found).`);
