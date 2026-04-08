import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function NewsletterSubscribe() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [businessName, setBusinessName] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [copied, setCopied] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);

  const businessId = searchParams.get('business');
  const email = searchParams.get('email');
  const firstName = searchParams.get('firstName');
  const lastName = searchParams.get('lastName');
  const referralToken = searchParams.get('ref'); // For tracking referrals

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
            referred_by: referralToken || null,
            source: 'email'
          })
        });

        const data = await response.json();
        
        if (response.ok) {
          setBusinessName(data.business_name);
          setAccessToken(data.access_token);
          setStatus('success');
          // Auto-show share options after successful subscription
          setTimeout(() => setShowShareOptions(true), 1500);
        } else {
          setStatus('error');
        }
      } catch (error) {
        console.error('Subscription error:', error);
        setStatus('error');
      }
    };

    subscribe();
  }, [businessId, email, firstName, lastName, referralToken]);

  // Generate shareable link with referral token
  const generateShareLink = () => {
    const baseUrl = 'https://fastcheckin.co.za/subscribe';
    const params = new URLSearchParams({
      business: businessId || '',
      ref: accessToken || ''
    });
    return `${baseUrl}?${params.toString()}`;
  };

  // Pre-written message for sharing
  const getShareMessage = () => {
    const guestName = firstName ? decodeURIComponent(firstName) : 'a guest';
    return `🎁 I just entered to win a FREE stay at ${businessName}! 🎁\n\nJoin me in the draw - subscribe to their newsletter and you could win TWO nights + champagne!\n\n👉 ${generateShareLink()}\n\n*T&C's apply.`;
  };

  const copyShareLink = async () => {
    const shareMessage = getShareMessage();
    try {
      await navigator.clipboard.writeText(shareMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Press Ctrl+C to copy the link');
    }
  };

  const shareOnWhatsApp = () => {
    const message = encodeURIComponent(getShareMessage());
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const shareOnFacebook = () => {
    const url = encodeURIComponent(generateShareLink());
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
  };

  const shareOnTwitter = () => {
    const text = encodeURIComponent(`I just entered to win a FREE stay at ${businessName}!`);
    const url = encodeURIComponent(generateShareLink());
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  const shareOnTelegram = () => {
    const message = encodeURIComponent(getShareMessage());
    window.open(`https://t.me/share/url?url=${encodeURIComponent(generateShareLink())}&text=${message}`, '_blank');
  };

  const shareOnEmail = () => {
    const subject = encodeURIComponent(`Win a FREE stay at ${businessName}!`);
    const body = encodeURIComponent(getShareMessage());
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-white">Processing your subscription...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">😢</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-6">We couldn't process your subscription. Please try again later.</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">You're in the draw!</h2>
        <p className="text-gray-600 mb-4">
          Thank you for subscribing to <strong>{businessName}</strong>'s newsletter!
        </p>
        
        <div className="bg-amber-50 p-4 rounded-lg mb-6">
          <p className="text-amber-800 font-semibold">✨ You've been entered to win ✨</p>
          <p className="text-sm text-amber-700">Good luck! We'll contact you if you win.</p>
        </div>

        {/* Share Section */}
        <div className="border-t border-gray-200 pt-6 mt-4">
          <p className="text-sm text-gray-600 mb-4">
            🎁 <strong>Want to increase your chances?</strong>
          </p>
          <p className="text-xs text-gray-500 mb-4">
            Share with friends and get <span className="font-bold text-amber-600">+5 bonus entries</span> for each friend who subscribes!
          </p>

          {/* Share Buttons */}
          <div className="grid grid-cols-5 gap-2 mb-4">
            <button
              onClick={shareOnWhatsApp}
              className="bg-green-500 hover:bg-green-600 text-white p-3 rounded-xl transition-all"
              title="Share on WhatsApp"
            >
              <svg className="w-5 h-5 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.52-.075-.148-.67-1.614-.918-2.21-.242-.58-.486-.5-.67-.51-.173-.01-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.478 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.075 4.487.709.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              </svg>
            </button>
            <button
              onClick={shareOnFacebook}
              className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl transition-all"
              title="Share on Facebook"
            >
              <svg className="w-5 h-5 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.77 7.46H14.5v-1.9c0-.9.6-1.1 1-1.1h3V.5h-4.33C10.24.5 9.5 3.44 9.5 5.32v2.15h-3v4h3v12h5v-12h3.85l.42-4z"/>
              </svg>
            </button>
            <button
              onClick={shareOnTwitter}
              className="bg-black hover:bg-gray-800 text-white p-3 rounded-xl transition-all"
              title="Share on X (Twitter)"
            >
              <svg className="w-5 h-5 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </button>
            <button
              onClick={shareOnTelegram}
              className="bg-blue-400 hover:bg-blue-500 text-white p-3 rounded-xl transition-all"
              title="Share on Telegram"
            >
              <svg className="w-5 h-5 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.66-.35-1.02.22-1.61.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.09-.2-.1-.06-.24-.04-.34-.02-.14.02-2.37 1.5-3.33 2.11-.32.19-.6.29-.86.29-.28 0-.81-.16-1.21-.29-.49-.16-.88-.24-.85-.51.02-.14.21-.28.58-.43 2.28-.99 3.83-1.63 4.66-1.92 2.22-.77 2.68-.9 2.98-.9.07 0 .17.02.25.09.1.09.13.21.14.35.01.14-.01.29-.02.44z"/>
              </svg>
            </button>
            <button
              onClick={shareOnEmail}
              className="bg-gray-600 hover:bg-gray-700 text-white p-3 rounded-xl transition-all"
              title="Share via Email"
            >
              <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </button>
          </div>

          {/* Copy Link Button */}
          <button
            onClick={copyShareLink}
            className="w-full mt-2 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            {copied ? '✓ Copied!' : 'Copy shareable message'}
          </button>
          
          <p className="text-xs text-gray-400 mt-4">
            Each friend who subscribes gives you <strong className="text-amber-600">+5 bonus entries</strong>!
            <br />
            Share your unique link and watch your chances grow.
          </p>
        </div>

        <div className="mt-6">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Return to Home
          </button>
        </div>
      </div>
    </div>
  );
}
