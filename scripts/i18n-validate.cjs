#!/usr/bin/env node
/**
 * i18n validation script for FastCheckIn / Best-Check-In
 * Discovers t('key') / t("key") usages and verifies every key exists
 * in all 12 supported language files. Exits non-zero on missing keys.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const TRANSLATIONS_DIR = path.join(SRC, 'i18n', 'translations');
const SUPPORTED = ['en', 'af', 'de', 'fr', 'nl', 'pt', 'es', 'ru', 'zh', 'ar', 'he', 'it'];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (['node_modules', 'dist', '.git'].includes(name)) continue;
      walk(p, files);
    } else if (/\.(tsx?|jsx?)$/.test(name) && !name.endsWith('.d.ts')) {
      files.push(p);
    }
  }
  return files;
}

function extractKeysFromCode() {
  const files = walk(SRC);
  const keys = new Set();
  const keyRegex = /\bt\(\s*['"]([a-zA-Z0-9_]+)['"]/g;
  for (const file of files) {
    if (file.includes(`${path.sep}i18n${path.sep}`)) continue;
    const content = fs.readFileSync(file, 'utf8');
    let m;
    while ((m = keyRegex.exec(content)) !== null) {
      keys.add(m[1]);
    }
  }
  return keys;
}

function loadLanguageKeys(lang) {
  const file = path.join(TRANSLATIONS_DIR, `${lang}.json`);
  if (!fs.existsSync(file)) {
    return { missingFile: true, keys: new Set() };
  }
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { missingFile: false, keys: new Set(Object.keys(data)) };
  } catch (e) {
    console.error(`Failed to parse ${file}:`, e.message);
    return { missingFile: true, keys: new Set() };
  }
}


// Target Report/Analytics UI files for residual hard-coded English labels.
// This is intentionally narrow to avoid false positives across the whole app.
const REPORT_ANALYTICS_GLOBS = [
  'src/pages/tabs/ReportsTab.tsx',
  'src/components/analytics/RoomPerformancePanel.tsx',
  'src/components/analytics/TravelPatternsCard.tsx',
  'src/components/analytics/VisitorOriginExplorer.tsx',
  'src/components/analytics/geo/GeographicMapViewport.tsx',
  'src/components/dashboard/GuestOriginsChart.tsx',
  'src/components/dashboard/ReferralSourcesChart.tsx',
  'src/components/dashboard/LengthOfStayChart.tsx',
];

// High-signal phrases that must not appear as raw JSX text in Report UI.
const FORBIDDEN_PHRASES = [
  'Room Performance',
  'Guest Origins by Country',
  'How Guests Found You',
  'Length of Stay Distribution',
  'Visitor Origin Explorer',
  'Interactive Map Engine',
  'Property utilisation',
  'Guest density',
  'Arriving From',
  'Going To',
  'Most guests stay',
  'nights sold',
  'of property nights',
  'historical name',
  'limited sample',
  'pp vs property',
  'Room nights / sellable nights',
  'SA / International',
  'Snapshot PDF',
  'BI Report',
];

function scanReportHardcoded() {
  const hits = [];
  for (const rel of REPORT_ANALYTICS_GLOBS) {
    const file = path.join(ROOT, rel);
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split(/\r?\n/);
    lines.forEach((line, idx) => {
      // skip pure imports and comments
      const trimmed = line.trim();
      if (trimmed.startsWith('import ') || trimmed.startsWith('//') || trimmed.startsWith('*')) return;
      // skip lines that already go through t(
      if (/\bt\s*\(/.test(line)) return;
      for (const phrase of FORBIDDEN_PHRASES) {
        if (line.includes(phrase)) {
          hits.push({ file: rel, line: idx + 1, phrase, sample: trimmed.slice(0, 120) });
        }
      }
    });
  }
  return hits;
}


function main() {
  console.log('🔍 FastCheckIn i18n validation\n');

  const usedKeys = extractKeysFromCode();
  console.log(`Keys referenced in application code: ${usedKeys.size}`);

  let totalMissing = 0;

  for (const lang of SUPPORTED) {
    const { missingFile, keys } = loadLanguageKeys(lang);
    if (missingFile) {
      console.error(`❌ ${lang}: translation file missing or invalid`);
      totalMissing += usedKeys.size;
      continue;
    }
    const missing = [...usedKeys].filter(k => !keys.has(k)).sort();
    totalMissing += missing.length;
    if (missing.length === 0) {
      console.log(`✅ ${lang}: 0 missing (${keys.size} keys in file)`);
    } else {
      console.log(`❌ ${lang}: ${missing.length} missing`);
      missing.slice(0, 20).forEach(k => console.log(`   - ${k}`));
      if (missing.length > 20) console.log(`   ... and ${missing.length - 20} more`);
    }
  }

  const en = loadLanguageKeys('en');
  if (!en.missingFile) {
    const orphans = [...en.keys].filter(k => !usedKeys.has(k)).sort();
    console.log(`\nℹ️  Orphaned keys in en.json (present but not referenced): ${orphans.length}`);
  }

  const hardHits = scanReportHardcoded();
  if (hardHits.length) {
    console.log(`\n❌ Report/Analytics hard-coded UI phrases: ${hardHits.length}`);
    hardHits.slice(0, 30).forEach(h => {
      console.log(`   - ${h.file}:${h.line} “${h.phrase}”`);
    });
    totalMissing += hardHits.length;
  } else {
    console.log('\n✅ Report/Analytics targeted hard-coded phrase scan: clean');
  }

  console.log('\n---');
  if (totalMissing === 0) {
    console.log('✅ RESULT: 0 missing translation keys across all 12 languages');
    process.exit(0);
  } else {
    console.log(`❌ RESULT: ${totalMissing} missing key occurrences across languages`);
    process.exit(1);
  }
}

main();
