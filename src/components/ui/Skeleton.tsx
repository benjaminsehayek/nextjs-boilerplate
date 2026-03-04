'use client';

interface SkeletonProps {
  variant?: 'line' | 'card' | 'ring' | 'table-row';
  className?: string;
}

export function Skeleton({ variant = 'line', className = '' }: SkeletonProps) {
  if (variant === 'line') {
    return (
      <div
        className={`h-4 rounded bg-char-700 animate-pulse w-full ${className}`}
      />
    );
  }

  if (variant === 'card') {
    return (
      <div
        className={`h-32 rounded-card bg-char-700 animate-pulse w-full ${className}`}
      />
    );
  }

  if (variant === 'ring') {
    return (
      <div
        className={`w-20 h-20 rounded-full bg-char-700 animate-pulse flex-shrink-0 ${className}`}
      />
    );
  }

  if (variant === 'table-row') {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <div className="h-4 rounded bg-char-700 animate-pulse w-full" />
        <div className="h-4 rounded bg-char-700 animate-pulse w-3/4" />
        <div className="h-4 rounded bg-char-700 animate-pulse w-1/2" />
      </div>
    );
  }

  return null;
}

interface SkeletonGroupProps {
  count?: number;
  variant?: SkeletonProps['variant'];
  className?: string;
  itemClassName?: string;
}

export function SkeletonGroup({
  count = 3,
  variant = 'line',
  className = '',
  itemClassName = '',
}: SkeletonGroupProps) {
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} variant={variant} className={itemClassName} />
      ))}
    </div>
  );
}
