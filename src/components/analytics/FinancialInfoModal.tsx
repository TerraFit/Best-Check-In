import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';

export interface AnalyticsFinancials {
  revenue: number | null;
  costOfSale: number | null;
  operatingCosts: number | null;
  updatedAt?: string | null;
}

interface FinancialInfoModalProps {
  isOpen: boolean;
  dateFrom: string;
  dateTo: string;
  initialFinancials: AnalyticsFinancials | null;
  saving: boolean;
  onClose: () => void;
  onSkip: () => void;
  onSave: (financials: AnalyticsFinancials) => void;
}

function inputValue(value: number | null | undefined): string {
  return value == null ? '' : String(value);
}

export function FinancialInfoModal({
  isOpen,
  dateFrom,
  dateTo,
  initialFinancials,
  saving,
  onClose,
  onSkip,
  onSave,
}: FinancialInfoModalProps) {
  const [revenue, setRevenue] = useState('');
  const [costOfSale, setCostOfSale] = useState('');
  const [operatingCosts, setOperatingCosts] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setRevenue(inputValue(initialFinancials?.revenue));
    setCostOfSale(inputValue(initialFinancials?.costOfSale));
    setOperatingCosts(inputValue(initialFinancials?.operatingCosts));
  }, [isOpen, initialFinancials]);

  if (!isOpen) return null;

  const parse = (value: string): number | null => {
    if (value.trim() === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  };

  const revenueValue = parse(revenue);
  const costOfSaleValue = parse(costOfSale);
  const operatingCostsValue = parse(operatingCosts);
  const operatingProfit =
    revenueValue !== null && costOfSaleValue !== null && operatingCostsValue !== null
      ? revenueValue - costOfSaleValue - operatingCostsValue
      : null;

  const valid = [revenue, costOfSale, operatingCosts].every(
    (value) => value.trim() === '' || (Number.isFinite(Number(value)) && Number(value) >= 0)
  );

  const handleSave = () => {
    if (!valid || saving) return;
    onSave({
      revenue: revenueValue,
      costOfSale: costOfSaleValue,
      operatingCosts: operatingCostsValue,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="financial-info-title"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-stone-200 px-6 py-5">
          <div>
            <h2 id="financial-info-title" className="text-lg font-bold text-stone-900">
              Add financial information
            </h2>
            <p className="mt-1 text-xs text-stone-500">
              {dateFrom} – {dateTo}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 disabled:opacity-50"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 px-6 py-6">
          <p className="text-sm text-stone-600">
            Add financial figures for this reporting period. All fields are optional.
          </p>

          <div className="space-y-4">
            {[
              ['Revenue', revenue, setRevenue],
              ['Cost of Sale', costOfSale, setCostOfSale],
              ['Operating Costs', operatingCosts, setOperatingCosts],
            ].map(([label, value, setter]) => (
              <label key={label as string} className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-500">
                  {label as string}
                </span>
                <div className="flex items-center rounded-xl border border-stone-200 bg-stone-50 focus-within:border-stone-400 focus-within:bg-white">
                  <span className="px-3 text-sm font-semibold text-stone-400">R</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={value as string}
                    onChange={(event) => (setter as (value: string) => void)(event.target.value)}
                    className="w-full bg-transparent px-1 py-3 text-sm font-medium outline-none"
                    placeholder="0.00"
                  />
                </div>
              </label>
            ))}

            <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Operating Profit
                </span>
                <span className="text-base font-bold text-stone-900">
                  {operatingProfit === null
                    ? 'Calculated automatically'
                    : `R ${operatingProfit.toLocaleString('en-ZA', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`}
                </span>
              </div>
              {operatingProfit === null && (
                <p className="mt-1 text-[11px] text-stone-400">
                  Enter Revenue, Cost of Sale and Operating Costs to calculate profit.
                </p>
              )}
            </div>
          </div>

          <p className="text-[11px] leading-5 text-stone-400">
            Financial figures are manually provided and are not taken from FastCheckIn booking data.
            Saved figures are marked as Manual in the PDF.
          </p>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-stone-200 bg-stone-50 px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onSkip}
            disabled={saving}
            className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-100 disabled:opacity-50"
          >
            Skip &amp; Download PDF
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !valid}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-stone-800 disabled:opacity-50"
          >
            {saving && <Loader2 size={13} className="animate-spin" />}
            Save &amp; Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}
