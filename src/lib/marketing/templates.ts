export interface CampaignTemplate {
  id: string;
  name: string;
  subject: string;
  body: string; // HTML with {{first_name}}, {{business_name}} merge tags
}

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: 're-engagement',
    name: 'Re-engagement',
    subject: '{{first_name}}, we miss you!',
    body: `<p>Hi {{first_name}},</p><p>It's been a while since we've heard from you. We'd love to reconnect and see how we can help.</p><p>As a valued customer, we're offering you a special discount on your next service.</p><p>Call us today to learn more!</p><p>Best,<br>{{business_name}}</p>`,
  },
  {
    id: 'seasonal-promo',
    name: 'Seasonal Promo',
    subject: 'Special offer from {{business_name}}',
    body: `<p>Hi {{first_name}},</p><p>This season, {{business_name}} is offering exclusive savings on our services.</p><p>Book now and save — limited time only!</p><p>Reply to this email or call us to claim your offer.</p><p>Best,<br>{{business_name}}</p>`,
  },
  {
    id: 'service-announcement',
    name: 'Service Announcement',
    subject: 'New service available from {{business_name}}',
    body: `<p>Hi {{first_name}},</p><p>We're excited to announce a new service offering at {{business_name}}.</p><p>We'd love to tell you more about how this can benefit you.</p><p>Contact us today to learn more!</p><p>Best,<br>{{business_name}}</p>`,
  },
  {
    id: 'thank-you',
    name: 'Thank You',
    subject: 'Thank you from {{business_name}}',
    body: `<p>Hi {{first_name}},</p><p>Thank you for choosing {{business_name}}. We truly appreciate your business.</p><p>If you have a moment, we'd love to hear your feedback — and a review would mean the world to us!</p><p>With gratitude,<br>{{business_name}}</p>`,
  },
];
