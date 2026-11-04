// src/pages/admin/ApproveBusinesses.tsx
import { useState, useEffect } from 'react';
import { getAuthHeader } from '../../utils/auth';

interface Director {
  name: string;
  id_number?: string;
  idNumber?: string;
  id_photo_url?: string;
  idPhoto?: string;
}

interface OriginalApplicationDocument { id: string; document_key: string; director_name: string; original_filename: string; content_type: string; dataUrl: string; }
interface ApplicationDocument { id: string; document_key: string; original_filename: string; content_type: string; created_at: string; signedUrl: string | null; }
interface ReviewRequest { id: string; request_type: string; document_key: string | null; message: string; status: string; applicant_response: string | null; requested_at: string; responded_at: string | null; }

interface Business {
  id: string;
  registered_name: string;
  business_number: string;
  trading_name: string;
  phone: string;
  email: string;
  physical_address: any;
  postal_address: any;
  directors: Director[];
  subscription_tier: string;
  payment_method: string;
  status: string;
  total_rooms?: number;
  avg_price?: number;
  seasons?: any;
  setup_complete?: boolean;
  created_at: string;
  registration_payment_status?: string;
}

export default function ApproveBusinesses() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [showIdModal, setShowIdModal] = useState(false);
  const [selectedIdPhoto, setSelectedIdPhoto] = useState('');
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [requestType, setRequestType] = useState<'clarification' | 'additional_information' | 'document_replacement'>('clarification');
  const [requestMessage, setRequestMessage] = useState('');
  const [documentKey, setDocumentKey] = useState('');
  const [documentsByBusiness, setDocumentsByBusiness] = useState<Record<string, ApplicationDocument[]>>({});
  const [originalDocumentsByBusiness, setOriginalDocumentsByBusiness] = useState<Record<string, OriginalApplicationDocument[]>>({});
  const [loadingDocumentsId, setLoadingDocumentsId] = useState<string | null>(null);
  const [reviewRequestsByBusiness, setReviewRequestsByBusiness] = useState<Record<string, ReviewRequest[]>>({});

  useEffect(() => {
    fetchPendingBusinesses();
  }, []);

  const fetchPendingBusinesses = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/.netlify/functions/get-pending-businesses', {
        headers: { ...getAuthHeader() }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      // Handle both response formats
      let businessesList = [];
      if (data.success && Array.isArray(data.data)) {
        businessesList = data.data;
      } else if (Array.isArray(data)) {
        businessesList = data;
      } else {
        businessesList = [];
      }
      
      setBusinesses(businessesList);
    } catch (err) {
      console.error('Error fetching businesses:', err);
      setError(err instanceof Error ? err.message : 'Failed to load pending businesses');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (businessId: string) => {
    setApprovingId(businessId);
    try {
      const response = await fetch('/.netlify/functions/approve-business', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ businessId })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Remove from list
        setBusinesses(businesses.filter(b => b.id !== businessId));
        alert(`✅ ${data.business?.trading_name || 'Business'} approved successfully!`);
      } else {
        alert(data.error || 'Failed to approve business');
      }
    } catch (error) {
      console.error('Error approving business:', error);
      alert('An error occurred while approving');
    } finally {
      setApprovingId(null);
    }
  };

  const handleRequestInformation = async (businessId: string) => {
    if (requestMessage.trim().length < 5) {
      alert('Please explain what information or document is required.');
      return;
    }
    if (requestType === 'document_replacement' && !documentKey.trim()) {
      alert('Please identify the document that needs replacement.');
      return;
    }
    try {
      const response = await fetch('/.netlify/functions/request-business-application-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ businessId, requestType, documentKey: requestType === 'document_replacement' ? documentKey.trim() : null, message: requestMessage.trim() })
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Could not send the request');
      alert(data.emailSent ? 'Request sent to the applicant by email.' : 'Request saved, but the email could not be sent. Check the Resend configuration.');
      setRequestingId(null);
      setRequestMessage('');
      setDocumentKey('');
      setRequestType('clarification');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not send the request');
    }
  };

  const loadApplicationDocuments = async (businessId: string) => {
    setLoadingDocumentsId(businessId);
    try {
      const query = new URLSearchParams({ businessId });
      const response = await fetch(`/.netlify/functions/get-business-application-documents?${query.toString()}`, { headers: { ...getAuthHeader() } });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Could not load documents');
      setDocumentsByBusiness((current) => ({ ...current, [businessId]: data.documents || [] }));
      setOriginalDocumentsByBusiness((current) => ({ ...current, [businessId]: data.originalDocuments || [] }));
      setReviewRequestsByBusiness((current) => ({ ...current, [businessId]: data.reviewRequests || [] }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not load documents');
    } finally {
      setLoadingDocumentsId(null);
    }
  };

  const viewIdPhoto = (photoBase64: string, businessName: string) => {
    setSelectedIdPhoto(photoBase64);
    setSelectedBusiness(null);
    setShowIdModal(true);
  };

  const downloadIdPhoto = () => {
    const link = document.createElement('a');
    link.href = selectedIdPhoto;
    link.download = 'id-document.png';
    link.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading pending businesses...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Pending Businesses</h2>
            <p className="text-gray-500 mb-6">{error}</p>
            <button
              onClick={fetchPendingBusinesses}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
            >
              Try Again
            </button>
            <button
              onClick={() => window.history.back()}
              className="ml-3 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Pending Business Approvals ({businesses.length})
          </h1>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Back to Dashboard
          </button>
        </div>

        {businesses.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-green-500 text-6xl mb-4">✅</div>
            <p className="text-gray-500 text-lg">No pending businesses to approve</p>
            <p className="text-gray-400 mt-2">Check back later for new registrations</p>
          </div>
        ) : (
          <div className="space-y-6">
            {businesses.map((business) => (
              <div key={business.id} className="bg-white rounded-lg shadow overflow-hidden">
                {/* Business Header */}
                <div className="bg-orange-50 px-6 py-4 border-b border-orange-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        {business.trading_name}
                      </h2>
                      <p className="text-sm text-gray-600">
                        Registered as: {business.registered_name}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                      Pending
                    </span>
                  </div>
                </div>

                {/* Business Details */}
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column - Business Info */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Business Information</h3>
                      <dl className="space-y-3">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Business Number</dt>
                          <dd className="text-sm text-gray-900">{business.business_number}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Contact</dt>
                          <dd className="text-sm text-gray-900">{business.phone}</dd>
                          <dd className="text-sm text-gray-900">{business.email}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Subscription</dt>
                          <dd className="text-sm text-gray-900 capitalize">{business.subscription_tier}</dd>
                          <dd className="text-sm text-gray-900">Payment: {business.payment_method}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Physical Address</dt>
                          <dd className="text-sm text-gray-900 whitespace-pre-line">
                            {business.physical_address?.street}<br />
                            {business.physical_address?.city}, {business.physical_address?.province}<br />
                            {business.physical_address?.postalCode}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    {/* Right Column - Directors with ID Photos */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Directors / Owners</h3>
                      <div className="space-y-4">
                        {business.directors && business.directors.length > 0 ? (
                          business.directors.map((director, index) => (
                            <div key={index} className="border rounded-lg p-4">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-medium text-gray-900">{director.name}</p>
                                  <p className="text-sm text-gray-600">ID: {director.id_number || director.idNumber || 'Not provided'}</p>
                                </div>
                                {(director.id_photo_url || director.idPhoto) && (
                                  <button
                                    onClick={() => viewIdPhoto((director.id_photo_url || director.idPhoto)!, business.trading_name)}
                                    className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100 transition-colors"
                                  >
                                    View original ID
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">No director information provided</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-5">
                    <p className="text-sm text-gray-600">
                      Card validation: <strong className={business.registration_payment_status === 'verified' ? 'text-green-700' : 'text-amber-700'}>{business.registration_payment_status || 'Not verified'}</strong>
                    </p>
                    <div className="flex flex-wrap justify-end gap-3">
                      <button
                        onClick={() => loadApplicationDocuments(business.id)}
                        disabled={loadingDocumentsId === business.id}
                        className="px-5 py-2 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 font-medium disabled:opacity-50"
                      >
                        {loadingDocumentsId === business.id ? 'Loading documents…' : 'View uploaded documents'}
                      </button>
                      <button
                        onClick={() => setRequestingId(requestingId === business.id ? null : business.id)}
                        className="px-5 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium"
                      >
                        Request more information
                      </button>
                      <button
                        onClick={() => handleApprove(business.id)}
                        disabled={approvingId === business.id || business.registration_payment_status !== 'verified'}
                        title={business.registration_payment_status !== 'verified' ? 'Applicant must validate a card before approval' : 'Approve business'}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {approvingId === business.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            Approving...
                          </>
                        ) : 'Approve Business'}
                      </button>
                    </div>
                  </div>
                  {reviewRequestsByBusiness[business.id] && reviewRequestsByBusiness[business.id].length > 0 && (
                    <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Application review history</h3>
                      <div className="space-y-4">
                        {reviewRequestsByBusiness[business.id].map((item) => (
                          <div key={item.id} className="border-b border-indigo-100 pb-3 last:border-0 last:pb-0">
                            <div className="flex flex-wrap justify-between gap-2">
                              <strong className="text-sm text-gray-800">{item.request_type.replaceAll('_', ' ')}{item.document_key ? ` — ${item.document_key}` : ''}</strong>
                              <span className={item.status === 'responded' ? 'text-sm text-green-700' : 'text-sm text-amber-700'}>{item.status.replaceAll('_', ' ')}</span>
                            </div>
                            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{item.message}</p>
                            {item.applicant_response && <div className="mt-2 rounded-lg bg-white p-3"><p className="text-xs font-semibold uppercase text-gray-500 mb-1">Applicant response</p><p className="whitespace-pre-wrap text-sm text-gray-800">{item.applicant_response}</p></div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {documentsByBusiness[business.id] && (
                    <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
                      {originalDocumentsByBusiness[business.id]?.length > 0 && (
                        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
                          <h4 className="font-semibold text-gray-900 mb-2">Original registration documents</h4>
                          <ul className="space-y-2">
                            {originalDocumentsByBusiness[business.id].map((doc) => (
                              <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                                <span className="text-gray-700">{doc.original_filename}</span>
                                <button onClick={() => viewIdPhoto(doc.dataUrl, business.trading_name)} className="text-blue-700 underline">View original registration document</button>
                              </li>
                            ))}
                          </ul>
                          <p className="mt-2 text-xs text-gray-600">Original files are retained separately and are never replaced by later uploads.</p>
                        </div>
                      )}
                      <h3 className="font-semibold text-gray-900 mb-2">Replacement and additional documents</h3>
                      {documentsByBusiness[business.id].length === 0 ? (
                        <p className="text-sm text-gray-500">No replacement or additional documents have been uploaded yet.</p>
                      ) : (
                        <ul className="space-y-2">
                          {documentsByBusiness[business.id].map((doc, index) => (
                            <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                              <span className="text-gray-700">{doc.document_key}: {doc.original_filename}{index === 0 ? " — Latest upload" : ""}</span>
                              {doc.signedUrl ? <a href={doc.signedUrl} target="_blank" rel="noreferrer" className="text-blue-700 underline">View / download</a> : <span className="text-red-600">File unavailable</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                      <p className="mt-2 text-xs text-gray-500">Secure document links expire after 10 minutes.</p>
                    </div>
                  )}
                  {requestingId === business.id && (
                    <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-5">
                      <h3 className="font-semibold text-gray-900 mb-3">Request information from applicant</h3>
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700">
                          Request type
                          <select value={requestType} onChange={(e) => setRequestType(e.target.value as typeof requestType)} className="mt-1 block w-full rounded-lg border border-gray-300 bg-white p-2">
                            <option value="clarification">Clarification</option>
                            <option value="additional_information">Additional information</option>
                            <option value="document_replacement">Clearer / replacement document</option>
                          </select>
                        </label>
                        {requestType === 'document_replacement' && (
                          <label className="block text-sm font-medium text-gray-700">
                            Document to replace
                            <input value={documentKey} onChange={(e) => setDocumentKey(e.target.value)} placeholder="e.g. Director ID / proof of address" className="mt-1 block w-full rounded-lg border border-gray-300 bg-white p-2" />
                          </label>
                        )}
                        <label className="block text-sm font-medium text-gray-700">
                          Message to applicant
                          <textarea value={requestMessage} onChange={(e) => setRequestMessage(e.target.value)} rows={4} maxLength={4000} placeholder="Clearly explain what is missing or what needs to be clarified…" className="mt-1 block w-full rounded-lg border border-gray-300 bg-white p-3" />
                        </label>
                        <div className="flex justify-end gap-3">
                          <button onClick={() => setRequestingId(null)} className="px-4 py-2 rounded-lg bg-white text-gray-700 border">Cancel</button>
                          <button onClick={() => handleRequestInformation(business.id)} className="px-5 py-2 rounded-lg bg-blue-700 text-white hover:bg-blue-800">Send request</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ID Photo Modal */}
        {showIdModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold">ID Document</h3>
                  <button
                    onClick={() => setShowIdModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
                <div className="bg-gray-100 rounded-lg p-4 flex justify-center">
                  <img 
                    src={selectedIdPhoto} 
                    alt="ID Document" 
                    className="max-w-full max-h-[70vh] object-contain"
                  />
                </div>
                <div className="mt-4 flex justify-end gap-3">
                  <button
                    onClick={() => setShowIdModal(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Close
                  </button>
                  <button
                    onClick={downloadIdPhoto}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                  >
                    Download Image
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
