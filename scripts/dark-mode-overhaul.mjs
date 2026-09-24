#!/usr/bin/env node
/**
 * Dark Mode Black & Obsidian Architecture Overhaul (better-colors).
 * Remaps every hardcoded blue/navy hex to the true neutral carbon system:
 *   Canvas #09090B | Surface #121215 | Elevated #18181B | Border #202024/#2E2E34
 * index.css gets the same remap, plus the plan's dedicated scrollbar-thumb
 * value (#27272A) and an accent-aware scrollbar hover.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';

const SRC = join(process.cwd(), 'src');
const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : [/\.(tsx?|css)$/i.test(extname(p)) ? p : null].filter(Boolean);
  });

/* Component-level remap (semantic old -> new):
   Phase 1 — audit-listed families:
   #16171B elevated  -> #18181B   | #1C1E24 surface   -> #121215
   #262832 border    -> #2E2E34   | #121316 canvas    -> #09090B
   #14171F card      -> #121215   | #11151d sidebar   -> #09090B
   #12161e header    -> #09090B   | #121824 authpanel -> #121215
   #F3F4F6 old text  -> #F4F4F5
   Phase 2 — deep-sweep blue-tinted hexes across console views:
   #0d1017 canvas/wells -> #09090B   | #171b24 cards   -> #121215
   #141822/#11141c modals -> #18181B | #1A1B1F/#181d27 -> #18181B
   #05070b scrims     -> #000000   | #121722/#121926/#111722/#111622/#13171f -> #121215
   #0f1420/#0c1018/#0c1119/#090d14/#080a0f/#0f1115/#0f1318 -> #09090B
   Intentionally skipped (light-mode branches): #111827, #0f172a, #0B1020 */
const COMPONENT_MAP = [
  [/#16171b/ig, '#18181B'],
  [/#1c1e24/ig, '#121215'],
  [/#262832/ig, '#2E2E34'],
  [/#121316/ig, '#09090B'],
  [/#14171f/ig, '#121215'],
  [/#11151d/ig, '#09090B'],
  [/#12161e/ig, '#09090B'],
  [/#121824/ig, '#121215'],
  [/#f3f4f6/ig, '#F4F4F5'],
  [/#0d1017/ig, '#09090B'],
  [/#171b24/ig, '#121215'],
  [/#141822/ig, '#18181B'],
  [/#11141c/ig, '#18181B'],
  [/#1a1b1f/ig, '#18181B'],
  [/#181d27/ig, '#18181B'],
  [/#05070b/ig, '#000000'],
  [/#121926/ig, '#121215'],
  [/#121722/ig, '#121215'],
  [/#111722/ig, '#121215'],
  [/#111622/ig, '#121215'],
  [/#13171f/ig, '#121215'],
  [/#0f1420/ig, '#09090B'],
  [/#0c1018/ig, '#09090B'],
  [/#0c1119/ig, '#09090B'],
  [/#090d14/ig, '#09090B'],
  [/#080a0f/ig, '#09090B'],
  [/#0f1115/ig, '#09090B'],
  [/#0f1318/ig, '#09090B']
];

let filesChanged = 0;
for (const file of walk(SRC)) {
  const isCss = file.endsWith('index.css');
  const src = readFileSync(file, 'utf8');
  let out = src;

  if (isCss) {
    // Scrollbar thumbs use the plan's dedicated neutral before the generic border remap
    out = out.split('background: #282A34;').join('background: #27272A;');
    out = out.split('#282A34').join('#202024');
    out = out.split('#121316').join('#09090B');
    out = out.split('#1C1E24').join('#121215');
    out = out.split('#F3F4F6').join('#F4F4F5');
    out = out.replace(/#13171d/ig, '#121215'); // dark autofill wells
    out = out.split('background: #5B75F8;').join('background: var(--accent-primary);'); // scrollbar hover follows accent
  } else {
    for (const [re, to] of COMPONENT_MAP) out = out.replace(re, to);
  }

  if (out !== src) {
    const EOL = src.includes('\r\n') ? '\r\n' : '\n';
    writeFileSync(file, out.split(/\r?\n/).join(EOL), 'utf8');
    filesChanged++;
    console.log('remapped:', file.split(/[\\/]/).slice(-2).join('/'));
  }
}
console.log('Done.', filesChanged, 'files updated.');
