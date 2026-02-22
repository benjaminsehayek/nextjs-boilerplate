// SendGrid Email Sending Module

import sgMail from '@sendgrid/mail';

export interface EmailMessage {
  to: string;
  from: { email: string; name: string };
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
  customArgs?: Record<string, string>;
}

export interface BatchResult {
  sent: number;
  failed: number;
  errors: Array<{ email: string; error: string }>;
}

/**
 * Initialize SendGrid with API key.
 */
function initSendGrid(): void {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) throw new Error('SENDGRID_API_KEY not configured');
  sgMail.setApiKey(apiKey);
}

/**
 * Send a single email via SendGrid.
 */
export async function sendEmail(message: EmailMessage): Promise<void> {
  initSendGrid();

  await sgMail.send({
    to: message.to,
    from: message.from,
    subject: message.subject,
    html: message.html,
    text: message.text,
    headers: {
      ...message.headers,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
    customArgs: message.customArgs,
  });
}

/**
 * Send a batch of emails via SendGrid.
 * Processes in chunks of 1000 (SendGrid limit per API call).
 */
export async function sendBatchEmails(
  messages: EmailMessage[],
): Promise<BatchResult> {
  initSendGrid();

  let sent = 0;
  let failed = 0;
  const errors: Array<{ email: string; error: string }> = [];

  // Process in chunks of 1000
  const chunkSize = 1000;
  for (let i = 0; i < messages.length; i += chunkSize) {
    const chunk = messages.slice(i, i + chunkSize);

    const results = await Promise.allSettled(
      chunk.map((msg) =>
        sgMail.send({
          to: msg.to,
          from: msg.from,
          subject: msg.subject,
          html: msg.html,
          text: msg.text,
          headers: {
            ...msg.headers,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
          customArgs: msg.customArgs,
        }),
      ),
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      if (result.status === 'fulfilled') {
        sent++;
      } else {
        failed++;
        errors.push({
          email: chunk[j].to,
          error: result.reason?.message || 'Unknown error',
        });
      }
    }
  }

  return { sent, failed, errors };
}
