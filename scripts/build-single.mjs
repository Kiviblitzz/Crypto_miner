// Baut eine einzelne, eigenständige HTML-Datei aus dist/ (zum Doppelklicken oder Teilen).
// Aufruf: npm run build:single  → play/HASHWERK.html
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
let html = readFileSync(join(dist, 'index.html'), 'utf8');
const esc = (s) => s.replace(/<\/script/gi, '<\\/script');

html = html.replace(/<script type="module" crossorigin src="\.?\/?([^"]+)"><\/script>/g, (_, src) => `<script type="module">${esc(readFileSync(join(dist, src), 'utf8'))}</script>`);
html = html.replace(/<script src="\.?\/?(boot-guard\.js)"><\/script>/, (_, src) => `<script>${esc(readFileSync(join(dist, src), 'utf8'))}</script>`); // Startschutz (public/boot-guard.js)
html = html.replace(/<link rel="stylesheet" crossorigin href="\.?\/?([^"]+)">/g, (_, href) => `<style>${readFileSync(join(dist, href), 'utf8')}</style>`);
// Modul-Script ans Ende des Bodys, damit das DOM bereits existiert
const m = html.match(/<script type="module">[\s\S]*?<\/script>/);
if (m) { html = html.replace(m[0], () => ''); html = html.replace('</body>', () => `${m[0]}\n</body>`); }

mkdirSync('play', { recursive: true });
writeFileSync('play/HASHWERK.html', html);
console.log('play/HASHWERK.html', (html.length / 1024).toFixed(0), 'KB');
