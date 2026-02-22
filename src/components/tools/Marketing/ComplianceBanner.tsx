'use client';

import { useMemo } from 'react';
import type { Channel } from '@/lib/marketing/types';
import {
  validateEmailCompliance,
  validateSMSCompliance,
} from '@/lib/marketing/compliance';
import type { ComplianceResult } from '@/lib/marketing/compliance';

interface ComplianceBannerProps {
  channel: Channel;
  htmlBody?: string;
  textBody: string;
  senderName?: string;
  senderEmail?: string;
}

export default function ComplianceBanner({
  channel,
  htmlBody,
  textBody,
  senderName,
  senderEmail,
}: ComplianceBannerProps) {
  const result: ComplianceResult = useMemo(() => {
    if (channel === 'email') {
      return validateEmailCompliance(
        htmlBody ?? '',
        textBody,
        senderName ?? null,
        senderEmail ?? null
      );
    }
    return validateSMSCompliance(textBody);
  }, [channel, htmlBody, textBody, senderName, senderEmail]);

  // All clear
  if (result.valid && result.warnings.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-success/10 border border-success/20 rounded-btn">
        <svg
          className="w-4 h-4 text-success shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
        <span className="text-sm text-success font-medium">
          All compliance checks passed
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Errors */}
      {result.errors.length > 0 && (
        <div className="flex items-start gap-2 px-3 py-2 bg-danger/10 border border-danger/20 rounded-btn">
          <svg
            className="w-4 h-4 text-danger shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
          <div className="min-w-0">
            {result.errors.map((error, i) => (
              <p key={i} className="text-sm text-danger">
                {error}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="flex items-start gap-2 px-3 py-2 bg-ember-500/10 border border-ember-500/20 rounded-btn">
          <svg
            className="w-4 h-4 text-ember-500 shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
            />
          </svg>
          <div className="min-w-0">
            {result.warnings.map((warning, i) => (
              <p key={i} className="text-sm text-ember-500">
                {warning}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
