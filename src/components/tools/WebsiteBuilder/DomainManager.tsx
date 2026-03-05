'use client';

import { useState, useEffect } from 'react';
import type { BusinessDomain } from '@/types';
import DomainStatus from './DomainStatus';

interface DomainManagerProps {
  businessId: string;
}

export default function DomainManager({ businessId }: DomainManagerProps) {
  const [domains, setDomains] = useState<BusinessDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDomain, setNewDomain] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [instructions, setInstructions] = useState<any>(null);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [verifyMessage, setVerifyMessage] = useState<{ id: string; msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    load();
  }, [businessId]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/website-builder/domains?businessId=${businessId}`);
      const data = await res.json();
      if (res.ok) setDomains(data.domains ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!newDomain.trim()) return;
    setAdding(true);
    setAddError('');
    try {
      const res = await fetch('/api/website-builder/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, domain: newDomain.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setDomains((prev) => [data.domain, ...prev]);
        setInstructions(data.instructions);
        setNewDomain('');
      } else {
        setAddError(data.error ?? 'Failed to add domain');
      }
    } finally {
      setAdding(false);
    }
  }

  async function handleVerify(domainId: string) {
    setVerifying(domainId);
    setVerifyMessage(null);
    try {
      const res = await fetch('/api/website-builder/domains/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainId }),
      });
      const data = await res.json();
      setVerifyMessage({ id: domainId, msg: data.message, ok: data.verified });
      if (data.verified) await load();
    } finally {
      setVerifying(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this domain?')) return;
    const res = await fetch(`/api/website-builder/domains/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setDomains((prev) => prev.filter((d) => d.id !== id));
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold text-ash-100 mb-1">Custom Domains</h2>
        <p className="text-xs text-ash-500">Connect your own domain to serve your pages</p>
      </div>

      {/* Add domain form */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newDomain}
          onChange={(e) => setNewDomain(e.target.value)}
          placeholder="example.com"
          className="input flex-1 text-sm"
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
        />
        <button onClick={handleAdd} disabled={adding || !newDomain.trim()} className="btn-primary text-sm">
          {adding ? 'Adding…' : 'Add Domain'}
        </button>
      </div>
      {addError && <p className="text-xs text-danger">{addError}</p>}

      {/* DNS setup instructions for newly added domain */}
      {instructions && (
        <div className="card border-flame-500/30 space-y-3">
          <h3 className="text-sm font-semibold text-ash-100">DNS Setup Required</h3>
          <p className="text-xs text-ash-400">Add these DNS records at your domain registrar, then click Verify:</p>
          <div className="space-y-2 font-mono text-xs">
            <div className="bg-char-900 rounded p-2">
              <div className="text-ash-500 mb-1">Step 1 — Verification TXT record:</div>
              <div className="text-ash-200">Name: <span className="text-flame-400">{instructions.txt_record.name}</span></div>
              <div className="text-ash-200">Type: <span className="text-flame-400">TXT</span></div>
              <div className="text-ash-200">Value: <span className="text-flame-400 break-all">{instructions.txt_record.value}</span></div>
              <div className="text-ash-200">TTL: <span className="text-flame-400">{instructions.txt_record.ttl}</span></div>
            </div>
            <div className="bg-char-900 rounded p-2">
              <div className="text-ash-500 mb-1">Step 2 — CNAME record (for serving):</div>
              <div className="text-ash-200">Name: <span className="text-flame-400">{instructions.cname_record.name}</span></div>
              <div className="text-ash-200">Type: <span className="text-flame-400">CNAME</span></div>
              <div className="text-ash-200">Value: <span className="text-flame-400">{instructions.cname_record.value}</span></div>
            </div>
          </div>
          <button onClick={() => setInstructions(null)} className="btn-ghost text-xs">Dismiss</button>
        </div>
      )}

      {/* Domain list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => <div key={i} className="h-16 bg-char-800 rounded-btn animate-pulse" />)}
        </div>
      ) : domains.length === 0 ? (
        <div className="card text-center py-8 text-ash-500 text-sm">
          No custom domains yet
        </div>
      ) : (
        <div className="space-y-3">
          {domains.map((domain) => (
            <div key={domain.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-ash-100 text-sm">{domain.domain}</div>
                  <div className="mt-1">
                    <DomainStatus domain={domain} />
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {!domain.dns_verified && (
                    <button
                      onClick={() => handleVerify(domain.id)}
                      disabled={verifying === domain.id}
                      className="btn-ghost text-xs"
                    >
                      {verifying === domain.id ? 'Checking…' : 'Verify DNS'}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(domain.id)}
                    className="btn-ghost text-xs text-danger/70 hover:text-danger border-danger/20"
                  >
                    Remove
                  </button>
                </div>
              </div>
              {verifyMessage?.id === domain.id && (
                <p className={`mt-2 text-xs ${verifyMessage.ok ? 'text-success' : 'text-ember-400'}`}>
                  {verifyMessage.msg}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
