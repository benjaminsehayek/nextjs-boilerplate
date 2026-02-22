// Marketing Automation Types
// Mirrors database schema for campaigns, templates, automations

export type Channel = 'email' | 'sms';

export type CampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'cancelled';

export type AudienceType = 'all' | 'segment' | 'list' | 'tag' | 'manual';

export type AutomationTrigger =
  | 'contact_added'
  | 'tag_added'
  | 'list_added'
  | 'form_submitted'
  | 'manual';

export type AutomationStepType = 'email' | 'sms' | 'wait' | 'condition';

export type AutomationStatus = 'draft' | 'active' | 'paused';

export type EnrollmentStatus = 'active' | 'completed' | 'paused' | 'cancelled';

export type RecipientStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'bounced'
  | 'failed'
  | 'unsubscribed';

export type TemplateCategory =
  | 'general'
  | 'promotional'
  | 'transactional'
  | 'follow-up'
  | 'welcome'
  | 're-engagement';

// ── Database Row Types ──────────────────────────────────────────

export interface MessageTemplate {
  id: string;
  business_id: string;
  name: string;
  channel: Channel;
  subject: string | null;
  html_body: string | null;
  text_body: string;
  merge_tags: string[];
  category: TemplateCategory;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  business_id: string;
  name: string;
  channel: Channel;
  status: CampaignStatus;
  template_id: string | null;
  subject: string | null;
  html_body: string | null;
  text_body: string;
  sender_name: string | null;
  sender_email: string | null;
  sender_phone: string | null;
  // Audience
  audience_type: AudienceType;
  audience_value: string | null;
  recipient_count: number;
  // Scheduling
  scheduled_at: string | null;
  sent_at: string | null;
  // A/B testing
  ab_parent_id: string | null;
  ab_variant: string | null;
  ab_test_field: string | null;
  ab_split_pct: number;
  // Denormalized counters
  total_sent: number;
  total_delivered: number;
  total_opened: number;
  total_clicked: number;
  total_bounced: number;
  total_unsubscribed: number;
  total_failed: number;
  // Meta
  created_at: string;
  updated_at: string;
}

export interface CampaignRecipient {
  id: string;
  campaign_id: string;
  contact_id: string;
  status: RecipientStatus;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  error_message: string | null;
}

export interface CampaignLinkClick {
  id: string;
  campaign_id: string;
  recipient_id: string;
  url: string;
  clicked_at: string;
}

export interface Automation {
  id: string;
  business_id: string;
  name: string;
  trigger_type: AutomationTrigger;
  trigger_value: string | null;
  status: AutomationStatus;
  enrollment_count: number;
  created_at: string;
  updated_at: string;
}

export interface AutomationStep {
  id: string;
  automation_id: string;
  step_order: number;
  step_type: AutomationStepType;
  template_id: string | null;
  delay_days: number;
  delay_hours: number;
  condition_field: string | null;
  condition_value: string | null;
}

export interface AutomationEnrollment {
  id: string;
  automation_id: string;
  contact_id: string;
  current_step: number;
  status: EnrollmentStatus;
  next_action_at: string | null;
  enrolled_at: string;
  completed_at: string | null;
}

export interface UnsubscribeLog {
  id: string;
  contact_id: string;
  campaign_id: string | null;
  channel: Channel;
  reason: string | null;
  unsubscribed_at: string;
}

export interface SenderIdentity {
  id: string;
  business_id: string;
  channel: Channel;
  name: string;
  email: string | null;
  phone: string | null;
  is_default: boolean;
  verified: boolean;
  created_at: string;
}

// ── Form / Input Types ──────────────────────────────────────────

export interface CreateTemplateInput {
  name: string;
  channel: Channel;
  subject?: string;
  html_body?: string;
  text_body: string;
  category?: TemplateCategory;
}

export interface CreateCampaignInput {
  name: string;
  channel: Channel;
  template_id?: string;
  subject?: string;
  html_body?: string;
  text_body: string;
  sender_name?: string;
  sender_email?: string;
  sender_phone?: string;
  audience_type: AudienceType;
  audience_value?: string;
}

export interface ScheduleCampaignInput {
  campaign_id: string;
  scheduled_at: string;
}

// ── Analytics Types ─────────────────────────────────────────────

export interface CampaignMetrics {
  total_sent: number;
  total_delivered: number;
  total_opened: number;
  total_clicked: number;
  total_bounced: number;
  total_unsubscribed: number;
  total_failed: number;
  delivery_rate: number;
  open_rate: number;
  click_rate: number;
  bounce_rate: number;
  unsubscribe_rate: number;
}

export interface DashboardStats {
  total_campaigns: number;
  total_sent: number;
  avg_open_rate: number;
  avg_click_rate: number;
  avg_unsubscribe_rate: number;
  active_automations: number;
  total_templates: number;
}

// ── SendGrid Webhook Event Types ────────────────────────────────

export interface SendGridEvent {
  email: string;
  timestamp: number;
  event: 'processed' | 'dropped' | 'delivered' | 'deferred' | 'bounce' | 'open' | 'click' | 'spamreport' | 'unsubscribe';
  sg_message_id: string;
  campaign_id?: string;
  recipient_id?: string;
  url?: string;
  reason?: string;
  type?: string;
}
