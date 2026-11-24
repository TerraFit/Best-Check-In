import { useLocation, Link } from 'react-router-dom';

export default function RegistrationPending() {
  const location = useLocation();
  const businessName = location.state?.businessName || 'your business';
  const email = location.state?.email || 'your email';
  const cardValidated = Boolean(location.state?.cardValidated);
  const confirmationEmailSent = Boolean(location.state?.confirmationEmailSent);

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
        <p className="text-gray-600 mb-3">
          {cardValidated ? 'Your card has been validated successfully. No amount has been debited.' : 'Your application has been received.'}
        </p>
        <div className="text-left rounded-xl bg-stone-50 border border-stone-200 p-4 mb-6 text-sm text-gray-700 space-y-3">
          <p><strong>Application review</strong><br />FastCheckIn will verify the information and supporting documents you submitted and aims to complete approval within 48 business hours. You are responsible for ensuring that your application information is accurate and complete.</p>
          <p><strong>Your subscription</strong><br />No amount is taken now. Your 14-day free trial starts at 00:00 South African time on the day after approval. We will remind you before the trial ends, and you may cancel your subscription at any time.</p>
          <p><strong>Access your dashboard</strong><br />{confirmationEmailSent ? `We have sent an email to ${email} with a secure link to set up your business account.` : `Your card is validated, but we could not confirm delivery of the account setup email. Please contact FastCheckIn support for assistance.`} You can access your dashboard while the application is under review once your password is set. Live guest check-in becomes available once approved.</p>
          <p>After approval, we will email you confirmation and instructions for getting started with live guest check-in.</p>
        </div>
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
