import { useState } from 'react';

interface PaymentGatewayProps {
  businessId: string;
  planId: string;
  planName: string;
  amount: number;
  billingCycle: 'monthly' | 'yearly';
  email: string;
  onSuccess: () => void;
  onCancel: () => void;
}

type GatewayType = 'payfast' | 'peach' | 'ozow' | 'yoco';

interface Gateway {
  id: GatewayType;
  name: string;
  icon: string;
  description: string;
  recommended: boolean;
  processingTime: string;
}

const gateways: Gateway[] = [
  {
    id: 'payfast',
    name: 'PayFast',
    icon: '💰',
    description: 'South Africa\'s most popular payment gateway',
    recommended: true,
    processingTime: 'Instant'
  },
  {
    id: 'peach',
    name: 'Peach Payments',
    icon: '🍑',
    description: 'Best for subscription billing',
    recommended: false,
    processingTime: 'Instant'
  },
  {
    id: 'ozow',
    name: 'Ozow',
    icon: '🏦',
    description: 'Instant EFT - Pay directly from your bank',
    recommended: false,
    processingTime: '1-5 minutes'
  },
  {
    id: 'yoco',
    name: 'Yoco',
    icon: '💳',
    description: 'Simple card payments',
    recommended: false,
    processingTime: 'Instant'
  }
];

export default function PaymentGateway({ 
  businessId, 
  planId, 
  planName, 
  amount, 
  billingCycle, 
  email, 
  onSuccess, 
  onCancel 
}: PaymentGatewayProps) {
  const [selectedGateway, setSelectedGateway] = useState<GatewayType>('payfast');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    setLoading(true);
    setError(null);

    try {
      let endpoint = '';
      switch (selectedGateway) {
        case 'payfast':
          endpoint = '/.netlify/functions/payfast-webhook';
          break;
        case 'peach':
          endpoint = '/.netlify/functions/peach-payments';
          break;
        case 'ozow':
          endpoint = '/.netlify/functions/ozow-payment';
          break;
        case 'yoco':
          endpoint = '/.netlify/functions/yoco-payment';
          break;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          planId,
          planName,
          billingCycle,
          amount,
          email,
          returnUrl: window.location.href
        })
      });

      const data = await response.json();

      if (data.redirectUrl) {
        // Redirect to payment gateway
        window.location.href = data.redirectUrl;
      } else if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        throw new Error('No redirect URL received');
      }

    } catch (err) {
      console.error('Payment error:', err);
      setError(err instanceof Error ? err.message : 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Choose Payment Method</h2>
      
      <div className="space-y-4 mb-6">
        {gateways.map(gateway => (
          <label
            key={gateway.id}
            className={`block border rounded-lg p-4 cursor-pointer transition-all ${
              selectedGateway === gateway.id
                ? 'border-orange-500 bg-orange-50'
                : 'border-gray-200 hover:border-orange-200'
            }`}
          >
            <div className="flex items-start gap-4">
              <input
                type="radio"
                name="gateway"
                value={gateway.id}
                checked={selectedGateway === gateway.id}
                onChange={() => setSelectedGateway(gateway.id)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{gateway.icon}</span>
                  <span className="font-semibold text-gray-900">{gateway.name}</span>
                  {gateway.recommended && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">{gateway.description}</p>
                <p className="text-xs text-gray-400 mt-1">Processing: {gateway.processingTime}</p>
              </div>
            </div>
          </label>
        ))}
      </div>

      {/* Payment Summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-gray-900 mb-2">Payment Summary</h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">{planName} Plan ({billingCycle})</span>
            <span className="font-medium">R{amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between border-t pt-2 mt-2">
            <span className="font-semibold">Total</span>
            <span className="font-bold text-orange-600">R{amount.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handlePayment}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              Processing...
            </>
          ) : (
            `Pay R${amount.toLocaleString()}`
          )}
        </button>
      </div>

      <p className="text-xs text-gray-400 text-center mt-4">
        Secure payment powered by {gateways.find(g => g.id === selectedGateway)?.name}
      </p>
    </div>
  );
}
