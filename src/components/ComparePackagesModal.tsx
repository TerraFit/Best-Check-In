import { X, Info, Check } from 'lucide-react';
import { useTranslation } from '../i18n';

interface ComparePackagesModalProps {
  open: boolean;
  onClose: () => void;
}

type ComparisonValue = string | { label: string; detail: string };
type ComparisonRow = {
  label: string;
  detail: string;
  values: ComparisonValue[];
};

const plans = ['Starter', 'Growth', 'Pro', 'Business', 'Enterprise'];

const snapshotPayg = 'Business Snapshot vouchers: 1 for R99, 2 for R190, 3 for R280 or 4 for R370. Each voucher covers one selected reporting period and is valid for 3 months.';
const snapshotUnlimited = 'Optional unlimited Business Snapshot access for R249/month on Pro. Business and Enterprise include unlimited access.';
const multiEstablishment = 'Multi-establishment fee: R2,890/month for each additional establishment after the first. Two establishments add R2,890/month; three establishments add R5,780/month. This fee is separate from each establishment's Enterprise room subscription.';
const enterpriseRooms = 'Enterprise starts at R1,698/month per establishment for up to 25 rooms. Add capacity in 5-room blocks at R349 per block: 30 rooms R2,047/month; 35 rooms R2,396/month, before any applicable volume discount.';
const volumeDiscounts = 'Volume discounts apply per establishment, not pooled across a group: rooms 1–50: 0%; rooms 51–100: 10% discount on that bracket; rooms 101–300: 12% on that bracket; rooms 301+: 15% on that bracket.';

const rows: ComparisonRow[] = [
  {
    label: 'Room capacity',
    detail: 'Starter, Growth, Pro and Business have fixed room limits. Enterprise starts at 25 rooms and expands in 5-room blocks.',
    values: ['Up to 5', 'Up to 10', 'Up to 15', 'Up to 20', '25+'],
  },
  {
    label: 'Digital check-in',
    detail: 'Digital guest registration and check-in forms replace paper-based reception workflows.',
    values: ['Included', 'Included', 'Included', 'Included', 'Included'],
  },
  {
    label: 'Guest data & history',
    detail: 'Guest records, history and export capabilities grow with the plan.',
    values: ['Core', 'History', 'Advanced', 'Advanced', 'Enterprise'],
  },
  {
    label: 'Compliance & consent',
    detail: 'POPIA-oriented guest consent, digital records and compliance-focused administration.',
    values: ['Included', 'Included', 'Included', 'Included', 'Included'],
  },
  {
    label: 'Staff & roles',
    detail: 'Employee accounts, roles and operational access expand from limited staff accounts to unlimited staff.',
    values: ['3 staff', '8 staff', '20 staff', 'Unlimited', 'Unlimited'],
  },
  {
    label: 'Housekeeping',
    detail: 'Basic covers core housekeeping workflow. Advanced adds room allocation. Enterprise Advance+ provides the enhanced operational capability for larger or more complex establishments.',
    values: ['—', 'Basic', 'Advanced', 'Advanced', 'Enterprise Advance+'],
  },
  {
    label: 'Analytics & market insight',
    detail: 'Analytics progresses from basic operational insight to regional, province and city-level market intelligence.',
    values: ['Basic', 'Enhanced', 'Advanced', 'Advanced+', 'Enterprise'],
  },
  {
    label: 'Reporting & exports',
    detail: 'CSV exports, marketing-ready exports and progressively richer reporting are available as plans increase.',
    values: ['CSV', 'CSV + marketing', 'Advanced', 'Business', 'Enterprise'],
  },
  {
    label: 'Business Snapshot',
    detail: 'Starter and Growth can buy individual Snapshot vouchers. Pro includes pay-as-you-go and offers unlimited access as an optional R249/month add-on. Business and Enterprise include unlimited access.',
    values: [
      { label: 'Pay-as-you-go', detail: snapshotPayg },
      { label: 'Pay-as-you-go', detail: snapshotPayg },
      { label: 'Pay-as-you-go + optional unlimited', detail: snapshotPayg + ' ' + snapshotUnlimited },
      'Unlimited included',
      'Unlimited included',
    ],
  },
  {
    label: 'Branding',
    detail: 'Branding controls progress from basic branding to custom logo and colour settings.',
    values: ['Basic', 'Basic', 'Custom', 'Custom', 'Custom'],
  },
  {
    label: 'Lost & Found',
    detail: 'Available as an optional Growth add-on and included from Pro upward.',
    values: ['—', 'Optional (R99/mo)', 'Included', 'Included', 'Included'],
  },
  {
    label: 'Multi-establishment',
    detail: 'The corporate multi-establishment capability is an optional paid add-on, not a free included feature.',
    values: [
      '—',
      '—',
      '—',
      { label: 'Optional', detail: multiEstablishment },
      { label: 'Optional', detail: multiEstablishment },
    ],
  },
  {
    label: 'Pricing',
    detail: 'Fixed-plan annual subscriptions are 11 times the monthly price (one month free). Enterprise is priced per establishment and scales by 5-room blocks, with bracket-based volume discounts. Hover the information icons beside options for their details.',
    values: [
      { label: 'R349/mo · R3,839/yr', detail: 'Starter: R349/month or R3,839/year (11 monthly payments). Includes up to 5 rooms and 3 staff.' },
      { label: 'R797/mo · R8,767/yr', detail: 'Growth: R797/month or R8,767/year. Includes up to 10 rooms and 8 staff. Lost & Found is an optional R99/month add-on.' },
      { label: 'R1,049/mo · R11,539/yr', detail: 'Pro: R1,049/month or R11,539/year. Includes up to 15 rooms and 20 staff. Business Snapshot unlimited is optional at R249/month; individual vouchers remain available pay-as-you-go.' },
      { label: 'R1,429/mo · R15,719/yr', detail: 'Business: R1,429/month or R15,719/year. Includes up to 20 rooms, unlimited staff and unlimited Business Snapshot. Multi-establishment is an optional paid add-on at R2,890/month for each additional establishment after the first.' },
      { label: 'From R1,698/mo', detail: enterpriseRooms + ' ' + volumeDiscounts + ' Annual pricing depends on the configured room capacity and discount brackets; request a quote for the establishment.' },
    ],
  },
];

function InfoValue({ value }: { value: ComparisonValue }) {
  if (typeof value === 'string') {
    return value === 'Included'
      ? <span className="inline-flex items-center gap-1 font-semibold text-stone-800"><Check className="h-4 w-4 text-amber-600" />Included</span>
      : <span>{value}</span>;
  }

  return (
    <span className="inline-flex items-center justify-center gap-1.5">
      <span>{value.label}</span>
      <span className="group relative inline-flex shrink-0 cursor-help align-middle" tabIndex={0} aria-label={value.detail}>
        <Info className="h-4 w-4 text-amber-600" />
        <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-72 -translate-x-1/2 rounded-xl bg-stone-950 px-3 py-2 text-left text-xs font-normal leading-5 text-white shadow-xl group-hover:block group-focus:block">
          {value.detail}
        </span>
      </span>
    </span>
  );
}

export default function ComparePackagesModal({ open, onClose }: ComparePackagesModalProps) {
  const { t } = useTranslation();
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center bg-stone-950/80 p-3 md:p-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="compare-packages-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="relative flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl bg-white text-stone-900 shadow-2xl">
        <div className="flex items-start justify-between border-b border-stone-200 px-5 py-5 md:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-600">FastCheckIn</p>
            <h2 id="compare-packages-title" className="mt-1 text-2xl md:text-3xl font-bold">Compare packages</h2>
            <p className="mt-2 text-sm text-stone-600">A condensed view of the main differences. Hover or focus the <Info className="inline h-3.5 w-3.5 align-[-2px] text-amber-600" /> icons for pricing and feature details.</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900" aria-label="Close package comparison">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-auto">
          <table className="min-w-[1120px] w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-stone-950 text-white">
              <tr>
                <th className="w-[22%] px-5 py-4 text-left font-semibold">Feature</th>
                {plans.map((plan) => (
                  <th key={plan} className="px-4 py-4 text-center font-bold">
                    <div>{plan}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.label} className={index % 2 === 0 ? 'bg-stone-50' : 'bg-white'}>
                  <th className="border-b border-stone-200 px-5 py-4 text-left align-top font-semibold text-stone-800">
                    <span className="inline-flex items-center gap-1.5">
                      {row.label}
                      <span className="group relative inline-flex cursor-help" tabIndex={0} aria-label={row.detail}>
                        <Info className="h-4 w-4 text-stone-400" />
                        <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-64 -translate-x-1/2 rounded-xl bg-stone-950 px-3 py-2 text-left text-xs font-normal leading-5 text-white shadow-xl group-hover:block group-focus:block">
                          {row.detail}
                        </span>
                      </span>
                    </span>
                  </th>
                  {row.values.map((value, valueIndex) => (
                    <td key={`${row.label}-${plans[valueIndex]}`} className="border-b border-stone-200 px-4 py-4 text-center align-top text-stone-600">
                      <InfoValue value={value} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-stone-200 bg-stone-50 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-8">
          <p className="text-xs text-stone-500">Annual fixed-plan pricing is 11 × monthly pricing. Enterprise room-block and volume pricing is calculated per establishment.</p>
          <button onClick={onClose} className="rounded-xl bg-stone-950 px-6 py-3 text-sm font-bold text-amber-400 hover:bg-stone-800 transition">{t('common_close')}</button>
        </div>
      </div>
    </div>
  );
}
