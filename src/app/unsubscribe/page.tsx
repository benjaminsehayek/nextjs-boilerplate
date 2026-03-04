'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const token = searchParams.get('token') || '';

  const [resubStatus, setResubStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleResubscribe() {
    setResubStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/marketing/resubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResubStatus('success');
      } else {
        setResubStatus('error');
        setErrorMsg(data.error || 'Failed to re-subscribe. Please try again.');
      }
    } catch {
      setResubStatus('error');
      setErrorMsg('Network error. Please try again.');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-char-900 p-4">
      <div className="bg-char-800 border border-char-700 rounded-btn p-8 max-w-md w-full text-center space-y-4 shadow-card">
        {/* Icon */}
        <div className="text-5xl mb-2">&#9993;</div>

        {resubStatus === 'success' ? (
          <>
            <h1 className="text-2xl font-display text-success">Re-subscribed!</h1>
            <p className="text-ash-400 text-sm">
              You have been successfully re-subscribed. You will continue to receive emails from this
              sender.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-display text-ash-100">You&apos;ve been unsubscribed</h1>
            {email && (
              <p className="text-ash-400 text-sm">
                <span className="text-flame-400 font-medium">{email}</span> has been removed from our
                mailing list.
              </p>
            )}
            <p className="text-ash-500 text-sm">
              You will no longer receive emails from this sender.
            </p>

            {/* Re-subscribe option */}
            <div className="pt-2 border-t border-char-700">
              <p className="text-ash-500 text-xs mb-3">Made a mistake?</p>
              <button
                onClick={handleResubscribe}
                disabled={resubStatus === 'loading' || !email}
                className="btn-ghost text-sm w-full"
              >
                {resubStatus === 'loading' ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="spinner-sm" />
                    Re-subscribing...
                  </span>
                ) : (
                  'Re-subscribe'
                )}
              </button>
              {resubStatus === 'error' && (
                <p className="text-danger text-xs mt-2">{errorMsg}</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-char-900">
          <div className="text-ash-500">Loading...</div>
        </div>
      }
    >
      <UnsubscribeContent />
    </Suspense>
  );
}
