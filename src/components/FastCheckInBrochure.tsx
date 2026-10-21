import { useEffect, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { useMarket } from '../context/MarketContext';
import { getRegionalPricing, convertZarToRegionalPrice, MARKETING_DOWNLOAD_MONTHLY_PRICE, MARKETING_DOWNLOAD_VOUCHER_PRICE } from '../config/pricing';
import { PACKAGE_IDS } from '../config/pricing-engine';
import { getCurrentLanguage, getLanguageDirection, getTranslationsForLanguage, LANGUAGE_OPTIONS, onLanguageChange, setLanguage, type SupportedLanguage } from '../i18n/languageService';
import { BROCHURE_TRANSLATIONS } from '../i18n/brochureTranslations';

type FastCheckInPackage = (typeof PACKAGE_IDS)[number];

interface FastCheckInBrochureProps {
  onClose: () => void;
}

type BrochureCopy = {
  language: string;
  productBrochure: string;
  from: string;
  perMonth: string;
  yearly: string;
  voucher: string;
  loadErrorTitle: string;
  loadErrorBody: string;
  regionNames: Record<string, string>;
};

const BROCHURE_COPY: Record<SupportedLanguage, BrochureCopy> = {
  en: { language: 'Language', productBrochure: 'Product Brochure', from: 'From ', perMonth: 'per month', yearly: 'yearly', voucher: 'voucher', loadErrorTitle: 'The brochure could not be displayed', loadErrorBody: 'Please close this window and try again. If the problem continues, contact the FastCheckIn team.', regionNames: { africa: 'Africa', 'north-america': 'North America', europe: 'Europe', 'south-america': 'South America', 'middle-east': 'Middle East', asia: 'Asia', oceania: 'Oceania' } },
  af: { language: 'Taal', productBrochure: 'Produkbrochure', from: 'Vanaf ', perMonth: 'per maand', yearly: 'jaarliks', voucher: 'bewys', loadErrorTitle: 'Die brosjure kon nie vertoon word nie', loadErrorBody: 'Maak asseblief hierdie venster toe en probeer weer. Kontak die FastCheckIn-span as die probleem voortduur.', regionNames: { africa: 'Afrika', 'north-america': 'Noord-Amerika', europe: 'Europa', 'south-america': 'Suid-Amerika', 'middle-east': 'Midde-Ooste', asia: 'Asië', oceania: 'Oseanië' } },
  de: { language: 'Sprache', productBrochure: 'Produktbroschüre', from: 'Ab ', perMonth: 'pro Monat', yearly: 'jährlich', voucher: 'Gutschein', loadErrorTitle: 'Die Broschüre konnte nicht angezeigt werden', loadErrorBody: 'Bitte schließen Sie dieses Fenster und versuchen Sie es erneut. Wenn das Problem weiterhin besteht, kontaktieren Sie das FastCheckIn-Team.', regionNames: { africa: 'Afrika', 'north-america': 'Nordamerika', europe: 'Europa', 'south-america': 'Südamerika', 'middle-east': 'Naher Osten', asia: 'Asien', oceania: 'Ozeanien' } },
  fr: { language: 'Langue', productBrochure: 'Brochure produit', from: 'À partir de ', perMonth: 'par mois', yearly: 'par an', voucher: 'bon', loadErrorTitle: 'La brochure ne peut pas être affichée', loadErrorBody: 'Veuillez fermer cette fenêtre et réessayer. Si le problème persiste, contactez l’équipe FastCheckIn.', regionNames: { africa: 'Afrique', 'north-america': 'Amérique du Nord', europe: 'Europe', 'south-america': 'Amérique du Sud', 'middle-east': 'Moyen-Orient', asia: 'Asie', oceania: 'Océanie' } },
  it: { language: 'Lingua', productBrochure: 'Brochure del prodotto', from: 'Da ', perMonth: 'al mese', yearly: 'annuale', voucher: 'buono', loadErrorTitle: 'Impossibile visualizzare la brochure', loadErrorBody: 'Chiudi questa finestra e riprova. Se il problema persiste, contatta il team FastCheckIn.', regionNames: { africa: 'Africa', 'north-america': 'Nord America', europe: 'Europa', 'south-america': 'Sud America', 'middle-east': 'Medio Oriente', asia: 'Asia', oceania: 'Oceania' } },
  pt: { language: 'Idioma', productBrochure: 'Brochura do produto', from: 'A partir de ', perMonth: 'por mês', yearly: 'anual', voucher: 'voucher', loadErrorTitle: 'Não foi possível apresentar a brochura', loadErrorBody: 'Feche esta janela e tente novamente. Se o problema persistir, contacte a equipa FastCheckIn.', regionNames: { africa: 'África', 'north-america': 'América do Norte', europe: 'Europa', 'south-america': 'América do Sul', 'middle-east': 'Médio Oriente', asia: 'Ásia', oceania: 'Oceânia' } },
  es: { language: 'Idioma', productBrochure: 'Folleto del producto', from: 'Desde ', perMonth: 'al mes', yearly: 'anual', voucher: 'bono', loadErrorTitle: 'No se pudo mostrar el folleto', loadErrorBody: 'Cierre esta ventana e inténtelo de nuevo. Si el problema continúa, contacte con el equipo de FastCheckIn.', regionNames: { africa: 'África', 'north-america': 'América del Norte', europe: 'Europa', 'south-america': 'América del Sur', 'middle-east': 'Oriente Medio', asia: 'Asia', oceania: 'Oceanía' } },
  nl: { language: 'Taal', productBrochure: 'Productbrochure', from: 'Vanaf ', perMonth: 'per maand', yearly: 'jaarlijks', voucher: 'voucher', loadErrorTitle: 'De brochure kon niet worden weergegeven', loadErrorBody: 'Sluit dit venster en probeer het opnieuw. Neem contact op met het FastCheckIn-team als het probleem blijft bestaan.', regionNames: { africa: 'Afrika', 'north-america': 'Noord-Amerika', europe: 'Europa', 'south-america': 'Zuid-Amerika', 'middle-east': 'Midden-Oosten', asia: 'Azië', oceania: 'Oceanië' } },
  ru: { language: 'Язык', productBrochure: 'Брошюра продукта', from: 'От ', perMonth: 'в месяц', yearly: 'в год', voucher: 'ваучер', loadErrorTitle: 'Не удалось отобразить брошюру', loadErrorBody: 'Закройте это окно и попробуйте ещё раз. Если проблема не исчезнет, свяжитесь с командой FastCheckIn.', regionNames: { africa: 'Африка', 'north-america': 'Северная Америка', europe: 'Европа', 'south-america': 'Южная Америка', 'middle-east': 'Ближний Восток', asia: 'Азия', oceania: 'Океания' } },
  zh: { language: '语言', productBrochure: '产品手册', from: '起价 ', perMonth: '每月', yearly: '每年', voucher: '优惠券', loadErrorTitle: '无法显示宣传册', loadErrorBody: '请关闭此窗口后重试。如果问题仍然存在，请联系 FastCheckIn 团队。', regionNames: { africa: '非洲', 'north-america': '北美洲', europe: '欧洲', 'south-america': '南美洲', 'middle-east': '中东', asia: '亚洲', oceania: '大洋洲' } },
  ar: { language: 'اللغة', productBrochure: 'كتيب المنتج', from: 'ابتداءً من ', perMonth: 'شهريًا', yearly: 'سنويًا', voucher: 'قسيمة', loadErrorTitle: 'تعذّر عرض الكتيب', loadErrorBody: 'يرجى إغلاق هذه النافذة والمحاولة مرة أخرى. إذا استمرت المشكلة، فاتصل بفريق FastCheckIn.', regionNames: { africa: 'أفريقيا', 'north-america': 'أمريكا الشمالية', europe: 'أوروبا', 'south-america': 'أمريكا الجنوبية', 'middle-east': 'الشرق الأوسط', asia: 'آسيا', oceania: 'أوقيانوسيا' } },
  he: { language: 'שפה', productBrochure: 'חוברת המוצר', from: 'החל מ־', perMonth: 'לחודש', yearly: 'לשנה', voucher: 'שובר', loadErrorTitle: 'לא ניתן להציג את החוברת', loadErrorBody: 'יש לסגור חלון זה ולנסות שוב. אם הבעיה נמשכת, יש לפנות לצוות FastCheckIn.', regionNames: { africa: 'אפריקה', 'north-america': 'צפון אמריקה', europe: 'אירופה', 'south-america': 'דרום אמריקה', 'middle-east': 'המזרח התיכון', asia: 'אסיה', oceania: 'אוקיאניה' } },
};

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
    if (price) price.textContent = `${index === 4 ? BROCHURE_COPY[language].from : ''}${symbol}${formatPrice(monthly, language)}`;
    if (per) per.textContent = `${BROCHURE_COPY[language].perMonth} · ${symbol}${formatPrice(yearly, language)} ${BROCHURE_COPY[language].yearly}`;
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
  replacements.push([/R\s*39\s*\/\s*month/gi, `${symbol}${formatPrice(marketingMonthly, language)} ${BROCHURE_COPY[language].perMonth}`]);
  replacements.push([/R\s*149\s+voucher/gi, `${symbol}${formatPrice(marketingVoucher, language)} ${BROCHURE_COPY[language].voucher}`]);

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
    const regionKey = southAfrican ? 'south-africa' : region;
    const regionName = regionKey === 'south-africa' ? 'South Africa' : BROCHURE_COPY[language].regionNames[regionKey] || regionKey;
    const localizedRegionName = regionKey === 'south-africa' ? ({ en: 'South Africa', af: 'Suid-Afrika', de: 'Südafrika', fr: 'Afrique du Sud', it: 'Sudafrica', pt: 'África do Sul', es: 'Sudáfrica', nl: 'Zuid-Afrika', ru: 'Южная Африка', zh: '南非', ar: 'جنوب أفريقيا', he: 'דרום אפריקה' } as Record<SupportedLanguage, string>)[language] : regionName;
    utilityLabel.textContent = `FastCheckIn · ${BROCHURE_COPY[language].productBrochure} · ${localizedRegionName} · ${symbol}`;
  }
}

/**
 * Translate the brochure with a dedicated, product-specific catalog. Shared app
 * labels may use exact-key locale entries, but brochure paragraphs are never
 * translated by fuzzy substring matching (which can corrupt unrelated wording).
 */
function applyBrochureTranslations(doc: Document, language: SupportedLanguage) {
  const english = getTranslationsForLanguage('en');
  const selected = getTranslationsForLanguage(language);
  const appLabels = new Map<string, string>();

  Object.keys(english).forEach((key) => {
    const source = english[key];
    const translated = selected[key];
    if (
      typeof source === 'string' &&
      typeof translated === 'string' &&
      source.trim() &&
      translated.trim() &&
      source !== translated
    ) {
      appLabels.set(source, translated);
    }
  });

  const brochureCopy = (BROCHURE_TRANSLATIONS[language] || {}) as Record<string, string>;
  const phraseEntries = Object.entries(brochureCopy).sort(([a], [b]) => b.length - a.length);
  const translateValue = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return value;
    const exact = brochureCopy[trimmed] || appLabels.get(trimmed);
    if (exact) {
      const leading = value.match(/^\s*/)?.[0] || '';
      const trailing = value.match(/\s*$/)?.[0] || '';
      return leading + exact + trailing;
    }
    let translated = value;
    for (const [source, replacement] of phraseEntries) {
      if (translated.includes(source)) translated = translated.split(source).join(replacement);
    }
    return translated;
  };

  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const parent = node.parentElement;
    if (parent && ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) continue;
    nodes.push(node as Text);
  }
  nodes.forEach((textNode) => {
    textNode.nodeValue = translateValue(textNode.nodeValue || '');
  });

  const attributeNames = ['title', 'aria-label', 'alt', 'placeholder'];
  doc.querySelectorAll<HTMLElement>('*').forEach((element) => {
    attributeNames.forEach((name) => {
      const value = element.getAttribute(name);
      if (value) {
        const translated = translateValue(value);
        if (translated !== value) element.setAttribute(name, translated);
      }
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
  const brochureCopy = BROCHURE_COPY[language];
  const loadingLabel = copy.common_loading || 'Loading…';

  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-stone-950/80 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={brochureCopy.productBrochure}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="relative flex h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 py-3 pr-14">
          <label className="flex min-w-0 items-center gap-2 text-sm font-semibold text-stone-700">
            <span className="whitespace-nowrap">{brochureCopy.language}</span>
            <select
              value={language}
              onChange={(event) => {
                const next = event.target.value as SupportedLanguage;
                setLanguage(next);
                setLanguageState(next);
              }}
              aria-label={brochureCopy.language}
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
            <h2 className="text-xl font-bold text-stone-900">{brochureCopy.loadErrorTitle}</h2>
            <p className="max-w-lg text-sm leading-6 text-stone-600">{brochureCopy.loadErrorBody}</p>
            <button type="button" onClick={onClose} className="rounded-xl bg-stone-950 px-5 py-3 font-bold text-amber-400 transition hover:bg-stone-800">{closeLabel}</button>
          </div>
        ) : html ? (
          <iframe
            key={`${language}:${region}:${isSouthAfricanMarket}:${JSON.stringify(fxRates)}`}
            ref={iframeRef}
            title={brochureCopy.productBrochure}
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
