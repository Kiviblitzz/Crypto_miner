// Desktop-Version (Electron): node scripts/desktop.mjs dev | win | linux
//   dev    – Vite-Build, dann die App direkt aus dem Repo starten (HASHWERK_DEV=1: Entwicklerwerkzeuge mit F12)
//   win    – Ordner release/HASHWERK-win32-x64 (+ ZIP), linux – release/HASHWERK-linux-x64 (+ ZIP)
import { build } from 'vite';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'release');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const mode = process.argv[2];
const extra = process.argv.slice(3);

// Schriften für den Offline-Betrieb (index.html lädt sie sonst von Google Fonts; main.cjs leitet das auf diese Dateien um)
const FONTS = { nunito: [500, 600, 700, 800], fredoka: [500, 600, 700] };

async function buildGame() {
  await build({ root: ROOT, logLevel: 'warn' });
  const dst = path.join(ROOT, 'dist', '_fonts');
  fs.mkdirSync(dst, { recursive: true });
  for (const [fam, weights] of Object.entries(FONTS)) {
    const src = path.join(ROOT, 'node_modules', '@fontsource', fam);
    for (const w of weights) fs.copyFileSync(path.join(src, 'files', `${fam}-latin-${w}-normal.woff2`), path.join(dst, `${fam}-latin-${w}-normal.woff2`));
    fs.copyFileSync(path.join(src, 'LICENSE'), path.join(dst, `LICENSE-${fam}.txt`));
  }
}

function runDev() {
  const electron = require('electron');
  const args = ['.', ...extra];
  if (process.platform === 'linux' && process.getuid?.() === 0 && !args.includes('--no-sandbox')) args.push('--no-sandbox');
  const p = spawn(electron, args, { cwd: ROOT, stdio: 'inherit', env: { ...process.env, HASHWERK_DEV: process.env.HASHWERK_DEV ?? '1' } });
  p.on('exit', (code) => process.exit(code ?? 0));
}

// nur das, was die App braucht: package.json, electron/, dist/, steam/ und steamworks.js (nur die Binärdateien der Zielplattform)
function ignoreFor(platform) {
  const keep = ['/package.json', '/electron', '/dist', '/steam', '/node_modules', '/node_modules/steamworks.js'];
  const other = { win32: ['linux64', 'osx'], linux: ['win64', 'osx'] }[platform] || [];
  return (p) => {
    if (p === '') return false;
    if (keep.includes(p)) return false;
    if (p.startsWith('/node_modules/steamworks.js/')) {
      if (other.some((d) => p.startsWith(`/node_modules/steamworks.js/dist/${d}`))) return true;
      return /\.(lib|d\.ts|md)$/.test(p);
    }
    return !['/electron/', '/dist/', '/steam/'].some((d) => p.startsWith(d));
  };
}

function zipDir(dir) {
  const zip = `${dir}-${pkg.version}.zip`;
  fs.rmSync(zip, { force: true });
  const base = path.basename(dir), cwd = path.dirname(dir);
  let r = spawnSync('zip', ['-qry', zip, base], { cwd, stdio: 'inherit' });
  if (r.error && process.platform === 'win32') r = spawnSync('tar', ['-a', '-c', '-f', zip, base], { cwd, stdio: 'inherit' });
  if (r.error || r.status !== 0) { console.log('Hinweis: kein ZIP erstellt (zip/tar fehlt) – der Ordner reicht für Steam.'); return null; }
  return zip;
}

function check(dir, platform) {
  const exe = platform === 'win32' ? 'HASHWERK.exe' : 'HASHWERK';
  const res = path.join(dir, 'resources');
  const sw = path.join(res, 'app.asar.unpacked', 'node_modules', 'steamworks.js', 'dist', platform === 'win32' ? 'win64' : 'linux64');
  const need = [path.join(dir, exe), path.join(res, 'app.asar'),
    ...(platform === 'win32' ? ['steamworksjs.win32-x64-msvc.node', 'steam_api64.dll'] : ['steamworksjs.linux-x64-gnu.node', 'libsteam_api.so']).map((f) => path.join(sw, f))];
  const miss = need.filter((f) => !fs.existsSync(f));
  if (miss.length) { console.error('Fehlt im Paket:\n  ' + miss.join('\n  ')); process.exit(1); }
}

async function pack(platform) {
  const { packager } = require('@electron/packager');
  const electronVersion = require('electron/package.json').version;
  const [dir] = await packager({
    dir: ROOT,
    out: OUT,
    name: 'HASHWERK',
    executableName: 'HASHWERK',
    platform,
    arch: 'x64',
    electronVersion,
    appVersion: pkg.version,
    buildVersion: pkg.version,
    appCopyright: `© ${new Date().getFullYear()} HASHWERK`,
    icon: path.join(ROOT, 'electron', 'icons', platform === 'win32' ? 'hashwerk.ico' : 'hashwerk.png'),
    win32metadata: { CompanyName: 'HASHWERK', FileDescription: 'HASHWERK', ProductName: 'HASHWERK', InternalName: 'HASHWERK', OriginalFilename: 'HASHWERK.exe' },
    asar: { unpack: '*.{node,dll,so,dylib}' },
    prune: false,
    ignore: ignoreFor(platform),
    overwrite: true,
    quiet: true,
  });
  check(dir, platform);
  const zip = zipDir(dir);
  console.log(`Fertig: ${path.relative(ROOT, dir)}${zip ? ` und ${path.relative(ROOT, zip)}` : ''}`);
}

const targets = { win: 'win32', linux: 'linux' };
if (mode === 'dev') { await buildGame(); runDev(); }
else if (targets[mode]) { await buildGame(); await pack(targets[mode]); }
else { console.log('Aufruf: node scripts/desktop.mjs dev | win | linux'); process.exit(1); }
