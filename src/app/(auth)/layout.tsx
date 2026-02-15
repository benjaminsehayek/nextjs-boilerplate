export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4">
      <div className="absolute inset-0 bg-hero-glow pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl mb-2">
            <span className="text-flame-500">Scorch</span>
            <span className="text-ash-100">Local</span>
          </h1>
        </div>

        {children}
      </div>
    </div>
  );
}
