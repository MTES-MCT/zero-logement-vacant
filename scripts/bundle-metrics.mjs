#!/usr/bin/env node
/**
 * Measures JS bundle metrics from a Vite build.
 *
 * Usage:
 *   node scripts/bundle-metrics.mjs [--save <label>] [--compare <file>]
 *
 * --save <label>   Write snapshot to bundle-metrics.<label>.json
 * --compare <file> Compare current build against a saved snapshot
 */

import { createReadStream, existsSync, readFileSync, writeFileSync } from 'fs';
import { readdir, stat } from 'fs/promises';
import { createGzip } from 'zlib';
import { join } from 'path';

const DIST_DIR = new URL('../frontend/dist', import.meta.url).pathname;
const ASSETS_DIR = join(DIST_DIR, 'assets');

async function gzipSize(filePath) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const gzip = createGzip({ level: 9 });
    createReadStream(filePath)
      .pipe(gzip)
      .on('data', (chunk) => (size += chunk.length))
      .on('end', () => resolve(size))
      .on('error', reject);
  });
}

function initialChunkNames() {
  const html = readFileSync(join(DIST_DIR, 'index.html'), 'utf8');
  // Extract all <script type="module" src="..."> and <link rel="modulepreload"> hrefs
  const matches = [
    ...html.matchAll(/(?:script[^>]+src|link[^>]+href)="\/assets\/([^"]+\.js)"/g)
  ];
  return new Set(matches.map((m) => m[1]));
}

async function measure() {
  if (!existsSync(ASSETS_DIR)) {
    console.error('No dist/assets found — run `yarn nx build frontend` first.');
    process.exit(1);
  }

  const initial = initialChunkNames();
  const files = (await readdir(ASSETS_DIR)).filter((f) => f.endsWith('.js'));

  const chunks = await Promise.all(
    files.map(async (name) => {
      const path = join(ASSETS_DIR, name);
      const { size } = await stat(path);
      const gz = await gzipSize(path);
      return { name, size, gz, initial: initial.has(name) };
    })
  );

  chunks.sort((a, b) => b.gz - a.gz);

  const sum = (arr, key) => arr.reduce((acc, c) => acc + c[key], 0);

  const total = { size: sum(chunks, 'size'), gz: sum(chunks, 'gz') };
  const initialChunks = chunks.filter((c) => c.initial);
  const initialTotal = { size: sum(initialChunks, 'size'), gz: sum(initialChunks, 'gz') };

  return {
    timestamp: new Date().toISOString(),
    chunkCount: chunks.length,
    initialChunkCount: initialChunks.length,
    total,
    initialTotal,
    chunks
  };
}

function fmt(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function printReport(metrics, label = 'Current build') {
  console.log(`\n── ${label} ─────────────────────────────────────`);
  console.log(`Chunks: ${metrics.chunkCount} total, ${metrics.initialChunkCount} initial`);
  console.log(`Total JS:   ${fmt(metrics.total.size).padStart(10)} raw   ${fmt(metrics.total.gz).padStart(10)} gz`);
  console.log(`Initial JS: ${fmt(metrics.initialTotal.size).padStart(10)} raw   ${fmt(metrics.initialTotal.gz).padStart(10)} gz`);
  console.log('\nTop 10 chunks (by gz):');
  metrics.chunks.slice(0, 10).forEach((c) => {
    const tag = c.initial ? '[initial]' : '[lazy]   ';
    console.log(`  ${tag}  ${fmt(c.gz).padStart(9)} gz    ${c.name}`);
  });
}

function printDiff(before, after) {
  const diffGz = after.initialTotal.gz - before.initialTotal.gz;
  const pct = ((diffGz / before.initialTotal.gz) * 100).toFixed(1);
  const sign = diffGz > 0 ? '+' : '';

  console.log('\n── Diff (before → after) ────────────────────────────');
  console.log(`Initial JS gz: ${fmt(before.initialTotal.gz)} → ${fmt(after.initialTotal.gz)}   ${sign}${fmt(diffGz)} (${sign}${pct}%)`);
  console.log(`Total JS gz:   ${fmt(before.total.gz)} → ${fmt(after.total.gz)}`);
  console.log(`Chunks:        ${before.chunkCount} → ${after.chunkCount}   (+${after.chunkCount - before.chunkCount} lazy chunks)`);
}

// ── main ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const saveIdx = args.indexOf('--save');
const compareIdx = args.indexOf('--compare');
const saveLabel = saveIdx !== -1 ? args[saveIdx + 1] : null;
const compareFile = compareIdx !== -1 ? args[compareIdx + 1] : null;

const metrics = await measure();
printReport(metrics, saveLabel ?? 'Current build');

if (saveLabel) {
  const outFile = `bundle-metrics.${saveLabel}.json`;
  writeFileSync(outFile, JSON.stringify(metrics, null, 2));
  console.log(`\nSnapshot saved → ${outFile}`);
}

if (compareFile) {
  if (!existsSync(compareFile)) {
    console.error(`Snapshot not found: ${compareFile}`);
    process.exit(1);
  }
  const before = JSON.parse(readFileSync(compareFile, 'utf8'));
  printDiff(before, metrics);
}
