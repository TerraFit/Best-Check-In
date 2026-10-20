import { useEffect, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { useMarket } from '../context/MarketContext';
import { getRegionalPricing, convertZarToRegionalPrice, MARKETING_DOWNLOAD_MONTHLY_PRICE, MARKETING_DOWNLOAD_VOUCHER_PRICE } from '../config/pricing';
import { PACKAGE_IDS } from '../config/pricing-engine';
import { getCurrentLanguage, getLanguageDirection, getTranslationsForLanguage, LANGUAGE_OPTIONS, onLanguageChange, setLanguage, type SupportedLanguage } from '../i18n/languageService';

type FastCheckInPackage = (typeof PACKAGE_IDS)[number];

interface FastCheckInBrochureProps {
  onClose: () => void;
}

const LOCALE_BY_LANGUAGE: Record<SupportedLanguage, string> = {
  en: 'en-ZA', af: 'af-ZA', de: 'de-DE', fr: 'fr-FR', it: 'it-IT', pt: 'pt-PT',
  es: 'es-ES', nl: 'nl-NL', ru: 'ru-RU', zh: 'zh-CN', ar: 'ar-SA', he: 'he-IL',
};

function currencySymbol(currency: string) {
  return currency === 'ZAR' ? 'R' : currency === 'EUR' ? '€' : '$';
}

function formatPrice(value: number, language: SupportedLanguage) {
  return new Intl.NumberFormat(LOCALE_BY_LANGUAGE[language], { maximumFractionDigits: 0 }).format(value);
}

function applyRegionalPricing(doc: Document, region: Parameters<typeof getRegionalPricing>[0], southAfrican: boolean, fxRates: Parameters<typeof getRegionalPricing>[2], language: SupportedLanguage) {
  const pricing = getRegionalPricing(region, southAfrican, fxRates);
  const symbol = currencySymbol(pricing.currency);
  const zarPricing = getRegionalPricing('africa', true);

  const planCards = Array.from(doc.querySelectorAll<HTMLElement>('.pricing .plan'));
  planCards.slice(0, PACKAGE_IDS.length).forEach((card, index) => {
    const monthly = pricing.prices[index]?.monthly;
    const yearly = pricing.prices[index]?.yearly;
    if (monthly == null || yearly == null) return;
    const price = card.querySelector<HTMLElement>('.price');
    const per = card.querySelector<HTMLElement>('.per');
    if (price) price.textContent = `${index === 4 ? 'From ' : ''}${symbol}${formatPrice(monthly, language)}`;
    if (per) per.textContent = `per month · ${symbol}${formatPrice(yearly, language)} yearly`;
  });

  const replacements: Array<[RegExp, string]> = [];
  (PACKAGE_IDS as FastCheckInPackage[]).forEach((_, index) => {
    const zarMonthly = zarPricing.prices[index]?.monthly;
    const zarYearly = zarPricing.prices[index]?.yearly;
    const regionalMonthly = pricing.prices[index]?.monthly;
    const regionalYearly = pricing.prices[index]?.yearly;
    if (zarMonthly != null && regionalMonthly != null) replacements.push([new RegExp(`R\\s*${zarMonthly.toLocaleString('en-US').replace(/,/g, ',?')}`, 'g'), `${symbol}${formatPrice(regionalMonthly, language)}`]);
    if (zarYearly != null && regionalYearly != null) replacements.push([new RegExp(`R\\s*${zarYearly.toLocaleString('en-US').replace(/,/g, ',?')}`, 'g'), `${symbol}${formatPrice(regionalYearly, language)}`]);
  });

  const marketingMonthly = convertZarToRegionalPrice(MARKETING_DOWNLOAD_MONTHLY_PRICE, region, southAfrican, fxRates);
  const marketingVoucher = convertZarToRegionalPrice(MARKETING_DOWNLOAD_VOUCHER_PRICE, region, southAfrican, fxRates);
  replacements.push([/R\s*39\s*\/\s*month/gi, `${symbol}${formatPrice(marketingMonthly, language)}/month`]);
  replacements.push([/R\s*149\s+voucher/gi, `${symbol}${formatPrice(marketingVoucher, language)} voucher`]);

  const pricingRoot = doc.querySelector('.pricing')?.parentElement || doc.body;
  const walker = doc.createTreeWalker(pricingRoot, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) nodes.push(node as Text);
  nodes.forEach((textNode) => {
    let value = textNode.nodeValue || '';
    for (const [pattern, replacement] of replacements) value = value.replace(pattern, replacement);
    textNode.nodeValue = value;
  });

  doc.querySelectorAll<HTMLElement>('.utility-actions .utility-btn').forEach((button, index) => {
    if (index > 0) button.style.display = 'none';
  });

  const utilityLabel = doc.querySelector<HTMLElement>('.utility-label');
  if (utilityLabel) {
    const regionName = region === 'north-america' ? 'North America' : region.charAt(0).toUpperCase() + region.slice(1).replace('-', ' ');
    utilityLabel.textContent = `FastCheckIn · Product Brochure · ${southAfrican ? 'South Africa' : regionName} · ${symbol}`;
  }
}

/**
 * Translate brochure text using the application's existing, reviewed locale packs.
 * Exact text matches are translated first; longer phrases are then replaced within
 * mixed text nodes. Untranslated brochure-specific wording safely falls back to
 * its original English text rather than being sent to an external service.
 */
function applyBrochureTranslations(doc: Document, language: SupportedLanguage) {
  const english = getTranslationsForLanguage('en');
  const selected = getTranslationsForLanguage(language);
  const exact = new Map<string, string>();
  const phrases: Array<[string, string]> = [];

  Object.keys(english).forEach((key) => {
    const source = english[key];
    const translated = selected[key];
    if (typeof source !== 'string' || typeof translated !== 'string' || !source.trim() || !translated.trim() || source === translated) return;
    exact.set(source, translated);
    if (source.trim().length >= 14 && !/[{}]/.test(source)) phrases.push([source, translated]);
  });
  phrases.sort((a, b) => b[0].length - a[0].length);

  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const parent = node.parentElement;
    if (parent && ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) continue;
    nodes.push(node as Text);
  }
  nodes.forEach((textNode) => {
    const original = textNode.nodeValue || '';
    const trimmed = original.trim();
    if (!trimmed) return;
    if (exact.has(trimmed)) {
      const leading = original.match(/^\s*/)?.[0] || '';
      const trailing = original.match(/\s*$/)?.[0] || '';
      textNode.nodeValue = leading + exact.get(trimmed) + trailing;
      return;
    }
    let value = original;
    for (const [source, translated] of phrases) {
      value = value.split(source).join(translated);
    }
    textNode.nodeValue = value;
  });

  const attributeNames = ['title', 'aria-label', 'alt', 'placeholder'];
  doc.querySelectorAll<HTMLElement>('*').forEach((element) => {
    attributeNames.forEach((name) => {
      const value = element.getAttribute(name);
      if (value && exact.has(value)) element.setAttribute(name, exact.get(value)!);
    });
  });
  doc.documentElement.lang = language;
  doc.documentElement.dir = getLanguageDirection(language);
}

export default function FastCheckInBrochure({ onClose }: FastCheckInBrochureProps) {
  const { region, isSouthAfricanMarket, fxRates } = useMarket();
  const [language, setLanguageState] = useState<SupportedLanguage>(getCurrentLanguage());
  const [html, setHtml] = useState('');
  const [error, setError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    // Subscribe to language changes made elsewhere on the page as well as in this modal.
    return onLanguageChange((nextLanguage) => setLanguageState(nextLanguage));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setHtml('');
    setError(false);
    fetch('/FastCheckIn_Brochure.html', { cache: 'no-cache' })
      .then((response) => {
        if (!response.ok) throw new Error('Unable to load brochure');
        return response.text();
      })
      .then((value) => {
        if (!cancelled) {
          const withBase = value.includes('<head')
            ? value.replace(/<head([^>]*)>/i, `<head$1><base href="${window.location.origin}/">`)
            : value;
          setHtml(withBase);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => { cancelled = true; };
  }, []);

  const applyContent = () => {
    try {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return;
      applyRegionalPricing(doc, region, isSouthAfricanMarket, fxRates, language);
      applyBrochureTranslations(doc, language);
    } catch {
      setError(true);
    }
  };

  const copy = getTranslationsForLanguage(language);
  const closeLabel = copy.common_close || 'Close';
  const loadingLabel = copy.common_loading || 'Loading…';

  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-stone-950/80 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="FastCheckIn brochure"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="relative flex h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 py-3 pr-14">
          <label className="flex min-w-0 items-center gap-2 text-sm font-semibold text-stone-700">
            <span className="whitespace-nowrap">Language</span>
            <select
              value={language}
              onChange={(event) => {
                const next = event.target.value as SupportedLanguage;
                setLanguage(next);
                setLanguageState(next);
              }}
              aria-label="Brochure language"
              className="min-w-0 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800"
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>{option.flag} {option.nativeName}</option>
              ))}
            </select>
          </label>
          <button type="button" onClick={onClose} aria-label={closeLabel} className="absolute right-3 top-3 z-20 rounded-full bg-stone-950/80 p-2 text-white shadow-lg transition hover:bg-stone-950">
            <X className="h-5 w-5" />
          </button>
        </div>
        {error ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <h2 className="text-xl font-bold text-stone-900">The brochure could not be displayed</h2>
            <p className="max-w-lg text-sm leading-6 text-stone-600">Please close this window and try again. If the problem continues, contact the FastCheckIn team.</p>
            <button type="button" onClick={onClose} className="rounded-xl bg-stone-950 px-5 py-3 font-bold text-amber-400 transition hover:bg-stone-800">{closeLabel}</button>
          </div>
        ) : html ? (
          <iframe
            key={`${language}:${region}:${isSouthAfricanMarket}:${JSON.stringify(fxRates)}`}
            ref={iframeRef}
            title="FastCheckIn brochure"
            srcDoc={html}
            onLoad={applyContent}
            className="min-h-0 flex-1 w-full border-0 bg-stone-100"
          />
        ) : (
          <div className="flex flex-1 items-center justify-center gap-2 text-sm text-stone-600">
            <Loader2 className="h-4 w-4 animate-spin" /> {loadingLabel}
          </div>
        )}
        <div className="flex shrink-0 justify-end border-t border-stone-200 bg-white px-4 py-3">
          <button type="button" onClick={onClose} className="rounded-xl bg-stone-950 px-5 py-3 font-bold text-white transition hover:bg-stone-800">{closeLabel}</button>
        </div>
      </div>
    </div>
  );
}

