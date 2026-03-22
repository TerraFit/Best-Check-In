import { useParams } from 'react-router-dom';

export default function BusinessAnalytics() {
  const { businessId } = useParams();
  
  console.log('BusinessAnalytics page loaded!');
  console.log('Business ID:', businessId);
  
  return (
    <div className="min-h-screen bg-stone-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-stone-900 mb-4">Business Analytics</h1>
        <p className="text-stone-600">Business ID: {businessId}</p>
        <p className="text-stone-600 mt-4">This page is working!</p>
        <button 
          onClick={() => window.location.href = '/business/dashboard'}
          className="mt-6 px-4 py-2 bg-amber-600 text-white rounded-lg"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
