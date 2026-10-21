import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calculateSubscriptionMonthlyPrice, calculateSubscriptionAnnualPrice } from '../src/config/pricing-engine.js';

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
      assert.ok(block.includes("'" + label + "':") || block.includes('"' + label + '":'), `${language} is missing translation for: ${label}`);
    }
  }
});

test('translation preserves whitespace around exact text-node replacements', () => {
  assert.ok(component.includes('value.match(/^\\s*/)'));
  assert.ok(component.includes('value.match(/\\s*$/)'));
  assert.ok(!component.includes('value.match(/^\\\\s'));
  assert.ok(!component.includes('value.match(/\\\\s*$/)'));
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

test('brochure translation catalog includes newly audited actions and dashboard labels', () => {
  const required = [
    '↓ Download HTML',
    'Explore FastCheckIn',
    'Ask for a demo',
    'GUEST ORIGIN OVERVIEW',
    'Returning guests can confirm or update existing details',
    '12-language experience:',
    'Occupancy',
    'Total guests',
    'Illustrative example',
    'Average stay',
  ];
  for (const language of languages) {
    const start = catalog.indexOf(`  ${language}: {`);
    const commaEnd = catalog.indexOf('\n  },', start);
    const finalEnd = catalog.indexOf('\n  }\n};', start);
    const end = commaEnd >= 0 && (finalEnd < 0 || commaEnd < finalEnd) ? commaEnd : finalEnd;
    const block = catalog.slice(start, end);
    for (const label of required) {
      assert.ok(
        block.includes("'" + label + "':") || block.includes('"' + label + '":'),
        `${language} is missing translation for: ${label}`,
      );
    }
  }
});

test('English brochure copy replaces obsolete fixed room caps with open-ended thresholds', () => {
  const start = catalog.indexOf('  en: {');
  assert.notEqual(start, -1, 'missing English brochure corrections');
  const end = catalog.indexOf('\n  },', start);
  const block = catalog.slice(start, end);
  assert.ok(block.includes('"Up to 5 rooms": "From 1 room"'));
  assert.ok(block.includes('"Up to 10 rooms": "6+ rooms"'));
  assert.ok(block.includes('"Up to 15 rooms": "11+ rooms"'));
  assert.ok(block.includes('"Up to 20 rooms": "21+ rooms"'));
  assert.ok(block.includes('"25+ rooms": "21+ rooms"'), 'Enterprise must start at 21 rooms');
});


test('homepage, registration and brochure all consume the shared pricing engine', () => {
  const home = readFileSync(new URL('../src/pages/HomePage.tsx', import.meta.url), 'utf8');
  const registration = readFileSync(new URL('../src/pages/BusinessRegistration.tsx', import.meta.url), 'utf8');
  const engine = readFileSync(new URL('../src/config/pricing-engine.js', import.meta.url), 'utf8');

  assert.ok(home.includes('getRegionalPricing(region, isSouthAfricanMarket, fxRates)'), 'homepage must use shared regional prices');
  assert.ok(home.includes('minimumRooms: 21'), 'Business and Enterprise start at 21 rooms on homepage');
  assert.ok(registration.includes('getRegionalPricing(region, isSouthAfricanMarket, fxRates)'), 'registration must use shared regional prices');
  assert.ok(registration.includes('calculateSubscriptionMonthlyPrice(roomsCount, selectedPlanBase.id)'), 'registration selected-plan price must use shared engine');
  assert.ok(home.includes('getRegionalPricing(region, isSouthAfricanMarket, fxRates)'), 'homepage must use current market FX context');
  assert.ok(registration.includes('getRegionalPricing(region, isSouthAfricanMarket, fxRates)'), 'registration must use current market FX context');
  assert.ok(home.includes('convertZarToRegionalPrice(MARKETING_DOWNLOAD_MONTHLY_PRICE, region, isSouthAfricanMarket, fxRates)'), 'homepage add-on prices must use the same FX context');
  assert.ok(registration.includes('convertZarToRegionalPrice(MARKETING_DOWNLOAD_MONTHLY_PRICE, region, isSouthAfricanMarket, fxRates)'), 'registration add-on prices must use the same FX context');
  assert.ok(component.includes('getRegionalPricing(region, southAfrican, fxRates)'), 'brochure must use shared regional prices');
  assert.ok(component.includes('addLegacyPriceReplacements(price.textContent ||'), 'brochure must replace repeated legacy prices from its original HTML');
  assert.ok(engine.includes('business: 21, enterprise: 21'), 'shared engine must use the agreed 21-room minimum for both tiers');
});

test('shared engine exposes the agreed monthly starting-price ladder', () => {
  const engine = readFileSync(new URL('../src/config/pricing-engine.js', import.meta.url), 'utf8');
  assert.ok(engine.includes('business: 515, enterprise: 871'), 'package premiums must calibrate Business and Enterprise prices');
});


test('all supported brochure locales show the same 21+ Business and Enterprise threshold', () => {
  for (const language of ['en', ...languages]) {
    const start = catalog.indexOf('  ' + language + ': {');
    assert.notEqual(start, -1, 'missing locale block: ' + language);
    const end = catalog.indexOf('\n  },', start);
    const finalEnd = catalog.indexOf('\n  }\n};', start);
    const blockEnd = end >= 0 && (finalEnd < 0 || end < finalEnd) ? end : finalEnd;
    const localeBlock = catalog.slice(start, blockEnd);
    const business = localeBlock.match(/["']Up to 20 rooms["']\s*:\s*["']([^"']*)["']/);
    const enterprise = localeBlock.match(/["']25\+ rooms["']\s*:\s*["']([^"']*)["']/);
    assert.ok(business && enterprise, language + ' is missing a package threshold');
    assert.equal(business[1], enterprise[1], language + ' must show both Business and Enterprise starting at 21+ rooms');
  }
});

test('pricing audit executes the shared engine against the approved starting-price ladder', () => {
  assert.deepEqual(
    [1, 6, 11, 21, 21].map((rooms, index) => calculateSubscriptionMonthlyPrice(rooms, ['starter', 'growth', 'pro', 'business', 'enterprise'][index])),
    [349, 649, 949, 2260, 2616],
  );
  assert.deepEqual(
    [1, 6, 11, 21, 21].map((rooms, index) => calculateSubscriptionAnnualPrice(rooms, ['starter', 'growth', 'pro', 'business', 'enterprise'][index])),
    [3839, 7139, 10439, 24860, 28776],
  );
});
