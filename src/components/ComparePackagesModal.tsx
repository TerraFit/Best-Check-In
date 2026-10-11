import { X, Info, Check } from 'lucide-react';
import { useTranslation } from '../i18n';

interface ComparePackagesModalProps {
  open: boolean;
  onClose: () => void;
}

type ComparisonRow = {
  label: string;
  detail: string;
  values: string[];
};

const plans = ['Starter', 'Growth', 'Pro', 'Business', 'Enterprise'];

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
    detail: 'Operational housekeeping tools are available from Growth upward.',
    values: ['—', 'Included', 'Included', 'Included', 'Included'],
  },
  {
    label: 'Analytics & market insight',
    detail: 'Analytics progresses from basic operational insight to advanced regional, province and city-level market intelligence.',
    values: ['Basic', 'Enhanced', 'Advanced', 'Advanced+', 'Enterprise'],
  },
  {
    label: 'Reporting & exports',
    detail: 'CSV exports, marketing-ready exports and progressively richer reporting are available as plans increase.',
    values: ['CSV', 'CSV + marketing', 'Advanced', 'Business', 'Enterprise'],
  },
  {
    label: 'Business Snapshot',
    detail: 'Pay-as-you-go from Starter/Growth, unlimited as an optional Pro add-on, and included in Business and Enterprise.',
    values: ['Pay-as-you-go', 'Pay-as-you-go', 'Optional unlimited', 'Included', 'Included'],
  },
  {
    label: 'Branding',
    detail: 'Branding controls progress from basic branding to custom logo and colour settings.',
    values: ['Basic', 'Basic', 'Custom', 'Custom', 'Custom'],
  },
  {
    label: 'Lost & Found',
    detail: 'Available as an optional Growth add-on and included from Pro upward.',
    values: ['—', 'Optional', 'Included', 'Included', 'Included'],
  },
  {
    label: 'Multi-establishment',
    detail: 'Corporate multi-establishment management is available as a separate group capability with an additional group fee.',
    values: ['—', '—', '—', 'Available', 'Available'],
  },
  {
    label: 'Enterprise pricing',
    detail: 'Enterprise is priced per establishment. Additional 5-room blocks are discounted by room bracket; capacity is never pooled across establishments.',
    values: ['—', '—', '—', '—', 'From R1,698/mo'],
  },
];

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
            <p className="mt-2 text-sm text-stone-600">A condensed view of the main differences. Hover over the <Info className="inline h-3.5 w-3.5 align-[-2px]" /> icon for more detail.</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900" aria-label="Close package comparison">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-auto">
          <table className="min-w-[920px] w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-stone-950 text-white">
              <tr>
                <th className="w-[25%] px-5 py-4 text-left font-semibold">Feature</th>
                {plans.map((plan) => (
                  <th key={plan} className="px-4 py-4 text-center font-bold">
                    <div>{plan}</div>
                    {plan === 'Enterprise' && <div className="mt-1 text-xs font-normal text-amber-400">From R1,698/mo</div>}
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
                      <span className="group relative inline-flex cursor-help">
                        <Info className="h-4 w-4 text-stone-400" />
                        <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-64 -translate-x-1/2 rounded-xl bg-stone-950 px-3 py-2 text-left text-xs font-normal leading-5 text-white shadow-xl group-hover:block">
                          {row.detail}
                        </span>
                      </span>
                    </span>
                  </th>
                  {row.values.map((value, valueIndex) => (
                    <td key={`${row.label}-${plans[valueIndex]}`} className="border-b border-stone-200 px-4 py-4 text-center align-top text-stone-600">
                      {value === 'Included' ? <span className="inline-flex items-center gap-1 font-semibold text-stone-800"><Check className="h-4 w-4 text-amber-600" />Included</span> : value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-stone-200 bg-stone-50 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-8">
          <p className="text-xs text-stone-500">Annual pricing is 11 × the monthly subscription for fixed plans. Enterprise pricing is configured per establishment.</p>
          <button onClick={onClose} className="rounded-xl bg-stone-950 px-6 py-3 text-sm font-bold text-amber-400 hover:bg-stone-800 transition">{t('common_close')}</button>
        </div>
      </div>
    </div>
  );
}
