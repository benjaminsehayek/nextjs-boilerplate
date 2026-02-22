'use client';

import { useEffect, useState, useCallback } from 'react';
import { useBusiness } from '@/lib/hooks/useBusiness';
import { useUser } from '@/lib/hooks/useUser';
import { ToolGate } from '@/components/ui/ToolGate';
import { createClient } from '@/lib/supabase/client';
import type { MessageTemplate, CreateTemplateInput } from '@/lib/marketing/types';
import dynamic from 'next/dynamic';

const TemplateList = dynamic(() => import('@/components/tools/Marketing/TemplateList'), { ssr: false });
const TemplateEditor = dynamic(() => import('@/components/tools/Marketing/TemplateEditor'), { ssr: false });

export default function TemplatesPage() {
  const { user, loading: authLoading } = useUser();
  const { business } = useBusiness();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  const supabase = createClient();

  const loadTemplates = useCallback(async () => {
    if (!business?.id) return;
    setLoading(true);

    const { data } = await (supabase as any)
      .from('message_templates')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false });

    setTemplates((data || []) as MessageTemplate[]);
    setLoading(false);
  }, [business?.id, supabase]);

  useEffect(() => {
    if (business?.id) loadTemplates();
  }, [business?.id, loadTemplates]);

  const handleSave = async (input: CreateTemplateInput) => {
    if (!business?.id) return;
    setIsSaving(true);

    try {
      if (editingTemplate) {
        // Update existing
        const { data } = await (supabase as any)
          .from('message_templates')
          .update({
            name: input.name,
            channel: input.channel,
            subject: input.subject || null,
            html_body: input.html_body || null,
            text_body: input.text_body,
            category: input.category || 'general',
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingTemplate.id)
          .select()
          .single();

        if (data) {
          setTemplates((prev) =>
            prev.map((t) => (t.id === editingTemplate.id ? (data as MessageTemplate) : t)),
          );
        }
      } else {
        // Create new
        const { data } = await (supabase as any)
          .from('message_templates')
          .insert({
            business_id: business.id,
            name: input.name,
            channel: input.channel,
            subject: input.subject || null,
            html_body: input.html_body || null,
            text_body: input.text_body,
            category: input.category || 'general',
          })
          .select()
          .single();

        if (data) {
          setTemplates((prev) => [data as MessageTemplate, ...prev]);
        }
      }

      setShowEditor(false);
      setEditingTemplate(undefined);
    } catch (err) {
      console.error('Save template error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Delete this template? This cannot be undone.')) return;
    await (supabase as any).from('message_templates').delete().eq('id', templateId);
    setTemplates((prev) => prev.filter((t) => t.id !== templateId));
  };

  if (authLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-char-700 rounded animate-pulse" />
        <div className="h-96 bg-char-700 rounded-card animate-pulse" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <ToolGate tool="marketing">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-ash-100">Templates</h1>
            <p className="text-ash-400 mt-1">Reusable email and SMS templates</p>
          </div>
          <a href="/marketing" className="btn-ghost text-sm">
            ← Back to Marketing
          </a>
        </div>

        {showEditor ? (
          <TemplateEditor
            template={editingTemplate}
            onSave={handleSave}
            onCancel={() => {
              setShowEditor(false);
              setEditingTemplate(undefined);
            }}
            isSaving={isSaving}
          />
        ) : loading ? (
          <div className="h-96 bg-char-700 rounded-card animate-pulse" />
        ) : (
          <TemplateList
            templates={templates}
            onEdit={(template) => {
              setEditingTemplate(template);
              setShowEditor(true);
            }}
            onDelete={handleDelete}
            onCreateNew={() => {
              setEditingTemplate(undefined);
              setShowEditor(true);
            }}
          />
        )}
      </div>
    </ToolGate>
  );
}
