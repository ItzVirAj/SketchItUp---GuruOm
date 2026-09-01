#!/usr/bin/env node
/**
 * UI Polish Remediation (better-ui audit) — bulk pass over src/**.
 *
 * Fix 2 — Replace `transition-all` with scoped transitions:
 *   - Line animates an inline `width` (progress bars)  -> `transition-[width]`
 *   - Line already carries an explicit `duration-*`    -> arbitrary property list
 *     (keeps the line's own duration; no cascade ambiguity)
 *   - Otherwise                                        -> `transition-ui`
 *     (custom @utility in index.css: explicit property list + 150ms + ease-out)
 *
 * Fix 3 — Standardize press feedback to `active:scale-[0.96]`:
 *   - active:scale-95 / active:scale-98 / active:scale-[0.97..0.99] -> active:scale-[0.96]
 *   - Lines gaining the token without any transition utility get
 *     `transition-transform duration-150 ease-out` injected.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';

const SRC = join(process.cwd(), 'src');
const ARB = 'transition-[color,background-color,border-color,outline-color,box-shadow,opacity,transform,translate,scale,rotate,filter,backdrop-filter]';

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : [/\.tsx?$/i.test(extname(p)) ? p : null].filter(Boolean);
  });

const stats = { filesChanged: 0, transitionAll: 0, widthBars: 0, keptDurations: 0, activeScale: 0, injectedTransition: 0 };

for (const file of walk(SRC)) {
  const src = readFileSync(file, 'utf8');
  const EOL = src.includes('\r\n') ? '\r\n' : '\n';
  const lines = src.split(/\r?\n/);
  let changed = false;

  for (let i = 0; i < lines.length; i++) {
    const orig = lines[i];
    if (!orig.includes('transition-all') && !/active:scale-(?:95|98|\[0\.9[789]\])/.test(orig)) continue;
    let line = orig;

    /* ---------------- Fix 2: scope transitions ---------------- */
    if (line.includes('transition-all')) {
      const ctx = [lines[i - 1], line, lines[i + 1]].filter(Boolean).join(' ');
      if (/width:/.test(ctx)) {
        // Progress-bar style width animations must keep transitioning width
        line = line.replace(/\btransition-all\b/g, 'transition-[width]');
        stats.widthBars++;
      } else if (/(?:^|[\s"'`])duration-(?:\d+|\[[^\]]+\])/.test(line)) {
        // Preserve the author's explicit duration; scope only the property list
        line = line.replace(/\btransition-all\b/g, ARB);
        stats.keptDurations++;
      } else {
        line = line.replace(/\btransition-all\b/g, 'transition-ui');
      }
      stats.transitionAll++;
    }

    /* ---------------- Fix 3: tactile press feedback ---------------- */
    if (/active:scale-(?:95|98|\[0\.9[789]\])/.test(line)) {
      line = line
        .replace(/\bactive:scale-95\b/g, 'active:scale-[0.96]')
        .replace(/\bactive:scale-98\b/g, 'active:scale-[0.96]')
        .replace(/\bactive:scale-\[0\.9[789]\]/g, 'active:scale-[0.96]');
      stats.activeScale++;
      if (!/transition/.test(line)) {
        line = line.replace('active:scale-[0.96]', 'transition-transform duration-150 ease-out active:scale-[0.96]');
        stats.injectedTransition++;
      }
    }

    if (line !== orig) {
      lines[i] = line;
      changed = true;
    }
  }

  if (changed) {
    writeFileSync(file, lines.join(EOL), 'utf8');
    stats.filesChanged++;
  }
}

console.log('UI polish remediation complete:', JSON.stringify(stats, null, 2));
