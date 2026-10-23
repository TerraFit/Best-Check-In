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
  assert.match(markets, /ZA:\\s*'south-africa'/);
  assert.match(markets, /currency:\\s*'ZAR'/);
  assert.match(markets, /return COUNTRY_REGION\\[normalized\\] \\|\\| null/);
  assert.match(markets, /CR:\\s*'north-america'/);
  assert.match(markets, /MX:\\s*'north-america'/);
});

test('regional pricing treats South Africa as native ZAR pricing', () => {
  const pricing = read('src/config/pricing.ts');
  assert.match(pricing, /region === 'south-africa'/);
  assert.match(pricing, /currency: 'ZAR'/);
  assert.match(pricing, /return Math\\.round\\(zarAmount\\)/);
});

test('market context hydrates the initial GeoIP result before pricing can fall back to Africa', () => {
  const context = read('src/context/MarketContext.tsx');
  assert.match(context, /fastcheckin\\.detected\\.visitor/);
  assert.match(context, /initialDetected\\?\\.suggestedRegion \\|\\| 'africa'/);
  assert.match(context, /isSouthAfricanMarket: region === 'south-africa'/);
  assert.match(context, /detectionStatus/);
});

test('market chooser opens only after a non-South-African country is detected', () => {
  const context = read('src/context/MarketContext.tsx');
  assert.match(context, /if \\(suggestedRegion !== 'south-africa'\\) setChooserOpen\\(true\\)/);
  assert.match(context, /if \\(!data\\?\\.countryCode\\) \\{ setDetectionStatus\\('failed'\\); return; \\}/);
  assert.match(context, /\\.catch\\(\\(\\) => \\{ setDetectionStatus\\('failed'\\); \\}\\)/);
});

test('market selection is temporary until the visitor confirms it', () => {
  const context = read('src/context/MarketContext.tsx');
  const selector = read('src/components/GlobalMarketSelector.tsx');
  assert.match(context, /confirmationRegion/);
  assert.match(context, /setConfirmationRegion\\(nextRegion\\)/);
  assert.match(context, /localStorage\\.setItem\\(STORAGE_KEY, confirmationRegion\\)/);
  assert.match(context, /localStorage\\.setItem\\(CONFIRMED_KEY, 'true'\\)/);
  const declineBody = context.match(/const declineRegion = useCallback\\(\\(\\) => \\{([\\s\\S]*?)\\}, \\[confirmationRegion\\]\\);/)?.[1] || '';
  assert.ok(declineBody, 'declineRegion callback should be present');
  assert.match(declineBody, /localStorage\\.removeItem\\(STORAGE_KEY\\)/);
  assert.match(declineBody, /localStorage\\.removeItem\\(CONFIRMED_KEY\\)/);
  assert.doesNotMatch(declineBody, /localStorage\\.setItem/);
  assert.match(selector, /const regions: MarketRegion\\[\\] = \\['africa', 'europe', 'north-america', 'south-america', 'middle-east', 'asia', 'oceania'\\]/);
  assert.match(selector, /Do you want to make \\{confirmationName\\} your region\\?/);
  assert.match(selector, /onClick=\\{confirmRegion\\}/);
  assert.match(selector, /onClick=\\{declineRegion\\}/);
});

test('language detection covers supported local languages and English fallback', () => {
  const language = read('src/i18n/languageService.ts');
  assert.match(language, /detectLanguageForCountry/);
  assert.match(language, /ZA:\\s*'en'/);
  assert.match(language, /DE:\\s*'de'/);
  assert.match(language, /FR:\\s*'fr'/);
  assert.match(language, /COUNTRY_LANGUAGE_MAP\\[country\\] \\|\\| 'en'/);
  assert.match(language, /MULTILINGUAL_COUNTRIES = \\['CH', 'BE', 'CA', 'SG', 'LU'\\]/);
  assert.match(language, /MX:\\s*'es'/);
  assert.match(language, /CR:\\s*'es'/);
  assert.match(language, /EG:\\s*'ar'/);
});

test('first render bootstraps visitor context before the React app', () => {
  const main = read('src/main.tsx');
  assert.match(main, /fastcheckin\\.detected\\.visitor/);
  assert.match(main, /initLanguage\\(visitor\\?\\.countryCode \\|\\| null\\)/);
  assert.ok(main.indexOf('initLanguage') < main.indexOf('ReactDOM.createRoot'));
});
