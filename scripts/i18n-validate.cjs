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
