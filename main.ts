// Leonida Trophy Guide — the program that hands the guide in.
//
// What this file does, in plain terms: it takes the finished guide that
// lives beside it (the static app/ folder and the screenshots/ folder) and
// assembles the submission bundle in the output directory the grader
// provides. The bundle is three things: a copy of app/, a copy of
// screenshots/, and dossier.json, the summary the judge reads, written by
// the kit's own vendored library so the scorer can reproduce it byte for
// byte. Nothing here fetches anything, writes anything outside the output
// directory, or touches the network. Node 22, standard library only, plus
// the one vendored import below.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// and serve the guide itself with `node serve.ts` (http://localhost:8080).

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

// Where the guide lives, and where the bundle goes. Outside the grader's
// sandbox MAKEFUN_OUTPUT_DIR stands in for /output.
const entryRoot = fileURLToPath(new URL('.', import.meta.url));
const bundleDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
const appSource = join(entryRoot, 'app');
const shotsSource = join(entryRoot, 'screenshots');

function countEntries(folder: string): number {
  let total = 0;
  for (const name of readdirSync(folder)) {
    const path = join(folder, name);
    total += 1;
    if (statSync(path).isDirectory()) total += countEntries(path);
  }
  return total;
}

function assembleBundle(): { appEntries: number; shotFiles: string[] } {
  mkdirSync(bundleDir, { recursive: true });
  cpSync(appSource, join(bundleDir, 'app'), { recursive: true });
  const appEntries = countEntries(appSource);

  const shotFiles: string[] = [];
  if (existsSync(shotsSource)) {
    mkdirSync(join(bundleDir, 'screenshots'), { recursive: true });
    cpSync(shotsSource, join(bundleDir, 'screenshots'), { recursive: true });
    shotFiles.push(...readdirSync(shotsSource).filter((n) => statSync(join(shotsSource, n)).isFile()).sort());
  }
  return { appEntries, shotFiles };
}

const { appEntries, shotFiles } = assembleBundle();

// The scorer's own caps for this competition: the guide's text is capped,
// at most 4 screenshots of at most 256 KiB each, app/ at most 993 files and
// directories and 48 MiB. buildDossier enforces them and writes the dossier.
const dossier = buildDossier(bundleDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(bundleDir, 'dossier.json'), dossier);

console.log(
  `Leonida Trophy Guide bundled: ${appEntries} app entries, ${shotFiles.length} screenshots (${shotFiles.join(', ')}), dossier ${dossier.length} bytes -> ${bundleDir}`,
);
