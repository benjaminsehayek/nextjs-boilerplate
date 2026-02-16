'use client';

import { useUser } from '@/lib/hooks/useUser';
import { useSubscription } from '@/lib/hooks/useSubscription';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const navItems = [
  { section: 'Overview', items: [
    { href: '/', label: 'Dashboard', icon: '📊' },
  ]},
  { section: 'Tools', items: [
    { href: '/site-audit', label: 'Site Audit', icon: '🔍' },
    { href: '/content-strategy', label: 'Content Strategy', icon: '📝' },
    { href: '/local-grid', label: 'Local Grid', icon: '📍' },
    { href: '/off-page-audit', label: 'Off-Page Audit', icon: '🔗' },
    { href: '/lead-intelligence', label: 'Lead Intelligence', icon: '📡' },
    { href: '/lead-database', label: 'Lead Database', icon: '👥' },
  ]},
  { section: 'Account', items: [
    { href: '/billing', label: 'Billing', icon: '💳' },
    { href: '/settings', label: 'Settings', icon: '⚙️' },
  ]},
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { user, signOut } = useUser();
  const { tier } = useSubscription();

  const initials = user?.user_metadata?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || user?.email?.[0].toUpperCase() || '?';

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed top-4 left-4 z-50 btn-icon"
      >
        <span className="text-lg">{mobileOpen ? '✕' : '☰'}</span>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:sticky top-0 left-0 h-screen bg-char-800 border-r border-char-700
          flex flex-col transition-all duration-200 z-40
          ${collapsed ? 'w-16' : 'w-64'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-char-700">
          <div className="flex items-center justify-between">
            {!collapsed && (
              <h1 className="font-display text-xl">
                <span className="text-flame-500">Scorch</span>
                <span className="text-ash-100">Local</span>
              </h1>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="btn-icon hidden md:flex"
            >
              {collapsed ? '→' : '←'}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {navItems.map((section) => (
            <div key={section.section}>
              {!collapsed && (
                <div className="text-xs font-semibold text-ash-500 uppercase tracking-wider mb-2 px-2">
                  {section.section}
                </div>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`
                        flex items-center gap-3 px-3 py-2 rounded-btn
                        transition-all duration-200
                        ${isActive
                          ? 'bg-flame-500/10 text-flame-500 border-l-2 border-flame-500'
                          : 'text-ash-300 hover:bg-char-700 hover:text-ash-100'
                        }
                        ${collapsed ? 'justify-center' : ''}
                      `}
                    >
                      <span className="text-lg">{item.icon}</span>
                      {!collapsed && <span className="font-medium">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-char-700">
          <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-10 h-10 rounded-full bg-flame-gradient flex items-center justify-center text-white font-display text-sm">
              {initials}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-ash-100 truncate">
                  {user?.user_metadata?.full_name || user?.email}
                </div>
                <div className="text-xs text-ash-400 uppercase tracking-wide">
                  {tier}
                </div>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={signOut}
              className="btn-ghost w-full mt-3 text-sm"
            >
              Sign Out
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
