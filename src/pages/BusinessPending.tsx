import React from 'react';
import { Link } from 'react-router-dom';

export default function BusinessPending() {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        <h1 className="text-3xl font-serif font-bold text-stone-900 mb-4">
          Pending Approval
        </h1>
        
        <p className="text-stone-600 mb-6">
          Your application is being reviewed. You can access your business dashboard while we verify the information and documents you submitted.
        </p>
        
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-amber-800 text-sm">
            You are responsible for ensuring that the information you supplied is accurate and complete. FastCheckIn will complete review and approval within 48 business hours. Live guest check-in becomes available once approved.
          </p>
        </div>
        
        <Link
          to="/business/dashboard"
          className="inline-block bg-orange-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-orange-700 transition-colors"
        >
          Open Business Dashboard
        </Link>
        <div className="mt-4"><Link to="/" className="text-sm text-stone-500 hover:text-stone-700">Return to Home</Link></div>
      </div>
    </div>
  );
}
