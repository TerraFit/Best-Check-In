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
  assert.match(component, /value\.match\(/);
  assert.match(component, /value\.match\(\/\^\\s\*\//);
  assert.match(component, /value\.match\(\/\\s\*\$\//);
  assert.doesNotMatch(component, /value\.match\(\/\^\\\\s/);
  assert.doesNotMatch(component, /value\.match\(\/\\\\s\*\$\//);
});

test('regional price replacements use a whitespace-aware currency pattern', () => {
  assert.match(component, /new RegExp\(\`R\\\\s\*/);
  assert.match(component, /getRegionalPricing\(region, southAfrican, fxRates\)/);
});
