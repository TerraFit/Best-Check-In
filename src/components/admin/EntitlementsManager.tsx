// src/components/admin/EntitlementsManager.tsx
import { useState, useEffect } from 'react';
import ComplimentaryPlanModal from './ComplimentaryPlanModal';
import { SubscriptionEntitlement } from '../../types/entitlements';

interface EntitlementsManagerProps {
  businessId: string;
  businessName: string;
}

export default function EntitlementsManager({ businessId, businessName }: EntitlementsManagerProps) {
  const [entitlements, setEntitlements] = useState<SubscriptionEntitlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComplimentaryModal, setShowComplimentaryModal] = useState(false);

  useEffect(() => {
    fetchEntitlements();
  }, [businessId]);

  const fetchEntitlements = async () => {
    try {
      const response = await fetch(`/.netlify/functions/get-entitlements?businessId=${businessId}`);
      const data = await response.json();
      setEntitlements(data);
    } catch (error) {
      console.error('Error fetching entitlements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (entitlement: SubscriptionEntitlement) => {
    const now = new Date();
    const isActive = entitlement.isActive && 
      entitlement.startsAt <= now &&
      (entitlement.lifetime || !entitlement.endsAt || entitlement.endsAt > now);

    if (!isActive) {
      if (entitlement.endsAt && entitlement.endsAt < now) {
        return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Expired</span>;
      }
      return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">Inactive</span>;
    }

    if (entitlement.type === 'complimentary_plan') {
      return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Active ✨</span>;
    }
    if (entitlement.type === 'trial') {
      return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Trial</span>;
    }
    return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Active</span>;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      complimentary_plan: 'Complimentary Plan',
      discount_percentage: 'Percentage Discount',
      discount_fixed: 'Fixed Discount',
      trial: 'Free Trial',
      promo_code: 'Promo Code'
    };
    return labels[type] || type;
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'Permanent';
    return new Date(date).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return <div className="animate-pulse">Loading entitlements...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-medium text-gray-900">Entitlements & Promotions</h4>
        <button
          onClick={() => setShowComplimentaryModal(true)}
          className="px-3 py-1 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600"
        >
          + Grant Complimentary Plan
        </button>
      </div>

      {/* Entitlements List */}
      {entitlements.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          No active entitlements
        </div>
      ) : (
        <div className="space-y-3">
          {entitlements.map((entitlement) => (
            <div key={entitlement.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {getTypeLabel(entitlement.type)}
                    </span>
                    {getStatusBadge(entitlement)}
                  </div>
                  
                  {entitlement.complimentaryPlan && (
                    <p className="text-sm text-gray-600 mt-1">
                      Plan: <span className="font-medium capitalize">{entitlement.complimentaryPlan}</span>
                    </p>
                  )}
                  
                  {entitlement.value && (
                    <p className="text-sm text-gray-600 mt-1">
                      Value: <span className="font-medium">
                        {entitlement.type === 'discount_percentage' 
                          ? `${entitlement.value}% off` 
                          : `R${entitlement.value} off`}
                      </span>
                    </p>
                  )}

                  {entitlement.promoCode && (
                    <p className="text-sm text-gray-600 mt-1">
                      Code: <span className="font-mono font-medium">{entitlement.promoCode}</span>
                    </p>
                  )}

                  <p className="text-xs text-gray-400 mt-1">
                    {formatDate(entitlement.startsAt)} → {formatDate(entitlement.endsAt)}
                  </p>
                  
                  {entitlement.notes && (
                    <p className="text-xs text-gray-500 mt-1 italic">{entitlement.notes}</p>
                  )}
                </div>

                <button
                  onClick={async () => {
                    if (confirm('Revoke this entitlement?')) {
                      // API call to revoke
                    }
                  }}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Revoke
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Complimentary Plan Modal */}
      {showComplimentaryModal && (
        <ComplimentaryPlanModal
          businessId={businessId}
          businessName={businessName}
          onClose={() => setShowComplimentaryModal(false)}
          onSaved={fetchEntitlements}
        />
      )}
    </div>
  );
}
