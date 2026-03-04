'use client';

// Show at 25min inactivity warning (5min before 30min timeout)
// Supabase default session = 60min, but refresh token = 60min idle
// We'll warn at 25min of inactivity

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const WARNING_MS = 25 * 60 * 1000;   // 25 minutes — show modal
const TIMEOUT_MS = 30 * 60 * 1000;   // 30 minutes — auto sign-out
const CHECK_INTERVAL_MS = 60 * 1000; // check every 60 seconds
const THROTTLE_MS = 30 * 1000;       // update lastActivity at most once per 30s

export default function SessionTimeoutModal() {
  const router = useRouter();
  const supabase = createClient();

  const [showModal, setShowModal] = useState(false);
  const lastActivity = useRef<number>(Date.now());
  const lastActivityUpdate = useRef<number>(Date.now());

  useEffect(() => {
    // Throttled activity tracker — updates at most once per 30s to avoid perf hit
    function handleActivity() {
      const now = Date.now();
      if (now - lastActivityUpdate.current >= THROTTLE_MS) {
        lastActivity.current = now;
        lastActivityUpdate.current = now;
        // If user moves/clicks while modal is showing, dismiss it and reset
        if (showModal) {
          setShowModal(false);
        }
      }
    }

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    // Check every 60s whether inactivity thresholds have been crossed
    const interval = setInterval(async () => {
      const idle = Date.now() - lastActivity.current;

      if (idle >= TIMEOUT_MS) {
        // 30 min total inactivity — auto sign-out
        await supabase.auth.signOut();
        router.push('/');
        return;
      }

      if (idle >= WARNING_MS) {
        // 25 min inactivity — show warning modal
        setShowModal(true);
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      clearInterval(interval);
    };
  }, [showModal]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleStaySignedIn() {
    await supabase.auth.refreshSession();
    lastActivity.current = Date.now();
    lastActivityUpdate.current = Date.now();
    setShowModal(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/');
  }

  if (!showModal) return null;

  return (
    <div className="animate-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="animate-modal-card card max-w-sm w-full p-6 space-y-4">
        <div>
          <h2 className="font-display text-lg text-ash-100">Still there?</h2>
          <p className="text-ash-400 text-sm mt-1">
            Your session will expire soon due to inactivity.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleStaySignedIn}
            className="btn-primary flex-1"
          >
            Stay Signed In
          </button>
          <button
            onClick={handleSignOut}
            className="btn-secondary flex-1"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
