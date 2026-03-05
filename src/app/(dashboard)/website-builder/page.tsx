'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/context/AuthContext';
import { useSearchParams } from 'next/navigation';
import type { SitePage, ChecklistResult } from '@/types';
import PageList from '@/components/tools/WebsiteBuilder/PageList';
import MetaSidebar from '@/components/tools/WebsiteBuilder/MetaSidebar';
import ProjectLibrary from '@/components/tools/WebsiteBuilder/ProjectLibrary';
import DomainManager from '@/components/tools/WebsiteBuilder/DomainManager';

const PageEditor = dynamic(() => import('@/components/tools/WebsiteBuilder/PageEditor'), { ssr: false });
const PagePreview = dynamic(() => import('@/components/tools/WebsiteBuilder/PagePreview'), { ssr: false });

type ViewMode = 'split' | 'editor' | 'preview';
type MainTab = 'pages' | 'projects' | 'domains';

const VIEW_ICONS: Record<ViewMode, string> = { split: '⚡', editor: '✏️', preview: '👁️' };

function WebsiteBuilderInner() {
  const { business, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();

  // Pre-fill from URL params (e.g. from CalendarItemCard "Build Page" link)
  const urlType = (searchParams.get('type') ?? 'location_service') as SitePage['type'];
  const urlKeyword = searchParams.get('keyword') ?? '';
  const urlTitle = searchParams.get('title') ?? '';

  // Page list state
  const [pages, setPages] = useState<SitePage[]>([]);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [selectedPage, setSelectedPage] = useState<SitePage | null>(null);

  // Editor state (mirrors selected page with unsaved edits)
  const [html, setHtml] = useState('');
  const [css, setCss] = useState('');
  const [js, setJs] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [schemaJson, setSchemaJson] = useState('');

  // UI state
  const [mainTab, setMainTab] = useState<MainTab>('pages');
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [checklist, setChecklist] = useState<ChecklistResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [generatingSchema, setGeneratingSchema] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showGeneratePanel, setShowGeneratePanel] = useState(!!urlKeyword);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Generate form — pre-fill from URL params
  const [genPageType, setGenPageType] = useState<SitePage['type']>(urlType);
  const [genService, setGenService] = useState(urlTitle || urlKeyword || '');
  const [genCity, setGenCity] = useState('');
  const [genState, setGenState] = useState('');
  const [genKeyword, setGenKeyword] = useState(urlKeyword);
  const [genInstructions, setGenInstructions] = useState('');

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load pages ──────────────────────────────────────────────────────────────

  const loadPages = useCallback(async () => {
    if (!business) return;
    setPagesLoading(true);
    try {
      const res = await fetch(`/api/website-builder/pages?businessId=${business.id}`);
      const data = await res.json();
      if (res.ok) setPages(data.pages ?? []);
    } finally {
      setPagesLoading(false);
    }
  }, [business]);

  useEffect(() => {
    if (!authLoading && business) loadPages();
  }, [authLoading, business, loadPages]);

  // ── Select page ─────────────────────────────────────────────────────────────

  const selectPage = useCallback((page: SitePage) => {
    setSelectedPage(page);
    setHtml(page.html ?? '');
    setCss(page.css ?? '');
    setJs(page.js ?? '');
    setMetaTitle(page.meta_title ?? '');
    setMetaDescription(page.meta_description ?? '');
    setSchemaJson(page.schema_json ?? '');
    setChecklist(null);
  }, []);

  // ── Auto-save on edit ────────────────────────────────────────────────────────

  const scheduleSave = useCallback(() => {
    if (!selectedPage) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => handleSave(), 2000);
  }, [selectedPage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Trigger auto-save when content changes
  useEffect(() => {
    if (selectedPage) scheduleSave();
  }, [html, css, js, metaTitle, metaDescription, schemaJson]); // eslint-disable-line react-hooks/exhaustive-deps

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!selectedPage || !business) return;
    setSaving(true);
    try {
      const res = await fetch('/api/website-builder/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedPage.id,
          businessId: business.id,
          slug: selectedPage.slug,
          title: selectedPage.title,
          type: selectedPage.type,
          html,
          css: css || null,
          js: js || null,
          meta_title: metaTitle || null,
          meta_description: metaDescription || null,
          schema_json: schemaJson || null,
          location_id: selectedPage.location_id,
          market_id: selectedPage.market_id,
          service_id: selectedPage.service_id,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedPage(data.page);
        setChecklist(data.checklist ?? null);
        setPages((prev) => prev.map((p) => (p.id === data.page.id ? data.page : p)));
      }
    } finally {
      setSaving(false);
    }
  }

  // ── Publish / unpublish ──────────────────────────────────────────────────────

  async function handlePublish() {
    if (!selectedPage) return;
    // Save first
    await handleSave();
    setPublishing(true);
    try {
      const res = await fetch(`/api/website-builder/pages/${selectedPage.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish' }),
      });
      const data = await res.json();
      if (res.ok) {
        const updated = { ...selectedPage, status: 'published' as const, published_at: data.page.published_at };
        setSelectedPage(updated);
        setPages((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        setChecklist(data.checklist ?? null);
        showToast('Page published');
      } else {
        setChecklist(data.checklist ?? null);
        showToast(data.error ?? 'Publish failed', 'error');
      }
    } finally {
      setPublishing(false);
    }
  }

  async function handleUnpublish() {
    if (!selectedPage) return;
    setPublishing(true);
    try {
      const res = await fetch(`/api/website-builder/pages/${selectedPage.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unpublish' }),
      });
      const data = await res.json();
      if (res.ok) {
        const updated = { ...selectedPage, status: 'draft' as const };
        setSelectedPage(updated);
        setPages((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        showToast('Page unpublished');
      } else {
        showToast(data.error ?? 'Failed', 'error');
      }
    } finally {
      setPublishing(false);
    }
  }

  // ── Generate schema ──────────────────────────────────────────────────────────

  async function handleGenerateSchema() {
    if (!selectedPage) return;
    await handleSave();
    setGeneratingSchema(true);
    try {
      const res = await fetch('/api/website-builder/schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId: selectedPage.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setSchemaJson(data.schema_json);
        showToast('Schema generated');
      } else {
        showToast(data.error ?? 'Schema generation failed', 'error');
      }
    } finally {
      setGeneratingSchema(false);
    }
  }

  // ── Delete page ──────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    if (!confirm('Delete this page? This cannot be undone.')) return;
    const res = await fetch(`/api/website-builder/pages/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setPages((prev) => prev.filter((p) => p.id !== id));
      if (selectedPage?.id === id) setSelectedPage(null);
      showToast('Page deleted');
    } else {
      const data = await res.json();
      showToast(data.error ?? 'Delete failed', 'error');
    }
  }

  // ── Generate single page with Claude ────────────────────────────────────────

  async function handleGenerate() {
    if (!business) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/website-builder/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business.id,
          pageType: genPageType,
          service: genService || undefined,
          city: genCity || undefined,
          state: genState || undefined,
          targetKeyword: genKeyword || null,
          customInstructions: genInstructions || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPages((prev) => [data.page, ...prev]);
        selectPage(data.page);
        setChecklist(data.checklist ?? null);
        setShowGeneratePanel(false);
        showToast('Page generated successfully');
      } else {
        showToast(data.error ?? 'Generation failed', 'error');
      }
    } finally {
      setGenerating(false);
    }
  }

  // ── Rendering ────────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-char-700 rounded w-48" />
        <div className="h-64 bg-char-800 rounded-btn" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="card text-center py-12">
        <div className="text-4xl mb-3">🏗️</div>
        <p className="text-ash-400">Set up your business first to use the Website Builder.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] gap-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-display text-ash-100">Website Builder</h1>
          {/* Main tab nav */}
          <div className="flex gap-1 mt-2">
            {([['pages', 'Pages'], ['projects', 'Projects'], ['domains', 'Domains']] as [MainTab, string][]).map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => setMainTab(tab)}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  mainTab === tab
                    ? 'bg-flame-500/20 text-flame-400 border border-flame-500/30'
                    : 'text-ash-400 hover:text-ash-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {mainTab === 'pages' && (
            <>
              <div className="flex rounded-btn border border-char-700 overflow-hidden">
                {(['split', 'editor', 'preview'] as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-3 py-1.5 text-xs transition-colors ${
                      viewMode === mode ? 'bg-flame-500/20 text-flame-400' : 'text-ash-400 hover:text-ash-200'
                    }`}
                    title={mode}
                  >
                    {VIEW_ICONS[mode]}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowGeneratePanel(!showGeneratePanel)}
                className="btn-primary text-sm"
              >
                + Generate Page
              </button>
            </>
          )}
        </div>
      </div>

      {/* Generate panel */}
      {mainTab === 'pages' && showGeneratePanel && (
        <div className="card mb-4 flex-shrink-0">
          <h2 className="font-semibold text-ash-100 mb-3">Generate New Page with AI</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-xs text-ash-400 mb-1 block">Page Type</label>
              <select
                value={genPageType}
                onChange={(e) => setGenPageType(e.target.value as SitePage['type'])}
                className="input w-full text-sm"
              >
                <option value="location_service">Location Service Page</option>
                <option value="city_landing">City Landing Page</option>
                <option value="blog_post">Blog Post</option>
                <option value="foundation">Foundation Page</option>
                <option value="website_addition">Website Addition</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-ash-400 mb-1 block">Service / Topic</label>
              <input
                type="text"
                value={genService}
                onChange={(e) => setGenService(e.target.value)}
                placeholder="e.g. AC Repair"
                className="input w-full text-sm"
              />
            </div>
            {(genPageType === 'location_service' || genPageType === 'city_landing') && (
              <>
                <div>
                  <label className="text-xs text-ash-400 mb-1 block">City</label>
                  <input
                    type="text"
                    value={genCity}
                    onChange={(e) => setGenCity(e.target.value)}
                    placeholder="e.g. Portland"
                    className="input w-full text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-ash-400 mb-1 block">State</label>
                  <input
                    type="text"
                    value={genState}
                    onChange={(e) => setGenState(e.target.value)}
                    placeholder="e.g. OR"
                    className="input w-full text-sm"
                    maxLength={2}
                  />
                </div>
              </>
            )}
            <div>
              <label className="text-xs text-ash-400 mb-1 block">Target Keyword (optional)</label>
              <input
                type="text"
                value={genKeyword}
                onChange={(e) => setGenKeyword(e.target.value)}
                placeholder="Primary keyword"
                className="input w-full text-sm"
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="text-xs text-ash-400 mb-1 block">Custom Instructions (optional)</label>
            <textarea
              value={genInstructions}
              onChange={(e) => setGenInstructions(e.target.value)}
              rows={2}
              placeholder="Any specific requirements or focus areas…"
              className="input w-full text-sm resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={generating || !genService}
              className="btn-primary text-sm"
            >
              {generating ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⟳</span> Generating…
                </span>
              ) : 'Generate with Claude'}
            </button>
            <button onClick={() => setShowGeneratePanel(false)} className="btn-ghost text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Projects / Domains tabs */}
      {mainTab === 'projects' && (
        <div className="flex-1 overflow-y-auto">
          <ProjectLibrary
            businessId={business.id}
            onPageGenerated={(page) => {
              setPages((prev) => [page, ...prev]);
              setMainTab('pages');
              selectPage(page);
              showToast('Blog post generated from project');
            }}
          />
        </div>
      )}

      {mainTab === 'domains' && (
        <div className="flex-1 overflow-y-auto max-w-2xl">
          <DomainManager businessId={business.id} />
        </div>
      )}

      {/* Main layout */}
      {mainTab === 'pages' && <div className="flex flex-1 min-h-0 gap-4">
        {/* Left sidebar: page list */}
        <div className="w-64 flex-shrink-0 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto pr-1">
            <PageList
              pages={pages}
              selectedId={selectedPage?.id ?? null}
              onSelect={selectPage}
              onDelete={handleDelete}
              loading={pagesLoading}
            />
          </div>
        </div>

        {/* Center: editor + preview */}
        {selectedPage ? (
          <div className="flex flex-1 min-w-0 min-h-0 gap-4">
            {/* Editor */}
            {(viewMode === 'editor' || viewMode === 'split') && (
              <div className={`${viewMode === 'split' ? 'flex-1' : 'flex-1'} min-h-0`}>
                <PageEditor
                  html={html}
                  css={css}
                  js={js}
                  onHtmlChange={(v) => { setHtml(v); }}
                  onCssChange={(v) => { setCss(v); }}
                  onJsChange={(v) => { setJs(v); }}
                  className="h-full"
                />
              </div>
            )}

            {/* Preview */}
            {(viewMode === 'preview' || viewMode === 'split') && (
              <div className={`${viewMode === 'split' ? 'flex-1' : 'flex-1'} min-h-0`}>
                <PagePreview
                  html={html}
                  css={css}
                  js={js}
                  className="h-full"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-ash-500">
              <div className="text-4xl mb-3">📝</div>
              <p className="text-sm">Select a page to edit, or generate a new one</p>
            </div>
          </div>
        )}

        {/* Right sidebar: meta + publish */}
        {selectedPage && (
          <div className="w-72 flex-shrink-0 overflow-y-auto">
            <MetaSidebar
              metaTitle={metaTitle}
              metaDescription={metaDescription}
              schemaJson={schemaJson}
              status={selectedPage.status}
              checklist={checklist}
              saving={saving}
              publishing={publishing}
              onMetaTitleChange={(v) => { setMetaTitle(v); }}
              onMetaDescriptionChange={(v) => { setMetaDescription(v); }}
              onSchemaJsonChange={(v) => { setSchemaJson(v); }}
              onSave={handleSave}
              onPublish={handlePublish}
              onUnpublish={handleUnpublish}
              onGenerateSchema={handleGenerateSchema}
              generatingSchema={generatingSchema}
            />
          </div>
        )}
      </div>}

      {/* Toast */}
      {toast && (
        <div className={`
          fixed bottom-6 right-6 z-50 px-4 py-3 rounded-btn shadow-lg text-sm font-medium
          ${toast.type === 'success' ? 'bg-success/20 text-success border border-success/30' : 'bg-danger/20 text-danger border border-danger/30'}
        `}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

export default function WebsiteBuilderPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-96 bg-char-800 rounded-btn" />}>
      <WebsiteBuilderInner />
    </Suspense>
  );
}
