'use client';

import type { BusinessDomain } from '@/types';

interface DomainStatusProps {
  domain: BusinessDomain;
}

const SSL_STATUS_STYLE: Record<string, string> = {
  pending: 'bg-char-700 text-ash-400',
  provisioning: 'bg-ember-500/15 text-ember-400',
  active: 'bg-success/15 text-success',
  failed: 'bg-danger/15 text-danger',
};

const SSL_STATUS_LABEL: Record<string, string> = {
  pending: 'SSL: Pending',
  provisioning: 'SSL: Provisioning',
  active: 'SSL: Active',
  failed: 'SSL: Failed',
};

export default function DomainStatus({ domain }: DomainStatusProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {domain.dns_verified ? (
        <span className="flex items-center gap-1 text-success">
          <span>✓</span> DNS Verified
        </span>
      ) : (
        <span className="flex items-center gap-1 text-ember-400">
          <span>⏳</span> DNS Pending
        </span>
      )}
      <span className={`px-1.5 py-0.5 rounded ${SSL_STATUS_STYLE[domain.ssl_status]}`}>
        {SSL_STATUS_LABEL[domain.ssl_status]}
      </span>
      {domain.last_checked_at && (
        <span className="text-ash-600">
          Checked: {new Date(domain.last_checked_at).toLocaleDateString()}
        </span>
      )}
    </div>
  );
}
