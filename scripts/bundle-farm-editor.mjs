import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Local-only bundling. No Editor/MCP calls and no dependency installation.
// Usage: node scripts/bundle-farm-editor.mjs [path/to/esbuild/lib/main.js]
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const entry = 'src/features/farm-pc/scripts/motion.ts';
const output = 'storage/playcanvas-mcp/farm-motion.mjs';
const require = createRequire(import.meta.url);
const esbuildPath = process.argv[2] ? resolve(root, process.argv[2]) : require.resolve('esbuild');
const { build, version } = await import(pathToFileURL(esbuildPath).href);
const expected = {
  Sway: { scriptName: 'farmSway', attributes: ['amplitude', 'speed', 'phase'] },
  Pop: { scriptName: 'farmPop', attributes: ['duration', 'from', 'playOnStart'] },
  DoorOnSelect: { scriptName: 'farmDoor', attributes: ['openAngle', 'target'] },
  Lamp: { scriptName: 'farmLamp', attributes: ['intensity', 'glow'] },
  PlayFx: { scriptName: 'farmFx', attributes: ['kind', 'lift'] },
};
const result = await build({
  absWorkingDir: root,
  entryPoints: [entry],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  external: ['playcanvas'],
  target: 'es2022',
  minify: false,
  legalComments: 'inline',
  write: false,
  metafile: true,
  plugins: [
    {
      name: 'preserve-editor-attributes',
      setup(build) {
        build.onLoad({ filter: /motion\.ts$/ }, async ({ path }) => ({
          // esbuild removes ordinary JSDoc. Temporarily mark it as legal comment.
          contents: (await readFile(path, 'utf8')).replace(/\/\*\*(?=[\s\S]*?\*\/)/g, '/*!'),
          loader: 'ts',
        }));
      },
    },
  ],
});
let text = result.outputFiles[0].text.replace(/\/\*!/g, '/**');
for (const name of Object.keys(expected)) {
  const declaration = new RegExp(`var ${name} = class extends Script \\{`, 'g');
  assert.equal([...text.matchAll(declaration)].length, 1, `Expected one class expression: ${name}`);
  text = text.replace(declaration, `export class ${name} extends Script {`);
  // esbuild closes a class expression with }; rather than a declaration's }.
  const start = text.indexOf(`export class ${name} extends Script {`);
  const end = text.indexOf('\n};', start);
  assert.ok(end > start, `Missing class end: ${name}`);
  text = text.slice(0, end) + '\n}' + text.slice(end + 3);
}
// Avoid duplicate exports now that script classes are exported declarations.
text = text.replace(/export \{([\s\S]*?)\};/g, (_, members) => {
  const retained = members
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((name) => !Object.hasOwn(expected, name));
  return retained.length ? `export {\n  ${retained.join(',\n  ')}\n};` : '';
});
const classes = [...text.matchAll(/^export class (\w+) extends Script \{/gm)].map((m) => m[1]);
assert.deepEqual(classes, Object.keys(expected));
assert.equal([...text.matchAll(/\bclass\b[^\n]*extends Script/g)].length, 5);
assert.ok(!/\bvar\s+\w+\s*=\s*class\b/.test(text));
const checks = [];
for (const [name, spec] of Object.entries(expected)) {
  const start = text.indexOf(`export class ${name} extends Script {`);
  const end = text.indexOf('\n}', start);
  const body = text.slice(start, end);
  assert.ok(body.includes(`static scriptName = "${spec.scriptName}";`), `scriptName: ${name}`);
  const attributes = [...body.matchAll(/\/\*\*\s*@attribute[^]*?\*\/\s*(\w+)\s*=/g)].map(
    (m) => m[1],
  );
  assert.deepEqual(attributes, spec.attributes, `Attributes: ${name}`);
  checks.push({ className: name, ...spec });
}
const imports = Object.values(result.metafile.outputs).flatMap((item) => item.imports);
assert.ok(imports.length > 0);
assert.ok(imports.every((item) => item.external && item.path === 'playcanvas'));
assert.ok(!/(?:from\s*|import\s*\()['"]\.{1,2}\//.test(text));
await mkdir(resolve(root, dirname(output)), { recursive: true });
await writeFile(resolve(root, output), text);
const syntax = spawnSync(process.execPath, ['--check', resolve(root, output)], {
  encoding: 'utf8',
});
assert.ifError(syntax.error);
assert.equal(syntax.status, 0, syntax.stderr);
const report = {
  entry,
  output,
  esbuildVersion: version,
  format: 'esm',
  target: 'es2022',
  external: ['playcanvas'],
  classes: checks,
  checks: {
    moduleSyntax: true,
    directExportClasses: true,
    scriptNames: true,
    attributeComments: true,
    noRelativeImports: true,
  },
  editorParserVerified: false,
  runtimeVerified: false,
  parentFollowUp:
    'Verify registration of all five scripts and their attribute types in the Editor parser; then Launch and test event delivery, initial state, reduced motion and cleanup. No MCP/upload performed by this tool.',
};
await writeFile(
  resolve(root, 'storage/playcanvas-mcp/farm-motion.checks.json'),
  JSON.stringify(report, null, 2) + '\n',
);
console.log(JSON.stringify(report, null, 2));
