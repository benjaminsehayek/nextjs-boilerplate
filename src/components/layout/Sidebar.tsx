'use client';

import { useUser } from '@/lib/hooks/useUser';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { useBusiness } from '@/lib/hooks/useBusiness';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const stored = (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
    setTheme(stored);
    document.documentElement.classList.toggle('light', stored === 'light');
  }, []);

  function toggle() {
    const next: 'dark' | 'light' = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.classList.toggle('light', next === 'light');
  }

  return { theme, toggle };
}

const navItems = [
  { section: 'Overview', items: [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  ]},
  { section: 'Tools', items: [
    { href: '/site-audit', label: 'Site Audit', icon: '🔍' },
    { href: '/content-strategy', label: 'Content Strategy', icon: '📝' },
    { href: '/local-grid', label: 'Local Grid', icon: '📍' },
    { href: '/off-page-audit', label: 'Off-Page Audit', icon: '🔗' },
    { href: '/lead-intelligence', label: 'Lead Intelligence', icon: '📡' },
    { href: '/lead-database', label: 'Lead Database', icon: '👥' },
    { href: '/marketing', label: 'Marketing', icon: '📧' },
    { href: '/website-builder', label: 'Website Builder', icon: '🏗️' },
  ]},
  { section: 'Account', items: [
    { href: '/billing', label: 'Billing', icon: '💳' },
    { href: '/settings', label: 'Settings', icon: '⚙️' },
  ]},
];

function SidebarContent({
  collapsed,
  setCollapsed,
  onLinkClick,
}: {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  onLinkClick?: () => void;
}) {
  const pathname = usePathname();
  const { user, profile, signOut } = useUser();
  const { tier } = useSubscription();
  const { business } = useBusiness();
  const { theme, toggle: toggleTheme } = useTheme();
  const needsOnboarding = !business;

  const initials = user?.user_metadata?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || user?.email?.[0].toUpperCase() || '?';

  return (
    <div
      className={`
        flex flex-col h-full bg-char-800 border-r border-char-700
        transition-all duration-200
        ${collapsed ? 'w-16' : 'w-64'}
      `}
    >
      {/* Header */}
      <div className="p-4 border-b border-char-700 flex items-center justify-between">
        {!collapsed && (
          <h1 className="font-display text-xl">
            <span className="text-flame-500">Scorch</span>
            <span className="text-ash-100">Local</span>
          </h1>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="btn-icon"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '→' : '←'}
        </button>
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
                    onClick={onLinkClick}
                    className={`
                      relative flex items-center gap-3 px-3 py-2 rounded-btn
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
                    {item.href === '/dashboard' && needsOnboarding && (
                      <span className="ml-auto flex h-2 w-2 flex-shrink-0">
                        <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-flame-500 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-flame-500" />
                      </span>
                    )}
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
          <div className="w-10 h-10 rounded-full bg-flame-gradient flex items-center justify-center text-white font-display text-sm overflow-hidden flex-shrink-0">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{initials}</span>
            )}
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
        {/* Theme toggle */}
        <div className={`mt-3 flex ${collapsed ? 'justify-center' : 'justify-end'}`}>
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="btn-icon w-8 h-8 text-sm"
          >
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar — always visible, in document flow */}
      <div className="hidden md:flex flex-shrink-0 h-screen sticky top-0">
        <SidebarContent collapsed={collapsed} setCollapsed={setCollapsed} />
      </div>

      {/* Mobile: hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 btn-icon"
        aria-label="Open menu"
      >
        <span className="text-lg">☰</span>
      </button>

      {/* Mobile: overlay + drawer */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="md:hidden fixed top-0 left-0 h-full z-50 flex">
            <SidebarContent
              collapsed={false}
              setCollapsed={() => {}}
              onLinkClick={() => setMobileOpen(false)}
            />
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 btn-icon"
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>
        </>
      )}
    </>
  );
}
