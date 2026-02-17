'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

// Grid data: before ScorchLocal (high number = bad rank)
const GRID_BEFORE = [
  [20, 18, 15, 14, 16, 19, 20],
  [18, 14, 12, 11, 13, 15, 18],
  [16, 12,  9,  8, 10, 13, 16],
  [15, 11,  8,  7,  9, 12, 15],
  [16, 13, 10,  9, 11, 14, 17],
  [18, 15, 13, 12, 14, 17, 19],
  [20, 19, 16, 15, 17, 20, 20],
];

// Grid data: after ScorchLocal (low number = good rank)
const GRID_AFTER = [
  [14, 11,  9,  8, 10, 12, 15],
  [11,  8,  5,  4,  6,  9, 12],
  [ 9,  5,  2,  1,  2,  6, 10],
  [ 8,  4,  1,  1,  1,  5,  9],
  [ 9,  5,  2,  1,  2,  6, 11],
  [12,  9,  6,  5,  7, 10, 14],
  [15, 13, 10,  9, 12, 15, 17],
];

function rankColor(rank: number): string {
  if (rank <= 3) return '#22c55e';
  if (rank <= 7) return '#f59e0b';
  if (rank <= 10) return '#f97316';
  return '#ef4444';
}

function rankBg(rank: number): string {
  if (rank <= 3) return 'rgba(34,197,94,0.15)';
  if (rank <= 7) return 'rgba(245,158,11,0.15)';
  if (rank <= 10) return 'rgba(249,115,22,0.15)';
  return 'rgba(239,68,68,0.12)';
}

function LocalGridDemo() {
  const [phase, setPhase] = useState<'before' | 'transition' | 'after'>('before');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 100);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const cycle = 75;
    const pos = tick % cycle;
    if (pos < 30) setPhase('before');
    else if (pos < 45) setPhase('transition');
    else setPhase('after');
  }, [tick]);

  const isAfter = phase === 'after';
  const isTransition = phase === 'transition';
  const label = phase === 'before' ? 'Without ScorchLocal' : phase === 'after' ? 'With ScorchLocal' : 'Improving...';
  const labelColor = phase === 'after' ? '#22c55e' : phase === 'transition' ? '#f59e0b' : '#ef4444';

  return (
    <div className="select-none">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: labelColor, boxShadow: `0 0 6px ${labelColor}` }} />
        <span className="text-xs font-mono" style={{ color: labelColor }}>{label}</span>
      </div>
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="text-xs text-ash-400">📍 Portland, OR</span>
        <span className="text-xs text-ash-600">•</span>
        <span className="text-xs text-ash-400 font-mono">"plumber near me"</span>
      </div>
      <div
        className="relative rounded-lg overflow-hidden border border-char-700"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', padding: '6px', background: '#1a1a1a' }}
      >
        {(isAfter ? GRID_AFTER : GRID_BEFORE).map((row, r) =>
          row.map((rank, c) => {
            const afterRank = GRID_AFTER[r][c];
            const beforeRank = GRID_BEFORE[r][c];
            const displayRank = isTransition
              ? Math.round(beforeRank + (afterRank - beforeRank) * ((tick % 75 - 30) / 15))
              : rank;
            const isCenter = r === 3 && c === 3;
            return (
              <div
                key={`${r}-${c}`}
                className="relative flex items-center justify-center rounded"
                style={{
                  aspectRatio: '1',
                  background: isCenter ? 'transparent' : rankBg(displayRank),
                  border: isCenter ? '2px solid #f97316' : '1px solid rgba(255,255,255,0.05)',
                  transition: 'background 0.3s',
                }}
              >
                {isCenter ? (
                  <div className="flex flex-col items-center">
                    <div style={{ fontSize: '14px' }}>📍</div>
                    <div style={{ fontSize: '8px', color: '#f97316', fontWeight: 700, lineHeight: 1 }}>#1</div>
                  </div>
                ) : (
                  <span style={{ fontSize: '11px', fontWeight: 700, fontFamily: 'monospace', color: rankColor(displayRank), transition: 'color 0.3s' }}>
                    {displayRank > 20 ? '20+' : displayRank}
                  </span>
                )}
              </div>
            );
          })
        )}
        {isTransition && (
          <div className="absolute inset-0 rounded-lg pointer-events-none" style={{ background: 'rgba(249,115,22,0.05)' }} />
        )}
      </div>
      <div className="flex items-center gap-4 mt-3 px-1">
        {[['#22c55e', '#1–3'], ['#f59e0b', '#4–7'], ['#f97316', '#8–10'], ['#ef4444', '10+']].map(([color, label]) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm" style={{ background: color }} />
            <span className="text-xs text-ash-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

export default function LandingPage() {
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Reset form when switching modes
  const switchMode = (newMode: 'signup' | 'signin') => {
    setMode(newMode);
    setError('');
    setPassword('');
  };

  const handleGoogleAuth = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/callback` },
    });
    if (error) setError(error.message);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setEmailSent(true);
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      <div className="absolute inset-0 bg-hero-glow pointer-events-none" />

      {/* Left: Grid Demo */}
      <div className="hidden lg:flex flex-col justify-center flex-1 px-16 relative z-10">
        <h1 className="font-display text-6xl mb-3">
          <span className="text-flame-500">Scorch</span>
          <span className="text-ash-100">Local</span>
        </h1>
        <p className="text-lg text-ash-300 max-w-md mb-10">
          See exactly where you rank on Google Maps — across every neighborhood you serve.
        </p>
        <div className="max-w-xs">
          <LocalGridDemo />
        </div>
        <p className="text-sm text-ash-500 mt-8 max-w-sm">
          Track rankings across a geographic grid. Identify weak spots. Fix them. Dominate your market.
        </p>
      </div>

      {/* Right: Auth Form */}
      <div className="flex flex-col justify-center w-full lg:w-[480px] px-6 lg:px-12 relative z-10">
        {/* Mobile: logo + grid */}
        <div className="lg:hidden mb-8">
          <div className="text-center mb-6">
            <h1 className="font-display text-4xl">
              <span className="text-flame-500">Scorch</span>
              <span className="text-ash-100">Local</span>
            </h1>
            <p className="text-ash-400 text-sm mt-1">See where you rank. Fix it. Win.</p>
          </div>
          <div className="max-w-xs mx-auto">
            <LocalGridDemo />
          </div>
        </div>

        {/* Email sent confirmation */}
        {emailSent ? (
          <div className="card p-8 text-center">
            <div className="text-5xl mb-4">✉️</div>
            <h2 className="text-2xl font-display mb-3">Check your email</h2>
            <p className="text-ash-300 mb-6">
              We sent a confirmation link to <span className="text-ash-100 font-medium">{email}</span>. Click it to activate your account.
            </p>
            <button onClick={() => { setEmailSent(false); switchMode('signin'); }} className="btn-secondary w-full">
              Back to Sign In
            </button>
          </div>
        ) : (
          <div className="card p-8">
            {/* Mode toggle tabs */}
            <div className="flex rounded-btn bg-char-900 p-1 mb-6">
              <button
                onClick={() => switchMode('signup')}
                className={`flex-1 py-2 text-sm font-semibold rounded transition-colors ${
                  mode === 'signup' ? 'bg-flame-500 text-white' : 'text-ash-400 hover:text-ash-200'
                }`}
              >
                Create Account
              </button>
              <button
                onClick={() => switchMode('signin')}
                className={`flex-1 py-2 text-sm font-semibold rounded transition-colors ${
                  mode === 'signin' ? 'bg-flame-500 text-white' : 'text-ash-400 hover:text-ash-200'
                }`}
              >
                Sign In
              </button>
            </div>

            {error && (
              <div className="bg-danger/10 border border-danger text-danger px-4 py-3 rounded-btn mb-4 text-sm">
                {error}
              </div>
            )}

            {/* Sign Up Form */}
            {mode === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <label className="input-label">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input"
                    placeholder="Jane Smith"
                    required
                  />
                </div>
                <div>
                  <label className="input-label">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input"
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="input-label">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
                <button type="submit" className="btn-primary w-full" disabled={loading}>
                  {loading ? 'Creating account...' : 'Create Free Account'}
                </button>
              </form>
            )}

            {/* Sign In Form */}
            {mode === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="input-label">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input"
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="input-label">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input"
                    placeholder="••••••••"
                    required
                  />
                </div>
                <button type="submit" className="btn-primary w-full" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            )}

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-char-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-char-800 text-ash-400">Or continue with</span>
              </div>
            </div>

            <button onClick={handleGoogleAuth} className="btn-ghost w-full flex items-center justify-center gap-2">
              <GoogleIcon />
              Continue with Google
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
