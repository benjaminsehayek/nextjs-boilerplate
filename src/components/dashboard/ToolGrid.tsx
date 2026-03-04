import Link from 'next/link';

const tools = [
  { href: '/site-audit', icon: '🔍', name: 'Site Audit', desc: '52-point technical SEO check' },
  { href: '/content-strategy', icon: '📝', name: 'Content Strategy', desc: 'ROI-based keyword research' },
  { href: '/local-grid', icon: '📍', name: 'Local Grid', desc: 'Maps ranking heat map' },
  { href: '/off-page-audit', icon: '🔗', name: 'Off-Page Audit', desc: 'Backlinks, reviews, citations' },
  { href: '/lead-intelligence', icon: '📡', name: 'Lead Intelligence', desc: 'Multi-channel marketing dashboard' },
  { href: '/lead-database', icon: '👥', name: 'Lead Database', desc: 'CRM with lead scoring' },
];

export function ToolGrid() {
  return (
    <>
      <div className="mb-4">
        <h2 className="text-xl font-display mb-4">Tools</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map((tool) => (
          <Link key={tool.href} href={tool.href} className="card-interactive p-6">
            <div className="text-4xl mb-3">{tool.icon}</div>
            <h3 className="font-display text-lg mb-1 text-flame-500">{tool.name}</h3>
            <p className="text-sm text-ash-400">{tool.desc}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
