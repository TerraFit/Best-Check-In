import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';

const SOUTH_AFRICAN_PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'Northern Cape',
  'North West',
  'Western Cape',
];

const COUNTRIES = [
  'Angola',
  'Botswana',
  'Eswatini',
  'Kenya',
  'Lesotho',
  'Malawi',
  'Mauritius',
  'Mozambique',
  'Namibia',
  'Nigeria',
  'Tanzania',
  'Uganda',
  'Zambia',
  'Zimbabwe',
  'Other',
];

type EnterpriseInquiryModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function EnterpriseInquiryModal({ open, onClose }: EnterpriseInquiryModalProps) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [internationalCount, setInternationalCount] = useState(0);
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, busy, onClose]);

  useEffect(() => {
    if (!open) {
      setBusy(false);
      setMessage('');
      setSuccess(false);
      setInternationalCount(0);
      setSelectedProvinces([]);
      setSelectedCountries([]);
    }
  }, [open]);

  if (!open) return null;

  const toggleSelection = (value: string, current: string[], setter: (values: string[]) => void) => {
    setter(current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  };

  const submitEnterpriseInquiry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    const totalRooms = String(form.get('totalRooms') || '').trim();
    const totalEstablishments = String(form.get('totalEstablishments') || '').trim();
    const saEstablishments = String(form.get('saEstablishments') || '').trim();
    const comments = String(form.get('comments') || '').trim();

    const details = [
      'Enterprise enquiry',
      '',
      'CONTACT',
      'Full name: ' + String(form.get('fullName') || '').trim(),
      'Company / group: ' + String(form.get('companyName') || '').trim(),
      'Email: ' + String(form.get('email') || '').trim(),
      'Telephone: ' + String(form.get('telephone') || '').trim(),
      'Website: ' + String(form.get('website') || '').trim(),
      '',
      'PORTFOLIO',
      'Total rooms: ' + totalRooms,
      'Total establishments: ' + totalEstablishments,
      'Establishments in South Africa: ' + saEstablishments,
      'South African provinces: ' + (selectedProvinces.length ? selectedProvinces.join(', ') : 'None specified'),
      'Establishments outside South Africa: ' + internationalCount,
      'Other countries: ' + (selectedCountries.length ? selectedCountries.join(', ') : 'None specified'),
      '',
      'REQUIREMENTS',
      'Areas of interest: ' + (form.getAll('interests').join(', ') || 'None specified'),
      'Additional requirements: ' + (comments || 'None provided'),
    ].join('\n');

    try {
      const response = await fetch('/.netlify/functions/homepage-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'inquiry',
          lead: {
            fullName: form.get('fullName'),
            companyName: form.get('companyName'),
            email: form.get('email'),
            telephone: form.get('telephone'),
            address: form.get('website') || 'Enterprise enquiry',
          },
          topic: 'Enterprise enquiry',
          comments: details,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to send your enquiry.');
      setSuccess(true);
      setMessage('Thank you. Your Enterprise enquiry has been sent. Our team will be in touch.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to send your enquiry.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="enterprise-inquiry-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white text-stone-900 shadow-2xl">
        <div className="flex items-start justify-between border-b border-stone-200 px-6 py-5 md:px-8">
          <div className="pr-8">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-600">Enterprise</p>
            <h2 id="enterprise-inquiry-title" className="mt-2 text-2xl font-bold md:text-3xl">Tell us about your portfolio</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">
              Share a few details so we can understand your requirements and prepare an Enterprise discussion around your portfolio.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close Enterprise enquiry"
            className="rounded-full p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900 disabled:opacity-40"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {success ? (
          <div className="overflow-y-auto px-6 py-12 md:px-8">
            <div className="mx-auto max-w-xl rounded-2xl border border-stone-200 bg-stone-50 p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500 text-xl font-black text-stone-950">✓</div>
              <h3 className="mt-5 text-2xl font-bold">Enquiry received</h3>
              <p className="mt-3 text-stone-600">{message}</p>
              <button type="button" onClick={onClose} className="mt-7 rounded-xl bg-stone-950 px-7 py-3 font-bold text-amber-400 hover:bg-stone-800">
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submitEnterpriseInquiry} className="overflow-y-auto px-6 py-6 md:px-8">
            <div className="space-y-8">
              <section>
                <h3 className="text-lg font-bold">Contact details</h3>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label>
                    <span className="mb-1.5 block text-sm font-semibold">Full name</span>
                    <input name="fullName" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-sm font-semibold">Company / group name</span>
                    <input name="companyName" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-sm font-semibold">Email address</span>
                    <input name="email" type="email" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-sm font-semibold">Telephone</span>
                    <input name="telephone" type="tel" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" />
                  </label>
                  <label className="md:col-span-2">
                    <span className="mb-1.5 block text-sm font-semibold">Website <span className="font-normal text-stone-500">(optional)</span></span>
                    <input name="website" type="url" placeholder="https://" className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" />
                  </label>
                </div>
              </section>

              <section className="border-t border-stone-200 pt-7">
                <h3 className="text-lg font-bold">Portfolio</h3>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <label>
                    <span className="mb-1.5 block text-sm font-semibold">Total number of rooms</span>
                    <input name="totalRooms" type="number" min="21" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" placeholder="e.g. 120" />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-sm font-semibold">Number of establishments</span>
                    <input name="totalEstablishments" type="number" min="1" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" placeholder="e.g. 8" />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-sm font-semibold">Establishments in South Africa</span>
                    <input name="saEstablishments" type="number" min="0" required className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" placeholder="e.g. 6" />
                  </label>
                </div>

                <div className="mt-5">
                  <span className="mb-2 block text-sm font-semibold">South African provinces</span>
                  <div className="grid gap-2 rounded-2xl border border-stone-200 bg-stone-50 p-4 sm:grid-cols-2 lg:grid-cols-3">
                    {SOUTH_AFRICAN_PROVINCES.map((province) => (
                      <label key={province} className="flex items-center gap-2 text-sm text-stone-700">
                        <input
                          type="checkbox"
                          checked={selectedProvinces.includes(province)}
                          onChange={() => toggleSelection(province, selectedProvinces, setSelectedProvinces)}
                          className="h-4 w-4 rounded border-stone-300 accent-amber-500"
                        />
                        {province}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label>
                    <span className="mb-1.5 block text-sm font-semibold">Establishments outside South Africa</span>
                    <input
                      name="internationalCount"
                      type="number"
                      min="0"
                      value={internationalCount}
                      onChange={(event) => setInternationalCount(Math.max(0, Number(event.target.value) || 0))}
                      className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3"
                      placeholder="0"
                    />
                  </label>
                  <div>
                    <span className="mb-1.5 block text-sm font-semibold">Other countries</span>
                    <div className="grid max-h-40 grid-cols-2 gap-2 overflow-y-auto rounded-xl border border-stone-300 bg-white p-3">
                      {COUNTRIES.map((country) => (
                        <label key={country} className="flex items-center gap-2 text-sm text-stone-700">
                          <input
                            type="checkbox"
                            disabled={internationalCount === 0}
                            checked={selectedCountries.includes(country)}
                            onChange={() => toggleSelection(country, selectedCountries, setSelectedCountries)}
                            className="h-4 w-4 rounded border-stone-300 accent-amber-500"
                          />
                          {country}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="border-t border-stone-200 pt-7">
                <h3 className="text-lg font-bold">What are you looking for?</h3>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {[
                    'Enterprise platform',
                    'Multi-establishment management',
                    'Digital guest check-in',
                    'Guest management and compliance',
                    'Hotel operations and housekeeping',
                    'Analytics and reporting',
                    'Visitor Origin Explorer',
                    'Business Snapshot',
                    'Payments and card tokenization',
                    'Integration / API',
                    'Other',
                  ].map((interest) => (
                    <label key={interest} className="flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2.5 text-sm text-stone-700 hover:bg-stone-50">
                      <input type="checkbox" name="interests" value={interest} className="h-4 w-4 rounded border-stone-300 accent-amber-500" />
                      {interest}
                    </label>
                  ))}
                </div>
                <label className="mt-5 block">
                  <span className="mb-1.5 block text-sm font-semibold">Additional requirements</span>
                  <textarea name="comments" rows={4} className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3" placeholder="Tell us about any specific requirements, integrations, reporting needs or other considerations…" />
                </label>
              </section>
            </div>

            {message && <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{message}</p>}

            <div className="mt-7 flex flex-col-reverse gap-3 border-t border-stone-200 pt-6 sm:flex-row sm:justify-end">
              <button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-stone-300 px-7 py-3 font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-40">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="rounded-xl bg-stone-950 px-7 py-3 font-bold text-amber-400 hover:bg-stone-800 disabled:opacity-60">
                {busy ? 'Sending…' : 'Send Enterprise Enquiry'}
              </button>
            </div>
            <p className="mt-4 text-xs text-stone-500">Your information is handled in accordance with our Privacy Policy.</p>
          </form>
        )}
      </div>
    </div>
  );
}
