import type { BillingInterval } from '@/lib/stripe/config';

interface BillingToggleProps {
  interval: BillingInterval;
  onChange: (interval: BillingInterval) => void;
}

export function BillingToggle({ interval, onChange }: BillingToggleProps) {
  return (
    <div className="inline-flex items-center gap-3 p-1 bg-char-800 rounded-btn border border-char-700">
      <button
        onClick={() => onChange('monthly')}
        className={`
          px-6 py-2 rounded-btn font-medium transition-all
          ${
            interval === 'monthly'
              ? 'bg-flame-500 text-white'
              : 'text-ash-300 hover:text-ash-100'
          }
        `}
      >
        Monthly
      </button>
      <button
        onClick={() => onChange('annual')}
        className={`
          px-6 py-2 rounded-btn font-medium transition-all relative
          ${
            interval === 'annual'
              ? 'bg-flame-500 text-white'
              : 'text-ash-300 hover:text-ash-100'
          }
        `}
      >
        Annual
        <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-success text-white text-xs font-bold rounded-full">
          Save 17%
        </span>
      </button>
    </div>
  );
}
