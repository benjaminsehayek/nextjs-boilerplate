import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-hero-glow pointer-events-none" />

      <main className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <div className="mb-8">
          <h1 className="font-display text-5xl md:text-6xl mb-4">
            <span className="text-flame-500">Scorch</span>
            <span className="text-ash-100">Local</span>
          </h1>
          <p className="text-xl md:text-2xl text-ash-300 max-w-2xl mx-auto">
            DIY marketing tools built for local contractors. Transparent. ROI-focused. No agency BS.
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          <Link href="/signup" className="btn-primary">
            Get Started
          </Link>
          <Link href="/login" className="btn-secondary">
            Sign In
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          <div className="card p-6 text-left">
            <div className="text-3xl mb-3">🔍</div>
            <h3 className="font-display text-lg mb-2 text-flame-500">Site Audit</h3>
            <p className="text-sm text-ash-400">52-point technical SEO analysis</p>
          </div>
          <div className="card p-6 text-left">
            <div className="text-3xl mb-3">📝</div>
            <h3 className="font-display text-lg mb-2 text-flame-500">Content Strategy</h3>
            <p className="text-sm text-ash-400">ROI-based keyword research</p>
          </div>
          <div className="card p-6 text-left">
            <div className="text-3xl mb-3">📍</div>
            <h3 className="font-display text-lg mb-2 text-flame-500">Local Grid</h3>
            <p className="text-sm text-ash-400">Maps ranking heat map</p>
          </div>
        </div>
      </main>
    </div>
  );
}
