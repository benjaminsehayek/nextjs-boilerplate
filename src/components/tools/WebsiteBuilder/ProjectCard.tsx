'use client';

import type { BusinessProject } from '@/types';

interface ProjectCardProps {
  project: BusinessProject;
  selected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

const JOB_ICON: Record<string, string> = {
  installation: '🔧',
  repair: '🛠️',
  maintenance: '⚙️',
  inspection: '🔍',
  other: '📋',
};

export default function ProjectCard({ project, selected, onSelect, onDelete }: ProjectCardProps) {
  return (
    <div
      onClick={() => onSelect(project.id)}
      className={`
        group card p-3 cursor-pointer transition-all duration-150
        ${selected ? 'border-flame-500/40 bg-flame-500/5' : 'hover:border-char-600'}
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base flex-shrink-0">{JOB_ICON[project.job_type] ?? '📋'}</span>
          <div className="min-w-0">
            <div className="text-sm font-medium text-ash-100 truncate">
              {project.title ?? project.work_performed.slice(0, 50)}
            </div>
            <div className="text-xs text-ash-500 flex items-center gap-2 mt-0.5">
              <span className="capitalize">{project.job_type}</span>
              {project.city && <span>· {project.city}</span>}
              <span>· {project.completed_date}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {project.used_in_posts.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-success/10 text-success">
              Used
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}
            className="opacity-0 group-hover:opacity-100 btn-icon w-6 h-6 text-xs text-danger/60 hover:text-danger transition-opacity"
            title="Delete project"
          >
            ✕
          </button>
        </div>
      </div>

      {selected && (
        <div className="mt-2 pt-2 border-t border-char-700 space-y-1">
          {project.problem && (
            <p className="text-xs text-ash-400"><span className="text-ash-500">Problem:</span> {project.problem}</p>
          )}
          <p className="text-xs text-ash-400"><span className="text-ash-500">Work:</span> {project.work_performed.slice(0, 200)}</p>
          {project.outcome && (
            <p className="text-xs text-ash-400"><span className="text-ash-500">Outcome:</span> {project.outcome}</p>
          )}
        </div>
      )}
    </div>
  );
}
