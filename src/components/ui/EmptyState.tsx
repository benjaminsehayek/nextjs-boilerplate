'use client';

import Link from 'next/link';

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
  ctaOnClick?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  ctaLabel,
  ctaHref,
  ctaOnClick,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="text-5xl mb-4 opacity-50">{icon}</div>
      <h3 className="text-ash-200 text-lg font-semibold mb-2">{title}</h3>
      <p className="text-ash-400 text-sm mb-6 max-w-sm">{description}</p>
      {ctaLabel && ctaHref && (
        <Link href={ctaHref} className="btn-primary">
          {ctaLabel}
        </Link>
      )}
      {ctaLabel && ctaOnClick && !ctaHref && (
        <button onClick={ctaOnClick} className="btn-primary">
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
