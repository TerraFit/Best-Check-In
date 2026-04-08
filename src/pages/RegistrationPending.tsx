import { useLocation, Link } from 'react-router-dom';

export default function RegistrationPending() {
  const location = useLocation();
  const businessName = location.state?.businessName || 'your business';
  const email = location.state?.email || 'your email';

  return (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md text-center">
        <div className="text-6xl mb-4">📋</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h1>
        <p className="text-gray-600 mb-4">
          Thank you for applying to join FastCheckin.
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-amber-800 font-semibold">Business: {businessName}</p>
          <p className="text-sm text-amber-700">Email: {email}</p>
        </div>
        <p className="text-gray-600 mb-6">
          Your application has been received and will be reviewed shortly.
          You will receive an email once your account is approved.
        </p>
        <Link
          to="/"
          className="inline-block bg-stone-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-stone-800 transition-colors"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
}
