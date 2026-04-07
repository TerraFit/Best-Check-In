import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function NewsletterSubscribe() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [businessName, setBusinessName] = useState('');

  const businessId = searchParams.get('business');
  const email = searchParams.get('email');
  const firstName = searchParams.get('firstName');
  const lastName = searchParams.get('lastName');

  useEffect(() => {
    if (!businessId || !email) {
      setStatus('error');
      return;
    }

    const subscribe = async () => {
      try {
        const response = await fetch('/.netlify/functions/newsletter-subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            business_id: businessId,
            email: decodeURIComponent(email),
            guest_name: firstName && lastName ? `${decodeURIComponent(firstName)} ${decodeURIComponent(lastName)}` : null,
            first_name: firstName ? decodeURIComponent(firstName) : null,
            last_name: lastName ? decodeURIComponent(lastName) : null,
            source: 'email'
          })
        });

        const data = await response.json();
        
        if (response.ok) {
          setBusinessName(data.business_name);
          setStatus('success');
        } else {
          setStatus('error');
        }
      } catch (error) {
        console.error('Subscription error:', error);
        setStatus('error');
      }
    };

    subscribe();
  }, [businessId, email, firstName, lastName]);

  // ... rest of the component remains the same
}
