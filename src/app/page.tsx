'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LandingPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleEmailLogin = async (e: React.FormEvent) => {
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

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/callback`,
      },
    });

    if (error) setError(error.message);
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      <div className="absolute inset-0 bg-hero-glow pointer-events-none" />

      {/* Left: Marketing */}
      <div className="hidden lg:flex flex-col justify-center flex-1 px-16 relative z-10">
        <h1 className="font-display text-6xl mb-6">
          <span className="text-flame-500">Scorch</span>
          <span className="text-ash-100">Local</span>
        </h1>
        <p className="text-xl text-ash-300 max-w-md mb-12">
          DIY marketing tools built for local contractors. Transparent. ROI-focused. No agency BS.
        </p>

        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="text-2xl">🔍</div>
            <div>
              <div className="font-display text-ash-100">Site Audit</div>
              <div className="text-sm text-ash-400">52-point technical SEO check</div>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="text-2xl">📝</div>
            <div>
              <div className="font-display text-ash-100">Content Strategy</div>
              <div className="text-sm text-ash-400">ROI-based keyword research</div>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="text-2xl">📍</div>
            <div>
              <div className="font-display text-ash-100">Local Grid</div>
              <div className="text-sm text-ash-400">Maps ranking heat map</div>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="text-2xl">👥</div>
            <div>
              <div className="font-display text-ash-100">Lead Database</div>
              <div className="text-sm text-ash-400">CRM with lead scoring</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Login Form */}
      <div className="flex flex-col justify-center w-full lg:w-[480px] px-6 lg:px-12 relative z-10">
        {/* Mobile logo */}
        <div className="lg:hidden text-center mb-10">
          <h1 className="font-display text-4xl">
            <span className="text-flame-500">Scorch</span>
            <span className="text-ash-100">Local</span>
          </h1>
          <p className="text-ash-400 text-sm mt-2">DIY marketing for local contractors</p>
        </div>

        <div className="card p-8">
          <h2 className="text-2xl font-display mb-2">Welcome back</h2>
          <p className="text-ash-400 text-sm mb-6">Sign in to your account to continue</p>

          {error && (
            <div className="bg-danger/10 border border-danger text-danger px-4 py-3 rounded-btn mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-4">
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

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-char-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-char-800 text-ash-400">Or continue with</span>
            </div>
          </div>

          <button onClick={handleGoogleLogin} className="btn-ghost w-full flex items-center justify-center gap-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <p className="text-center mt-6 text-sm text-ash-400">
            Don't have an account?{' '}
            <Link href="/signup" className="text-flame-500 hover:text-flame-600 font-semibold">
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
