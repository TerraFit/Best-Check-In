import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('South Africa is a first-class market and maps ZA directly to it', () => {
  const markets = read('src/config/markets.ts');
  assert.match(markets, /'south-africa'/);
  assert.match(markets, /ZA:\s*'south-africa'/);
  assert.match(markets, /currency:\s*'ZAR'/);
  assert.match(markets, /return COUNTRY_REGION\[normalized\] \|\| null/);
});

test('regional pricing treats South Africa as native ZAR pricing', () => {
  const pricing = read('src/config/pricing.ts');
  assert.match(pricing, /region === 'south-africa'/);
  assert.match(pricing, /currency: 'ZAR'/);
  assert.match(pricing, /return Math\.round\(zarAmount\)/);
});

test('market context hydrates the initial GeoIP result before pricing can fall back to Africa', () => {
  const context = read('src/context/MarketContext.tsx');
  assert.match(context, /fastcheckin\.detected\.visitor/);
  assert.match(context, /initialDetected\?\.suggestedRegion \|\| 'africa'/);
  assert.match(context, /isSouthAfricanMarket: region === 'south-africa'/);
  assert.match(context, /detectionStatus/);
});

test('language detection includes country defaults and English fallback', () => {
  const language = read('src/i18n/languageService.ts');
  assert.match(language, /detectLanguageForCountry/);
  assert.match(language, /ZA:\s*'en'/);
  assert.match(language, /DE:\s*'de'/);
  assert.match(language, /FR:\s*'fr'/);
  assert.match(language, /COUNTRY_LANGUAGE_MAP\[country\] \|\| 'en'/);
  assert.match(language, /\['CH', 'BE', 'CA'\]/);
});

test('first render bootstraps visitor context before the React app', () => {
  const main = read('src/main.tsx');
  assert.match(main, /fastcheckin\.detected\.visitor/);
  assert.match(main, /initLanguage\(visitor\?\.countryCode \|\| null\)/);
  assert.ok(main.indexOf('initLanguage') < main.indexOf('ReactDOM.createRoot'));
});
