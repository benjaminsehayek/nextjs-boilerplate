'use client';

import { useState } from 'react';

interface ProjectFormProps {
  businessId: string;
  onCreated: (project: any) => void;
  onCancel: () => void;
}

export default function ProjectForm({ businessId, onCreated, onCancel }: ProjectFormProps) {
  const [jobType, setJobType] = useState<string>('repair');
  const [title, setTitle] = useState('');
  const [problem, setProblem] = useState('');
  const [workPerformed, setWorkPerformed] = useState('');
  const [outcome, setOutcome] = useState('');
  const [equipmentUsed, setEquipmentUsed] = useState('');
  const [homeType, setHomeType] = useState('');
  const [completedDate, setCompletedDate] = useState(new Date().toISOString().split('T')[0]);
  const [city, setCity] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!workPerformed.trim()) {
      setError('Work performed is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/website-builder/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          job_type: jobType,
          title: title || null,
          problem: problem || null,
          work_performed: workPerformed,
          outcome: outcome || null,
          equipment_used: equipmentUsed || null,
          home_type: homeType || null,
          completed_date: completedDate,
          city: city || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onCreated(data.project);
      } else {
        setError(data.error ?? 'Failed to create project');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-3">
      <h3 className="font-semibold text-ash-100 text-sm">Add Completed Project</h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-ash-400 mb-1 block">Job Type</label>
          <select value={jobType} onChange={(e) => setJobType(e.target.value)} className="input w-full text-sm">
            <option value="installation">Installation</option>
            <option value="repair">Repair</option>
            <option value="maintenance">Maintenance</option>
            <option value="inspection">Inspection</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-ash-400 mb-1 block">Completion Date</label>
          <input
            type="date"
            value={completedDate}
            onChange={(e) => setCompletedDate(e.target.value)}
            className="input w-full text-sm"
            required
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-ash-400 mb-1 block">Title (optional)</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. AC Unit Replacement — 3BR Ranch Home"
          className="input w-full text-sm"
          maxLength={200}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-ash-400 mb-1 block">City</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Portland"
            className="input w-full text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-ash-400 mb-1 block">Home Type</label>
          <input
            type="text"
            value={homeType}
            onChange={(e) => setHomeType(e.target.value)}
            placeholder="e.g. 1980s ranch home"
            className="input w-full text-sm"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-ash-400 mb-1 block">Problem / Issue Reported</label>
        <textarea
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          rows={2}
          placeholder="What was the customer's problem?"
          className="input w-full text-sm resize-none"
          maxLength={1000}
        />
      </div>

      <div>
        <label className="text-xs text-ash-400 mb-1 block">Work Performed *</label>
        <textarea
          value={workPerformed}
          onChange={(e) => setWorkPerformed(e.target.value)}
          rows={3}
          placeholder="Describe what was done, including specific parts/materials used"
          className="input w-full text-sm resize-none"
          maxLength={2000}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-ash-400 mb-1 block">Outcome</label>
          <textarea
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            rows={2}
            placeholder="Result / customer satisfaction"
            className="input w-full text-sm resize-none"
            maxLength={500}
          />
        </div>
        <div>
          <label className="text-xs text-ash-400 mb-1 block">Equipment / Materials</label>
          <textarea
            value={equipmentUsed}
            onChange={(e) => setEquipmentUsed(e.target.value)}
            rows={2}
            placeholder="Brand, model, part numbers"
            className="input w-full text-sm resize-none"
            maxLength={500}
          />
        </div>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary text-sm">
          {saving ? 'Saving…' : 'Add Project'}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}
