'use client';

import { useState, useEffect } from 'react';
import type { BusinessProject } from '@/types';
import ProjectCard from './ProjectCard';
import ProjectForm from './ProjectForm';

interface ProjectLibraryProps {
  businessId: string;
  onPageGenerated?: (page: any) => void;
}

export default function ProjectLibrary({ businessId, onPageGenerated }: ProjectLibraryProps) {
  const [projects, setProjects] = useState<BusinessProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [keyword, setKeyword] = useState('');
  const [instructions, setInstructions] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [businessId]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/website-builder/projects?businessId=${businessId}`);
      const data = await res.json();
      if (res.ok) setProjects(data.projects ?? []);
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this project?')) return;
    const res = await fetch(`/api/website-builder/projects/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    }
  }

  async function handleGenerateBlog() {
    if (selectedIds.size === 0) return;
    setGenerating(true);
    setError('');
    try {
      const res = await fetch('/api/website-builder/generate-blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          projectIds: [...selectedIds],
          targetKeyword: keyword || null,
          customInstructions: instructions || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedIds(new Set());
        setKeyword('');
        setInstructions('');
        onPageGenerated?.(data.page);
        // Reload to show updated used_in_posts
        await load();
      } else {
        setError(data.error ?? 'Generation failed');
      }
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-ash-100">Project Library</h2>
          <p className="text-xs text-ash-500 mt-0.5">
            Log completed jobs → generate authentic blog posts that rank
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">
          + Add Project
        </button>
      </div>

      {showForm && (
        <ProjectForm
          businessId={businessId}
          onCreated={(project) => {
            setProjects((prev) => [project, ...prev]);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Generate blog from selected */}
      {selectedIds.size > 0 && (
        <div className="card border-flame-500/30 bg-flame-500/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-ash-100">
              {selectedIds.size} project{selectedIds.size !== 1 ? 's' : ''} selected
            </span>
            <button onClick={() => setSelectedIds(new Set())} className="text-xs text-ash-500 hover:text-ash-300">
              Clear
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-ash-400 mb-1 block">Target Keyword (optional)</label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g. AC repair Portland"
                className="input w-full text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-ash-400 mb-1 block">Custom Instructions</label>
              <input
                type="text"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Focus on energy savings…"
                className="input w-full text-sm"
              />
            </div>
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          <button onClick={handleGenerateBlog} disabled={generating} className="btn-primary text-sm">
            {generating ? (
              <span className="flex items-center gap-2"><span className="animate-spin">⟳</span>Generating Blog Post…</span>
            ) : 'Generate Blog Post with AI'}
          </button>
        </div>
      )}

      {/* Project list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-char-800 rounded-btn animate-pulse" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="card text-center py-8 text-ash-500 text-sm">
          No projects yet — add completed jobs to generate authentic content
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map((project) => (
            <div key={project.id} className="relative">
              <div className="absolute top-3 left-3 z-10">
                <input
                  type="checkbox"
                  checked={selectedIds.has(project.id)}
                  onChange={() => toggleSelect(project.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 accent-flame-500 cursor-pointer"
                />
              </div>
              <div className="pl-8">
                <ProjectCard
                  project={project}
                  selected={expandedId === project.id}
                  onSelect={(id) => setExpandedId(expandedId === id ? null : id)}
                  onDelete={handleDelete}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
