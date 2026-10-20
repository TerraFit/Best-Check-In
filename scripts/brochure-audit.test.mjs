import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const catalog = readFileSync(new URL('../src/i18n/brochureTranslations.ts', import.meta.url), 'utf8');
const component = readFileSync(new URL('../src/components/FastCheckInBrochure.tsx', import.meta.url), 'utf8');
const languages = ['af', 'de', 'fr', 'it', 'pt', 'es', 'nl', 'ru', 'zh', 'ar', 'he'];
const requiredBrochureLabels = [
  'FastCheckIn · Product Brochure',
  'Print / Save as PDF',
  'AMERICAS',
  'EUROPE',
  'SOUTHERN AFRICA',
  'ASIA',
  '01 / The business case',
  '02 / Why FastCheckIn',
  'From insight to action',
  'Possible insight',
  'Question to consider',
  'Next steps',
  'FastCheckIn perspective:',
  'Request a demonstration',
  'Scan to learn more',
];

test('all supported non-English brochure locales translate core section labels', () => {
  for (const language of languages) {
    const start = catalog.indexOf(`  ${language}: {`);
    assert.notEqual(start, -1, `missing locale block: ${language}`);
    const commaEnd = catalog.indexOf('\n  },', start);
    const finalEnd = catalog.indexOf('\n  }\n};', start);
    const end = commaEnd >= 0 && (finalEnd < 0 || commaEnd < finalEnd) ? commaEnd : finalEnd;
    assert.ok(end > start, `could not locate locale block end: ${language}`);
    const block = catalog.slice(start, end);
    for (const label of requiredBrochureLabels) {
      assert.ok(block.includes(JSON.stringify(label) + ':'), `${language} is missing translation for: ${label}`);
    }
  }
});

test('translation preserves whitespace around exact text-node replacements', () => {
  assert.ok(component.includes(String.raw`value.match(/^\s*/)`));
  assert.ok(component.includes(String.raw`value.match(/\s*$/)`));
  assert.ok(!component.includes(String.raw`value.match(/^\\s`));
  assert.ok(!component.includes(String.raw`value.match(/\\s*$/)`));
});

test('regional pricing is derived from the shared pricing engine', () => {
  assert.ok(component.includes('getRegionalPricing(region, southAfrican, fxRates)'));
  assert.ok(component.includes('pricing.prices[index]?.monthly'));
  assert.ok(component.includes('pricing.prices[index]?.yearly'));
});

test('brochure translation catalog has no duplicate keys in any locale', () => {
  for (let index = 0; index < languages.length; index += 1) {
    const language = languages[index];
    const start = catalog.indexOf('  ' + language + ': {');
    const nextLanguage = languages[index + 1];
    const end = nextLanguage ? catalog.indexOf('  ' + nextLanguage + ': {', start) : catalog.indexOf('\n};', start);
    assert.ok(start >= 0 && end > start, 'could not locate locale block: ' + language);
    const block = catalog.slice(start, end);
    const keys = [...block.matchAll(/^\s*(['"])(.*?)\1\s*:/gm)].map((match) => match[2]);
    const seen = new Set();
    const duplicates = new Set();
    for (const key of keys) { if (seen.has(key)) duplicates.add(key); seen.add(key); }
    assert.deepEqual([...duplicates], [], language + ' contains duplicate translation keys');
  }
});

test('marketing-download monthly price uses the selected language label', () => {
  assert.ok(component.includes('BROCHURE_COPY[language].perMonth'));
  assert.ok(!component.includes('formatPrice(marketingMonthly, language)}/month'));
});
