// Wandelt play/HASHWERK.html in eine Seite für das claude.ai-Artifact um (ohne eigenes html/head/body-Gerüst).
import { readFileSync, writeFileSync } from 'node:fs';
const [, , src = 'play/HASHWERK.html', out = 'play/hashwerk-artifact.html'] = process.argv;
let html = readFileSync(src, 'utf8');
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];
const styles = [...head.matchAll(/<style>[\s\S]*?<\/style>/g)].map((m) => m[0]).join('\n');
const scripts = [...head.matchAll(/<script type="module">[\s\S]*?<\/script>/g)].map((m) => m[0]).join('\n');
const page = `<title>HASHWERK</title>
<style>:root{color-scheme:dark}html,body{height:100%;background:#0b0e13}</style>
${styles}
${body}
${scripts}
`;
writeFileSync(out, page);
console.log(out, (page.length / 1024).toFixed(0), 'KB');
