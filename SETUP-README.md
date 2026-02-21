# Crocs and Clicks - Setup Instructions

## Files to Add to Your Project

Copy the following files into your Next.js project:

```
your-project/
├── .env.local                    # Environment variables (DON'T commit this!)
├── middleware.ts                 # Auth middleware (root level)
├── lib/
│   └── supabase/
│       ├── client.ts             # Browser client
│       └── server.ts             # Server client
├── app/
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts          # OAuth callback handler
│   ├── login/
│   │   └── page.tsx              # Login page
│   └── dashboard/
│       └── page.tsx              # Dashboard with 3 pipelines
└── components/
    └── logout-button.tsx         # Logout button component
```

## Step 1: Install Dependencies

Run this in your project folder:

```bash
npm install @supabase/supabase-js @supabase/ssr
```

## Step 2: Copy Files

Copy all the files from this package into your project, maintaining the folder structure.

## Step 3: Set Up Google OAuth in Supabase

1. Go to https://lwratkmmlcuwhjrofocf.supabase.co
2. Navigate to **Authentication → Providers → Google**
3. Enable Google provider
4. You'll need to create Google OAuth credentials:

### Create Google OAuth Credentials:

1. Go to https://console.cloud.google.com
2. Create a new project (or use existing)
3. Go to **APIs & Services → Credentials**
4. Click **Create Credentials → OAuth client ID**
5. Select **Web application**
6. Add these authorized redirect URIs:
   - `https://lwratkmmlcuwhjrofocf.supabase.co/auth/v1/callback`
   - `http://localhost:3000/auth/callback` (for local dev)
7. Copy the **Client ID** and **Client Secret**
8. Paste them in Supabase Google provider settings

## Step 4: Add Environment Variables to Vercel

Go to your Vercel project → Settings → Environment Variables:

- `NEXT_PUBLIC_SUPABASE_URL` = `https://lwratkmmlcuwhjrofocf.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (your anon key)

## Step 5: Test Locally

```bash
npm run dev
```

Visit http://localhost:3000/login to test Google sign-in.

## What's Included

- ✅ Supabase client setup (browser + server)
- ✅ Auth middleware (protects /dashboard routes)
- ✅ Google OAuth login page
- ✅ OAuth callback handler
- ✅ Dashboard with 3 pipeline cards (Website, SEO, Ads)
- ✅ Logout functionality

## Next Steps

After this is working:
1. Build the Website Pipeline wizard
2. Set up the database schema for businesses, keywords, etc.
3. Add Stripe for billing

---

**Security Note:** The `.env.local` file contains your Supabase credentials. 
Make sure it's in your `.gitignore` (it should be by default in Next.js projects).

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Crocs and Clicks — Full Site Audit</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Fraunces:wght@700;800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
    <style>
        :root {
            /* Surface hierarchy — cool neutral darks so pink & blue pop */
            --bg-primary: #0f1117; --bg-secondary: #161821; --bg-tertiary: #1e2030; --bg-card: #1a1c2b;
            --bg-elevated: #252838; --bg-input: #13151e;
            /* Accent pink — matches the croc logo */
            --accent-pink: #F472B6; --accent-light: #FBCFE8; --accent-hot: #EC4899;
            --accent-glow: rgba(244,114,182,0.18); --accent-subtle: rgba(244,114,182,0.08);
            /* Blue accent — matches logo sparkles */
            --accent-blue: #60A5FA; --accent-blue-deep: #3B82F6;
            --blue-glow: rgba(96,165,250,0.15); --blue-subtle: rgba(96,165,250,0.08);
            /* Text hierarchy — bright whites on cool darks */
            --text-primary: #F8FAFC; --text-secondary: #B8C0CC; --text-muted: #6B7280;
            /* Borders — cool gray */
            --border-color: #2D3348; --border-hover: #3D4560; --border-input: #353B52;
            /* Semantic colors */
            --success: #22c55e; --success-bg: rgba(34,197,94,0.12);
            --warning: #f59e0b; --warning-bg: rgba(245,158,11,0.12);
            --danger: #ef4444; --danger-bg: rgba(239,68,68,0.12);
            --info: #60A5FA; --info-bg: rgba(96,165,250,0.12);
            /* Focus ring */
            --focus-ring: 0 0 0 2px var(--bg-primary), 0 0 0 4px var(--accent-pink);
        }
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Outfit',sans-serif; background:var(--bg-primary); color:var(--text-primary); min-height:100vh; overflow-x:hidden; }
        

        /* Text-based status indicators — 2026 best practice: color + text, no icons */
        .sev-indicator { display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:0.35rem; flex-shrink:0; }
        .sev-critical { background:var(--danger); }
        .sev-warning { background:var(--warning); }
        .sev-notice { background:var(--info); }
        .trend-up { color:var(--success); font-weight:700; font-size:0.75em; }
        .trend-down { color:var(--danger); font-weight:700; font-size:0.75em; }
        .trend-new { color:var(--info); font-size:0.6rem; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; padding:0.1rem 0.3rem; background:var(--info-bg); border-radius:3px; }
        .trend-lost { color:var(--danger); font-weight:700; font-size:0.75em; }
        .ai-badge { font-size:0.6rem; font-weight:700; padding:0.12rem 0.35rem; border-radius:3px; letter-spacing:0.03em; }
        .ai-badge.ai-yes { background:rgba(59,130,246,0.15); color:var(--info); }
        /* Header */
        .header { background:var(--bg-secondary); border-bottom:none; display:flex; align-items:center; justify-content:space-between; padding:0 2rem; height:62px; position:sticky; top:0; z-index:100; }
        .header::after { content:''; position:absolute; bottom:0; left:0; right:0; height:2px; background:linear-gradient(90deg, var(--accent-pink), var(--accent-blue)); }
        .logo { display:flex; align-items:center; gap:0.6rem; font-size:1.1rem; font-weight:700; }
        .logo-icon { width:36px; height:36px; border-radius:6px; overflow:hidden; flex-shrink:0; }
        .logo-icon img { width:100%; height:100%; object-fit:contain; }
        .logo-badge { font-size:0.6rem; color:var(--accent-blue); font-weight:500; background:var(--blue-subtle); padding:0.15rem 0.45rem; border-radius:4px; }
        .header-actions { display:flex; gap:0.6rem; align-items:center; }
        /* Ghost/tertiary header button — minimal, understated */
        .header-btn { background:transparent; border:1px solid var(--border-color); color:var(--text-secondary); padding:0.5rem 0.9rem; border-radius:8px; cursor:pointer; font-size:0.82rem; display:flex; align-items:center; gap:0.4rem; transition:all 0.2s; font-family:inherit; font-weight:500; }
        .header-btn:hover { border-color:var(--border-hover); color:var(--text-primary); background:var(--accent-subtle); }
        .header-btn:focus-visible { outline:none; box-shadow:var(--focus-ring); }
        /* Primary header button — filled accent, clear CTA */
        .header-btn-primary { background:var(--accent-hot); border:1px solid var(--accent-hot); color:white; padding:0.55rem 1.15rem; border-radius:8px; cursor:pointer; font-size:0.82rem; display:flex; align-items:center; gap:0.4rem; transition:all 0.2s; font-family:inherit; font-weight:600; letter-spacing:0.01em; }
        .header-btn-primary:hover { background:var(--accent-pink); border-color:var(--accent-pink); box-shadow:0 2px 14px rgba(236,72,153,0.35); }
        .header-btn-primary:focus-visible { outline:none; box-shadow:var(--focus-ring); }
        
        /* Input Section */
        .scan-hero { max-width:720px; margin:0 auto; padding:4rem 1.5rem 2.5rem; text-align:center; }
        .scan-hero h1 { font-family:'Fraunces',serif; font-size:2.4rem; font-weight:800; background:linear-gradient(135deg,var(--accent-light),var(--accent-pink),var(--accent-blue)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; margin-bottom:0.6rem; }
        .scan-hero p { color:var(--text-secondary); font-size:0.95rem; margin-bottom:2.5rem; line-height:1.7; max-width:560px; margin-left:auto; margin-right:auto; }
        .scan-input-row { display:flex; gap:0.65rem; max-width:640px; margin:0 auto; }
        .scan-input-row input { flex:1; background:var(--bg-input); border:2px solid var(--border-input); color:var(--text-primary); padding:1.05rem 1.2rem; border-radius:12px; font-size:1.05rem; font-family:inherit; transition:all 0.2s; }
        .scan-input-row input::placeholder { color:var(--text-muted); }
        .scan-input-row input:focus { outline:none; border-color:var(--accent-pink); box-shadow:0 0 0 4px var(--accent-glow); background:var(--bg-primary); }
        /* Primary CTA button — large, prominent, the single most important action */
        .btn { padding:1.05rem 1.85rem; border-radius:12px; font-weight:600; cursor:pointer; transition:all 0.2s; font-size:0.95rem; border:none; display:flex; align-items:center; justify-content:center; gap:0.5rem; white-space:nowrap; font-family:inherit; }
        .btn:focus-visible { outline:none; box-shadow:var(--focus-ring); }
        .btn-primary { background:linear-gradient(135deg,var(--accent-pink),var(--accent-hot)); color:white; min-width:170px; font-size:1.02rem; font-weight:700; letter-spacing:0.015em; box-shadow:0 2px 12px rgba(236,72,153,0.2); }
        .btn-primary:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 6px 28px rgba(236,72,153,0.45); }
        .btn-primary:active:not(:disabled) { transform:translateY(0); box-shadow:0 2px 8px rgba(236,72,153,0.3); }
        .btn-primary:disabled { opacity:0.5; cursor:not-allowed; box-shadow:none; }
        /* Secondary button — outlined, clearly subordinate */
        .btn-secondary { background:transparent; border:1px solid var(--border-color); color:var(--text-secondary); }
        .btn-secondary:hover { border-color:var(--border-hover); color:var(--text-primary); background:var(--accent-subtle); }
        /* Small button variant */
        .btn-sm { padding:0.55rem 1rem; font-size:0.82rem; border-radius:8px; min-width:auto; box-shadow:none; }
        .error-msg { font-size:0.8rem; color:var(--danger); margin-top:0.65rem; text-align:left; max-width:640px; margin-left:auto; margin-right:auto; }
        
        
        /* Progress Section */
        .progress-container { max-width:700px; margin:0 auto; padding:2rem 1.5rem; text-align:center; display:none; }
        .progress-container.active { display:block; }
        .progress-title { font-family:'Fraunces',serif; font-size:1.4rem; color:var(--accent-pink); margin-bottom:0.5rem; }
        .progress-domain { font-size:0.9rem; color:var(--text-secondary); margin-bottom:1.5rem; }
        .progress-bar-wrap { background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:10px; overflow:hidden; height:28px; margin-bottom:1rem; position:relative; }
        .progress-bar-fill { height:100%; background:linear-gradient(90deg,var(--accent-pink),var(--accent-blue)); transition:width 0.5s ease; border-radius:10px; min-width:2%; }
        .progress-bar-text { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:0.8rem; font-weight:600; font-family:'Space Mono',monospace; }
        .progress-stats { display:flex; gap:2rem; justify-content:center; margin-bottom:1.5rem; flex-wrap:wrap; }
        .progress-stat { text-align:center; }
        .progress-stat .val { font-family:'Space Mono',monospace; font-size:1.3rem; font-weight:700; color:var(--accent-pink); }
        .progress-stat .lbl { font-size:0.7rem; color:var(--text-muted); }
        .progress-log { background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:8px; padding:0.75rem; max-height:180px; overflow-y:auto; text-align:left; margin-bottom:1rem; }
        .log-line { font-size:0.75rem; color:var(--text-secondary); font-family:'Space Mono',monospace; margin-bottom:0.25rem; line-height:1.4; }
        .log-line.success { color:var(--success); }
        .log-line.error { color:var(--danger); }
        .log-line.warning { color:var(--warning); }
        .progress-actions { display:flex; gap:0.5rem; justify-content:center; }
        
        /* Resume Banner */
        .resume-banner { max-width:600px; margin:0 auto 1rem; background:var(--bg-tertiary); border:1px solid var(--accent-pink); border-radius:10px; padding:0.85rem 1rem; display:none; align-items:center; gap:0.75rem; }
        .resume-banner.active { display:flex; }
        .resume-banner-text { flex:1; font-size:0.85rem; color:var(--text-secondary); }
        .resume-banner-text strong { color:var(--accent-pink); }
        
        /* Dashboard */
        .dashboard { display:none; max-width:1200px; margin:0 auto; padding:1.25rem 1.75rem 3rem; }
        .dashboard.active { display:block; }
        .dash-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem; flex-wrap:wrap; gap:1rem; padding-bottom:1.25rem; border-bottom:1px solid var(--border-color); }
        .dash-domain { font-family:'Fraunces',serif; font-size:1.7rem; background:linear-gradient(135deg,var(--accent-pink),var(--accent-blue)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
        .dash-meta { font-size:0.82rem; color:var(--text-muted); margin-top:0.25rem; }
        
        /* Score Ring */
        .score-overview { display:flex; gap:2rem; align-items:center; margin-bottom:2rem; flex-wrap:wrap; }
        .score-ring-wrap { position:relative; width:160px; height:160px; flex-shrink:0; }
        .score-ring-bg { fill:none; stroke:var(--border-color); stroke-width:8; }
        .score-ring-fg { fill:none; stroke-width:8; stroke-linecap:round; transition:stroke-dashoffset 1s ease, stroke 0.3s; transform:rotate(-90deg); transform-origin:center; }
        .score-ring-text { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; }
        .score-ring-num { font-family:'Space Mono',monospace; font-size:2.4rem; font-weight:700; }
        .score-ring-lbl { font-size:0.7rem; color:var(--text-muted); }
        
        .score-cards { flex:1; display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:0.65rem; }
        .score-card { background:var(--bg-card); border:1px solid var(--border-color); border-radius:10px; padding:0.8rem 0.9rem; cursor:pointer; transition:all 0.2s; }
        .score-card:hover { border-color:var(--border-hover); transform:translateY(-1px); box-shadow:0 4px 12px rgba(0,0,0,0.2); }
        .score-card:focus-visible { outline:none; box-shadow:var(--focus-ring); }
        .score-card.active { border-color:var(--accent-pink); background:var(--accent-subtle); }
        .score-card-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:0.45rem; }
        .score-card-val { font-family:'Space Mono',monospace; font-size:1.2rem; font-weight:700; }
        .score-card-name { font-size:0.78rem; color:var(--text-secondary); font-weight:500; }
        .score-card-bar { height:3px; background:var(--border-color); border-radius:2px; margin-top:0.45rem; overflow:hidden; }
        .score-card-bar-fill { height:100%; border-radius:2px; transition:width 0.5s; }
        
        /* Tabs — readable inactive state, clear active indicator */
        .tabs { display:flex; gap:0.15rem; border-bottom:1px solid var(--border-color); margin-bottom:1.75rem; overflow-x:auto; flex-wrap:nowrap; padding-bottom:0; }
        .tab { padding:0.75rem 1.15rem; font-size:0.85rem; font-weight:500; color:var(--text-secondary); cursor:pointer; border-bottom:2px solid transparent; transition:all 0.2s; white-space:nowrap; flex-shrink:0; border-radius:6px 6px 0 0; }
        .tab:hover { color:var(--text-primary); background:var(--accent-subtle); }
        .tab:focus-visible { outline:none; box-shadow:var(--focus-ring); }
        .tab.active { color:var(--accent-pink); border-bottom-color:var(--accent-pink); font-weight:600; background:rgba(244,114,182,0.05); }
        .tab .badge { font-size:0.65rem; background:var(--danger-bg); color:var(--danger); padding:0.12rem 0.4rem; border-radius:4px; margin-left:0.35rem; font-family:'Space Mono',monospace; font-weight:600; }
        .tab-content { display:none; }
        .tab-content.active { display:block; }
        
        /* Tables — clear headers, generous padding, visible hover */
        .data-table { width:100%; border-collapse:collapse; font-size:0.82rem; }
        .data-table th { text-align:left; padding:0.7rem 0.85rem; color:var(--text-muted); font-weight:600; font-size:0.72rem; text-transform:uppercase; letter-spacing:0.05em; border-bottom:2px solid var(--border-color); cursor:pointer; user-select:none; white-space:nowrap; }
        .data-table th:hover { color:var(--accent-pink); }
        .data-table th .sort-icon { opacity:0.4; margin-left:0.2rem; }
        .data-table th.sorted .sort-icon { opacity:1; color:var(--accent-pink); }
        .data-table td { padding:0.65rem 0.85rem; border-bottom:1px solid rgba(61,50,57,0.5); color:var(--text-secondary); vertical-align:top; }
        .data-table tr:hover td { background:rgba(244,114,182,0.04); }
        .data-table .url-cell { max-width:350px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--text-primary); font-family:'Space Mono',monospace; font-size:0.74rem; }
        .data-table .url-cell a { color:var(--accent-pink); text-decoration:none; }
        .data-table .url-cell a:hover { text-decoration:underline; }
        .status-pill { display:inline-block; padding:0.18rem 0.5rem; border-radius:4px; font-size:0.72rem; font-weight:600; font-family:'Space Mono',monospace; }
        .status-200 { background:var(--success-bg); color:var(--success); }
        .status-301, .status-302 { background:var(--warning-bg); color:var(--warning); }
        .status-404, .status-500, .status-err { background:var(--danger-bg); color:var(--danger); }
        .issue-dot { width:8px; height:8px; border-radius:50%; display:inline-block; margin-right:0.3rem; }
        
        /* Stat Grids — neutral values by default, color only for semantic meaning */
        .stat-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:0.85rem; margin-bottom:1.75rem; }
        .stat-box { background:var(--bg-card); border:1px solid var(--border-color); border-radius:10px; padding:1rem 1.1rem; }
        .stat-box-val { font-family:'Space Mono',monospace; font-size:1.5rem; font-weight:700; color:var(--text-primary); }
        .stat-box-val.val-warn { color:var(--danger); }
        .stat-box-val.val-accent { color:var(--accent-pink); }
        .stat-box-lbl { font-size:0.78rem; color:var(--text-muted); margin-top:0.2rem; }
        .stat-box-sub { font-size:0.74rem; color:var(--text-secondary); margin-top:0.35rem; }
        
        /* Issue Cards — overview tab */
        .issue-list { display:flex; flex-direction:column; gap:0.6rem; margin-bottom:1.75rem; }
        .issue-card { background:var(--bg-card); border:1px solid var(--border-color); border-radius:10px; padding:0.85rem 1.1rem; display:flex; gap:0.85rem; align-items:flex-start; }
        .issue-sev { width:4px; border-radius:2px; min-height:100%; flex-shrink:0; align-self:stretch; }
        .issue-sev.high { background:var(--danger); }
        .issue-sev.medium { background:var(--warning); }
        .issue-sev.low { background:var(--info); }
        .issue-body { flex:1; }
        .issue-title { font-size:0.88rem; font-weight:600; margin-bottom:0.25rem; }
        .issue-desc { font-size:0.78rem; color:var(--text-secondary); line-height:1.45; }
        .issue-count { font-family:'Space Mono',monospace; font-size:0.92rem; font-weight:700; color:var(--text-muted); flex-shrink:0; }

        /* Issues Tab — Full Priority Board */
        .issues-summary-bar { display:flex; gap:0.5rem; margin-bottom:1.25rem; flex-wrap:wrap; }
        .issues-sev-pill { display:flex; align-items:center; gap:0.45rem; padding:0.55rem 1rem; background:var(--bg-card); border:2px solid var(--border-color); border-radius:10px; cursor:pointer; transition:all 0.2s; user-select:none; flex:1; min-width:120px; }
        .issues-sev-pill:hover { border-color:var(--border-hover); }
        .issues-sev-pill.active { border-color:var(--accent-pink); background:rgba(244,114,182,0.06); }
        .issues-sev-pill.active.sev-critical { border-color:var(--danger); background:var(--danger-bg); }
        .issues-sev-pill.active.sev-warning { border-color:var(--warning); background:var(--warning-bg); }
        .issues-sev-pill.active.sev-notice { border-color:var(--info); background:var(--info-bg); }
        .issues-sev-pill .pill-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
        .issues-sev-pill .pill-count { font-family:'Space Mono',monospace; font-size:1.2rem; font-weight:700; }
        .issues-sev-pill .pill-label { font-size:0.72rem; color:var(--text-muted); }
        .issues-sev-pill.sev-critical .pill-dot { background:var(--danger); }
        .issues-sev-pill.sev-critical .pill-count { color:var(--danger); }
        .issues-sev-pill.sev-warning .pill-dot { background:var(--warning); }
        .issues-sev-pill.sev-warning .pill-count { color:var(--warning); }
        .issues-sev-pill.sev-notice .pill-dot { background:var(--info); }
        .issues-sev-pill.sev-notice .pill-count { color:var(--info); }
        .issues-sev-pill.sev-all .pill-dot { background:var(--accent-pink); }
        .issues-sev-pill.sev-all .pill-count { color:var(--accent-pink); }
        .issues-cat-filters { display:flex; gap:0.4rem; flex-wrap:wrap; margin-bottom:1.1rem; }
        .issues-cat-chip { padding:0.35rem 0.75rem; border:1px solid var(--border-color); border-radius:20px; font-size:0.74rem; cursor:pointer; color:var(--text-muted); background:transparent; transition:all 0.2s; font-family:inherit; }
        .issues-cat-chip:hover { border-color:var(--border-hover); color:var(--text-primary); background:var(--accent-subtle); }
        .issues-cat-chip:focus-visible { outline:none; box-shadow:var(--focus-ring); }
        .issues-cat-chip.active { border-color:var(--accent-pink); background:rgba(244,114,182,0.1); color:var(--accent-pink); }
        .ix-card { background:var(--bg-card); border:1px solid var(--border-color); border-radius:10px; margin-bottom:0.5rem; overflow:hidden; transition:border-color 0.2s; }
        .ix-card:hover { border-color:var(--border-hover); }
        .ix-card.expanded { border-color:var(--accent-pink); }
        .ix-head { display:flex; gap:0.75rem; align-items:center; padding:0.85rem 1rem; cursor:pointer; user-select:none; }
        .ix-sev-badge { padding:0.2rem 0.55rem; border-radius:5px; font-size:0.65rem; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; flex-shrink:0; font-family:'Space Mono',monospace; }
        .ix-sev-badge.critical { background:var(--danger-bg); color:var(--danger); border:1px solid rgba(239,68,68,0.3); }
        .ix-sev-badge.warning { background:var(--warning-bg); color:var(--warning); border:1px solid rgba(245,158,11,0.3); }
        .ix-sev-badge.notice { background:var(--info-bg); color:var(--info); border:1px solid rgba(59,130,246,0.3); }
        .ix-info { flex:1; min-width:0; }
        .ix-title { font-size:0.88rem; font-weight:600; margin-bottom:0.15rem; }
        .ix-subtitle { font-size:0.72rem; color:var(--text-muted); display:flex; gap:0.75rem; flex-wrap:wrap; align-items:center; }
        .ix-tag { font-size:0.62rem; padding:0.1rem 0.4rem; border-radius:3px; background:var(--bg-tertiary); border:1px solid var(--border-color); color:var(--text-muted); }
        .ix-tag.effort-easy { color:var(--success); border-color:rgba(34,197,94,0.3); }
        .ix-tag.effort-medium { color:var(--warning); border-color:rgba(245,158,11,0.3); }
        .ix-tag.effort-hard { color:var(--danger); border-color:rgba(239,68,68,0.3); }
        .ix-impact { display:flex; gap:2px; align-items:center; }
        .ix-impact-dot { width:6px; height:6px; border-radius:50%; background:var(--border-color); }
        .ix-impact-dot.filled { background:var(--accent-pink); }
        .ix-count-badge { font-family:'Space Mono',monospace; font-size:0.9rem; font-weight:700; flex-shrink:0; min-width:36px; height:36px; display:flex; align-items:center; justify-content:center; border-radius:8px; background:var(--bg-tertiary); border:1px solid var(--border-color); }
        .ix-count-badge.high-count { color:var(--danger); border-color:rgba(239,68,68,0.3); }
        .ix-count-badge.med-count { color:var(--warning); border-color:rgba(245,158,11,0.3); }
        .ix-count-badge.low-count { color:var(--text-muted); }
        .ix-chevron { transition:transform 0.2s; color:var(--text-muted); font-size:0.8rem; flex-shrink:0; }
        .ix-card.expanded .ix-chevron { transform:rotate(90deg); color:var(--accent-pink); }
        .ix-detail { display:none; padding:0 1rem 1rem; border-top:1px solid var(--border-color); }
        .ix-card.expanded .ix-detail { display:block; }
        .ix-detail-section { margin-top:0.85rem; }
        .ix-detail-label { font-size:0.7rem; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.4rem; }
        .ix-why { font-size:0.8rem; color:var(--text-secondary); line-height:1.55; }
        .ix-fix { font-size:0.8rem; color:var(--text-primary); line-height:1.55; background:rgba(34,197,94,0.05); border:1px solid rgba(34,197,94,0.15); border-radius:8px; padding:0.75rem; }
        .ix-fix strong { color:var(--success); }
        .ix-affected-list { max-height:200px; overflow-y:auto; }
        .ix-affected-url { display:flex; align-items:center; gap:0.5rem; padding:0.35rem 0.5rem; font-size:0.72rem; font-family:'Space Mono',monospace; color:var(--text-secondary); border-bottom:1px solid rgba(53,42,51,0.3); }
        .ix-affected-url:last-child { border-bottom:none; }
        .ix-affected-url a { color:var(--accent-pink); text-decoration:none; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .ix-affected-url a:hover { text-decoration:underline; }
        .ix-affected-url .af-status { font-size:0.65rem; padding:0.1rem 0.3rem; border-radius:3px; flex-shrink:0; }
        .ix-no-issues { text-align:center; padding:3rem 1rem; color:var(--text-muted); }
        .ix-no-issues .ni-icon { font-size:2.5rem; margin-bottom:0.5rem; }
        .ix-no-issues .ni-title { font-size:1.1rem; font-weight:600; color:var(--success); }
        
        /* Table Controls — search, filters, pagination */
        .table-controls { display:flex; justify-content:space-between; align-items:center; margin-bottom:0.85rem; flex-wrap:wrap; gap:0.6rem; }
        .table-search { background:var(--bg-input); border:1px solid var(--border-input); color:var(--text-primary); padding:0.5rem 0.85rem; border-radius:8px; font-size:0.82rem; font-family:inherit; min-width:220px; transition:all 0.2s; }
        .table-search:focus { outline:none; border-color:var(--accent-pink); box-shadow:0 0 0 3px var(--accent-glow); }
        .table-filter { display:flex; gap:0.4rem; }
        .filter-chip { background:transparent; border:1px solid var(--border-color); color:var(--text-muted); padding:0.35rem 0.7rem; border-radius:6px; font-size:0.74rem; cursor:pointer; transition:all 0.2s; font-family:inherit; }
        .filter-chip:hover { border-color:var(--border-hover); color:var(--text-primary); background:var(--accent-subtle); }
        .filter-chip:focus-visible { outline:none; box-shadow:var(--focus-ring); }
        .filter-chip.active { border-color:var(--accent-pink); background:rgba(244,114,182,0.1); color:var(--accent-pink); }
        .pagination { display:flex; gap:0.3rem; align-items:center; justify-content:center; margin-top:1.25rem; }
        .page-btn { background:transparent; border:1px solid var(--border-color); color:var(--text-muted); padding:0.4rem 0.65rem; border-radius:6px; font-size:0.78rem; cursor:pointer; font-family:inherit; transition:all 0.2s; }
        .page-btn:hover { border-color:var(--border-hover); color:var(--text-primary); }
        .page-btn:focus-visible { outline:none; box-shadow:var(--focus-ring); }
        .page-btn.active { background:var(--accent-pink); color:white; border-color:var(--accent-pink); }
        .page-info { font-size:0.78rem; color:var(--text-muted); }
        
        /* Section headers — clear visual anchor */
        .section-hdr { font-size:1.05rem; font-weight:600; margin-bottom:1.1rem; padding-left:0.75rem; border-left:3px solid var(--accent-pink); color:var(--text-primary); }
        .section-sub { font-size:0.82rem; color:var(--text-secondary); margin-bottom:1.35rem; line-height:1.55; }
        
        /* Toast */
        .toast { position:fixed; bottom:2rem; left:50%; transform:translateX(-50%) translateY(100px); background:var(--bg-secondary); border:1px solid var(--border-color); padding:0.75rem 1.25rem; border-radius:8px; font-size:0.85rem; z-index:1001; opacity:0; transition:all 0.3s; }
        .toast.show { transform:translateX(-50%) translateY(0); opacity:1; }
        .toast.success { border-color:var(--success); }
        .toast.error { border-color:var(--danger); }
        
        /* Responsive */
        @media(max-width:768px) { 
            .scan-input-row { flex-direction:column; }
            .scan-input-row .btn { min-width:100%; }
            .score-overview { flex-direction:column; align-items:center; }
            .stat-grid { grid-template-columns:repeat(2,1fr); }
            .data-table { font-size:0.74rem; }
            .tabs { gap:0; }
            .tab { padding:0.6rem 0.75rem; font-size:0.78rem; }
            .header { padding:0 1rem; height:56px; }
            .dashboard { padding:1rem 1rem 3rem; }
            .dash-header { padding-bottom:1rem; }
        }
        
        /* Scrollbar */
        ::-webkit-scrollbar { width:6px; height:6px; }
        ::-webkit-scrollbar-track { background:var(--bg-primary); }
        ::-webkit-scrollbar-thumb { background:var(--border-color); border-radius:3px; }
        ::-webkit-scrollbar-thumb:hover { background:var(--accent-pink); }
        

        /* Quick Wins Board */
        .qw-board { margin-bottom:2rem; }
        .qw-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; }
        .qw-title { font-family:'Fraunces',serif; font-size:1.2rem; color:var(--success); display:flex; align-items:center; gap:0.5rem; }
        .qw-subtitle { font-size:0.75rem; color:var(--text-muted); }
        .qw-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:0.5rem; }
        .qw-card { background:var(--bg-card); border:1px solid rgba(34,197,94,0.25); border-radius:10px; padding:0.85rem; display:flex; gap:0.65rem; align-items:flex-start; transition:all 0.2s; cursor:pointer; }
        .qw-card:hover { border-color:var(--success); transform:translateY(-1px); }
        .qw-card.done { opacity:0.45; border-color:var(--border-color); }
        .qw-card.done .qw-card-title { text-decoration:line-through; }
        .qw-check { width:20px; height:20px; border:2px solid var(--success); border-radius:5px; flex-shrink:0; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.15s; margin-top:1px; }
        .qw-check.checked { background:var(--success); color:white; font-size:0.7rem; font-weight:700; }
        .qw-card-body { flex:1; min-width:0; }
        .qw-card-title { font-size:0.85rem; font-weight:600; margin-bottom:0.25rem; }
        .qw-card-meta { display:flex; gap:0.5rem; flex-wrap:wrap; align-items:center; }
        .qw-card-time { font-size:0.68rem; color:var(--text-muted); display:flex; align-items:center; gap:0.2rem; }
        .qw-card-impact { font-size:0.68rem; padding:0.1rem 0.4rem; border-radius:4px; font-weight:600; }
        .qw-card-impact.high-roi { background:rgba(34,197,94,0.15); color:var(--success); }
        .qw-card-pages { font-family:'Space Mono',monospace; font-size:0.85rem; font-weight:700; color:var(--accent-pink); flex-shrink:0; }
        
        /* Priority Score Badge */
        .priority-score { display:inline-flex; align-items:center; gap:0.2rem; font-family:'Space Mono',monospace; font-size:0.65rem; padding:0.1rem 0.4rem; border-radius:4px; font-weight:700; }
        .priority-score.p-high { background:rgba(239,68,68,0.15); color:var(--danger); }
        .priority-score.p-med { background:rgba(245,158,11,0.15); color:var(--warning); }
        .priority-score.p-low { background:rgba(59,130,246,0.15); color:var(--info); }
        
        /* Time Estimate */
        .time-est { font-size:0.65rem; color:var(--text-muted); display:flex; align-items:center; gap:0.2rem; }
        
        /* Task completion checkbox in issue cards */
        .ix-check { width:18px; height:18px; border:2px solid var(--border-hover); border-radius:4px; flex-shrink:0; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.15s; }
        .ix-check:hover { border-color:var(--success); }
        .ix-check.checked { background:var(--success); border-color:var(--success); color:white; font-size:0.65rem; font-weight:700; }
        .ix-card.task-done { opacity:0.4; }
        .ix-card.task-done .ix-title { text-decoration:line-through; color:var(--text-muted); }
        
        /* Task Progress Bar */
        .task-progress { background:var(--bg-card); border:1px solid var(--border-color); border-radius:10px; padding:0.85rem 1rem; margin-bottom:1.25rem; display:flex; align-items:center; gap:1rem; }
        .task-progress-bar { flex:1; height:8px; background:var(--bg-primary); border-radius:4px; overflow:hidden; }
        .task-progress-fill { height:100%; background:linear-gradient(90deg,var(--success),#34d399); border-radius:4px; transition:width 0.5s; }
        .task-progress-text { font-family:'Space Mono',monospace; font-size:0.85rem; font-weight:600; color:var(--success); white-space:nowrap; }
        .task-progress-label { font-size:0.78rem; color:var(--text-secondary); white-space:nowrap; }
        
        /* Task Group Headers */
        .task-group { margin-bottom:1.5rem; }
        .task-group-header { display:flex; align-items:center; gap:0.5rem; margin-bottom:0.65rem; padding-bottom:0.4rem; border-bottom:1px solid var(--border-color); }
        .task-group-title { font-size:0.92rem; font-weight:700; }
        .task-group-count { font-family:'Space Mono',monospace; font-size:0.75rem; color:var(--text-muted); }
        .task-group-time { font-size:0.72rem; color:var(--text-muted); margin-left:auto; display:flex; align-items:center; gap:0.3rem; }


        /* Icon System */
        .ic-lg { width:1.25em; height:1.25em; }
        .ic-xl { width:1.5em; height:1.5em; }
        .ic-filled svg { fill:currentColor; stroke:none; }
        
        /* Severity shapes — shape+color, never color alone */
        .sev-indicator { display:inline-flex; align-items:center; gap:0.35rem; }
        .sev-shape { width:10px; height:10px; flex-shrink:0; }
        .sev-shape.critical { background:var(--danger); clip-path:polygon(50% 0%, 0% 100%, 100% 100%); transform:rotate(180deg); }
        .sev-shape.warning { background:var(--warning); clip-path:polygon(50% 0%, 0% 100%, 100% 100%); }
        .sev-shape.notice { background:var(--info); border-radius:50%; }
        .sev-shape.success { background:var(--success); border-radius:50%; }
        /* Inline SVG icon system — 2026 best practice: scalable, accessible, theme-aware */
        .ic { display:inline-flex; align-items:center; justify-content:center; width:1em; height:1em; vertical-align:-0.125em; flex-shrink:0; }
        .ic svg { width:100%; height:100%; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
        .ic-sm { width:0.8em; height:0.8em; }
        .ic-lg { width:1.25em; height:1.25em; }
        .ic-check svg { stroke:var(--success); }
        .ic-chevron { transition:transform 0.2s; }
        .ic-chevron.open { transform:rotate(90deg); }
        .ic-down { transition:transform 0.2s; }
        
        /* Accessible severity shapes — never rely on color alone */
        .sev-shape { display:inline-flex; align-items:center; justify-content:center; width:10px; height:10px; flex-shrink:0; }
        .sev-shape.crit { clip-path:polygon(50% 0%,0% 100%,100% 100%); background:var(--danger); }
        .sev-shape.warn { clip-path:polygon(50% 0%,0% 100%,100% 100%); background:var(--warning); transform:rotate(180deg); }
        .sev-shape.info { border-radius:50%; background:var(--info); }
        .sev-shape.ok { clip-path:polygon(20% 50%,45% 75%,80% 25%,90% 35%,45% 90%,10% 55%); background:var(--success); width:12px; height:12px; }
        
        .hidden { display:none !important; }
        
        /* Market Chips */
        .market-tag { display:inline-block; padding:0.08rem 0.35rem; border-radius:3px; font-size:0.6rem; font-weight:600; background:rgba(232,123,164,0.1); border:1px solid rgba(232,123,164,0.2); color:var(--accent-pink); margin-left:0.3rem; white-space:nowrap; }

        /* Location autocomplete dropdown */
        .loc-loading { padding:0.75rem; text-align:center; font-size:0.78rem; color:var(--text-muted); }
        .loc-empty { padding:0.75rem; text-align:center; font-size:0.78rem; color:var(--text-muted); }

        /* Keyword Intelligence Tab */
        .kw-hero-stats { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:0.75rem; margin-bottom:1.5rem; }
        .kw-hero-stat { background:var(--bg-card); border:1px solid var(--border-color); border-radius:10px; padding:1rem; text-align:center; }
        .kw-hero-stat .khs-val { font-family:'Space Mono',monospace; font-size:1.8rem; font-weight:700; }
        .kw-hero-stat .khs-lbl { font-size:0.72rem; color:var(--text-muted); margin-top:0.15rem; }
        .kw-hero-stat .khs-sub { font-size:0.7rem; color:var(--text-secondary); margin-top:0.35rem; }
        .kw-hero-stat.khs-money .khs-val { color:var(--success); }
        
        /* Ranking Distribution */
        .rank-dist { display:flex; gap:0.35rem; align-items:flex-end; height:120px; margin-bottom:1rem; padding:0 0.5rem; }
        .rank-bar-wrap { flex:1; display:flex; flex-direction:column; align-items:center; height:100%; justify-content:flex-end; }
        .rank-bar { width:100%; border-radius:4px 4px 0 0; min-height:4px; transition:height 0.5s; position:relative; }
        .rank-bar .rb-count { position:absolute; top:-18px; left:50%; transform:translateX(-50%); font-family:'Space Mono',monospace; font-size:0.65rem; font-weight:700; white-space:nowrap; }
        .rank-bar-lbl { font-size:0.62rem; color:var(--text-muted); margin-top:0.3rem; text-align:center; white-space:nowrap; }
        
        /* Cannibalization */
        .cannibal-cluster { background:var(--bg-card); border:1px solid var(--border-color); border-radius:10px; margin-bottom:0.5rem; overflow:hidden; }
        .cannibal-head { display:flex; gap:0.75rem; align-items:center; padding:0.85rem 1rem; cursor:pointer; user-select:none; }
        .cannibal-head:hover { background:rgba(244,114,182,0.03); }
        .cannibal-kw { flex:1; font-size:0.85rem; font-weight:600; }
        .cannibal-risk { padding:0.2rem 0.55rem; border-radius:5px; font-size:0.65rem; font-weight:700; text-transform:uppercase; font-family:'Space Mono',monospace; }
        .cannibal-risk.risk-high { background:var(--danger-bg); color:var(--danger); border:1px solid rgba(239,68,68,0.3); }
        .cannibal-risk.risk-medium { background:var(--warning-bg); color:var(--warning); border:1px solid rgba(245,158,11,0.3); }
        .cannibal-risk.risk-low { background:var(--info-bg); color:var(--info); border:1px solid rgba(59,130,246,0.3); }
        .cannibal-detail { display:none; padding:0 1rem 1rem; border-top:1px solid var(--border-color); }
        .cannibal-cluster.expanded .cannibal-detail { display:block; }
        .cannibal-page { display:flex; gap:0.75rem; align-items:center; padding:0.5rem 0.5rem; border-bottom:1px solid rgba(53,42,51,0.3); font-size:0.78rem; }
        .cannibal-page:last-child { border-bottom:none; }
        .cannibal-page .cp-url { flex:1; font-family:'Space Mono',monospace; font-size:0.7rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .cannibal-page .cp-url a { color:var(--accent-pink); text-decoration:none; }
        .cannibal-page .cp-pos { font-family:'Space Mono',monospace; font-weight:700; min-width:40px; text-align:center; }
        .cannibal-page .cp-traffic { font-family:'Space Mono',monospace; font-size:0.7rem; color:var(--text-muted); min-width:60px; text-align:right; }
        .cannibal-page .cp-vol { font-size:0.7rem; color:var(--text-muted); min-width:55px; text-align:right; }
        .cannibal-chevron { transition:transform 0.2s; color:var(--text-muted); font-size:0.8rem; }
        .cannibal-cluster.expanded .cannibal-chevron { transform:rotate(90deg); color:var(--accent-pink); }
        
        /* Opportunity cards */
        .opp-table-highlight { background:rgba(34,197,94,0.04); }
        .opp-gain { color:var(--success); font-family:'Space Mono',monospace; font-weight:700; font-size:0.78rem; }
        
        /* AI Overview badge */
        .ai-badge { display:inline-flex; align-items:center; gap:0.3rem; padding:0.15rem 0.5rem; border-radius:4px; font-size:0.65rem; font-weight:600; }
        .ai-badge.ai-yes { background:rgba(139,92,246,0.15); color:#a78bfa; border:1px solid rgba(139,92,246,0.3); }
        .ai-badge.ai-no { background:var(--bg-tertiary); color:var(--text-muted); border:1px solid var(--border-color); }
        
        /* Keyword subtabs */
        .kw-subtabs { display:flex; gap:0.25rem; margin-bottom:1.25rem; border-bottom:1px solid var(--border-color); }
        .kw-subtab { padding:0.55rem 0.85rem; font-size:0.78rem; font-weight:500; color:var(--text-muted); cursor:pointer; border-bottom:2px solid transparent; transition:all 0.2s; white-space:nowrap; }
        .kw-subtab:hover { color:var(--text-secondary); }
        .kw-subtab.active { color:var(--accent-pink); border-bottom-color:var(--accent-pink); }
        .kw-subtab .kw-sub-badge { font-size:0.6rem; background:var(--danger-bg); color:var(--danger); padding:0.08rem 0.3rem; border-radius:3px; margin-left:0.25rem; font-family:'Space Mono',monospace; }
        .kw-subcontent { display:none; }
        .kw-subcontent.active { display:block; }
        
        /* Trend arrows */
        .trend-up { color:var(--success); }
        .trend-down { color:var(--danger); }
        .trend-new { color:var(--info); }
        .trend-lost { color:var(--danger); font-weight:700; }


        /* Page Health Tab */
        .ph-page-card { background:var(--bg-card); border:1px solid var(--border-color); border-radius:10px; margin-bottom:0.5rem; overflow:hidden; transition:border-color 0.2s; }
        .ph-page-card:hover { border-color:var(--border-hover); }
        .ph-page-card.expanded { border-color:var(--accent-pink); }
        .ph-head { display:flex; gap:0.65rem; align-items:center; padding:0.75rem 1rem; cursor:pointer; user-select:none; }
        .ph-score-badge { width:42px; height:42px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-family:'Space Mono',monospace; font-size:0.95rem; font-weight:700; flex-shrink:0; border:2px solid; }
        .ph-score-good { color:var(--success); border-color:var(--success); background:var(--success-bg); }
        .ph-score-warn { color:var(--warning); border-color:var(--warning); background:var(--warning-bg); }
        .ph-score-bad { color:var(--danger); border-color:var(--danger); background:var(--danger-bg); }
        .ph-info { flex:1; min-width:0; }
        .ph-url { font-family:'Space Mono',monospace; font-size:0.78rem; color:var(--accent-pink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .ph-url a { color:var(--accent-pink); text-decoration:none; }
        .ph-url a:hover { text-decoration:underline; }
        .ph-meta-row { display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:0.25rem; }
        .ph-tag { font-size:0.65rem; padding:0.1rem 0.4rem; border-radius:3px; background:var(--bg-tertiary); border:1px solid var(--border-color); color:var(--text-muted); }
        .ph-tag.issue-tag { color:var(--danger); border-color:rgba(239,68,68,0.3); }
        .ph-tag.ok-tag { color:var(--success); border-color:rgba(34,197,94,0.3); }
        .ph-tag.warn-tag { color:var(--warning); border-color:rgba(245,158,11,0.3); }
        .ph-issue-count { font-family:'Space Mono',monospace; font-size:0.75rem; color:var(--text-muted); flex-shrink:0; }
        .ph-chevron { transition:transform 0.2s; color:var(--text-muted); font-size:0.8rem; flex-shrink:0; }
        .ph-page-card.expanded .ph-chevron { transform:rotate(90deg); color:var(--accent-pink); }
        .ph-detail { display:none; padding:0 1rem 1rem; border-top:1px solid var(--border-color); }
        .ph-page-card.expanded .ph-detail { display:block; }
        .ph-issue-item { display:flex; align-items:center; gap:0.5rem; padding:0.45rem 0.5rem; border-bottom:1px solid rgba(53,42,51,0.3); font-size:0.78rem; }
        .ph-issue-item:last-child { border-bottom:none; }
        .ph-issue-sev { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
        .ph-issue-sev.crit { background:var(--danger); }
        .ph-issue-sev.warn { background:var(--warning); }
        .ph-issue-sev.note { background:var(--info); }
        .ph-timing { display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:0.4rem; margin-top:0.65rem; }
        .ph-timing-box { background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:6px; padding:0.45rem 0.6rem; }
        .ph-timing-val { font-family:'Space Mono',monospace; font-size:0.95rem; font-weight:700; }
        .ph-timing-lbl { font-size:0.65rem; color:var(--text-muted); }
        .ph-sort-bar { display:flex; gap:0.35rem; margin-bottom:1rem; flex-wrap:wrap; align-items:center; }
        .ph-sort-btn { padding:0.35rem 0.65rem; border:1px solid var(--border-color); border-radius:6px; font-size:0.72rem; cursor:pointer; color:var(--text-muted); background:transparent; transition:all 0.2s; font-family:inherit; }
        .ph-sort-btn:hover { border-color:var(--accent-pink); color:var(--text-secondary); }
        .ph-sort-btn.active { border-color:var(--accent-pink); background:rgba(244,114,182,0.1); color:var(--accent-pink); }
        .ix-copy-btn { font-size:0.65rem; padding:0.25rem 0.55rem; border-radius:5px; border:1px solid var(--border-color); background:var(--bg-tertiary); color:var(--text-muted); cursor:pointer; transition:all 0.2s; font-family:inherit; white-space:nowrap; flex-shrink:0; }
        .ix-copy-btn:hover { border-color:var(--accent-pink); color:var(--accent-pink); }
        .ix-copy-btn.copied { border-color:var(--success); color:var(--success); background:var(--success-bg); }
        .score-impact { font-size:0.65rem; padding:0.15rem 0.45rem; border-radius:4px; background:rgba(34,197,94,0.08); border:1px solid rgba(34,197,94,0.2); color:var(--success); font-family:'Space Mono',monospace; white-space:nowrap; }
        .score-impact.high-impact { background:rgba(34,197,94,0.15); border-color:rgba(34,197,94,0.35); }
        .score-proj { background:var(--bg-card); border:1px solid var(--border-color); border-radius:10px; padding:1rem 1.25rem; margin-bottom:1.25rem; }
        .score-proj-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem; flex-wrap:wrap; gap:0.5rem; }
        .score-proj-title { font-size:0.92rem; font-weight:600; display:flex; align-items:center; gap:0.4rem; }
        .score-proj-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(120px,1fr)); gap:0.5rem; }
        .score-proj-item { text-align:center; padding:0.5rem; border-radius:6px; background:var(--bg-tertiary); border:1px solid var(--border-color); }
        .score-proj-current { font-family:'Space Mono',monospace; font-size:1rem; font-weight:700; }
        .score-proj-arrow { color:var(--success); font-size:0.8rem; margin:0.15rem 0; }
        .score-proj-target { font-family:'Space Mono',monospace; font-size:1.1rem; font-weight:700; color:var(--success); }
        .score-proj-label { font-size:0.65rem; color:var(--text-muted); }
        .cb-bar { display:flex; height:28px; border-radius:8px; overflow:hidden; border:1px solid var(--border-color); margin-bottom:0.75rem; }
        .cb-segment { display:flex; align-items:center; justify-content:center; font-size:0.7rem; font-weight:600; overflow:hidden; white-space:nowrap; }
        .cb-segment.healthy { background:rgba(34,197,94,0.25); color:var(--success); }
        .cb-segment.redirects { background:rgba(245,158,11,0.25); color:var(--warning); }
        .cb-segment.errors { background:rgba(239,68,68,0.25); color:var(--danger); }
        .cb-segment.blocked { background:rgba(59,130,246,0.25); color:var(--info); }
        .cb-legend { display:flex; gap:1rem; flex-wrap:wrap; margin-bottom:1rem; }
        .cb-legend-item { display:flex; align-items:center; gap:0.3rem; font-size:0.75rem; color:var(--text-secondary); }
        .cb-legend-dot { width:10px; height:10px; border-radius:3px; }
        .depth-chart { display:flex; gap:0.25rem; align-items:flex-end; height:140px; margin-bottom:1rem; padding:0.5rem 0; }
        .depth-bar-wrap { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:100%; }
        .depth-bar { width:100%; max-width:60px; border-radius:4px 4px 0 0; min-height:2px; }
        .depth-bar-label { font-size:0.65rem; color:var(--text-muted); margin-top:0.3rem; text-align:center; font-family:'Space Mono',monospace; }
        .depth-bar-count { font-size:0.7rem; font-weight:600; margin-bottom:0.2rem; font-family:'Space Mono',monospace; }
        .export-all-btn { padding:0.5rem 1rem; border-radius:8px; border:1px solid var(--accent-pink); background:rgba(244,114,182,0.1); color:var(--accent-pink); cursor:pointer; font-size:0.8rem; font-weight:600; font-family:inherit; transition:all 0.2s; display:flex; align-items:center; gap:0.4rem; }
        .export-all-btn:hover { background:rgba(244,114,182,0.2); transform:translateY(-1px); }

    </style>
</head>
<body>
    <header class="header">
        <div class="logo">
            <div class="logo-icon"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEgAAABICAIAAADajyQQAAABAGlDQ1BpY2MAABiVY2BgPMEABCwGDAy5eSVFQe5OChGRUQrsDxgYgRAMEpOLCxhwA6Cqb9cgai/r4lGHC3CmpBYnA+kPQKxSBLQcaKQIkC2SDmFrgNhJELYNiF1eUlACZAeA2EUhQc5AdgqQrZGOxE5CYicXFIHU9wDZNrk5pckIdzPwpOaFBgNpDiCWYShmCGJwZ3AC+R+iJH8RA4PFVwYG5gkIsaSZDAzbWxkYJG4hxFQWMDDwtzAwbDuPEEOESUFiUSJYiAWImdLSGBg+LWdg4I1kYBC+wMDAFQ0LCBxuUwC7zZ0hHwjTGXIYUoEingx5DMkMekCWEYMBgyGDGQCm1j8/yRb+6wAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAABmJLR0QA/wD/AP+gvaeTAAAAB3RJTUUH6gIJEik5eCLuUwAAItNJREFUaN7te2eYVFW29tr7hMpV3V2dc6BpmmA3OQsoAiqgiBhHHMNV1DGNinEMmMcwxhEDo45XDGMEFAOigGRoQtNA51wdKnWFUyft8P0obJk7n47OOPf5vnlm/6qnzj7n7HevtVd41zqIcw7/jgP/W6ICAPF/+X2cc4TQ3/4NAMdUhwMHDgDJaQghDoD+n5VYUuH5d+P4f5KQKGWcMYQQIEDfDcYYYwwlp/3ME4N+wTOWlAZjLLmsHxDOX03mjDPOMMZJ4SRUNRgIq6oqCEJGZrrb5UxuBMaYc44A/XTZib8sqv8JhgOgY2JJXt27c9/QynK3xwUAlFKMsCAIgVB457bdDQcbjGjCDtgiSSbnMTWB3bYF586vHFbOKMPCd9j+N4ENygpj6OoKZWWliCIGwAAc+DHpJZF8tf7rNG+q2+OihIqS2O8PrH3v097a1nzJPtrhsTKRJwxGTXDZ04cOEQThlTuemX7JwtMXnEIJFUThx7XgF1bFwXOCMervj731zNJZi+4+YexoxihCGCFEKcUYJxdECEEIY4QAo7Uff16zdvNIe3qZYLMGokY0Rk1T4AAIRRPxFmUge2LV7JNOvmPVS7/+w02VQ4d8L7efgO2XAZY8Bgf31rTtf/WkKQ27dongXXbS/AWUUkEQWhraMrLTnS4H55wxJopiaCDywmMvZvYak9NzSVs3RBN2i2xz2DBl8URC0XUE4JLljR1No88/08mFJ3ZteGb103abbVCr/4VWcdDEMcYIIQAQi2qJngan4ucDCjHNwZkl5UUutxMQAgBRFI80tjxwzX0TA+I07uBHW90cZaalIuC7m5v/1HDw5Uj7u9b4O2L05d4mTFnDgbqhBYUzUNojdz8J3/uEf4Eqcs6TW8YY45wLgpBQEkF/uKA4DwCaGrveX3H+7GVPjp06njOW0PT16zZ0tnRY7da8wrzxk0YH/OF3bn/27IxSh2EQVZOtVpnzvS2tWyWtaP7UCXOmlg4pcjkdhNCOrp4/3vqoNwo3LDpLDib+2Lhn/K/nzZg5hVKKBQH9K4AhhBjjCAFCiKiJruY2h9uVUVjAKEUCbm7yFRZmyJJoEPrQ8keHM8fw4qIBXW3p6+1Wow1NrVMjwjCnM8PlQRaZGeb7R+sGplf8ZsX1RbnZg5qWPE47du//9InVyyfMhN7oEZuxw61de9MVg1bkx3VS/IeUEDCGlvrWQ4ca9vkGfI5sX/Oe+xeOrJ44hlJaVpZLCAGEX3zmlVGmbfHyK6gd4d1t0xI6iyWi1cqhkK+xsaW2qSvfxDv1aPlt5995yZJBx40QUk2jt9cfi8S+Xv/N+PwCGlXtFkuKiOLR4KDbGDQhP2RLfjYwxrmA0Teba7Y0+jsLR5PCDBfgFkvo9bXvVU8cAwgTQiRJ2r6jpnfnkWvPPEeNhZAp8YQiSCJyyW5g0zLLJmSVNo/wf1O771BP4syqof29/b2BoD8U7m7u7G3uMntCKBjTOvrqibL0kivibQFPeraiRIhIAIADxwj/XT0Tf764OADUNbT1DJsaYFlFfeoAFSzOtH0DFjMSFDxeCUsdnd3//fuX7r30MuZNFXwRltBJPGGYRBCQiEUkAFKNCrBXjJo2d3j120+/s+1oXV6cjsktSrc6xktWF2BEHdtBnLBgAe6PyUgCynviA5t2bbr6+su8GWkAsPXrbSXlxfmFeT8kNPyzIHHOkw8YX561/sPaXgW2R+SvmuKtn30zNU+SPCkYoN8feOSmB5edsyRj3ng6LBvLguiy27PTbd4UJEiGohkDMUqYaRE0YuQp6I7KaS8sWjpz5rQEM1A4bA2GjYFIXUdrpDRjlC3dDMacsgwS3t7RPE5MXfvmGgAwTbOrwxcJRwY3+h80HoPh0rG9QQhR84mVH7/SnGbj5q+HRMYNzx03oVp2OFta25+4+ZErzl5cdfosXSJib5Q39VIOmHCgDBGOCCVx1QxFaVwVEBawYMYTokElt72JqzXdbQP9fbQ/3C7xGxaeY2sN2J12C2GHrOQPG9Y9dcYFz7bv/e0zdzqsVjWhSrIs/nAs8jOs4qAjBs4ZB4zR4b37DY6rx51AKRMEvP6TDZ+++O51Ny4rnznmtiXXF+blXP2r8814QpKtNJ5gugEmA5OAQcEwSVwzwlFkEIwQMylN6BLjgs2i28RV9XsnjK0uV7A1bkgmk1Pdj9dtPdWaUz16zLPN385bvrS8rGQwmvmnjEfy5lg0vva9TxYume9yOxkhwHHl2GrEOeV8b83BdW98nCXZHn3+EZvHYda0XnD2GRl2B2hmLDBweG/tqNGjnHY7ZRRxzk3CDYIBrA4HA92IKUZcwRgZkiio2jc7aiomDydOcetIBz7aN7cdf9Hf5o3oVUW5EI0IcSMQDJeXlfySQbAkibn5OQLGACCKAmHsaF39/h37WvYfzRZsly2cXzR77IuPvjRQ23brjVeNLK/gpgmEHmhvu/H1l1dlLB87ZBgxTDApMwliHChjBgXGRUkCWTZVzdTNeDw6YIUCp8UoSz/ztJO/tX5T31y7v/bggoKhQU2xM2LG9ea6xskTxsB36ecPubKfp4rJB9U3Nn/96aZAqy/T4igtL54wZdzh7QcMgZ84dkxbc7tFtuSkeX0Nraaq5xcXUEIjsZgHJEwYo1RgXKDciKvcoEw3uW5y1eCGwRnnjKuJ+PtH97inDxcmDB035oTDew7uf/Xzkhh/2X90Xkrh6WMn9SgDB/PlWx++hRKKBfwLOOikNipK4qVnX43Udcyuqq6eMac1GEitKHSnpxERCYoJMa0oNYNhBJQ/v3ZNW7fvz7fejg3i5TIlJiNM4BDsD/gDgbL0HMQAKOOUcUI5A+DAOJOxWGBP2b37kFWLHqqpjYVji4SUBmGgJRG1jc0vSEvr3F9HC4p/yoLFny4oQshDdz02WUibf+N1MCaP7mnduuGrymgkH1kmjx4nCILvSP39z6689vxzhpeW33LeecQkoBPOGAAgyohuyJJ1fX3tbWtWv/2r38zILFUMk5uEUZp8SyKmAEJTSyolX/PhPZ2CLI4x5czsvOYU8a0xl4+iNt7a061G03Iyk276n40Vk/G7IAirnn/ddSRwzoIFaiyMh+WJaU4cMVBEifX616z5fOLkcWVDSw83Nuc5U1JSUrlmgG5SSrlhhvqDbqtNQBibLMbIbl/rCa7MNAOZhklNAowxxhLRmCBgQRQIpUjV+8KhhE1wFWQLDlt6gvFw1CBmjBj37/v6ytceOnH6REqpIOAfoXl+koMWBCGWSLTuqpubPyTR2CbpFNV2s12tepff9EcxF0JOMaYkUNQYnpZjB3HHN1tbjjRSQkQGXcHg3GceXrn5CxmJpqo7FTLHU5SicUM3mGECY4xSJRLDIpasFqAsGgi2ajFzVHHWyHK3Rm3NPWpvn8HNDl3Z2FZvK8mdMHE0ACRpkn9WFRFCDfXNGQnuGND9Pr8jP9OSlYowYE0HjC0IXzvvTKbpRlwByhHGq/ZvL/Sk/K7wXH0gmm11Pn/plV7BQuMKMqlpmKpBMGVAGGJATFNNqA6LxWaR4pFoR9hPi7LyvKm4d8AI9yNJFGSxU4m2BwZsxKwL9i9ecZtVlolpipLEOf+RhFP8+06ZccDQ2NAidIRYtmYXZbkzDEHFSHGIqU4kiwxjLZbACCGEOaUAsPLC/6KmYYajYBBs0qnOPKoZRkzljHOTYMqAMc6opqiGYbgdzppA19sN+88qq8wfXuLWmFnfiUVBsErN0VCXErUJOIPQTzrbTrjpglNPm0UpFUQxyYX9U9F98rb2nbVVVcMOtDUVpKR/Hu2xITQlt1gI2pFNluxWwWpBksgRAOOMUk4UxIFxxgnlJlcMlROKKeeMUUqIQahuENPEgiDbbVYOaxoPtntw8fAKe1dIVeJuh70lPnA01OdEQh4Wm3v618jagidvWHzWqQBQu3d/T1fXqWedwRj7p1QxuR1U0Yo0q1g99M1Nm584ss1jd8zpL7tv4lwWSagRBQkIiyKWJSxKgBAHJgBCDDjjQBmYhJtEpwQxJhhUoJQwLlutGCE9ruyPBmdOHr88Jdts7dMRt9mk1fX7V7YcmuVMr7S5P7Py0kVT7rv6wqLcHOCsL2C01q2WtD0HD1SdUFX8I5ZP/LuGPhnRU4sUONpZ5fGePGlCnwM2NNS933RwcW7FpNxSHSFOGNEMCQgIKghIxFgxdGIShDECBIRyxmRB6lOi9ZF+t2wb7clODMQGVCXqtVpHFI2PGPGWLqvTrseiD+zb1l3oufHe64K9AWdx/u9On1WUm00pBYD2juB7j11w+X+Znky06vF5/bNWzp4/83gK7GeYe845pVQUxWeefDny6meXVU0WOZK9KfVI+7C1bgzYR4LDgmWXw+lxODcHu97rrJOxWOLxXlA2ygUypQwhRBmzIry9r/2Og1/5dTVmqDcUjT69vIrmp6ZhCXX0M2Jgq9jZ2/NM++Fxly+67rpLLVbLoP9MosIYc842fbEF1T/gdUY7nTfPXLDAbrf91Oh+MEMZLA4k4qrT7ThS3/zgWb9ZklNSnJKZIdusklX0uEI2NGCoekwzYwmU0O+o23w4HnRgMWxoFxWPuK9sctwwEEIGJTJDD7bu+izWXZWeMzQ758SC8tGeTBSM8miciiho6ntb678k0WVP33HyrKmUMs5ZkvfFAsYYJdfIGcOCsOaNN3pajl55z4OcMwD092PFQUiUMozRMbocoUg4arVbLBbLay++ue3hVScVFHvd3lybyyNYrVgCWSB2WZWxIqBuPd4TC/fHo0FNkwDmphdhSUSiIGAkiZYYN20MZ4LopkAUTdUSXMIhU/NFIjtaG9sLUu546f7K8lJiEkEQEP5+YQih/l4/MUluQQ5j1DCZSZjLLjGOMEbHct8fUsVBjnrQ94VDA6FgWJKl7JwsWZYYYxjj999Zt+HRVflxkuf15qSkZVidbtlqRYIsCKIgiaIIGCOEAWMiIAUxxDkGjgyKTCIxoMTUqGlyajAaNvX+eNQXDu0P9HnmjL/lsVsz0lIJoYKAk1nfV59scDgck2ZOBoBQMMwoS8/0Hq9fg+Z+sAxyfHr2fV6cvEwpe/fNDz9448OBYIRzZmoGiMKEEydcdd0lZcNKAaCxpf39l9/u/Gq3MxjLkq3ZrlSPw5nidLllmyQIsiBLAEA5Ao4Y45wzBBwB5ZwANxlRiRlKxCNKvCsY7FaVWFH6Sdect/jcBQJClDKEgHMAzkVJbDxcL0lycfmxnHIQzPHE2yCk5O/vjiJHg3iSAunu6vnNxTdLGrlw2QVjZox3uxxaOHboq91PPbeqxd//x9eemDFnepK1Vg1j746aXes29ew5jMPxTCxnWqw2SeaEAnCbJCPKRQFjSUICxhyoSeKK0h8OawKO2kSW6XFXloyYM2XyzAkum41SyjkXRfFv2cLjVWmwDMAZRxgxxkVRiEZi+3cfTM/yVo6sOF6SKEnoYoz7e/2LT7nw1MmT7nhxBecAPREeViDNgd1ObUf9BXfc2RYOzJk3s7S8ZGhleWdLhzc7fdqsqYJF+uCdtZ+8tabpwFGPJI8qLc32eILdvZIgcMrjihLVdZMwlRNXTkb19HFtfv/Rxpa8orxhleVTp42bMGUcoSwyEM3Jywr0B/fsqAn0BxwOe9X4E0qHlOia3t7S6fI4c/Kyj69FEZMIooAxrt13ePlVd+YV5sZjitvjevT5FaneVMY4xsnN4IAwuuisKzOo9OTHz+ltfnbYJ4miSAAMolLT5nKveOmlbW31s2dN+/DDTwDjcy8+Z9/mXS2+7pzcnFg0Vjq8DCN8eG9dUFMuuPTcpZee9+maL++5+cHKiiFTT5mWkuo+vP1AzaFDo8eP7m3pmnTi+ILyIl9L1+cffKEjds8jt42fPO61F9748J01RWWFaWkpA+HIkdqGcZNH9/f0+/uCoiSmpHpsdpthGJUjKy65+qLCkoLWpvZeX++d199fMqRo1V+eNwxzZtXcU8+Y87tHbiOECIIAhBDO+aavto7Nnug/2MKiqvZxDfvkYPTp9Z9f9siGKx9L/GF9771/+dXYs9prGznnR974qmnDXs45rfWdVjHngVsejsXiXCVMJeaA8uFDf6rKGnPpOVedWDl75X3PMcKYQkic8KD+7s1Pjcmf1HqwgTNO/QZn3KzvObtq4fTquXddf++EshkNR5o458n1NB5tGlM8ZeH0s3VNr69r+N1vV2zdtGPLxm1nn/Kr6SNOuXTxsqnDZ1+08PIpw0566M7HkmbivFMvvvzcq5NPYIyJyYTtg3fXThk5Mh3s2o4miyhGm32/eeWPu0I+CeHyb78e0FRXqivXk6Z/WVeelYNBgLWHfK3tZ519+mUPXEdr2rkvhgiHLMeZs+fmya6Fd9627MJzr7z7GmNbk9gZRgaFjLSKtNzl11xeXFKqfbR7y5ZdBV7vsBHDc7IzjxyqfevV906cPaV8WFmvr2/X1j0zTpk+pKLs0quX9nT3yBa5dGjpfY/flVSr0eNOOH3K4pamtjfXrioqLQz6g53tvuTRioSjOXnZ34dUgigAwJGDR86aPB16o8wfQy7XFwf2bfV35bg9JqGt8YjJiIs61JpWG8cC4dt37K5pb+6PRi9fdglsbmItPe9v3twV8P/6pDlOb8r4kvIlJ846Y/JU2NIkt/rXbdryxdHak4aPWHdw35knzYKNh7EJDZHAuzU7zff+UhPwOW02l8O2bdPO2675XWFp4aF9dSOrR3hS3IUlBQk1kSSO1r6/3umwz5o3w+FyjKiqXLJ0UVFpIaXUm+FNS08DAMMwBgYiOfnZg5GgCACmYcZjilWWQTO4aoBo9iRiVkGgjDPOraIoMayaphGM2mWbaZhPbfry6+Yj80ZV50cZxAIHWlpWfLE2ampOl/uK0xZAJD5lyFBPSIOm/r6BgQe//jRCtW+6mzRK0vd65leOFi3iNacvMiTY09Xy6J9e7wwEiK4vPOf0Ox68xel2JkstACBKooAFAIjHlPtufnDYqKGz5s0AgBGjK6vGjgKAr9Z/88bLbz3+woNZuVmRcDQeTRQU5Q0aRgzJ9FoUwk3dEIqDqoOilaZl6IRgBKKACaVx0zBMovsjQsIgmsEQT7e7bBwz1QCNgMkBAeZgMAqKDhrRo3GiqKATiYLdbjFNU8SCQ5TX1dcuW/nUri3blbZu1BWc4i2+/fRFjBLZIl9y1UXuFHfNzv0zRs09XHsUAFRFIyYBgIHwAKMsKzsTAAzdsDvtLrcLAP775bfXr/m8s6MbALo7exKKkleYO2juRc65KEsZGd5DHW0Q00SNUjN+cvGwU8pHft16FAFkOz1jcgprfO2RYDjX5rYy8Mg2Bqw10Dfg83tSPFXe3KUTprUOBBZXVBuRuAzC1oajpfaU8pRsDxcenb14Y1fjlPzSxj7f6/u22y32Gz99pzTFu/LcywXVKBGdKQ5nWIknpZSVm3nnQ8srRpQDgK7px9wXIEppbn4OAChKorWxPSmWkdXDo5FI5agKAGhrbkcYknOOAUsG72PHVq1+eXVrU1NJdp6q6zLCT8w5Z3PLkbDAxmXnD7VnPLx5TXdfX2VaHsKowJVikSS/nnh3z9arps0zGLlp/GwkYKobEkG762u/7Wl3y/L0vCFcwNWpOWOzi5Aglljcbo4Wj53ZFu71E4XrBGPJ39unUQIMnn/ixQefvregKD8l1dPR3DmksiwUCPf6+pMYGIO8wjwAUGKJbV/v8HX1FJYU3HDnNdfffrUgigBQW3PIk+rJyEpPbgQACPfccw/G2O1yrH77o7ASO8VbiLCgG4ZAaWVq9qjUbDtBEuO6pu/1tU/LLdZjkbf27azt8SGT7u5ptRjGEIdX0k2kGYlIbHPjoQf2fUMQ1PZ117e1DHWmuiSJxBQ1Enlt37aOSGiWt8BjdeTY0qwMYoHgIzu+rO31uSyWtrbO9R99sWPLnpee/tMHb63ZtW3P159vbmvp2Ltz36cffuHvCwT6AyYxPn533d7tNeFwcMTo4VgQmupbvN5UURSeeuj51NSUpVdckGSIj4VUycjjzmvvef3P710+dvL1Q8aletJMBIQxzLiIkGnod+/d8GVfW7XFPcDBUp4zrKLE7bQf6gzv2Lk3PzpQmVPENT0kQl24n+qGRRCHjqwYM2VU457DaqPP43S3xQba1ZiI0YkZBZMziqyi6NeUzzob6tXo2DHVvX3BQGcHB9BU1WK1CgJWFc1mt2GMNVUXBGSxWxKKqqmq1WbFgmMgFCsuy3B67O1NnafMP0kUhff+/NH5ly65/w93DzLE34dh0YHYsvOv+2bbjknFpYvyKkalZNllq05JczTwfufRg9EgjymZ06bde/fV06oqGOeUg4TR+22JF558uePNl0dfcvGjyy+1c37ttff3d3R9sPHNqN3a1hv/7dn/pbY2WG1OuySahIQVhXFqs1q5KBqKvmjFikcvn9ccN6+68KZwzW6L20VNAhghDhyAc2boBqFUxMhqs3IkahoZP5pPm5b2yqvBRII7ndbWxg5KWfnwIS+/89yQitLBsFhMomKMuVNcf1z91IO3PvL+e+u2tzWn2Z1Oi9VgNJxQXC63rOtFS87/49M3e4B/3Em6YzTBcK6VG6Jlwg3XDzS1LFi80G/zhiXImzq51b/+9YTV10xiLqezsERqawIBBwNhV4q7qrJcJ6y1pcthqLI3u3jS+DVdTLNLGRVl/p1btUgUARIpsbichqpxLAwbXp6a6mrr9rc1tOelc0WxFBbwpTexT78QjxwVTz97QVl5ITHJtJMm5+bnfFflAgAQk2Elxpgx5va4fv/iQ2desPCzj75orG+ORmOyJJ88tOzw7ppOR/kt9//WYpKnmnicC11M9EW5iCHHjtpjZhwEsLoOB7mPoy6/Ro4cfO6W58Wq6WbTgdSa3aLFkkhoV9x42UUXn2n1pgucban3PXrvMwNtrQPcDgmIEohFEgklfu2d1y04+7S7Vn584M9vZo4c+cSTy4efUJHgSCTG85/U7nz13jNL29/+Kq3ssUiPz1x5V+jjT58oLnvhnKULk2HUYM5yzEEfj41zPnXm5KkzJ3PONU2z2Wz+/uD8iQsrfn1DWSp+4QAJMnlv0Dj8zn87G3bijLyWKQu0mm9yfQ2HUZojxrkTRaMxymFqija9KNwQ1zYjiKvk0kfuuXHpqZ/10aZu7JAgq6Ss/Oa79j10v1vCEQNUDL6W1vOuvuSM266pDcHw667et/vQ1Y/cnl9d9kw97eEoyybYTxvXv+Osmt1PIeD3Pa7npsXWb7LYCxcMrcgHAMa4KOLj01Dx+AQuiZhSChywgGVJBoDdm3f2xs0JI0evOgLtCo7ZoPWdN8s/ehI73bx1n7HrUy8xeNEQmfOwDoYARiikp2aet/w32CKHT5qRdqRVjqnzLzr1mVptt2pt7AvpwUhJZUlvfb8ANGBaQhpEYyR33KSyy859toZpdnx0W60z1dWSVrb/AOuMqruffIBlltinzOEHa2rqXaIDPfvIkKyyiQ+s+LrA6XJ6XMnaHaU0yZF8H1L9VX4GSBCE47skO1o6bR63D6f0BsAuCJEYZNRvZk4Pke0cGAIwDVEC3h7DgMFEQAxi0eLv1w7I7gzTjoS8MrvD/cQhiESt3d2+wEPXOuOhhooJ0FKbmpfXpALXuc5Q6vxffd4jiBbcva+p/7E7bOnZ24KQBSAKlomLFmh7dzY9d2vs6IEJc2dXFMtuZ+SEE4e982npxk+6Hrt9ud1T8Ktll4wZPyKpcceE9DfsznFlQgQAoOs6YyxhsgSBPpXrDBACzpI8FmecI84ox30qCmgQ1sHkgHX1aJ/eZ+KADgNWd8zubR+AMAJ2aFe674hVEh37vrSHO2OCI5iAiMFjBPckcNgUWvqj/fdf61JjvKetfd1n7SLWrAKvmlJw3W/nv/Zm2sLzAp2dBk5rONhCg920d/XJpysvrL50/lzPyofvuu6SO4/UtSW7hn5StcWd6iED4Vh/QCEQU6jKQRg/jyWioMYgEeOqwowEURKhCFFMFDfBFC2cEF1jIQ38CigJqgSjGgUlBryk2swoovEQyStnDi8nNKxB1MRKLK729sYMAKvbPvd8XdcwQnjV7Y2337x73eb6FmVXI9kSkNxX3NquonXvb+xopkb3BkGPGZ2badcrJ51uvrT6xMWntN297OLDh1owRpzxH2SC0XdyKx0+1GoqsZ077XMLLDpQE/C0JRrBfP9GbLWa1QsYl6TPnzXDcWaxAwDOHcaBYRMxBUAGS0yNd9bFpp2ZphtaWrF8wyrS14aKx4odR8m374IKCANSTWXTJ86FVwoKhVOW8r4A2fg6mn1xHleVVbcmRs7AV/9eCxIq2sWcEty4p8UnhVqa8ka4sYKRLJkN34Y66fQM50umv7mlc/jIUs5/GBgghBEGgNFjR+WWlvR++eemslNKcz12nZiApelL2OSzOQaLyTRRSHTUWXs6SEamFDatY88w9m9l3Mo1IBxUzXTUftq6Y0ms6oSsBBXcOSg1R2UonFJgt7iJBhbMmJgKh77tL5zoHlltCxniGTck5NSU086VU+x83hVI12iUWgXcHiLQ1j5t1BCnw9pWV5NXSUE3gJuS1dnUBctf7CmesXjeqVMBAAs/Xj5DQCl1e5xnLl1COg6nr3ugrlftA5EyhBSKNQ5xMHTUGQUebOc1nzdGwQ9iX5QDMUJ9oVYNOrp1oe0AAl7wwS2Rz96r61EaQ6zZT9va/LB+pa1pS6KnL8xwNBC3qFG07snmTqUXy30h0wz1tnUpfSHQLemqJz/BUaOB9e1rhK5DldWjysdMqKmJg8HMCATqgScSU6catiIoGDIqaR7/Dnc/SAwZunHpOdfu3vCVtXpGx4TLzNyRFrsTIaCGRv1d3toPcw6vMwlRyk80PTmOrgNC+36SkqOll8hxP/I1ubzeWDgkEJVmlRnuHODcEmiDcA8VREtWIc0oRYFO0t8hcYPnj4yUTnH5Djnad4ZLJgeqzyZpeQgLPBb2NG7KOPChElc+2vROb1D5y81Ln30kr6ODb9yQOGOJNbVADIX0q+63vPDBX9LSnD92xgZ9AGNMtshPv/Lwb5fdue2zDSXNe82MYt2TCxgLSkgMtNOQXygslp2CsvMDmVNmdWWVlUaDQTjytWCxjZwyfsXjd9TsPvDaytW97e2Cvx0jLDs9ExctEDDauO5L5mvCsm3SiZPiirrv2x2O+p3I7qQpXqF2Y+7RTWBPASSAGmMJhaR4733yd0OHD3X3h4M4q3WPsuaQvHa7WpCpT52V5W/XBNEqW8Skrv39ast3pCo2DeO91R9/+M66jvpGXYlzDoIse3OyJ0yfeMmyC91u57ebd6kJvbg0v2rsyEB/0Nfd501PLRtSLEpikpboaOsK+MMWi5ybn52VncE5a25o6+np96anVVSWGYaxbdOuzo6e/IKcsvKiz9Zu3LJxa6CnDyHweNNHjh5xzkVnDBs+lJhElMTnHn9x65+ezBw+efoFF3/42D3Vjv6DAymLlq8465w5ydrDT+oaOJ7WJ4R0dfj6egOUUE+qu7A4z+Vy/l/7PY+/MRnWHE9Q/w9GmjGGACVrEYMUPOc8HleAg8NpT85McsAIIULogYMNeXmZ2Vnegwcbdm7ZPXbSmDFjK5Otr/Bzu9+SHa0I/VUpJBnLAALGOABH6FilJlkHSq4D/vr7j0HC/fhpAMAoO9aojxBjXPiu9yb5aoQQFjAc166WrEgMbtngnwDo57UcDd7/3V0IY/R9reDYdwxJufG/imW+ewZ8/wnOX0/jCBAfvMg5oL9ZG0qmad9dYiy5icc+gcEIDwaKCKF/rO+eH1sK/EMfCv1iI7lNx28Q+qml2v9/x7/th3H/AfYfYP8B9h9g/9D4P2vRvCvaUXSqAAAAHnRFWHRpY2M6Y29weXJpZ2h0AEdvb2dsZSBJbmMuIDIwMTasCzM4AAAAFHRFWHRpY2M6ZGVzY3JpcHRpb24Ac1JHQrqQcwcAAAAASUVORK5CYII=" alt="Crocs and Clicks"></div>
            <span style="font-family:'Fraunces',serif;">Crocs <span style="font-weight:400;font-family:'Outfit';font-size:0.8em;color:var(--text-secondary);">and</span> Clicks</span>
            <span class="logo-badge">Full Site Audit</span>
        </div>
        <div class="header-actions">
            <button class="header-btn" onclick="exportPDF()">Export</button>
            <button class="header-btn-primary" onclick="newScan()">New Scan</button>
        </div>
    </header>

    <!-- Input Section -->
    <div id="inputSection">
        <div class="scan-hero">
            <h1>Full Site Audit</h1>
            <p>Crawl your entire website. Every page analyzed for SEO issues, broken links, duplicate content, performance problems, and more.</p>
            <div class="scan-input-row">
                <input type="text" id="urlInput" placeholder="Enter your website URL..." autocomplete="url">
                <button class="btn btn-primary" id="scanBtn" onclick="startCrawl()">Start Crawl</button>
            </div>
            <div class="error-msg" id="errorMsg"></div>
            <input type="hidden" id="maxPages" value="250">
        </div>
        <div class="resume-banner" id="resumeBanner">
            <span></span>
            <div class="resume-banner-text">You have a crawl in progress for <strong id="resumeDomain"></strong></div>
            <button class="btn btn-primary btn-sm" onclick="resumeCrawl()">Resume</button>
            <button class="btn btn-sm" style="background:var(--bg-primary);border:1px solid var(--border-color);color:var(--text-muted);" onclick="clearSaved()">Dismiss</button>
        </div>
    </div>

    <!-- Progress Section -->
    <div class="progress-container" id="progressSection">
        <div class="progress-title" id="progressTitle">Crawling...</div>
        <div class="progress-domain" id="progressDomain"></div>
        <div class="progress-bar-wrap">
            <div class="progress-bar-fill" id="progressFill" style="width:2%;"></div>
            <div class="progress-bar-text" id="progressBarText">Starting...</div>
        </div>
        <div class="progress-stats">
            <div class="progress-stat"><div class="val" id="pCrawled">0</div><div class="lbl">Pages Crawled</div></div>
            <div class="progress-stat"><div class="val" id="pQueued">0</div><div class="lbl">In Queue</div></div>
            <div class="progress-stat"><div class="val" id="pElapsed">0:00</div><div class="lbl">Elapsed</div></div>
            <div class="progress-stat"><div class="val" id="pStatus">Pending</div><div class="lbl">Status</div></div>
        </div>
        <div class="progress-log" id="progressLog"></div>
        <div class="progress-actions">
            <button class="btn btn-sm" style="background:var(--bg-tertiary);border:1px solid var(--border-color);color:var(--text-secondary);" onclick="minimizeCrawl()">Copy Task ID & Continue Later</button>
        </div>
    </div>

    <!-- Dashboard -->
    <div class="dashboard" id="dashboard">
        <div class="dash-header">
            <div>
                <div class="dash-domain" id="dashDomain"></div>
                <div class="dash-meta" id="dashMeta"></div>
            </div>
            <div class="header-actions">
                <button class="header-btn-primary" onclick="newScan()">New Scan</button>
                <button class="header-btn" onclick="exportPDF()">Export PDF</button>
            </div>
        </div>

        <!-- Score Overview -->
        <div class="score-overview" id="scoreOverview"></div>

        <!-- Tabs -->
        <div class="tabs" id="tabBar"></div>
        <div id="tabContent"></div>
    </div>

    <div class="toast" id="toast"></div>
    <script>
    // ═══════════════════════════════════════════════════════════
    // CONFIG & STATE
    // ═══════════════════════════════════════════════════════════
    const API = {
        base: 'https://api.dataforseo.com/v3',
        auth: 'Basic ' + btoa('benjamin_sehayek@vancouvercontractorconsulting.com:701a00cf7bad7a98')
    };
    const state = { taskId:null, lhTaskId:null, domain:null, crawlStart:null, pollTimer:null, data:{}, phase:'idle', business:null };
    const $=id=>document.getElementById(id);

    async function apiFetch(url, options={}) {
        const headers = {'Authorization':API.auth,'Content-Type':'application/json',...(options.headers||{})};
        const opts = {...options, headers};
        // Direct request
        try { const r=await fetch(url,opts); if(r.ok||r.status===401) return r; } catch(e){}
        // CORS proxy fallbacks
        const proxies = [
            u => 'https://corsproxy.io/?'+encodeURIComponent(u),
            u => 'https://api.allorigins.win/raw?url='+encodeURIComponent(u),
        ];
        for(const mkUrl of proxies) {
            try { 
                const r=await fetch(mkUrl(url),{...opts,headers:{...headers,'x-requested-with':'XMLHttpRequest'}}); 
                if(r.ok) return r; 
                // If proxy returns non-ok, try reading the body — DataForSEO may return 200 inside a proxied error
                try { const body = await r.clone().text(); if(body.includes('"status_code":20000')) return r; } catch(e2){}
            } catch(e){}
        }
        throw new Error('API_FAILED');
    }

    // ═══════════════════════════════════════════════════════════
    // BUSINESS AUTO-DETECTION — Find GBP listing from domain
    // ═══════════════════════════════════════════════════════════
    async function detectBusiness(domain) {
        log('Auto-detecting business from domain...');
        try {
            const body = [{
                categories: [],
                description: null,
                title: null,
                is_claimed: null,
                location_coordinate: null,
                filters: [['domain', 'like', '%' + domain + '%']],
                limit: 5
            }];
            const r = await apiFetch(API.base + '/business_data/business_listings/search/live', { method: 'POST', body: JSON.stringify(body) });
            const d = await r.json();
            if (d.status_code !== 20000 || !d.tasks?.[0]?.result) {
                log('  Business detection: no results for ' + domain, 'warning');
                return null;
            }
            const results = d.tasks[0].result.flatMap(r => r.items || []);
            if (results.length === 0) {
                log('  No business listing found for ' + domain, 'warning');
                return null;
            }
            // Pick best match (first result, usually highest relevance)
            const biz = results[0];
            const coords = biz.latitude && biz.longitude ? { lat: biz.latitude, lng: biz.longitude } : null;
            const address = biz.address_info || {};
            const businessInfo = {
                name: biz.title || '',
                coords,
                address: [address.address, address.city, address.region, address.zip].filter(Boolean).join(', '),
                city: address.city || '',
                region: address.region || '',
                country: address.country_code || '',
                categories: (biz.category_ids || []).slice(0, 5),
                categoryNames: biz.category || '',
                placeId: biz.place_id || null,
                phone: biz.phone || '',
                rating: biz.rating?.value || null,
                reviewCount: biz.rating?.votes_count || 0,
                url: biz.url || '',
                allResults: results.slice(0, 5)
            };
            log('  Found: ' + businessInfo.name, 'success');
            log('  Location: ' + businessInfo.address);
            if (coords) log('  Coords: ' + coords.lat.toFixed(5) + ', ' + coords.lng.toFixed(5));
            if (businessInfo.rating) log('  Rating: ' + businessInfo.rating + ' (' + businessInfo.reviewCount + ' reviews)');
            log('  Cost: $' + (d.tasks[0].cost || 0).toFixed(4));
            return businessInfo;
        } catch (e) {
            log('  Business detection failed: ' + e.message, 'warning');
            return null;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // MARKET AUTO-DISCOVERY — Find cities from location pages
    // ═══════════════════════════════════════════════════════════
    function discoverMarketsFromCrawl(pages, businessInfo) {
        if (!pages || pages.length === 0) return [];
        const discovered = [];
        const seen = new Set();
        
        // State abbreviation → full name (for detecting "chehalis-wa" → Chehalis, Washington)
        const stateAbbrMap = {
            'al':'Alabama','ak':'Alaska','az':'Arizona','ar':'Arkansas','ca':'California',
            'co':'Colorado','ct':'Connecticut','de':'Delaware','fl':'Florida','ga':'Georgia',
            'hi':'Hawaii','id':'Idaho','il':'Illinois','in':'Indiana','ia':'Iowa',
            'ks':'Kansas','ky':'Kentucky','la':'Louisiana','me':'Maine','md':'Maryland',
            'ma':'Massachusetts','mi':'Michigan','mn':'Minnesota','ms':'Mississippi','mo':'Missouri',
            'mt':'Montana','ne':'Nebraska','nv':'Nevada','nh':'New Hampshire','nj':'New Jersey',
            'nm':'New Mexico','ny':'New York','nc':'North Carolina','nd':'North Dakota','oh':'Ohio',
            'ok':'Oklahoma','or':'Oregon','pa':'Pennsylvania','ri':'Rhode Island','sc':'South Carolina',
            'sd':'South Dakota','tn':'Tennessee','tx':'Texas','ut':'Utah','vt':'Vermont',
            'va':'Virginia','wa':'Washington','wv':'West Virginia','wi':'Wisconsin','wy':'Wyoming',
            'dc':'District of Columbia'
        };
        // Full state names for validation
        const usStates = {};
        Object.values(stateAbbrMap).forEach(s => { usStates[s.toLowerCase()] = true; });
        
        const caProvAbbrMap = {
            'bc':'British Columbia','ab':'Alberta','on':'Ontario','qc':'Quebec',
            'mb':'Manitoba','sk':'Saskatchewan','ns':'Nova Scotia','nb':'New Brunswick',
            'pe':'Prince Edward Island','nl':'Newfoundland and Labrador'
        };
        const caProvinces = {};
        Object.values(caProvAbbrMap).forEach(s => { caProvinces[s.toLowerCase()] = true; });
        
        // Street address indicators — segments containing these are addresses, not cities
        const streetWords = /\b(blvd|boulevard|ave|avenue|street|st|road|rd|drive|dr|lane|ln|way|court|ct|circle|cir|place|pl|terrace|trail|pike|highway|hwy|suite|ste|floor|unit|apt|building|bldg)\b/i;
        const startsWithNumber = /^\d/;
        
        // Known region from business detection
        const bizRegion = businessInfo?.region || '';
        const bizCountry = businessInfo?.country || '';
        
        // Scan pages for location patterns
        pages.forEach(p => {
            const url = (p.url || '').toLowerCase();
            let path;
            try { path = new URL(url).pathname.toLowerCase(); } catch (e) { path = ''; }
            
            const pageType = classifyUrlType(url);
            if (pageType !== 'location') return;
            
            const segments = path.split('/').filter(Boolean);
            segments.forEach(seg => {
                const clean = seg.replace(/[-_]/g, ' ').replace(/\.(html?|php|aspx?)$/i, '').trim();
                // Skip generic/service segments
                if (/^(locations?|areas?|service|serving|coverage|cities|near|me)$/i.test(clean)) return;
                if (clean.length < 3 || clean.length > 40) return;
                if (/^(residential|commercial|emergency|services?|repair|install|roofing|plumbing|hvac|electric)/i.test(clean)) return;
                
                // Skip street addresses: starts with number or contains street words
                if (startsWithNumber.test(clean)) return;
                if (streetWords.test(clean)) return;
                
                // Try to extract city + state abbreviation from segment
                // Patterns: "chehalis wa", "fort worth tx", "new york ny"
                const words = clean.split(/\s+/);
                let city = '', stateFull = '', country = '';
                
                // Check if last word is a 2-letter state/province abbreviation
                const lastWord = words[words.length - 1];
                if (words.length >= 2 && lastWord.length === 2) {
                    const stateMatch = stateAbbrMap[lastWord];
                    const provMatch = caProvAbbrMap[lastWord];
                    if (stateMatch) {
                        city = words.slice(0, -1).join(' ');
                        stateFull = stateMatch;
                        country = 'United States';
                    } else if (provMatch) {
                        city = words.slice(0, -1).join(' ');
                        stateFull = provMatch;
                        country = 'Canada';
                    }
                }
                
                // Check if last word(s) are a full state name
                if (!stateFull) {
                    // Try last 2 words as state (e.g., "new york", "north carolina")
                    if (words.length >= 3) {
                        const twoWord = words.slice(-2).join(' ');
                        if (usStates[twoWord]) { city = words.slice(0, -2).join(' '); stateFull = twoWord.replace(/\b\w/g, l => l.toUpperCase()); country = 'United States'; }
                        else if (caProvinces[twoWord]) { city = words.slice(0, -2).join(' '); stateFull = twoWord.replace(/\b\w/g, l => l.toUpperCase()); country = 'Canada'; }
                    }
                    // Try last word as state
                    if (!stateFull && words.length >= 2) {
                        if (usStates[lastWord]) { city = words.slice(0, -1).join(' '); stateFull = lastWord.replace(/\b\w/g, l => l.toUpperCase()); country = 'United States'; }
                        else if (caProvinces[lastWord]) { city = words.slice(0, -1).join(' '); stateFull = lastWord.replace(/\b\w/g, l => l.toUpperCase()); country = 'Canada'; }
                    }
                }
                
                // No state found in segment — use business info as fallback
                if (!stateFull) {
                    city = clean;
                    if (bizRegion && bizCountry) {
                        const regionLC = bizRegion.toLowerCase();
                        if (usStates[regionLC]) { stateFull = bizRegion; country = 'United States'; }
                        else if (caProvinces[regionLC]) { stateFull = bizRegion; country = 'Canada'; }
                        else { stateFull = bizRegion; country = ''; }
                    } else if (bizCountry === 'US' || bizCountry === 'us') {
                        country = 'United States';
                    } else if (bizCountry === 'CA' || bizCountry === 'ca') {
                        country = 'Canada';
                    } else {
                        // Cannot determine state — skip this segment entirely
                        // A city without state is useless for DataForSEO location targeting
                        return;
                    }
                }
                
                // Skip if city is empty or too short after state extraction
                if (!city || city.length < 2) return;
                
                // Title-case the city
                const cityTC = city.replace(/\b\w/g, l => l.toUpperCase());
                const key = cityTC.toLowerCase() + '|' + (stateFull || '').toLowerCase();
                if (seen.has(key)) return;
                seen.add(key);
                
                // Build DataForSEO-compatible location string: "City,State,Country"
                const locString = [cityTC, stateFull, country].filter(Boolean).join(',');
                
                discovered.push({
                    city: cityTC,
                    location: locString,
                    source: 'url',
                    page: p.url
                });
            });
        });
        
        return discovered;
    }

    // ═══════════════════════════════════════════════════════════
    // CONTENT-BASED CITY DETECTION — Fallback for single-location sites
    // Scans page titles, H1s, descriptions for city+state patterns
    // ═══════════════════════════════════════════════════════════
    function detectCityFromContent(pages) {
        if (!pages || pages.length === 0) return null;
        
        // US state abbreviations → full names
        const stateAbbr = {
            'AL':'Alabama','AK':'Alaska','AZ':'Arizona','AR':'Arkansas','CA':'California',
            'CO':'Colorado','CT':'Connecticut','DE':'Delaware','FL':'Florida','GA':'Georgia',
            'HI':'Hawaii','ID':'Idaho','IL':'Illinois','IN':'Indiana','IA':'Iowa',
            'KS':'Kansas','KY':'Kentucky','LA':'Louisiana','ME':'Maine','MD':'Maryland',
            'MA':'Massachusetts','MI':'Michigan','MN':'Minnesota','MS':'Mississippi','MO':'Missouri',
            'MT':'Montana','NE':'Nebraska','NV':'Nevada','NH':'New Hampshire','NJ':'New Jersey',
            'NM':'New Mexico','NY':'New York','NC':'North Carolina','ND':'North Dakota','OH':'Ohio',
            'OK':'Oklahoma','OR':'Oregon','PA':'Pennsylvania','RI':'Rhode Island','SC':'South Carolina',
            'SD':'South Dakota','TN':'Tennessee','TX':'Texas','UT':'Utah','VT':'Vermont',
            'VA':'Virginia','WA':'Washington','WV':'West Virginia','WI':'Wisconsin','WY':'Wyoming',
            'DC':'District of Columbia'
        };
        // Full state names (lowercase) for matching "Portland, Oregon"
        const stateNames = {};
        Object.entries(stateAbbr).forEach(([abbr, name]) => { stateNames[name.toLowerCase()] = { abbr, name }; });
        
        // Canadian province abbreviations
        const provAbbr = {
            'BC':'British Columbia','AB':'Alberta','ON':'Ontario','QC':'Quebec',
            'MB':'Manitoba','SK':'Saskatchewan','NS':'Nova Scotia','NB':'New Brunswick',
            'PE':'Prince Edward Island','NL':'Newfoundland and Labrador'
        };
        const provNames = {};
        Object.entries(provAbbr).forEach(([abbr, name]) => { provNames[name.toLowerCase()] = { abbr, name }; });
        
        // Words to skip — not city names
        const skipWords = new Set(['home','about','contact','services','our','the','best','top','quality',
            'professional','expert','certified','licensed','residential','commercial','emergency','free',
            'affordable','reliable','trusted','local','premier','pro','elite','custom','full','new','all']);
        
        const cityVotes = {}; // "city|state" → { count, city, stateFull, country, sources[] }
        
        pages.forEach(p => {
            if (p.status_code !== 200) return;
            const texts = [
                p.meta?.title || '',
                p.meta?.description || '',
                ...(p.meta?.htags?.h1 || []),
                ...(p.meta?.htags?.h2 || []).slice(0, 3)
            ];
            const combined = texts.join(' | ');
            
            // Pattern 1: "City, ST" or "City ST" (2-letter state abbr)
            // Matches: "Portland, OR" "Portland OR" "Fort Worth, TX"
            const abbrPattern = /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2}),?\s+([A-Z]{2})\b/g;
            let m;
            while ((m = abbrPattern.exec(combined)) !== null) {
                const city = m[1].trim();
                const abbr = m[2];
                if (skipWords.has(city.toLowerCase())) continue;
                if (city.length < 3) continue;
                
                let country = '', stateFull = '';
                if (stateAbbr[abbr]) { country = 'United States'; stateFull = stateAbbr[abbr]; }
                else if (provAbbr[abbr]) { country = 'Canada'; stateFull = provAbbr[abbr]; }
                else continue; // Not a recognized state/province
                
                const key = city.toLowerCase() + '|' + stateFull.toLowerCase();
                if (!cityVotes[key]) cityVotes[key] = { count: 0, city, stateFull, country, sources: [] };
                cityVotes[key].count++;
                if (cityVotes[key].sources.length < 3) cityVotes[key].sources.push(shortUrl(p.url || ''));
            }
            
            // Pattern 2: "City, Full State Name" 
            // Matches: "Portland, Oregon" "Fort Worth, Texas"
            const fullPattern = /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2}),?\s+(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New\s+Hampshire|New\s+Jersey|New\s+Mexico|New\s+York|North\s+Carolina|North\s+Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode\s+Island|South\s+Carolina|South\s+Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West\s+Virginia|Wisconsin|Wyoming|British\s+Columbia|Alberta|Ontario|Quebec|Manitoba|Saskatchewan|Nova\s+Scotia|New\s+Brunswick)\b/gi;
            while ((m = fullPattern.exec(combined)) !== null) {
                const city = m[1].trim();
                const stateRaw = m[2].trim();
                if (skipWords.has(city.toLowerCase())) continue;
                if (city.length < 3) continue;
                
                const stateLower = stateRaw.toLowerCase().replace(/\s+/g, ' ');
                let country = '', stateFull = '';
                if (stateNames[stateLower]) { country = 'United States'; stateFull = stateNames[stateLower].name; }
                else if (provNames[stateLower]) { country = 'Canada'; stateFull = provNames[stateLower].name; }
                else continue;
                
                const key = city.toLowerCase() + '|' + stateFull.toLowerCase();
                if (!cityVotes[key]) cityVotes[key] = { count: 0, city, stateFull, country, sources: [] };
                cityVotes[key].count++;
                if (cityVotes[key].sources.length < 3) cityVotes[key].sources.push(shortUrl(p.url || ''));
            }
        });
        
        // Also scan URL paths for city names in service-area patterns
        // e.g., /plumbing-portland/ /services/portland-or/
        pages.forEach(p => {
            if (p.status_code !== 200) return;
            let path;
            try { path = new URL(p.url || '').pathname.toLowerCase(); } catch(e) { return; }
            
            // Look for "city-state" or "city-st" in URL segments
            const segments = path.split('/').filter(Boolean);
            segments.forEach(seg => {
                const clean = seg.replace(/[-_]/g, ' ');
                // Pattern: "portland or" or "portland oregon" in a URL segment
                Object.entries(stateAbbr).forEach(([abbr, name]) => {
                    const abbrLower = abbr.toLowerCase();
                    const nameLower = name.toLowerCase();
                    // "portland or" at end of segment
                    const abbrMatch = clean.match(new RegExp('\\b([a-z]+(?:\\s[a-z]+){0,2})\\s+' + abbrLower + '\\b'));
                    if (abbrMatch) {
                        const city = abbrMatch[1].replace(/\b\w/g, l => l.toUpperCase());
                        if (skipWords.has(city.toLowerCase()) || city.length < 3) return;
                        const key = city.toLowerCase() + '|' + nameLower;
                        if (!cityVotes[key]) cityVotes[key] = { count: 0, city, stateFull: name, country: 'United States', sources: [] };
                        cityVotes[key].count += 0.5; // URL mentions weighted less
                    }
                });
            });
        });
        
        // Find winner — city mentioned most often across pages
        const candidates = Object.values(cityVotes).filter(c => c.count >= 2).sort((a, b) => b.count - a.count);
        if (candidates.length === 0) return null;
        
        const winner = candidates[0];
        return {
            city: winner.city,
            state: winner.stateFull,
            country: winner.country,
            location: [winner.city, winner.stateFull, winner.country].filter(Boolean).join(','),
            confidence: winner.count,
            sources: winner.sources
        };
    }

    // ═══════════════════════════════════════════════════════════
    // MAPS SERP CHECK — Local Pack rankings per keyword per market
    // Adapted from Local Grid Search logic
    // ═══════════════════════════════════════════════════════════
    async function fetchMapsRankings(keywords, coords, marketName) {
        if (!coords || !coords.lat || !coords.lng) return {};
        
        log('  Checking Local Pack rankings for ' + marketName + ' (' + keywords.length + ' keywords)...');
        const results = {};
        
        // Build batch request for maps SERP
        const serpBody = keywords.map(kw => ({
            keyword: typeof kw === 'string' ? kw : kw.keyword,
            location_coordinate: coords.lat.toFixed(7) + ',' + coords.lng.toFixed(7) + ',12',
            language_code: 'en',
            device: 'desktop',
            os: 'windows',
            depth: 20
        }));
        
        try {
            const r = await apiFetch(API.base + '/serp/google/maps/live/advanced', { method: 'POST', body: JSON.stringify(serpBody) });
            const d = await r.json();
            if (d.status_code !== 20000) {
                log('    Maps SERP error: ' + (d.status_message || d.status_code), 'warning');
                return results;
            }
            
            let totalCost = 0;
            let found = 0;
            
            (d.tasks || []).forEach((task, ti) => {
                totalCost += task.cost || 0;
                if (task.status_code !== 20000 || !task.result?.[0]) return;
                
                const res = task.result[0];
                let items = res.items || [];
                // Handle nested structures
                if (items.length > 0 && items[0].type === 'maps_search' && items[0].items) items = items[0].items;
                if (items.length === 0 && res.local_pack) items = res.local_pack;
                if (items.length === 0 && res.maps_search) items = Array.isArray(res.maps_search) ? res.maps_search : [];
                
                const kw = typeof keywords[ti] === 'string' ? keywords[ti] : keywords[ti]?.keyword;
                if (!kw) return;
                
                // Find domain match in maps results
                const domainMatches = items.filter(item => {
                    const itemDomain = (item.domain || '').replace(/^www\./, '');
                    const itemUrl = item.url || '';
                    return itemDomain === state.domain ||
                           itemDomain === 'www.' + state.domain ||
                           itemUrl.includes(state.domain);
                });
                
                // Also get all results for competitor context
                const allMapResults = items.filter(item => item.title).slice(0, 20).map((item, idx) => ({
                    rank: item.rank_group || item.rank_absolute || (idx + 1),
                    title: item.title || '',
                    domain: (item.domain || '').replace(/^www\./, ''),
                    url: item.url || '',
                    rating: item.rating?.value || null,
                    reviews: item.rating?.votes_count || 0,
                    address: item.address || '',
                    isBusiness: (item.domain || '').replace(/^www\./, '') === state.domain
                }));
                
                if (domainMatches.length > 0) found++;
                
                results[kw.toLowerCase()] = {
                    rank: domainMatches.length > 0 ? (domainMatches[0].rank_group || domainMatches[0].rank_absolute || 999) : 'NF',
                    url: domainMatches[0]?.url || '',
                    title: domainMatches[0]?.title || '',
                    allMatches: domainMatches.map(dm => ({
                        rank: dm.rank_group || dm.rank_absolute || 999,
                        url: dm.url || '',
                        title: dm.title || '',
                        domain: (dm.domain || '').replace(/^www\./, '')
                    })),
                    competitors: allMapResults.filter(r => !r.isBusiness).slice(0, 5),
                    totalResults: allMapResults.length
                };
            });
            
            log('    Local Pack: ' + found + '/' + keywords.length + ' keywords with Maps presence', found > 0 ? 'success' : 'warning');
            log('    Maps SERP cost: $' + totalCost.toFixed(4));
            return results;
        } catch (e) {
            log('    Maps SERP failed: ' + e.message, 'warning');
            return results;
        }
    }

    function normalizeUrl(input) {
        let u=input.trim().replace(/\/+$/,'');
        if(!/^https?:\/\//i.test(u)) u='https://'+u;
        try { return new URL(u).hostname.replace(/^www\./,''); } catch(e) { return null; }
    }

    // ═══════════════════════════════════════════════════════════
    // SVG ICON SYSTEM — 2026 best practice: inline SVG, ARIA-hidden, scalable
    // ═══════════════════════════════════════════════════════════
    function ic(name, cls='') {
        const icons = {
            check: '<polyline points="20 6 9 17 4 12"/>',
            chevron: '<polyline points="9 18 15 12 9 6"/>',
            down: '<polyline points="6 9 12 15 18 9"/>',
            x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
            export: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 12 15 15"/>',
            refresh: '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
            copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
        };
        const path = icons[name] || '';
        return '<span class="ic '+cls+'" aria-hidden="true"><svg viewBox="0 0 24 24">'+path+'</svg></span>';
    }
    // Severity shape indicator: shape + color (no color-only reliance)
    function sevShape(level) {
        const map = { critical:'crit', warning:'warn', notice:'info', success:'ok' };
        return '<span class="sev-shape '+(map[level]||'info')+'" aria-hidden="true"></span>';
    }

    // ═══════════════════════════════════════════════════════════
    // ICON SYSTEM — inline SVGs, currentColor, no emoji
    // ═══════════════════════════════════════════════════════════
        // Auto-detected markets — populated from GBP, location pages, and content analysis
        const _markets = [];
        function getTargetLocations() {
            if (_markets.length > 0) return [..._markets];
            // Fallback to TLD detection
            const d = state.domain || '';
            if(/\.ca$/i.test(d)) return ['Canada'];
            if(/\.co\.uk$/i.test(d) || /\.uk$/i.test(d)) return ['United Kingdom'];
            if(/\.com\.au$/i.test(d) || /\.au$/i.test(d)) return ['Australia'];
            return ['United States'];
        }
        // Keep backward compat
        function getTargetLocation() { return getTargetLocations()[0]; }
    // ═══════════════════════════════════════════════════════════
    // INIT — check for saved crawl
    // ═══════════════════════════════════════════════════════════
    document.addEventListener('DOMContentLoaded', () => {
        $('urlInput').addEventListener('keydown', e => { if(e.key==='Enter') startCrawl(); });

        const saved = JSON.parse(localStorage.getItem('cac_crawl')||'null');
        if(saved && saved.taskId) {
            $('resumeDomain').textContent = saved.domain;
            $('resumeBanner').classList.add('active');
        }
    });

    function clearSaved() { localStorage.removeItem('cac_crawl'); $('resumeBanner').classList.remove('active'); }

    async function resumeCrawl() {
        const saved = JSON.parse(localStorage.getItem('cac_crawl')||'null');
        if(!saved) return;
        state.taskId = saved.taskId;
        state.lhTaskId = saved.lhTaskId || null;
        state.domain = saved.domain;
        state.crawlStart = saved.startTime || Date.now();
        $('resumeBanner').classList.remove('active');
        showProgress();
        log('Resuming crawl for ' + saved.domain + '...');
        log('Task ID: ' + saved.taskId);
        startPolling();
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 1: SUBMIT CRAWL TASK
    // ═══════════════════════════════════════════════════════════
    async function startCrawl() {
        const domain = normalizeUrl($('urlInput').value);
        if(!domain) { $('errorMsg').textContent='Please enter a valid URL'; return; }
        $('errorMsg').textContent='';
        
        const maxPages = parseInt($('maxPages')?.value) || 250;

        state.domain = domain;
        state.crawlStart = Date.now();
        showProgress();
        log('Crawling ' + domain + ' — max ' + maxPages + ' pages');

        try {
            const body = [{
                target: domain,
                max_crawl_pages: maxPages,
                load_resources: true,
                enable_javascript: true,
                enable_browser_rendering: true,
                enable_www_redirect_check: true,
                enable_sitemap: true
            }];
            const r = await apiFetch(API.base+'/on_page/task_post', { method:'POST', body:JSON.stringify(body) });
            const d = await r.json();
            if(d.status_code!==20000 || !d.tasks?.[0]) throw new Error(d.status_message||'Task submission failed');
            if(d.tasks[0].status_code!==20100) throw new Error(d.tasks[0].status_message||'Task rejected');
            
            state.taskId = d.tasks[0].id;
            log('Task created: ' + state.taskId, 'success');
            log('Cost: $' + (d.tasks[0].cost||0).toFixed(4));
            
            // Submit Lighthouse task in parallel (non-blocking) — uses task_post pattern to avoid CORS timeout
            submitLighthouseTask(domain).catch(e => log('Lighthouse task submit failed: '+e.message, 'warning'));
            
            // Detect business from domain in parallel (non-blocking) — gets coordinates + primary market
            detectBusiness(domain).then(biz => {
                state.business = biz;
                if (biz && biz.city && biz.region) {
                    // Auto-add primary market if user hasn't added any
                    const currentMarkets = getTargetLocations();
                    const isCountryOnly = currentMarkets.length === 1 && /^(United States|Canada|United Kingdom|Australia)$/i.test(currentMarkets[0]);
                    if (_markets.length === 0 || isCountryOnly) {
                        // Build proper location string
                        const country = biz.country === 'US' || biz.country === 'us' ? 'United States' : 
                                        biz.country === 'CA' || biz.country === 'ca' ? 'Canada' : '';
                        const autoMarket = [biz.city, biz.region, country].filter(Boolean).join(',');
                        if (autoMarket && !_markets.includes(autoMarket)) {
                            _markets.push(autoMarket);
                            log('Auto-detected market: ' + autoMarket, 'success');
                        }
                    }
                }
            }).catch(e => log('Business detection failed: ' + e.message, 'warning'));
            
            // Save for resume
            localStorage.setItem('cac_crawl', JSON.stringify({taskId:state.taskId, lhTaskId:state.lhTaskId, domain, startTime:state.crawlStart}));
            
            startPolling();
        } catch(e) {
            log('' + e.message, 'error');
            if (e.message === 'API_FAILED') {
                toast('Connection failed — check your network or try again', 'error');
            } else {
                toast('Failed to start crawl', 'error');
            }
        }
    }

    // ═══════════════════════════════════════════════════════════
    // LIGHTHOUSE — Task POST + Task GET pattern (avoids CORS timeout)
    // ═══════════════════════════════════════════════════════════
    async function submitLighthouseTask(domain) {
        log('Submitting Lighthouse task (parallel)...');
        const lhUrls = ['https://'+domain, 'https://www.'+domain];
        for (const lhUrl of lhUrls) {
            try {
                const lhBody = [{ url: lhUrl, for_mobile: false, categories: ['performance','accessibility','best_practices','seo'] }];
                const r = await apiFetch(API.base+'/on_page/lighthouse/task_post', { method:'POST', body:JSON.stringify(lhBody) });
                const d = await r.json();
                if (d.status_code === 20000 && d.tasks?.[0]?.status_code === 20100) {
                    state.lhTaskId = d.tasks[0].id;
                    log('  Lighthouse task queued: ' + state.lhTaskId, 'success');
                    log('  Lighthouse cost: $' + (d.tasks[0].cost||0).toFixed(4));
                    // Update saved state with lhTaskId
                    const saved = JSON.parse(localStorage.getItem('cac_crawl')||'{}');
                    saved.lhTaskId = state.lhTaskId;
                    localStorage.setItem('cac_crawl', JSON.stringify(saved));
                    return; // Success — stop trying URLs
                }
                log('  Lighthouse rejected for ' + lhUrl + ': ' + (d.tasks?.[0]?.status_message||d.status_message||'unknown'), 'warning');
            } catch(e) {
                log('  Lighthouse submit failed for ' + lhUrl + ': ' + e.message, 'warning');
            }
        }
        log('  Lighthouse task could not be created — will use heuristic estimates', 'warning');
    }

    async function fetchLighthouseResult() {
        if (!state.lhTaskId) {
            log('  No Lighthouse task ID — skipping', 'warning');
            return null;
        }
        log('Retrieving Lighthouse results...');
        const maxAttempts = 15; // Up to ~60s of polling (4s intervals)
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const r = await apiFetch(API.base+'/on_page/lighthouse/task_get/json/'+state.lhTaskId);
                const d = await r.json();
                
                if (d.status_code !== 20000) {
                    log('  Lighthouse poll error: ' + (d.status_message||'unknown'), 'warning');
                    return null;
                }
                
                const taskStatus = d.tasks?.[0]?.status_code;
                
                if (taskStatus === 20000) {
                    // Task complete — extract data
                    const result = d.tasks?.[0]?.result?.[0] || null;
                    if (result) {
                        const lhData = result.categories ? result : result.lighthouseResult || result.lighthouse_result || null;
                        if (lhData && lhData.categories) {
                            log('  Lighthouse complete — ' + Object.keys(lhData.categories).join(', '), 'success');
                            return lhData;
                        }
                        log('  Lighthouse result has no categories. Keys: ' + Object.keys(result).slice(0,10).join(', '), 'warning');
                    }
                    return null;
                }
                
                if (taskStatus === 20100 || taskStatus === 20200) {
                    // Still processing — wait and retry
                    log('  Lighthouse still processing (attempt '+attempt+'/'+maxAttempts+')...');
                    await new Promise(resolve => setTimeout(resolve, 4000));
                    continue;
                }
                
                // Error status
                log('  Lighthouse task failed: ' + (d.tasks?.[0]?.status_message||'status '+taskStatus), 'warning');
                return null;
                
            } catch(e) {
                log('  Lighthouse poll failed: ' + e.message, 'warning');
                if (attempt < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 4000));
                    continue;
                }
                return null;
            }
        }
        log('  Lighthouse timed out after ' + maxAttempts + ' attempts — using heuristic estimates', 'warning');
        return null;
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 2: POLL FOR COMPLETION
    // ═══════════════════════════════════════════════════════════
    function startPolling() {
        state.phase = 'crawling';
        pollStatus();
        state.pollTimer = setInterval(pollStatus, 4000);
    }

    async function pollStatus() {
        try {
            const r = await apiFetch(API.base+'/on_page/summary/'+state.taskId);
            const d = await r.json();
            if(d.status_code!==20000) { log('Poll error: '+d.status_message,'error'); return; }
            const result = d.tasks?.[0]?.result?.[0];
            if(!result) return;

            const crawled = result.crawl_status?.pages_crawled || 0;
            const queued = result.crawl_status?.pages_in_queue || 0;
            const maxP = result.crawl_status?.max_crawl_pages || 1000;
            const progress = result.crawl_progress;
            const elapsed = Math.floor((Date.now()-state.crawlStart)/1000);
            const total = crawled + queued;

            $('pCrawled').textContent = crawled;
            $('pQueued').textContent = queued;
            $('pElapsed').textContent = Math.floor(elapsed/60)+':'+(elapsed%60+'').padStart(2,'0');
            $('pStatus').textContent = progress === 'finished' ? 'Done' : progress === 'in_progress' ? 'Crawling' : progress;
            
            const pct = total > 0 ? Math.min(95, Math.round(crawled/total*100)) : 5;
            $('progressFill').style.width = (progress==='finished'?100:pct)+'%';
            $('progressBarText').textContent = progress==='finished' ? 'Crawl complete!' : crawled+' / ~'+total+' pages';
            $('progressTitle').textContent = progress==='finished' ? 'Crawl Complete' : 'Crawling '+state.domain;

            if(progress === 'finished') {
                clearInterval(state.pollTimer);
                state.data.summary = result;
                log('Crawl finished! ' + crawled + ' pages crawled', 'success');
                if(result.domain_info) {
                    log('Server: '+(result.domain_info.server||'unknown')+' | CMS: '+(result.domain_info.cms||'unknown'));
                    log('IP: '+(result.domain_info.ip||'?')+' | Checks: '+JSON.stringify(result.domain_info.checks||{}).substring(0,120));
                }
                await fetchAllData();
            }
        } catch(e) {
            log('Poll failed: '+e.message,'warning');
        }
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 3: FETCH ALL 8 ENDPOINTS
    // ═══════════════════════════════════════════════════════════
    async function fetchAllData() {
        state.phase = 'fetching';
        $('progressTitle').textContent = 'Fetching detailed reports...';
        $('progressFill').style.width = '50%';
        $('progressBarText').textContent = 'Loading reports...';
        
        const endpoints = [
            { key:'pages', path:'/on_page/pages', label:'Pages', filters:[["resource_type","=","html"]], limit:1000 },
            { key:'resources', path:'/on_page/resources', label:'Resources', limit:1000 },
            { key:'links', path:'/on_page/links', label:'Links', limit:1000 },
            { key:'duplicateTags', path:'/on_page/duplicate_tags', label:'Duplicate Tags', limit:500 },
            { key:'duplicateContent', path:'/on_page/duplicate_content', label:'Duplicate Content', limit:500 },
            { key:'nonIndexable', path:'/on_page/non_indexable', label:'Non-Indexable Pages', limit:500 },
            { key:'redirectChains', path:'/on_page/redirect_chains', label:'Redirect Chains', limit:500 },
        ];
        
        let done = 0;
        for(const ep of endpoints) {
            log('Fetching ' + ep.label + '...');
            try {
                const body = [{ id: state.taskId, limit: ep.limit }];
                if(ep.filters) body[0].filters = ep.filters;
                const r = await apiFetch(API.base + ep.path, { method:'POST', body:JSON.stringify(body) });
                const d = await r.json();
                const items = d.tasks?.[0]?.result?.[0]?.items || [];
                const totalCount = d.tasks?.[0]?.result?.[0]?.total_items_count || items.length;
                state.data[ep.key] = { items, totalCount };
                log('  ' + items.length + ' items' + (totalCount>items.length ? ' (of '+totalCount+' total)' : ''), 'success');
            } catch(e) {
                log('  Failed: '+e.message, 'error');
                state.data[ep.key] = { items:[], totalCount:0 };
            }
            done++;
            $('progressFill').style.width = (50 + Math.round(done/endpoints.length*40))+'%';
        }
        
        // Lighthouse (homepage) — retrieve via task_get (submitted in parallel at crawl start)
        {
            const lhData = await fetchLighthouseResult();
            if (lhData) {
                state.data.lighthouse = lhData;
            } else {
                state.data.lighthouse = null;
                log('  Lighthouse API unavailable — will use heuristic estimates from crawl data', 'warning');
            }
        }
        

        // ═══════════════════════════════════════════════════════════
        // AUTO-DISCOVER MARKETS FROM LOCATION PAGES
        // Enriches _markets with cities found in crawled location pages
        // ═══════════════════════════════════════════════════════════
        {
            const pages = state.data.pages?.items || [];
            const discoveredMarkets = discoverMarketsFromCrawl(pages, state.business);
            if (discoveredMarkets.length > 0) {
                log('Market Auto-Discovery — found ' + discoveredMarkets.length + ' location pages');
                const existingLower = _markets.map(m => m.toLowerCase());
                let added = 0;
                discoveredMarkets.forEach(dm => {
                    if (_markets.length >= 5) return; // Cap at 5
                    if (existingLower.includes(dm.location.toLowerCase())) return;
                    if (existingLower.some(m => m.includes(dm.city.toLowerCase()))) return; // Already have this city
                    _markets.push(dm.location);
                    existingLower.push(dm.location.toLowerCase());
                    added++;
                    log('  Auto-added market: ' + dm.location + ' (from ' + shortUrl(dm.page) + ')', 'success');
                });
                if (added > 0) log('  ' + added + ' new market(s) added from site structure', 'success');
                else log('  All discovered markets already added');
            }
        }

        // ═══════════════════════════════════════════════════════════
        // CONTENT FALLBACK — Detect city from page titles/headings
        // Runs only if no markets found from GBP or location pages
        // ═══════════════════════════════════════════════════════════
        if (_markets.length === 0) {
            log('No markets from GBP or location pages — scanning page content...');
            const pages = state.data.pages?.items || [];
            const detected = detectCityFromContent(pages);
            if (detected) {
                _markets.push(detected.location);
                log('Content-based detection: ' + detected.location + ' (mentioned ' + Math.round(detected.confidence) + 'x across ' + detected.sources.join(', ') + ')', 'success');
            } else {
                log('  No city detected from content — using TLD fallback: ' + getTargetLocations()[0], 'warning');
            }
        }

        // Log final market summary
        {
            const markets = getTargetLocations();
            log('═══════════════════════════');
            log('Final markets (' + markets.length + '): ' + markets.join(' | '), 'success');
            log('═══════════════════════════');
        }

        // ═══════════════════════════════════════════════════════════
        // KEYWORD INTELLIGENCE — Cannibalization Detection
        // Step 1: Extract keywords from crawl data
        // Step 2: Per-market local SERP checks (find all ranking URLs)
        // Step 3: Maps SERP for cross-surface visibility
        // ═══════════════════════════════════════════════════════════
        {
            const locations = getTargetLocations();
            log('Keyword Intelligence — cannibalization detection...');
            const debugLog = ['Markets: ' + locations.join(', ')];
            const allCityNames = locations.map(l => l.split(',')[0].trim().toLowerCase());

            // ── Step 1: Extract keywords from crawl data ──
            const pages = state.data.pages?.items || [];
            const extractedKws = extractKeywordsFromCrawl(pages);
            log('  Step 1 — Crawl extraction: ' + extractedKws.length + ' keyword candidates');
            debugLog.push('Crawl extraction: ' + extractedKws.length + ' candidates');

            // Sort by extraction score, take top candidates
            const scoredKws = extractedKws.sort((a, b) => b.score - a.score);
            log('  Top candidates: ' + scoredKws.slice(0, 8).map(k => '"' + k.keyword + '" (' + k.type + ')').join(', '));

            // ── Step 2: Per-market local SERP checks ──
            // This is where cannibalization is detected — we check each keyword
            // in each market's local SERPs and find ALL URLs from the domain
            const marketResults = {};

            log('  Step 2 — Local SERP checks per market...');
            for (const loc of locations) {
                const locParts = loc.split(',').map(s => s.trim().toLowerCase());
                const thisCity = locParts[0] || '';
                const otherCities = allCityNames.filter(c => c !== thisCity);

                // Filter keywords for this market (exclude other cities' names)
                const marketKws = scoredKws
                    .filter(kw => !otherCities.some(oc => oc.length > 2 && kw.keyword.toLowerCase().includes(oc)))
                    .slice(0, 50);

                log('  📍 ' + loc + ' — checking ' + marketKws.length + ' keywords...');
                const marketItems = [];

                if (marketKws.length > 0) {
                    try {
                        const serpBody = marketKws.map(kw => ({
                            keyword: kw.keyword,
                            location_name: loc,
                            language_name: 'English',
                            depth: 20,
                            device: 'desktop'
                        }));

                        let sd = null;
                        const sr = await apiFetch(API.base + '/serp/google/organic/live/regular', {
                            method: 'POST', body: JSON.stringify(serpBody)
                        });
                        sd = await sr.json();

                        // Handle location not recognized — retry with spaced format
                        if (sd.tasks?.[0]?.status_code === 40501) {
                            const spaced = loc.split(',').map(s => s.trim()).join(', ');
                            if (spaced !== loc) {
                                log('    Location retry: "' + spaced + '"...', 'warning');
                                const retryBody = serpBody.map(s => ({ ...s, location_name: spaced }));
                                const rr = await apiFetch(API.base + '/serp/google/organic/live/regular', {
                                    method: 'POST', body: JSON.stringify(retryBody)
                                });
                                sd = await rr.json();
                            }
                        }

                        if (sd.status_code === 20000) {
                            let localCost = 0;

                            (sd.tasks || []).forEach((task, ti) => {
                                localCost += task.cost || 0;
                                if (task.status_code !== 20000 || !task.result?.[0]) return;

                                const res = task.result[0];
                                const serpItems = res.items || [];
                                const kwInfo = marketKws[ti];

                                // Find all domain matches (multiple = cannibalization)
                                const domainMatches = serpItems.filter(si =>
                                    si.type === 'organic' && (
                                        si.domain === state.domain ||
                                        si.domain === 'www.' + state.domain ||
                                        si.url?.includes(state.domain)
                                    )
                                );

                                if (domainMatches.length === 0) return; // Not ranking — skip

                                const bestMatch = domainMatches[0];
                                const position = bestMatch.rank_group || bestMatch.rank_absolute || 999;

                                marketItems.push({
                                    keyword_data: {
                                        keyword: kwInfo.keyword,
                                        keyword_info: {
                                            search_volume: 0,
                                            cpc: 0,
                                            competition_level: ''
                                        }
                                    },
                                    ranked_serp_element: {
                                        serp_item: {
                                            rank_group: position,
                                            rank_absolute: position,
                                            url: bestMatch.url || '',
                                            relative_url: (function () { try { return new URL(bestMatch.url).pathname; } catch (e) { return ''; } })(),
                                            etv: 0,
                                            estimated_paid_traffic_cost: 0,
                                            type: 'organic'
                                        }
                                    },
                                    rank_changes: {},
                                    serp_item_types: res.item_types || [],
                                    _serpMatches: domainMatches.map(dm => ({
                                        url: dm.url || '',
                                        path: (function () { try { return new URL(dm.url).pathname; } catch (e) { return ''; } })(),
                                        position: dm.rank_group || dm.rank_absolute || 999,
                                        title: dm.title || '',
                                        description: dm.description || ''
                                    })),
                                    _isCannibalized: domainMatches.length > 1,
                                    _localSerp: {
                                        hasLocalPack: (res.item_types || []).includes('local_pack'),
                                        hasAiOverview: (res.item_types || []).includes('ai_overview'),
                                        topCompetitors: serpItems.filter(si =>
                                            si.type === 'organic' && si.domain !== state.domain && si.domain !== 'www.' + state.domain
                                        ).slice(0, 5).map(si => ({
                                            domain: si.domain, position: si.rank_group, title: si.title
                                        })),
                                        notRanking: false
                                    },
                                    _locallyValidated: true
                                });
                            });

                            const rankingCount = marketItems.length;
                            const canniCount = marketItems.filter(i => i._isCannibalized).length;
                            log('    → ' + rankingCount + '/' + marketKws.length + ' ranking' +
                                (canniCount > 0 ? ' | ⚠️ ' + canniCount + ' cannibalized' : '') +
                                ' — $' + localCost.toFixed(4), 'success');
                            debugLog.push(loc + ': ' + rankingCount + '/' + marketKws.length + ' ($' + localCost.toFixed(4) + ')');
                        } else {
                            log('    → SERP check failed for "' + loc + '"', 'warning');
                            debugLog.push(loc + ': SERP failed');
                        }
                    } catch (e) {
                        log('    → SERP check exception: ' + e.message, 'warning');
                        debugLog.push(loc + ': exception - ' + e.message);
                    }
                }

                // Build market metrics
                let pos1 = 0, pos2_3 = 0, pos4_10 = 0, pos11_20 = 0;
                marketItems.forEach(item => {
                    const pos = item.ranked_serp_element?.serp_item?.rank_group || 999;
                    if (pos === 1) pos1++;
                    else if (pos <= 3) pos2_3++;
                    else if (pos <= 10) pos4_10++;
                    else if (pos <= 20) pos11_20++;
                });

                marketResults[loc] = {
                    items: marketItems,
                    totalCount: marketItems.length,
                    metrics: {
                        organic: {
                            count: marketItems.length,
                            etv: 0,
                            estimated_paid_traffic_cost: 0,
                            pos_1: pos1, pos_2_3: pos2_3, pos_4_10: pos4_10, pos_11_20: pos11_20,
                            is_new: 0, is_lost: 0
                        }
                    }
                };

                log('    Market ' + thisCity + ': ' + marketItems.length + ' ranking, ' + (pos1+pos2_3+pos4_10) + ' page 1');
            }

            // ── Step 3: Maps SERP — Local Pack rankings per market ──
            const mapsDataByMarket = {};
            const bizCoords = state.business?.coords;
            if (bizCoords) {
                log('  Step 3 — Maps SERP visibility...');
                for (const loc of locations) {
                    const mData = marketResults[loc];
                    if (!mData || !mData.items || mData.items.length === 0) continue;

                    const kwsForMaps = mData.items
                        .filter(item => item.keyword_data?.keyword)
                        .sort((a, b) => (a.ranked_serp_element?.serp_item?.rank_group || 999) - (b.ranked_serp_element?.serp_item?.rank_group || 999))
                        .slice(0, 20)
                        .map(item => item.keyword_data.keyword);

                    if (kwsForMaps.length === 0) continue;

                    const mapsResults = await fetchMapsRankings(kwsForMaps, bizCoords, loc);
                    mapsDataByMarket[loc] = mapsResults;

                    let mapsRanking = 0, mapsNotFound = 0;
                    mData.items.forEach(item => {
                        const kw = (item.keyword_data?.keyword || '').toLowerCase();
                        const mapsInfo = mapsResults[kw];
                        if (mapsInfo) {
                            item._mapsData = mapsInfo;
                            item._mapsRank = mapsInfo.rank;
                            item._mapsUrl = mapsInfo.url;
                            const organicRanking = (item.ranked_serp_element?.serp_item?.rank_group || 999) < 999;
                            const mapsRanked = mapsInfo.rank !== 'NF';

                            if (organicRanking && mapsRanked) item._surfaceComparison = 'both-ranking';
                            else if (organicRanking && !mapsRanked) item._surfaceComparison = 'organic-only';
                            else if (!organicRanking && mapsRanked) item._surfaceComparison = 'maps-only';
                            else item._surfaceComparison = 'neither';

                            if (mapsRanked) mapsRanking++;
                            else mapsNotFound++;
                        } else {
                            item._mapsData = null;
                            item._mapsRank = null;
                            item._surfaceComparison = null;
                        }
                    });

                    if (!mData.metrics) mData.metrics = {};
                    mData.metrics.maps = {
                        checked: kwsForMaps.length,
                        ranking: mapsRanking,
                        notFound: mapsNotFound
                    };
                }
            } else {
                log('  Maps SERP skipped — no business coordinates detected', 'warning');
            }

            const anyData = Object.values(marketResults).some(m => m.items.length > 0);
            state.data.keywords = anyData ? { markets: marketResults, locations, mapsData: mapsDataByMarket } : null;
            state.data.keywordDebug = debugLog;
            if (!anyData) log('  No ranking data found — see Local Rankings tab for diagnostics', 'warning');
        }

        $('progressFill').style.width = '100%';
        $('progressBarText').textContent = 'Building dashboard...';
        log('═══════════════════════════');
        log('All data loaded! Building dashboard...', 'success');
        
        localStorage.removeItem('cac_crawl');
        setTimeout(() => renderDashboard(), 500);
    }

    function minimizeCrawl() {
        if(state.taskId) {
            navigator.clipboard.writeText(state.taskId).then(()=>toast('Task ID copied! Close this tab and come back anytime.','success'));
        }
    }

    // ═══════════════════════════════════════════════════════════
    // KEYWORD EXTRACTION & SERP HELPERS
    // ═══════════════════════════════════════════════════════════
    // extractKeywordsFromCrawl: generates local keyword candidates from crawled page content
    // Used as the primary keyword source for local SERP validation
    function extractKeywordsFromCrawl(pages) {
        if (!pages || pages.length === 0) return [];
        
        const locations = getTargetLocations();
        
        // ── Step 1: Detect brand name (most repeated title segment) ──
        const segments = {};
        pages.forEach(p => {
            const title = (p.meta?.title || '').trim();
            if (!title) return;
            title.split(/[|\-–—·:»]/).forEach(seg => {
                const s = seg.trim().toLowerCase();
                if (s.length >= 3 && s.length <= 60) segments[s] = (segments[s] || 0) + 1;
            });
        });
        const sortedSegs = Object.entries(segments).sort((a,b) => b[1] - a[1]);
        const brand = sortedSegs.length && sortedSegs[0][1] > pages.length * 0.35 
            ? sortedSegs[0][0] : '';
        console.log('[KW] Detected brand:', brand || '(none)');
        
        // ── Step 2: Build location word sets to strip from service terms ──
        const locationWords = new Set();
        const cityNames = [];
        const stateAbbrevs = [];
        const stateNames = [];
        const stateMap = {
            'alabama':'al','alaska':'ak','arizona':'az','arkansas':'ar','california':'ca',
            'colorado':'co','connecticut':'ct','delaware':'de','florida':'fl','georgia':'ga',
            'hawaii':'hi','idaho':'id','illinois':'il','indiana':'in','iowa':'ia','kansas':'ks',
            'kentucky':'ky','louisiana':'la','maine':'me','maryland':'md','massachusetts':'ma',
            'michigan':'mi','minnesota':'mn','mississippi':'ms','missouri':'mo','montana':'mt',
            'nebraska':'ne','nevada':'nv','new hampshire':'nh','new jersey':'nj','new mexico':'nm',
            'new york':'ny','north carolina':'nc','north dakota':'nd','ohio':'oh','oklahoma':'ok',
            'oregon':'or','pennsylvania':'pa','rhode island':'ri','south carolina':'sc',
            'south dakota':'sd','tennessee':'tn','texas':'tx','utah':'ut','vermont':'vt',
            'virginia':'va','washington':'wa','west virginia':'wv','wisconsin':'wi','wyoming':'wy',
            'british columbia':'bc','alberta':'ab','ontario':'on','quebec':'qc','manitoba':'mb',
            'saskatchewan':'sk','nova scotia':'ns','new brunswick':'nb'
        };
        
        locations.forEach(loc => {
            const parts = loc.split(',').map(s => s.trim().toLowerCase());
            if (parts[0]) {
                cityNames.push(parts[0]);
                parts[0].split(/\s+/).forEach(w => locationWords.add(w));
            }
            if (parts[1]) {
                stateNames.push(parts[1]);
                const abbr = stateMap[parts[1]] || '';
                if (abbr) stateAbbrevs.push(abbr);
                parts[1].split(/\s+/).forEach(w => locationWords.add(w));
            }
        });
        // Common location noise words
        ['united','states','canada','america','county','city','area','region','near','me'].forEach(w => locationWords.add(w));
        
        console.log('[KW] Cities:', cityNames, 'States:', stateNames, 'Abbrevs:', stateAbbrevs);
        
        // ── Step 3: Extract raw service terms from titles, H1s, H2s, URLs ──
        const serviceTerms = {};  // term → { score, sources }
        
        const skip = new Set(['home page','welcome to','contact us','about us','our services','get in touch',
            'learn more','read more','click here','privacy policy','terms of service','all rights reserved',
            'home','blog','news','gallery','photos','reviews','testimonials','careers','jobs',
            'thank you','thanks','error','page not found','404']);
        
        function cleanTerm(raw) {
            let t = raw.trim().toLowerCase()
                .replace(/[^\w\s'&\-]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            // Strip location words from the term
            locationWords.forEach(w => {
                t = t.replace(new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi'), ' ');
            });
            // Strip state abbreviations
            stateAbbrevs.forEach(a => {
                t = t.replace(new RegExp('\\b' + a + '\\b', 'gi'), ' ');
            });
            // Strip brand
            if (brand) {
                t = t.replace(new RegExp(brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ' ');
            }
            t = t.replace(/\s+/g, ' ').trim();
            return t;
        }
        
        function addService(raw, source) {
            const term = cleanTerm(raw);
            if (!term || term.length < 3) return;
            if (skip.has(term)) return;
            const words = term.split(/\s+/);
            if (words.length < 1 || words.length > 6) return;
            
            if (!serviceTerms[term]) serviceTerms[term] = { score: 0, sources: new Set() };
            serviceTerms[term].sources.add(source);
            serviceTerms[term].score += source === 'title' ? 3 : source === 'h1' ? 2.5 : source === 'h2' ? 1.5 : source === 'url' ? 1 : 0.5;
        }
        
        pages.forEach(p => {
            const title = (p.meta?.title || '').trim();
            const h1s = p.meta?.htags?.h1 || [];
            const h2s = p.meta?.htags?.h2 || [];
            const url = p.url || '';
            
            // Title segments
            if (title) {
                title.split(/[|\-–—·:»]/).forEach(seg => addService(seg, 'title'));
                // Full title too (picks up compound phrases)
                addService(title, 'title');
            }
            
            // H1s and H2s
            h1s.forEach(h => addService(h, 'h1'));
            h2s.forEach(h => addService(h, 'h2'));
            
            // URL path segments (e.g., /auto-body-repair → "auto body repair")
            try {
                const pathname = new URL(url).pathname;
                pathname.split('/').filter(Boolean).forEach(seg => {
                    const readable = seg.replace(/[-_]/g, ' ').replace(/\.(html?|php|aspx?)$/i, '');
                    if (readable.length >= 3) addService(readable, 'url');
                });
            } catch(e) {}
        });
        
        // Also extract service words from the brand itself (e.g., "five star auto body" → "auto body")
        if (brand) {
            const brandWords = brand.split(/\s+/);
            // Common business name qualifiers to strip
            const nameQualifiers = new Set(['five','star','premier','best','quality','top','first','elite',
                'pro','professional','expert','master','royal','golden','silver','diamond','platinum',
                'superior','advanced','prime','ultimate','classic','modern','custom','certified',
                'all','big','the','a','an','mr','mrs','dr','saint','st','mount','mt','lake',
                'north','south','east','west','new','old','great','grand','little']);
            
            // Try progressively stripping qualifier words from the front
            let serviceCore = '';
            for (let i = 0; i < brandWords.length; i++) {
                if (!nameQualifiers.has(brandWords[i])) {
                    serviceCore = brandWords.slice(i).join(' ');
                    break;
                }
            }
            
            // Add the service core if it's meaningful (2+ words, 5+ chars)
            if (serviceCore && serviceCore.length >= 5 && serviceCore.split(/\s+/).length >= 1) {
                if (!serviceTerms[serviceCore]) serviceTerms[serviceCore] = { score: 0, sources: new Set() };
                serviceTerms[serviceCore].score += 5;  // High score — it's the business type
                serviceTerms[serviceCore].sources.add('brand');
                console.log('[KW] Service core from brand:', serviceCore);
            }
            
            // Also try 2-word subphrases from the end (catches "auto body" from "five star auto body")
            if (brandWords.length >= 3) {
                for (let len = 2; len <= 3; len++) {
                    const tail = brandWords.slice(-len).join(' ');
                    if (tail !== serviceCore && tail.length >= 5 && !nameQualifiers.has(brandWords[brandWords.length - len])) {
                        if (!serviceTerms[tail]) serviceTerms[tail] = { score: 0, sources: new Set() };
                        serviceTerms[tail].score += 3;
                        serviceTerms[tail].sources.add('brand');
                    }
                }
            }
        }
        
        console.log('[KW] Raw service terms:', Object.keys(serviceTerms).length, Object.entries(serviceTerms).sort((a,b)=>b[1].score-a[1].score).slice(0,15).map(([k,v])=>k+'('+v.score.toFixed(1)+')'));
        
        // ── Step 4: Generate local keyword combinations ──
        // DIVERSITY-FIRST approach: instead of all combos for all services (which
        // floods the list with city variants of the same term), we allocate slots:
        //   Tier 1: Bare service terms (national volume)
        //   Tier 2: "Near me" variants (massive volume aggregators)
        //   Tier 3: Best local combo per service (1 city each)
        //   Tier 4: Common modifiers (best, cost, affordable, etc.)
        //   Tier 5: Remaining city combos to fill slots
        const keywords = {};
        
        function addKeyword(kw, score, type) {
            kw = kw.trim().toLowerCase();
            if (kw.length < 3 || kw.length > 80) return;
            if (!keywords[kw]) keywords[kw] = { score: 0, type };
            keywords[kw].score = Math.max(keywords[kw].score, score);
        }
        
        // Sort service terms by score — take more terms (up to 30) for diversity
        const topServices = Object.entries(serviceTerms)
            .map(([term, data]) => ({ term, score: data.score }))
            .filter(s => s.score >= 1)
            .sort((a, b) => b.score - a.score)
            .slice(0, 30);
        
        // Primary city = first/largest market (used for Tier 3)
        const primaryCity = cityNames[0] || '';
        const primaryAbbr = stateAbbrevs[0] || '';
        
        // ── Tier 1: Bare service terms (15 slots) ──
        // These have NATIONAL volume data — "auto body repair" gets 40,500/mo
        topServices.slice(0, 15).forEach(({ term, score }) => {
            addKeyword(term, score * 1.0, 'service');
        });
        
        // ── Tier 2: "Near me" variants (15 slots) ──
        // These are volume monsters — "auto body repair near me" = 60,500/mo
        topServices.slice(0, 15).forEach(({ term, score }) => {
            addKeyword(term + ' near me', score * 1.5, 'near_me');
        });
        
        // ── Tier 3: Primary city combo per service (15 slots) ──
        // One local combo per service for the main market
        if (primaryCity) {
            topServices.slice(0, 15).forEach(({ term, score }) => {
                addKeyword(term + ' ' + primaryCity, score * 1.3, 'local');
                if (primaryAbbr) {
                    addKeyword(term + ' ' + primaryCity + ' ' + primaryAbbr, score * 1.1, 'local');
                }
            });
        }
        
        // ── Tier 4: Common modifiers for top services (20 slots) ──
        // These catch high-intent variations people actually search for
        const modifiers = [
            { pre: 'best', score: 1.3 },
            { pre: 'affordable', score: 1.0 },
            { pre: 'cheap', score: 0.9 },
            { pre: 'emergency', score: 1.0 },
            { pre: 'mobile', score: 0.8 },
            { post: 'cost', score: 1.2 },
            { post: 'price', score: 1.0 },
            { post: 'reviews', score: 0.8 },
            { post: 'services', score: 0.7 },
            { pre: 'certified', score: 0.7 },
        ];
        topServices.slice(0, 8).forEach(({ term, score }) => {
            modifiers.forEach(m => {
                if (m.pre) addKeyword(m.pre + ' ' + term, score * m.score, 'modifier');
                if (m.post) addKeyword(term + ' ' + m.post, score * m.score, 'modifier');
            });
            // Question keywords (informational, but feed content strategy)
            addKeyword('how much does ' + term + ' cost', score * 0.6, 'question');
        });
        
        // ── Tier 5: Secondary city combos (fill remaining) ──
        // Add combos for other cities — these rarely have Google Ads volume
        // but SERP checks will find actual rankings
        cityNames.slice(1).forEach(city => {
            topServices.slice(0, 10).forEach(({ term, score }) => {
                addKeyword(term + ' ' + city, score * 1.0, 'local');
                addKeyword(city + ' ' + term, score * 0.7, 'local');
            });
        });
        
        // ── Tier 6: "In city" variants + city+state for secondary cities ──
        cityNames.forEach((city, ci) => {
            const abbr = stateAbbrevs[ci] || stateAbbrevs[0] || '';
            topServices.slice(0, 5).forEach(({ term, score }) => {
                addKeyword(term + ' in ' + city, score * 0.8, 'local');
                if (abbr && ci > 0) {
                    addKeyword(term + ' ' + city + ' ' + abbr, score * 0.9, 'local');
                }
            });
        });
        
        // Brand combos
        if (brand) {
            addKeyword(brand, 3, 'branded');
            cityNames.forEach(city => {
                addKeyword(brand + ' ' + city, 2.5, 'branded');
            });
        }
        
        // ── Step 5: Sort, deduplicate, return top candidates ──
        const result = Object.entries(keywords)
            .map(([keyword, data]) => ({
                keyword,
                score: data.score,
                type: data.type
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 100);
        
        // Log diversity stats
        const typeBreakdown = {};
        result.forEach(k => { typeBreakdown[k.type] = (typeBreakdown[k.type]||0) + 1; });
        console.log('[KW] Generated keywords:', result.length, 'Types:', JSON.stringify(typeBreakdown));
        console.log('[KW] Top 10:', result.slice(0,10).map(k => '"'+k.keyword+'" ('+k.type+', '+k.score.toFixed(1)+')'));
        return result;
    }
    
    
    function detectCountryCode(location) {
        const loc = (location || '').toLowerCase();
        if (loc.includes('canada')) return 2124;
        if (loc.includes('united kingdom') || loc.includes('england') || loc.includes('scotland')) return 2826;
        if (loc.includes('australia')) return 2036;
        return 2840;  // US default
    }

    // ═══════════════════════════════════════════════════════════
    // SCORING ENGINE
    // ═══════════════════════════════════════════════════════════
    function computeScores() {
        const s = state.data.summary || {};
        const pages = state.data.pages?.items || [];
        const resources = state.data.resources?.items || [];
        const links = state.data.links?.items || [];
        const dupes = state.data.duplicateTags?.items || [];
        const dupeContent = state.data.duplicateContent?.items || [];
        const nonIdx = state.data.nonIndexable?.items || [];
        const redirects = state.data.redirectChains?.items || [];
        const lh = state.data.lighthouse;
        const totalPages = pages.length || 1;
        
        const scores = {};

        // Meta Tags: check titles, descriptions across all pages
        let noTitle=0, noDesc=0, shortTitle=0, longTitle=0, shortDesc=0, longDesc=0, noCanonical=0;
        pages.forEach(p => {
            const m = p.meta || {};
            if(!m.title) noTitle++;
            else { const tl=(m.title||'').length; if(tl<30) shortTitle++; if(tl>60) longTitle++; }
            if(!m.description) noDesc++;
            else { const dl=(m.description||'').length; if(dl<70) shortDesc++; if(dl>160) longDesc++; }
            if(!m.canonical) noCanonical++;
        });
        const dupeTitles = dupes.filter(d=>d.type==='title').length;
        const dupeDescs = dupes.filter(d=>d.type==='description').length;
        let metaScore = 100;
        metaScore -= Math.min(30, (noTitle/totalPages)*100);
        metaScore -= Math.min(25, (noDesc/totalPages)*100);
        metaScore -= Math.min(10, ((shortTitle+longTitle)/totalPages)*50);
        metaScore -= Math.min(10, ((shortDesc+longDesc)/totalPages)*50);
        metaScore -= Math.min(10, (dupeTitles/Math.max(1,totalPages))*50);
        metaScore -= Math.min(10, (dupeDescs/Math.max(1,totalPages))*50);
        scores.meta = { score:Math.max(0,Math.round(metaScore)), label:'Meta Tags', issues:noTitle+noDesc+dupeTitles+dupeDescs };

        // Content: word count, headings, readability
        let thinPages=0, noH1=0, multiH1=0, lowReadability=0;
        pages.forEach(p => {
            const wc = p.meta?.content?.plain_text_word_count || 0;
            if(wc < 300) thinPages++;
            const h1s = p.meta?.htags?.h1 || [];
            if(h1s.length === 0) noH1++;
            if(h1s.length > 1) multiH1++;
            const ari = p.meta?.content?.automated_readability_index || 0;
            if(ari > 14) lowReadability++;
        });
        let contentScore = 100;
        contentScore -= Math.min(35, (thinPages/totalPages)*100);
        contentScore -= Math.min(20, (noH1/totalPages)*80);
        contentScore -= Math.min(10, (multiH1/totalPages)*60);
        contentScore -= Math.min(10, (dupeContent.length/Math.max(1,totalPages))*60);
        contentScore -= Math.min(10, (lowReadability/totalPages)*50);
        scores.content = { score:Math.max(0,Math.round(contentScore)), label:'Content', issues:thinPages+noH1+dupeContent.length };

        // Links: broken, redirects
        const brokenLinks = links.filter(l => l.status_code >= 400 || l.status_code === 0);
        const redirectLinks = links.filter(l => l.status_code >= 300 && l.status_code < 400);
        let linkScore = 100;
        linkScore -= Math.min(40, brokenLinks.length * 3);
        linkScore -= Math.min(20, redirectLinks.length * 0.5);
        linkScore -= Math.min(15, redirects.length * 2);
        scores.links = { score:Math.max(0,Math.round(linkScore)), label:'Links', issues:brokenLinks.length };

        // Resources: heavy images, bloated scripts
        const images = resources.filter(r => r.resource_type === 'image');
        const scripts = resources.filter(r => r.resource_type === 'script');
        const styles = resources.filter(r => r.resource_type === 'stylesheet');
        const heavyImages = images.filter(i => (i.size||0) > 200000);
        const heavyScripts = scripts.filter(s => (s.size||0) > 100000);
        let resScore = 100;
        resScore -= Math.min(30, heavyImages.length * 2);
        resScore -= Math.min(25, heavyScripts.length * 3);
        resScore -= Math.min(15, Math.max(0, scripts.length - 30));
        resScore -= Math.min(10, Math.max(0, styles.length - 10) * 2);
        scores.resources = { score:Math.max(0,Math.round(resScore)), label:'Resources', issues:heavyImages.length+heavyScripts.length };

        // Performance (Lighthouse or heuristic)
        if(lh?.categories?.performance?.score != null) {
            scores.performance = { score:Math.round(lh.categories.performance.score*100), label:'Performance', issues:0 };
        } else {
            let perfScore = 70;
            perfScore -= Math.min(20, heavyImages.length * 3);
            perfScore -= Math.min(15, heavyScripts.length * 4);
            perfScore -= Math.min(10, Math.max(0, scripts.length - 20));
            const noEncoding = pages.filter(p=>p.checks?.no_content_encoding).length;
            perfScore -= Math.min(10, noEncoding > 0 ? 10 : 0);
            const totalResSize = resources.reduce((a,r)=>a+(r.size||0),0);
            perfScore -= Math.min(10, Math.max(0, (totalResSize / 1024 / 1024) - 3) * 5);
            const perfIssues = heavyImages.length + heavyScripts.length + (noEncoding > 0 ? 1 : 0);
            scores.performance = { score:Math.min(100,Math.max(0,Math.round(perfScore))), label:'Performance', issues:perfIssues };
        }

        // Accessibility (Lighthouse or heuristic)
        if(lh?.categories?.accessibility?.score != null) {
            scores.accessibility = { score:Math.round(lh.categories.accessibility.score*100), label:'Accessibility', issues:0 };
        } else {
            const noAlt = pages.filter(p=>p.checks?.no_image_alt).length;
            scores.accessibility = { score:Math.max(0,Math.round(100 - (noAlt/totalPages)*60)), label:'Accessibility', issues:noAlt };
        }

        // Technical: non-indexable, redirect chains, security
        const httpPages = pages.filter(p=>p.checks?.is_http);
        let techScore = 100;
        techScore -= Math.min(30, nonIdx.length * 1.5);
        techScore -= Math.min(20, redirects.length * 2);
        techScore -= Math.min(30, httpPages.length > 0 ? 30 : 0);
        const brokenPages = pages.filter(p => p.status_code >= 400);
        techScore -= Math.min(20, brokenPages.length * 3);
        scores.technical = { score:Math.max(0,Math.round(techScore)), label:'Technical', issues:nonIdx.length+redirects.length+brokenPages.length };

        // SEO (Lighthouse or heuristic)
        if(lh?.categories?.seo?.score != null) {
            scores.seo = { score:Math.round(lh.categories.seo.score*100), label:'SEO', issues:0 };
        } else {
            let seoScore = 100;
            seoScore -= (noTitle/totalPages)*30;
            seoScore -= (noDesc/totalPages)*20;
            seoScore -= (noCanonical/totalPages)*15;
            seoScore -= (noH1/totalPages)*15;
            scores.seo = { score:Math.max(0,Math.round(seoScore)), label:'SEO', issues:0 };
        }

        // Social: Open Graph tags
        const noOGPages = pages.filter(p => {
            const smt = p.meta?.social_media_tags;
            if (!smt || typeof smt !== 'object') return true;
            return !smt['og:title'] && !smt['og:description'];
        });
        let socialScore = 100;
        socialScore -= Math.min(60, (noOGPages.length / totalPages) * 80);
        scores.social = { score: Math.max(0, Math.round(socialScore)), label: 'Social', issues: noOGPages.length };

        // Security: HTTP, mixed content
        const mixedContentPages = pages.filter(p => p.checks?.https_to_http_links);
        let secScore = 100;
        secScore -= Math.min(40, httpPages.length > 0 ? 40 : 0);
        secScore -= Math.min(30, mixedContentPages.length * 3);
        const sslValid = s.domain_info?.ssl_info?.valid_certificate;
        if (sslValid === false) secScore -= 30;
        scores.security = { score: Math.max(0, Math.round(secScore)), label: 'Security', issues: httpPages.length + mixedContentPages.length };

        // Overall = weighted average
        const weights = { meta:1, content:1.2, links:1.3, resources:0.8, performance:1.1, accessibility:0.8, technical:1.2, seo:1.1, social:0.6, security:1.3 };
        let wSum=0, wTotal=0;
        Object.entries(scores).forEach(([k,v]) => { const w=weights[k]||1; wSum+=v.score*w; wTotal+=w; });
        scores._overall = Math.round(wSum/wTotal);

        return scores;
    }

    // ═══════════════════════════════════════════════════════════
    // RENDER DASHBOARD
    // ═══════════════════════════════════════════════════════════
    function renderDashboard() {
        state.phase = 'complete';
        $('inputSection').style.display = 'none';
        $('progressSection').classList.remove('active');
        $('dashboard').classList.add('active');

        const scores = computeScores();
        const s = state.data.summary || {};
        const crawled = s.crawl_status?.pages_crawled || state.data.pages?.items?.length || 0;

        $('dashDomain').textContent = state.domain;
        $('dashMeta').textContent = crawled+' pages crawled · '+(s.domain_info?.server||'Unknown server')+' · '+(s.domain_info?.cms||'No CMS detected');

        // Score overview
        const overall = scores._overall;
        const oColor = overall>=80?'var(--success)':overall>=50?'var(--warning)':'var(--danger)';
        const circ = 2*Math.PI*68;
        const offset = circ - (overall/100)*circ;
        
        let scoreHtml = '<div class="score-ring-wrap"><svg viewBox="0 0 160 160" width="160" height="160"><circle class="score-ring-bg" cx="80" cy="80" r="68"/><circle class="score-ring-fg" cx="80" cy="80" r="68" stroke="'+oColor+'" stroke-dasharray="'+circ+'" stroke-dashoffset="'+offset+'"/></svg><div class="score-ring-text"><div class="score-ring-num" style="color:'+oColor+'">'+overall+'</div><div class="score-ring-lbl">Overall Health</div></div></div>';
        scoreHtml += '<div class="score-cards">';
        Object.entries(scores).filter(([k])=>k!=='_overall').forEach(([k,v]) => {
            const c = v.score>=80?'var(--success)':v.score>=50?'var(--warning)':'var(--danger)';
            scoreHtml += '<div class="score-card" onclick="switchTab(\''+k+'\')" style="border-left:3px solid '+c+'"><div class="score-card-top"><span class="score-card-val" style="color:'+c+'">'+v.score+'</span></div><div class="score-card-name">'+v.label+'</div><div class="score-card-bar"><div class="score-card-bar-fill" style="width:'+v.score+'%;background:'+c+';"></div></div></div>';
        });
        scoreHtml += '</div>';
        $('scoreOverview').innerHTML = scoreHtml;

        // Tabs
        const allIssues = generateDetailedIssues();
        const issueBadge = allIssues.filter(i=>i.severity==='critical'||i.severity==='warning').length;
        const tabs = [
            {id:'overview', label:'Overview'},
            {id:'issues', label:'All Issues', badge:issueBadge||undefined},
            {id:'meta', label:'Meta Tags', badge:scores.meta.issues},
            {id:'content', label:'Content', badge:scores.content.issues},
            {id:'links', label:'Links', badge:scores.links.issues},
            {id:'resources', label:'Resources', badge:scores.resources.issues},
            {id:'technical', label:'Technical', badge:scores.technical.issues},
            {id:'pages', label:'All Pages'},
            {id:'pagespeed', label:'Page Speed'},
            {id:'social', label:'Social/OG'},
            {id:'localrankings', label:'Local Rankings', badge:(function(){ const kd=getKeywordData(); if(!kd) return undefined; const cd=detectCannibalization(kd); return cd.serpConflicts.length||undefined; })()},
            {id:'pagehealth', label:'Page Health'},
            {id:'structure', label:'Structure'},
        ];
        $('tabBar').innerHTML = tabs.map(t => '<div class="tab'+(t.id==='overview'?' active':'')+'" onclick="switchTab(\''+t.id+'\')" data-tab="'+t.id+'">'+t.label+(t.badge?'<span class="badge">'+t.badge+'</span>':'')+'</div>').join('');
        
        switchTab('overview');
    }

    function switchTab(id) {
        document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===id));
        const renderers = { overview:renderOverview, issues:renderIssues, meta:renderMeta, content:renderContent, links:renderLinks, resources:renderResources, technical:renderTechnical, pages:renderAllPages, pagespeed:renderPageSpeed, social:renderSocial, localrankings:renderLocalRankings, pagehealth:renderPageHealth, structure:renderStructure };
        if(renderers[id]) { $('tabContent').innerHTML=''; window._tableSources={}; renderers[id](); }
    }

    // ═══════════════════════════════════════════════════════════
    // TAB: OVERVIEW
    // ═══════════════════════════════════════════════════════════
    function renderOverview() {
        const s = state.data.summary || {};
        const pages = state.data.pages?.items || [];
        const resources = state.data.resources?.items || [];
        const links = state.data.links?.items || [];
        const brokenLinks = links.filter(l=>l.status_code>=400||l.status_code===0);
        const dupes = state.data.duplicateTags?.items || [];
        const nonIdx = state.data.nonIndexable?.items || [];
        const redirects = state.data.redirectChains?.items || [];
        
        let html = '<div class="stat-grid">';
        html += statBox(pages.length,'Pages Crawled','HTML pages analyzed');
        html += statBox(resources.length,'Total Resources','Images, scripts, styles');
        html += statBox(links.length,'Links Found','Internal & external');
        html += statBox(brokenLinks.length,'Broken Links', brokenLinks.length>0?'Needs attention':'All clear',brokenLinks.length>0);
        html += statBox(dupes.length,'Duplicate Tags','Title/desc duplicates',dupes.length>0);
        html += statBox(nonIdx.length,'Non-Indexable','Blocked from search',nonIdx.length>0);
        html += statBox(redirects.length,'Redirect Chains','Multi-hop redirects',redirects.length>0);
        const images = resources.filter(r=>r.resource_type==='image');
        const totalImgSize = images.reduce((a,i)=>a+(i.size||0),0);
        html += statBox(formatBytes(totalImgSize),'Total Image Size',images.length+' images');
        html += '</div>';

        // Top Issues
        html += '<div class="section-hdr">Top Issues</div>';
        html += '<div class="issue-list">';
        const issues = generateIssues();
        issues.slice(0,10).forEach(iss => {
            html += '<div class="issue-card"><div class="issue-sev '+iss.sev+'"></div><div class="issue-body"><div class="issue-title">'+iss.title+'</div><div class="issue-desc">'+iss.desc+'</div></div><div class="issue-count">'+iss.count+'</div></div>';
        });
        if(issues.length===0) html += '<div class="issue-card"><div class="issue-body"><div class="issue-title" style="color:var(--success);">'+ic('check','ic-check')+' No major issues found!</div></div></div>';
        html += '</div>';

        // Domain Info
        if(s.domain_info) {
            html += '<div class="section-hdr">Domain Info</div>';
            html += '<div class="stat-grid">';
            html += statBox(s.domain_info.name||'—','Domain');
            html += statBox(s.domain_info.server||'—','Server');
            html += statBox(s.domain_info.cms||'None','CMS');
            html += statBox(s.domain_info.ip||'—','IP Address');
            html += statBox(s.domain_info.ssl_info?.valid_certificate?'Valid':'Invalid','SSL Certificate');
            html += statBox(s.domain_info.total_pages||'—','Total Pages');
            html += '</div>';
        }


        // Keyword Intelligence summary (from Labs API)
        const kwDataOv = getKeywordData();
        if(kwDataOv) {
            html += '<div class="section-hdr">Keyword Intelligence</div>';
            const agg = kwDataOv.aggregate;
            const kwItems = kwDataOv.items;
            const decliningKws = kwItems.filter(k=>k.isDown||k.isLost).length;
            const aiKwsOv = kwItems.filter(k=>k.hasAiOverview).length;
            html += '<div class="stat-grid">';
            html += statBox(kwDataOv.totalRanking.toLocaleString(), 'Ranking Keywords', kwDataOv.locationLabel);
            html += statBox((agg.pos1+agg.pos2_3+agg.pos4_10), 'Page 1 Rankings', 'Positions 1-10');
            html += statBox(agg.pos11_20, 'Page 2 Opps', 'Quick wins available', agg.pos11_20>5);
            html += statBox(decliningKws, 'Declining', 'Need attention', decliningKws>3);
            if(aiKwsOv) html += statBox(aiKwsOv, 'AI Overviews', Math.round(aiKwsOv/kwItems.length*100)+'% of keywords');
            html += '</div>';
        }

        // Speed Insights from page_timing
        const pagesWithTiming = pages.filter(p => p.page_timing && (p.page_timing.duration_time || p.page_timing.time_to_interactive));
        if (pagesWithTiming.length > 0) {
            html += '<div class="section-hdr">Speed Insights</div>';
            const avgLoad = pagesWithTiming.reduce((a,p) => a + (p.page_timing.duration_time||0), 0) / pagesWithTiming.length;
            const avgTTFB = pagesWithTiming.filter(p=>p.page_timing.waiting_time).reduce((a,p) => a + p.page_timing.waiting_time, 0) / Math.max(1, pagesWithTiming.filter(p=>p.page_timing.waiting_time).length);
            const slowest = [...pagesWithTiming].sort((a,b) => (b.page_timing.duration_time||0) - (a.page_timing.duration_time||0));
            html += '<div class="stat-grid">';
            html += statBox(avgLoad.toFixed(2)+'s', 'Avg Load Time', avgLoad > 3 ? 'Slow' : 'Good', avgLoad > 3);
            html += statBox(avgTTFB.toFixed(3)+'s', 'Avg TTFB', avgTTFB > 0.8 ? 'High' : 'Good', avgTTFB > 0.8);
            html += statBox(pagesWithTiming.filter(p=>(p.page_timing.duration_time||0)>3).length, 'Slow Pages', '>3s load', pagesWithTiming.filter(p=>(p.page_timing.duration_time||0)>3).length > 0);
            html += statBox(pagesWithTiming.length, 'Timed Pages', 'of '+pages.length);
            html += '</div>';
            if (slowest.length > 0) {
                html += '<div class="issue-list">';
                slowest.slice(0,5).forEach(p => {
                    const t = p.page_timing.duration_time||0;
                    const sev = t > 5 ? 'high' : t > 3 ? 'medium' : 'low';
                    html += '<div class="issue-card"><div class="issue-sev '+sev+'"></div><div class="issue-body"><div class="issue-title" style="font-family:\'Space Mono\',monospace;font-size:0.75rem;">'+shortUrl(p.url)+'</div><div class="issue-desc">Load: '+t.toFixed(2)+'s'+(p.page_timing.waiting_time ? ' | TTFB: '+p.page_timing.waiting_time.toFixed(3)+'s' : '')+(p.page_timing.time_to_interactive ? ' | TTI: '+p.page_timing.time_to_interactive.toFixed(2)+'s' : '')+'</div></div><div class="issue-count">'+t.toFixed(1)+'s</div></div>';
                });
                html += '</div>';
            }
        }

        $('tabContent').innerHTML = html;
    }

    function generateIssues() {
        const issues = [];
        const pages = state.data.pages?.items || [];
        const links = state.data.links?.items || [];
        const resources = state.data.resources?.items || [];
        const dupes = state.data.duplicateTags?.items || [];
        const dupeContent = state.data.duplicateContent?.items || [];
        const nonIdx = state.data.nonIndexable?.items || [];
        const redirects = state.data.redirectChains?.items || [];
        const brokenLinks = links.filter(l=>l.status_code>=400||l.status_code===0);
        const brokenPages = pages.filter(p=>p.status_code>=400);
        const noTitle = pages.filter(p=>!p.meta?.title);
        const noDesc = pages.filter(p=>!p.meta?.description);
        const noH1 = pages.filter(p=>!p.meta?.htags?.h1?.length);
        const thinPages = pages.filter(p=>(p.meta?.content?.plain_text_word_count||0)<300);
        const noAlt = pages.filter(p=>p.checks?.no_image_alt);
        const httpPages = pages.filter(p=>p.checks?.is_http);
        const heavyImages = resources.filter(r=>r.resource_type==='image'&&(r.size||0)>200000);

        if(brokenLinks.length) issues.push({sev:'high',title:'Broken Links Found',desc:brokenLinks.length+' links return 4xx/5xx errors. Fix or remove these to improve user experience and crawlability.',count:brokenLinks.length});
        if(brokenPages.length) issues.push({sev:'high',title:'Broken Pages',desc:brokenPages.length+' pages return error status codes.',count:brokenPages.length});
        if(httpPages.length) issues.push({sev:'high',title:'Insecure Pages (HTTP)',desc:httpPages.length+' pages served over HTTP instead of HTTPS.',count:httpPages.length});
        if(noTitle.length) issues.push({sev:'high',title:'Missing Page Titles',desc:noTitle.length+' pages have no title tag. Every page needs a unique, descriptive title.',count:noTitle.length});
        if(noDesc.length) issues.push({sev:'medium',title:'Missing Meta Descriptions',desc:noDesc.length+' pages have no meta description.',count:noDesc.length});
        if(noH1.length) issues.push({sev:'medium',title:'Missing H1 Headings',desc:noH1.length+' pages have no H1 tag.',count:noH1.length});
        if(dupes.length) issues.push({sev:'medium',title:'Duplicate Meta Tags',desc:dupes.length+' sets of duplicate title/description tags found.',count:dupes.length});
        if(dupeContent.length) issues.push({sev:'medium',title:'Duplicate Content',desc:dupeContent.length+' pages with substantially similar content.',count:dupeContent.length});
        if(thinPages.length) issues.push({sev:'medium',title:'Thin Content Pages',desc:thinPages.length+' pages with fewer than 300 words.',count:thinPages.length});
        if(nonIdx.length) issues.push({sev:'medium',title:'Non-Indexable Pages',desc:nonIdx.length+' pages blocked from search engine indexing.',count:nonIdx.length});
        if(redirects.length) issues.push({sev:'medium',title:'Redirect Chains',desc:redirects.length+' redirect chains detected. Each hop slows page load and dilutes link equity.',count:redirects.length});
        if(noAlt.length) issues.push({sev:'low',title:'Images Missing Alt Text',desc:noAlt.length+' pages contain images without alt attributes.',count:noAlt.length});
        if(heavyImages.length) issues.push({sev:'low',title:'Oversized Images',desc:heavyImages.length+' images over 200KB. Compress for faster load times.',count:heavyImages.length});

        return issues.sort((a,b)=>({high:0,medium:1,low:2}[a.sev])-({high:0,medium:1,low:2}[b.sev]));
    }

    // ═══════════════════════════════════════════════════════════
    // TAB: ALL ISSUES — Comprehensive Priority Board
    // ═══════════════════════════════════════════════════════════
    function generateDetailedIssues() {
        const pages = state.data.pages?.items || [];
        const links = state.data.links?.items || [];
        const resources = state.data.resources?.items || [];
        const dupes = state.data.duplicateTags?.items || [];
        const dupeContent = state.data.duplicateContent?.items || [];
        const nonIdx = state.data.nonIndexable?.items || [];
        const redirects = state.data.redirectChains?.items || [];
        const lh = state.data.lighthouse;
        const totalPages = pages.length || 1;

        // Pre-compute filtered sets
        const brokenLinks = links.filter(l => l.status_code >= 400 || l.status_code === 0);
        const brokenPages = pages.filter(p => p.status_code >= 400);
        const serverErrors = pages.filter(p => p.status_code >= 500);
        const clientErrors = pages.filter(p => p.status_code >= 400 && p.status_code < 500);
        const httpPages = pages.filter(p => p.checks?.is_http);
        const noTitle = pages.filter(p => !p.meta?.title);
        const noDesc = pages.filter(p => !p.meta?.description);
        const noH1 = pages.filter(p => !p.meta?.htags?.h1?.length);
        const multiH1 = pages.filter(p => (p.meta?.htags?.h1?.length || 0) > 1);
        const shortTitle = pages.filter(p => p.meta?.title && p.meta.title.length < 30);
        const longTitle = pages.filter(p => p.meta?.title && p.meta.title.length > 60);
        const shortDesc = pages.filter(p => p.meta?.description && p.meta.description.length < 70);
        const longDesc = pages.filter(p => p.meta?.description && p.meta.description.length > 160);
        const thinPages = pages.filter(p => (p.meta?.content?.plain_text_word_count || 0) < 300 && p.status_code === 200);
        const veryThinPages = pages.filter(p => (p.meta?.content?.plain_text_word_count || 0) < 100 && p.status_code === 200);
        const noAlt = pages.filter(p => p.checks?.no_image_alt);
        const heavyImages = resources.filter(r => r.resource_type === 'image' && (r.size || 0) > 200000);
        const veryHeavyImages = resources.filter(r => r.resource_type === 'image' && (r.size || 0) > 500000);
        const heavyScripts = resources.filter(r => (r.resource_type === 'script' || r.resource_type === 'stylesheet') && (r.size || 0) > 100000);
        const brokenResources = resources.filter(r => r.status_code >= 400);
        const dupeTitles = dupes.filter(d => d.type === 'title');
        const dupeDescs = dupes.filter(d => d.type === 'description');
        const noCanonical = pages.filter(p => p.checks?.no_canonical);
        const longRedirects = redirects.filter(r => (r.chain?.length || 0) > 2);

        // NEW: Additional checks from DataForSEO API
        const mixedContent = pages.filter(p => p.checks?.https_to_http_links);
        const metaRefresh = pages.filter(p => p.checks?.has_meta_refresh_redirect);
        const renderBlocking = pages.filter(p => (p.meta?.render_blocking_scripts_count || 0) + (p.meta?.render_blocking_stylesheets_count || 0) > 5);
        const noDoctype = pages.filter(p => p.checks?.no_doctype);
        const deprecatedHtml = pages.filter(p => p.checks?.deprecated_html_tags);
        const hasFrames = pages.filter(p => p.checks?.frame);
        const hasFlash = pages.filter(p => p.checks?.flash);
        const orphanPages = pages.filter(p => p.checks?.is_orphan_page);
        const noFavicon = pages.filter(p => p.checks?.no_favicon);
        const lowContentRate = pages.filter(p => p.checks?.low_content_rate);
        const noEncoding = pages.filter(p => p.checks?.no_encoding_meta_tag);
        const notSeoFriendly = pages.filter(p => p.checks?.seo_friendly_url === false);
        const irrelevantTitle = pages.filter(p => p.checks?.irrelevant_title);
        const irrelevantDesc = pages.filter(p => p.checks?.irrelevant_description);
        const oversizedPages = pages.filter(p => p.checks?.size_greater_than_3mb);
        const slowPages = pages.filter(p => p.checks?.high_loading_time);
        const highTTFB = pages.filter(p => p.checks?.high_waiting_time);
        const canonicalChain = pages.filter(p => p.checks?.canonical_chain);
        const canonicalToRedirect = pages.filter(p => p.checks?.canonical_to_redirect);
        const canonicalToBroken = pages.filter(p => p.checks?.canonical_to_broken);
        const recursiveCanonical = pages.filter(p => p.checks?.recursive_canonical);
        const noCompression = pages.filter(p => p.checks?.no_content_encoding);
        const largeDom = pages.filter(p => (p.total_dom_size || 0) > 3000000);
        const deepPages = pages.filter(p => (p.click_depth || 0) > 4 && p.status_code === 200);
        const noCaching = pages.filter(p => p.cache_control && p.cache_control.cachable === false && p.status_code === 200);

        // NEW: Social media / Open Graph analysis
        const noOG = pages.filter(p => {
            const smt = p.meta?.social_media_tags;
            if (!smt || typeof smt !== 'object') return true;
            return !smt['og:title'] && !smt['og:description'];
        });

        // NEW: Heading hierarchy analysis (skipped heading levels)
        const skippedHeadings = pages.filter(p => {
            const ht = p.meta?.htags;
            if (!ht) return false;
            const levels = [];
            for (let i = 1; i <= 6; i++) { if (ht['h' + i]?.length) levels.push(i); }
            for (let i = 1; i < levels.length; i++) { if (levels[i] - levels[i - 1] > 1) return true; }
            return false;
        });

        // NEW: Internal linking analysis
        const poorInternalLinks = pages.filter(p => (p.meta?.internal_links_count || 0) < 2 && p.status_code === 200);
        const tooManyLinks = pages.filter(p => (p.meta?.internal_links_count || 0) + (p.meta?.external_links_count || 0) > 150);

        // NEW: Low onpage score from DataForSEO
        const lowScorePages = pages.filter(p => p.onpage_score != null && p.onpage_score < 50 && p.status_code === 200);

        const issues = [];
        const urlList = (arr, prop = 'url') => arr.slice(0, 50).map(p => ({ url: p[prop] || p.url || p.page || '—', status: p.status_code }));
        const linkUrlList = (arr) => arr.slice(0, 50).map(l => ({ url: l.url || l.link_to || '—', from: l.link_from || l.page_from || '', status: l.status_code }));

        // ────────────────────────────────────────────
        // CRITICAL — Blocks indexing, errors, security
        // ────────────────────────────────────────────
        if (serverErrors.length) issues.push({
            severity: 'critical', category: 'Technical', title: 'Server Errors (5xx)',
            impact: 5, effort: 'hard', count: serverErrors.length, timeMin: 30,
            why: 'Pages returning 5xx server errors are completely inaccessible to users and search engines. Google will de-index pages that consistently return server errors, and users hitting these pages will immediately bounce.',
            fix: '<strong>Immediate action required.</strong> Check your server logs for root cause — common culprits: exhausted PHP memory, broken database connections, misconfigured .htaccess, or crashed processes. Work with your hosting provider if errors are server-wide.',
            urls: urlList(serverErrors)
        });

        if (httpPages.length) issues.push({
            severity: 'critical', category: 'Security', title: 'Insecure Pages (HTTP)',
            impact: 5, effort: 'medium', count: httpPages.length, timeMin: 20,
            why: 'Pages served over HTTP are flagged "Not Secure" by all major browsers, eroding user trust. Google has confirmed HTTPS as a ranking signal. This also creates vulnerability to man-in-the-middle attacks.',
            fix: '<strong>Install an SSL certificate</strong> (most hosts offer free Let\'s Encrypt). Implement 301 redirects from HTTP to HTTPS. Update internal links, canonical tags, and sitemap URLs.',
            urls: urlList(httpPages)
        });

        if (mixedContent.length) issues.push({
            severity: 'critical', category: 'Security', title: 'Mixed Content (HTTPS→HTTP Links)',
            impact: 4, effort: 'medium', count: mixedContent.length, timeMin: 15,
            why: 'These HTTPS pages contain links or resources loaded over insecure HTTP. Browsers block mixed content, breaking page functionality and showing security warnings that destroy user trust.',
            fix: '<strong>Update all resource references to use HTTPS.</strong> Search your code and database for "http://" URLs and replace with "https://". Check images, scripts, stylesheets, and iframes. Use Content-Security-Policy headers to detect future violations.',
            urls: urlList(mixedContent)
        });

        if (nonIdx.length) {
            const importantNonIdx = nonIdx.filter(p => !p.url?.includes('/tag/') && !p.url?.includes('/author/') && !p.url?.includes('?'));
            if (importantNonIdx.length) issues.push({
                severity: 'critical', category: 'Indexing', title: 'Important Pages Blocked from Indexing',
                impact: 5, effort: 'easy', count: importantNonIdx.length, timeMin: 5,
                why: 'These pages are excluded from search results due to noindex directives, robots.txt blocks, or canonical issues. Every day they remain blocked is lost organic traffic.',
                fix: '<strong>Review each blocked page.</strong> Remove noindex tags if you want them indexed. Update robots.txt to allow crawling. Fix canonical tag issues. Request re-indexing via Google Search Console.',
                urls: urlList(importantNonIdx)
            });
        }

        if (clientErrors.length) issues.push({
            severity: 'critical', category: 'Technical', title: 'Broken Pages (4xx Errors)',
            impact: 4, effort: 'medium', count: clientErrors.length, timeMin: 10,
            why: '404 and other 4xx errors create dead ends for users and crawlers. Search engines waste crawl budget on these, and link equity pointing to them is completely wasted.',
            fix: '<strong>For each broken page:</strong> If moved, add 301 redirect. If intentionally removed, return 410 Gone. Update any internal links pointing to broken URLs.',
            urls: urlList(clientErrors)
        });

        if (canonicalToBroken.length) issues.push({
            severity: 'critical', category: 'Technical', title: 'Canonical Tags Pointing to Broken Pages',
            impact: 5, effort: 'easy', count: canonicalToBroken.length, timeMin: 5,
            why: 'These pages have canonical tags pointing to URLs that return errors. This tells Google the "real" version of the page is broken, effectively removing both pages from search results.',
            fix: '<strong>Update the canonical tag</strong> on each page to point to a valid, accessible URL — typically the page itself (self-referencing canonical).',
            urls: urlList(canonicalToBroken)
        });

        if (metaRefresh.length) issues.push({
            severity: 'critical', category: 'Technical', title: 'Meta Refresh Redirects Detected',
            impact: 4, effort: 'easy', count: metaRefresh.length, timeMin: 5,
            why: 'Meta refresh redirects are an outdated technique that search engines strongly discourage. They pass little to no link equity, create poor user experience with delays, and can be flagged as deceptive by Google.',
            fix: '<strong>Replace all meta refresh redirects with proper 301 server-side redirects.</strong> This preserves link equity and provides instant redirects without confusing search engines.',
            urls: urlList(metaRefresh)
        });

        // ────────────────────────────────────────
        // WARNING — Significant ranking/UX impact
        // ────────────────────────────────────────
        if (brokenLinks.length) issues.push({
            severity: 'warning', category: 'Links', title: 'Broken Links Detected',
            impact: 4, effort: 'easy', count: brokenLinks.length, timeMin: 2,
            why: 'Broken links hurt user experience and signal poor site maintenance to search engines, impacting crawl efficiency and rankings.',
            fix: '<strong>Update or remove each broken link.</strong> For internal links, redirect or fix the target URL. For external links, update to a working URL or remove entirely.',
            urls: linkUrlList(brokenLinks)
        });

        if (noTitle.length) issues.push({
            severity: 'warning', category: 'Meta', title: 'Missing Page Titles',
            impact: 4, effort: 'easy', count: noTitle.length, timeMin: 3,
            why: 'The title tag is the #1 on-page SEO element. It\'s the clickable headline in search results. Pages without titles are severely handicapped in rankings.',
            fix: '<strong>Write a unique, descriptive title for each page.</strong> Keep 30–60 characters. Include primary keyword near the beginning.',
            urls: urlList(noTitle)
        });

        if (dupeTitles.length) issues.push({
            severity: 'warning', category: 'Meta', title: 'Duplicate Page Titles',
            impact: 3, effort: 'easy', count: dupeTitles.length, timeMin: 3,
            why: 'Identical titles cause keyword cannibalization — your own pages compete against each other, diluting ranking potential for all.',
            fix: '<strong>Make every title unique</strong> with differentiating details like product names, locations, or specific features.',
            urls: dupeTitles.slice(0, 25).map(d => ({ url: d.title || d.tag || d.value || '—', status: d.total_count || d.count || '—' }))
        });

        if (longRedirects.length) issues.push({
            severity: 'warning', category: 'Technical', title: 'Long Redirect Chains (3+ hops)',
            impact: 4, effort: 'medium', count: longRedirects.length, timeMin: 10,
            why: 'Chains with 3+ hops significantly slow page loads. Google may stop following after 5 hops, and each hop dilutes link equity.',
            fix: '<strong>Flatten each chain into a single redirect.</strong> A → B → C → D should become A → D directly.',
            urls: longRedirects.slice(0, 25).map(r => ({ url: (r.chain || []).map(c => c.url || c).join(' → '), status: (r.chain?.length || 0) + ' hops' }))
        });

        if (redirects.length && redirects.length > longRedirects.length) issues.push({
            severity: 'warning', category: 'Technical', title: 'Redirect Chains Detected',
            impact: 3, effort: 'medium', count: redirects.length, timeMin: 10,
            why: 'Even 2-hop chains add ~100ms latency per hop and risk losing ~10-15% link equity per redirect.',
            fix: '<strong>Simplify to single hops.</strong> Update internal links to point directly to final destination URLs.',
            urls: redirects.slice(0, 25).map(r => ({ url: (r.chain || []).map(c => c.url || c).join(' → '), status: (r.chain?.length || 0) + ' hops' }))
        });

        if (veryThinPages.length) issues.push({
            severity: 'warning', category: 'Content', title: 'Very Thin Content (Under 100 Words)',
            impact: 3, effort: 'hard', count: veryThinPages.length, timeMin: 30,
            why: 'Pages under 100 words provide almost no value. Google\'s Helpful Content Update targets thin pages and can apply site-wide ranking penalties.',
            fix: '<strong>Decide each page\'s fate:</strong> Expand with valuable content (aim 500+ words), consolidate into a related page and redirect, or remove with 410 status.',
            urls: urlList(veryThinPages)
        });

        if (brokenResources.length) issues.push({
            severity: 'warning', category: 'Resources', title: 'Broken Resources (CSS/JS/Images)',
            impact: 3, effort: 'medium', count: brokenResources.length, timeMin: 10,
            why: 'Broken CSS breaks visual layout. Broken JS disables functionality. Broken images leave empty boxes. All signal poor quality.',
            fix: '<strong>Fix or replace each resource.</strong> Re-upload missing files. Update moved references. Self-host critical external resources.',
            urls: brokenResources.slice(0, 25).map(r => ({ url: r.url || '—', status: r.status_code }))
        });

        if (noCanonical.length) issues.push({
            severity: 'warning', category: 'Technical', title: 'Pages Missing Canonical Tags',
            impact: 3, effort: 'easy', count: noCanonical.length, timeMin: 2,
            why: 'Without canonicals, search engines must guess which URL version is "official." This splits ranking signals across duplicate URLs.',
            fix: '<strong>Add a self-referencing canonical tag to every page.</strong> Ensure it matches preferred protocol (HTTPS) and www/non-www convention.',
            urls: urlList(noCanonical)
        });

        if (canonicalChain.length) issues.push({
            severity: 'warning', category: 'Technical', title: 'Canonical Tag Chains',
            impact: 3, effort: 'easy', count: canonicalChain.length, timeMin: 5,
            why: 'These pages have canonical tags pointing to another URL whose canonical points elsewhere — a chain. Google may ignore the entire signal, causing duplicate content confusion.',
            fix: '<strong>Ensure each canonical tag points directly to the final preferred URL</strong> — no intermediate steps. Each page should canonicalize to itself or directly to the one preferred version.',
            urls: urlList(canonicalChain)
        });

        if (canonicalToRedirect.length) issues.push({
            severity: 'warning', category: 'Technical', title: 'Canonical Tags Pointing to Redirects',
            impact: 3, effort: 'easy', count: canonicalToRedirect.length, timeMin: 5,
            why: 'These canonical tags point to URLs that redirect. Google recommends canonicals point to the final destination directly, not to a redirect.',
            fix: '<strong>Update canonical tags</strong> to point to the final destination URL after the redirect, not the redirecting URL.',
            urls: urlList(canonicalToRedirect)
        });

        if (recursiveCanonical.length) issues.push({
            severity: 'warning', category: 'Technical', title: 'Recursive Canonical Tags',
            impact: 4, effort: 'easy', count: recursiveCanonical.length, timeMin: 3,
            why: 'These pages have circular canonical references where Page A canonicalizes to Page B which canonicalizes back to Page A. Google will ignore both canonical signals.',
            fix: '<strong>Break the loop</strong> by choosing one definitive canonical URL for each set of pages and pointing all others to it.',
            urls: urlList(recursiveCanonical)
        });

        if (orphanPages.length) issues.push({
            severity: 'warning', category: 'Links', title: 'Orphan Pages (No Internal Links Pointing Here)',
            impact: 4, effort: 'medium', count: orphanPages.length, timeMin: 5,
            why: 'Orphan pages have zero internal links pointing to them, making them nearly invisible to search engine crawlers and impossible for users to discover through navigation. These pages receive no internal link equity.',
            fix: '<strong>Add internal links to each orphan page</strong> from relevant parent or sibling pages. Include them in navigation menus, sidebar widgets, or contextual links within content. If the page is no longer needed, remove it.',
            urls: urlList(orphanPages)
        });

        if (slowPages.length) issues.push({
            severity: 'warning', category: 'Performance', title: 'Slow Loading Pages',
            impact: 4, effort: 'hard', count: slowPages.length, timeMin: 30,
            why: 'These pages exceed acceptable load time thresholds. Page speed is a confirmed Google ranking factor, and slow pages see 2-3x higher bounce rates. Each additional second of load time reduces conversions by ~7%.',
            fix: '<strong>Optimize each slow page:</strong> Compress images, minify CSS/JS, enable browser caching, reduce server response time, defer non-critical scripts, use lazy loading for images below the fold.',
            urls: urlList(slowPages)
        });

        if (highTTFB.length) issues.push({
            severity: 'warning', category: 'Performance', title: 'High Server Response Time (TTFB)',
            impact: 4, effort: 'hard', count: highTTFB.length, timeMin: 60,
            why: 'Time to First Byte (TTFB) above 600ms indicates server-side performance problems. This delays everything — rendering, interactivity, and Core Web Vitals scores.',
            fix: '<strong>Server-side optimization needed:</strong> Enable server-side caching (Redis, Varnish), optimize database queries, upgrade hosting if shared, use a CDN for static assets, enable HTTP/2.',
            urls: urlList(highTTFB)
        });

        if (oversizedPages.length) issues.push({
            severity: 'warning', category: 'Performance', title: 'Oversized Pages (>3MB)',
            impact: 3, effort: 'medium', count: oversizedPages.length, timeMin: 15,
            why: 'Pages larger than 3MB take excessively long to load, especially on mobile. They consume data plans, frustrate users, and hurt Core Web Vitals scores significantly.',
            fix: '<strong>Reduce page weight:</strong> Compress images to WebP, minify HTML/CSS/JS, remove unused code, lazy-load non-critical resources, implement pagination for long content.',
            urls: urlList(oversizedPages)
        });

        if (noDoctype.length) issues.push({
            severity: 'warning', category: 'Technical', title: 'Missing DOCTYPE Declaration',
            impact: 2, effort: 'easy', count: noDoctype.length, timeMin: 2,
            why: 'Without a DOCTYPE, browsers render in "quirks mode" causing inconsistent layout and rendering bugs. Search engines may have difficulty correctly parsing page content.',
            fix: '<strong>Add &lt;!DOCTYPE html&gt; as the very first line</strong> of each page\'s HTML, before the &lt;html&gt; tag. This ensures standards-mode rendering across all browsers.',
            urls: urlList(noDoctype)
        });

        if (renderBlocking.length) issues.push({
            severity: 'warning', category: 'Performance', title: 'Excessive Render-Blocking Resources',
            impact: 3, effort: 'medium', count: renderBlocking.length, timeMin: 20,
            why: 'These pages have 5+ render-blocking scripts and stylesheets that delay visible content. Users see a blank screen until all blocking resources load, directly hurting LCP (Largest Contentful Paint) and user experience.',
            fix: '<strong>Defer non-critical JavaScript</strong> with async/defer attributes. Inline critical CSS and lazy-load the rest. Move scripts to page bottom. Use media queries on stylesheets to prevent blocking for non-matching devices.',
            urls: urlList(renderBlocking)
        });

        // ────────────────────────────────────────
        // NOTICE — Moderate/minor improvements
        // ────────────────────────────────────────
        if (noDesc.length) issues.push({
            severity: 'notice', category: 'Meta', title: 'Missing Meta Descriptions',
            impact: 2, effort: 'easy', count: noDesc.length, timeMin: 3,
            why: 'Meta descriptions control search result snippets. Without them, Google auto-generates often less compelling text. Well-written descriptions improve CTR by 5-10%.',
            fix: '<strong>Write unique descriptions for each page.</strong> Keep 70–160 characters. Include primary keyword and a clear call-to-action.',
            urls: urlList(noDesc)
        });

        if (noH1.length) issues.push({
            severity: 'notice', category: 'Content', title: 'Missing H1 Headings',
            impact: 2, effort: 'easy', count: noH1.length, timeMin: 2,
            why: 'The H1 signals to search engines what the page is about. Missing H1 is also an accessibility concern for screen readers.',
            fix: '<strong>Add a single, descriptive H1 to each page</strong> that includes the primary keyword. Use H2-H6 for subheadings.',
            urls: urlList(noH1)
        });

        if (multiH1.length) issues.push({
            severity: 'notice', category: 'Content', title: 'Multiple H1 Headings on Page',
            impact: 1, effort: 'easy', count: multiH1.length, timeMin: 2,
            why: 'Multiple H1 tags dilute heading hierarchy and confuse search engines about the primary topic.',
            fix: '<strong>Keep one H1 per page.</strong> Demote others to H2 or lower for clear content hierarchy.',
            urls: urlList(multiH1)
        });

        if (skippedHeadings.length) issues.push({
            severity: 'notice', category: 'Content', title: 'Broken Heading Hierarchy (Skipped Levels)',
            impact: 2, effort: 'easy', count: skippedHeadings.length, timeMin: 5,
            why: 'These pages skip heading levels (e.g. H1 → H3, missing H2). This breaks the semantic document outline, confuses screen readers, and weakens the content structure signal for search engines.',
            fix: '<strong>Fix the heading hierarchy</strong> so levels descend sequentially: H1 → H2 → H3 etc. Never skip from H1 to H3 or H2 to H4. Each subheading should be one level deeper than its parent section.',
            urls: urlList(skippedHeadings)
        });

        if (dupeDescs.length) issues.push({
            severity: 'notice', category: 'Meta', title: 'Duplicate Meta Descriptions',
            impact: 2, effort: 'easy', count: dupeDescs.length, timeMin: 3,
            why: 'Identical descriptions across pages miss opportunities to customize search snippets for each page.',
            fix: '<strong>Write unique descriptions</strong> focusing on what makes each page different.',
            urls: dupeDescs.slice(0, 25).map(d => ({ url: d.title || d.tag || d.value || '—', status: d.total_count || d.count || '—' }))
        });

        if (dupeContent.length) issues.push({
            severity: 'notice', category: 'Content', title: 'Duplicate Content Detected',
            impact: 3, effort: 'hard', count: dupeContent.length, timeMin: 30,
            why: 'Substantially similar pages cause keyword cannibalization and can trigger site-wide quality filters.',
            fix: '<strong>Choose one primary version per set:</strong> Use canonical tags, consolidate with redirects, or add 60%+ unique content to differentiate.',
            urls: dupeContent.slice(0, 25).map(d => ({ url: d.url || d.page || d.page1 || '—', status: Math.round((d.similarity || 0) * 100) + '% similar' }))
        });

        const thinNotVery = thinPages.filter(p => (p.meta?.content?.plain_text_word_count || 0) >= 100);
        if (thinNotVery.length) issues.push({
            severity: 'notice', category: 'Content', title: 'Thin Content Pages (100–300 Words)',
            impact: 2, effort: 'hard', count: thinNotVery.length, timeMin: 30,
            why: 'Pages with 100–300 words may lack depth to rank competitively. Informational/commercial pages typically need 500+ words.',
            fix: '<strong>Expand content where it makes sense.</strong> Research top-ranking competitors and match or exceed their coverage.',
            urls: urlList(thinNotVery)
        });

        if (noOG.length && noOG.length < totalPages) issues.push({
            severity: 'notice', category: 'Social', title: 'Missing Open Graph / Social Meta Tags',
            impact: 2, effort: 'easy', count: noOG.length, timeMin: 3,
            why: 'These pages lack Open Graph tags (og:title, og:description, og:image). When shared on Facebook, LinkedIn, Twitter, or messaging apps, they display generic previews without proper images or descriptions — dramatically reducing click-through rates from social shares.',
            fix: '<strong>Add Open Graph meta tags to every page:</strong> og:title, og:description, og:image (minimum 1200×630px), og:url, and og:type. For Twitter, add twitter:card, twitter:title, and twitter:description. Most CMS platforms have plugins (Yoast, RankMath) that auto-generate these.',
            urls: urlList(noOG)
        });

        if (notSeoFriendly.length) issues.push({
            severity: 'notice', category: 'Technical', title: 'Non-SEO-Friendly URLs',
            impact: 2, effort: 'medium', count: notSeoFriendly.length, timeMin: 10,
            why: 'These URLs contain parameters, session IDs, excessive length, or non-descriptive characters that make them difficult for users to read and for search engines to evaluate topical relevance.',
            fix: '<strong>Restructure URLs to be short, descriptive, and keyword-rich.</strong> Use hyphens to separate words. Remove unnecessary parameters and IDs. Implement 301 redirects from old URLs.',
            urls: urlList(notSeoFriendly)
        });

        if (irrelevantTitle.length) issues.push({
            severity: 'notice', category: 'Meta', title: 'Title Tags Don\'t Match Page Content',
            impact: 3, effort: 'easy', count: irrelevantTitle.length, timeMin: 5,
            why: 'These page titles are mismatched with the actual page content. Google measures relevance between titles and content — mismatched titles reduce rankings and may cause Google to rewrite your title in search results.',
            fix: '<strong>Rewrite titles to accurately reflect each page\'s actual content.</strong> The title should describe what the user will find on the page and include keywords that appear naturally in the content.',
            urls: urlList(irrelevantTitle)
        });

        if (irrelevantDesc.length) issues.push({
            severity: 'notice', category: 'Meta', title: 'Meta Descriptions Don\'t Match Content',
            impact: 2, effort: 'easy', count: irrelevantDesc.length, timeMin: 5,
            why: 'These meta descriptions don\'t match the page content. Google will ignore irrelevant descriptions and auto-generate its own, which is often less compelling for click-through rates.',
            fix: '<strong>Rewrite descriptions to accurately summarize each page\'s content</strong> with a clear call-to-action.',
            urls: urlList(irrelevantDesc)
        });

        if (orphanPages.length === 0 && deepPages.length) issues.push({
            severity: 'notice', category: 'Links', title: 'Pages Buried Too Deep (4+ Clicks from Homepage)',
            impact: 3, effort: 'medium', count: deepPages.length, timeMin: 15,
            why: 'Pages requiring 4+ clicks to reach from the homepage receive less crawl attention and less link equity. Google\'s crawl budget is limited — deeply buried pages get crawled less frequently and rank lower.',
            fix: '<strong>Flatten your site architecture.</strong> Add links to deep pages from higher-level category pages. Use breadcrumbs, related content sections, and HTML sitemaps to reduce click depth to 3 or fewer.',
            urls: urlList(deepPages)
        });

        if (poorInternalLinks.length) issues.push({
            severity: 'notice', category: 'Links', title: 'Pages with Very Few Internal Links',
            impact: 2, effort: 'easy', count: poorInternalLinks.length, timeMin: 5,
            why: 'These pages have fewer than 2 internal links pointing out, which means they\'re not distributing link equity to other pages. Good internal linking helps search engines discover content and understand site structure.',
            fix: '<strong>Add relevant internal links</strong> to other pages on your site. Link to related content, category pages, and cornerstone articles. Aim for 3-5 contextual internal links per page.',
            urls: urlList(poorInternalLinks)
        });

        if (tooManyLinks.length) issues.push({
            severity: 'notice', category: 'Links', title: 'Pages with Excessive Links (150+)',
            impact: 1, effort: 'medium', count: tooManyLinks.length, timeMin: 10,
            why: 'Pages with over 150 links dilute the link equity passed to each linked page. Google also views excessively linked pages as potentially spammy.',
            fix: '<strong>Reduce link count to under 100 where possible.</strong> Remove redundant navigation links, consolidate footer links, and prioritize the most important destination pages.',
            urls: urlList(tooManyLinks)
        });

        if (shortTitle.length) issues.push({
            severity: 'notice', category: 'Meta', title: 'Title Tags Too Short (Under 30 Characters)',
            impact: 1, effort: 'easy', count: shortTitle.length, timeMin: 3,
            why: 'Short titles waste search result real estate. Longer titles (30–60 chars) include more keywords and context.',
            fix: '<strong>Expand titles</strong> with relevant keywords, location info, or brand modifiers. Aim for 30–60 characters.',
            urls: urlList(shortTitle)
        });

        if (longTitle.length) issues.push({
            severity: 'notice', category: 'Meta', title: 'Title Tags Too Long (Over 60 Characters)',
            impact: 1, effort: 'easy', count: longTitle.length, timeMin: 2,
            why: 'Titles over 60 characters get truncated in search results, cutting off important information.',
            fix: '<strong>Trim to under 60 characters.</strong> Front-load important keywords; move secondary details to meta description.',
            urls: urlList(longTitle)
        });

        if (noAlt.length) issues.push({
            severity: 'notice', category: 'Accessibility', title: 'Images Missing Alt Text',
            impact: 2, effort: 'easy', count: noAlt.length, timeMin: 2,
            why: 'Alt text describes images for screen readers (ADA/WCAG requirement) and helps Google Image Search rankings. Missing alt text is both an SEO miss and accessibility violation.',
            fix: '<strong>Add descriptive alt text to every meaningful image.</strong> 5–15 words, include relevant keywords naturally. Decorative images use empty alt="".',
            urls: urlList(noAlt)
        });

        if (veryHeavyImages.length) issues.push({
            severity: 'notice', category: 'Performance', title: 'Very Large Images (Over 500KB)',
            impact: 3, effort: 'easy', count: veryHeavyImages.length, timeMin: 2,
            why: 'Images over 500KB dramatically slow page loads, especially on mobile. Page speed is a confirmed ranking factor.',
            fix: '<strong>Compress and convert to WebP/AVIF</strong> (50-80% smaller than JPEG). Resize to max display dimensions. Use lazy loading. Tools: Squoosh, TinyPNG, ShortPixel.',
            urls: veryHeavyImages.slice(0, 25).map(r => ({ url: r.url || '—', status: formatBytes(r.size || 0) }))
        });

        const heavyImgsNotVery = heavyImages.filter(r => (r.size || 0) <= 500000);
        if (heavyImgsNotVery.length) issues.push({
            severity: 'notice', category: 'Performance', title: 'Oversized Images (200–500KB)',
            impact: 2, effort: 'easy', count: heavyImgsNotVery.length, timeMin: 2,
            why: 'These images are larger than optimal. Compressing them improves speed and experience on mobile.',
            fix: '<strong>Batch-compress</strong> using Squoosh or ImageOptim. Convert to WebP. Implement responsive srcset.',
            urls: heavyImgsNotVery.slice(0, 25).map(r => ({ url: r.url || '—', status: formatBytes(r.size || 0) }))
        });

        if (heavyScripts.length) issues.push({
            severity: 'notice', category: 'Performance', title: 'Heavy JavaScript/CSS Files (Over 100KB)',
            impact: 2, effort: 'hard', count: heavyScripts.length, timeMin: 30,
            why: 'Large scripts block rendering, hurting Core Web Vitals (LCP, INP). Heavy files also increase data usage for mobile.',
            fix: '<strong>Minify and compress with Terser/CleanCSS.</strong> Split into chunks, load non-critical scripts async/defer. Enable Brotli/Gzip.',
            urls: heavyScripts.slice(0, 25).map(r => ({ url: r.url || '—', status: formatBytes(r.size || 0) }))
        });

        if (noCompression.length) issues.push({
            severity: 'notice', category: 'Performance', title: 'Pages Without Compression (No Gzip/Brotli)',
            impact: 2, effort: 'easy', count: noCompression.length, timeMin: 5,
            why: 'These pages are served without gzip or Brotli compression, meaning users download the full uncompressed HTML. Enabling compression typically reduces transfer size by 70-90%.',
            fix: '<strong>Enable server-side compression.</strong> For Apache, add gzip rules to .htaccess. For Nginx, enable gzip in nginx.conf. Most hosting control panels have a one-click option. Brotli is preferred over gzip when available.',
            urls: urlList(noCompression)
        });

        if (noCaching.length && noCaching.length < totalPages * 0.8) issues.push({
            severity: 'notice', category: 'Performance', title: 'Pages Without Browser Caching',
            impact: 2, effort: 'easy', count: noCaching.length, timeMin: 5,
            why: 'These pages have no cache-control headers, forcing browsers to re-download everything on each visit. Proper caching dramatically improves repeat visit performance.',
            fix: '<strong>Set Cache-Control headers</strong> for static assets (images, CSS, JS): max-age=31536000 (1 year). For HTML pages: max-age=3600 with must-revalidate. Configure in your server config or .htaccess.',
            urls: urlList(noCaching)
        });

        if (largeDom.length) issues.push({
            severity: 'notice', category: 'Performance', title: 'Excessive DOM Size (>3M elements)',
            impact: 2, effort: 'hard', count: largeDom.length, timeMin: 30,
            why: 'Pages with very large DOMs consume more memory, slow down JavaScript execution, and cause layout thrashing. Google recommends under 1,500 DOM elements.',
            fix: '<strong>Simplify page structure:</strong> Flatten nested elements, use virtual scrolling for long lists, remove hidden elements, lazy-load content sections. Audit plugins/widgets adding excessive markup.',
            urls: urlList(largeDom)
        });

        if (lowContentRate.length) issues.push({
            severity: 'notice', category: 'Content', title: 'Low Text-to-HTML Ratio',
            impact: 1, effort: 'medium', count: lowContentRate.length, timeMin: 15,
            why: 'These pages have very little visible text relative to their HTML code. While not a direct ranking factor, low content rate often indicates bloated code, excessive ads, or insufficient content.',
            fix: '<strong>Increase visible content</strong> and reduce code bloat. Remove unnecessary inline styles, unused JavaScript, and excessive div nesting. Add meaningful text content.',
            urls: urlList(lowContentRate)
        });

        if (noFavicon.length && noFavicon.length < totalPages * 0.5) issues.push({
            severity: 'notice', category: 'Technical', title: 'Missing Favicon',
            impact: 1, effort: 'easy', count: noFavicon.length, timeMin: 5,
            why: 'Pages without a favicon display a generic browser icon in tabs, bookmarks, and search results. This reduces brand recognition and looks unprofessional.',
            fix: '<strong>Create a favicon</strong> (32×32px .ico and 180×180px for Apple Touch). Add &lt;link rel="icon"&gt; to your HTML head. Most browsers also check /favicon.ico automatically.',
            urls: urlList(noFavicon)
        });

        if (deprecatedHtml.length) issues.push({
            severity: 'notice', category: 'Technical', title: 'Deprecated HTML Tags Used',
            impact: 1, effort: 'easy', count: deprecatedHtml.length, timeMin: 5,
            why: 'These pages use HTML tags that have been deprecated (e.g., &lt;center&gt;, &lt;font&gt;, &lt;marquee&gt;). Deprecated tags may not render correctly in modern browsers and signal outdated code.',
            fix: '<strong>Replace deprecated HTML tags with modern equivalents.</strong> Use CSS for styling instead of inline HTML attributes. &lt;font&gt; → CSS font-family, &lt;center&gt; → CSS text-align.',
            urls: urlList(deprecatedHtml)
        });

        if (hasFrames.length) issues.push({
            severity: 'notice', category: 'Technical', title: 'Pages Using Frames/iFrames',
            impact: 1, effort: 'medium', count: hasFrames.length, timeMin: 15,
            why: 'Search engines have difficulty indexing framed content. Content inside iframes may not be associated with the parent page for ranking purposes.',
            fix: '<strong>Remove unnecessary frames.</strong> Replace with native HTML content where possible. If iframes are required (e.g., embedded videos), ensure the parent page has sufficient unique content.',
            urls: urlList(hasFrames)
        });

        if (shortDesc.length) issues.push({
            severity: 'notice', category: 'Meta', title: 'Meta Descriptions Too Short',
            impact: 1, effort: 'easy', count: shortDesc.length, timeMin: 2,
            why: 'Descriptions under 70 characters waste space Google provides in search results.',
            fix: '<strong>Expand to 120–155 characters</strong> with keyword-rich summary and call-to-action.',
            urls: urlList(shortDesc)
        });

        if (longDesc.length) issues.push({
            severity: 'notice', category: 'Meta', title: 'Meta Descriptions Too Long',
            impact: 1, effort: 'easy', count: longDesc.length, timeMin: 2,
            why: 'Descriptions over 160 characters get truncated in search results.',
            fix: '<strong>Trim to under 155 characters</strong> while keeping compelling copy visible.',
            urls: urlList(longDesc)
        });

        if (noEncoding.length && noEncoding.length < totalPages * 0.8) issues.push({
            severity: 'notice', category: 'Technical', title: 'Missing Encoding Meta Tag',
            impact: 1, effort: 'easy', count: noEncoding.length, timeMin: 2,
            why: 'Without a charset meta tag, browsers may guess the encoding incorrectly, causing garbled text for international characters.',
            fix: '<strong>Add &lt;meta charset="UTF-8"&gt;</strong> in the &lt;head&gt; section of each page. This should be the first child element of &lt;head&gt;.',
            urls: urlList(noEncoding)
        });

        if (lowScorePages.length) issues.push({
            severity: 'notice', category: 'Technical', title: 'Pages with Very Low SEO Score (<50)',
            impact: 2, effort: 'medium', count: lowScorePages.length, timeMin: 15,
            why: 'These pages scored below 50/100 on DataForSEO\'s comprehensive on-page analysis, indicating multiple overlapping SEO issues that compound each other.',
            fix: '<strong>Review each page individually</strong> — low-scoring pages typically have 3+ issues from this list. Fix the highest-impact issues first (missing titles, broken links, thin content) and the score will improve.',
            urls: lowScorePages.slice(0, 25).map(p => ({ url: p.url || '—', status: Math.round(p.onpage_score || 0) + '/100' }))
        });

        // Lighthouse-based issues
        if (lh) {
            const perfScore = Math.round((lh.categories?.performance?.score || 0) * 100);
            const accessScore = Math.round((lh.categories?.accessibility?.score || 0) * 100);
            const seoScore = Math.round((lh.categories?.seo?.score || 0) * 100);

            if (perfScore < 50) issues.push({
                severity: perfScore < 25 ? 'critical' : 'warning', category: 'Performance', title: 'Poor Homepage Performance (Lighthouse: ' + perfScore + ')',
                impact: 5, effort: 'hard', count: 1, timeMin: 60,
                why: 'Homepage Lighthouse performance of ' + perfScore + '/100 means serious speed issues. Slow pages have 2-3x higher bounce rates.',
                fix: '<strong>Prioritize Core Web Vitals:</strong> Optimize LCP (compress hero images, preload resources), reduce CLS (set image dimensions), improve INP (minimize main-thread JS).',
                urls: [{ url: state.domain, status: perfScore + '/100' }]
            });
            if (accessScore > 0 && accessScore < 70) issues.push({
                severity: 'notice', category: 'Accessibility', title: 'Accessibility Issues (Lighthouse: ' + accessScore + ')',
                impact: 3, effort: 'medium', count: 1, timeMin: 30,
                why: 'Score of ' + accessScore + '/100 means parts of your site are difficult for people with disabilities. This also exposes you to ADA/WCAG compliance risks.',
                fix: '<strong>Fix top accessibility issues:</strong> Add alt text, ensure color contrast, make elements keyboard-navigable, add ARIA labels, fix heading hierarchy.',
                urls: [{ url: state.domain, status: accessScore + '/100' }]
            });
            if (seoScore > 0 && seoScore < 80) issues.push({
                severity: 'warning', category: 'Meta', title: 'Lighthouse SEO Issues (Score: ' + seoScore + ')',
                impact: 3, effort: 'easy', count: 1, timeMin: 15,
                why: 'Lighthouse detected SEO violations on your homepage including missing meta tags, unoptimized viewport, or non-crawlable content.',
                fix: '<strong>Review Page Speed tab</strong> for specific audit items. Common fixes: add missing meta tags, size tap targets for mobile, make links crawlable.',
                urls: [{ url: state.domain, status: seoScore + '/100' }]
            });
        }

        // Add priority score to each issue: (severity_weight * impact) / effort_weight
        const sevW = { critical: 4, warning: 2.5, notice: 1 };
        const effW = { easy: 1, medium: 2, hard: 3.5 };
        issues.forEach(iss => {
            iss.priority = Math.round(((sevW[iss.severity] || 1) * iss.impact) / (effW[iss.effort] || 2) * 10);
            iss.totalTime = (iss.timeMin || 5) * Math.min(iss.count, 20);
        });


        // Keyword Cannibalization (SERP-verified + n-gram analysis)
        const kwData = getKeywordData();
        if(kwData) {
            const canniData = detectCannibalization(kwData);
            const { serpConflicts, ngramOverlaps, wrongPageRankings } = canniData;
            
            // SERP-verified cannibalization (definitive) — enriched with conflict types
            if(serpConflicts.length) {
                const criticalConflicts = serpConflicts.filter(c=>c.severity==='critical');
                const marketsAffected = [...new Set(serpConflicts.map(c=>c.market))].length;
                const wrongPageCount = serpConflicts.filter(c=>c.wrongPageWinning).length;
                // Summarize conflict types
                const typeCounts = {};
                serpConflicts.forEach(c => { typeCounts[c.conflictType] = (typeCounts[c.conflictType]||0) + 1; });
                const typeBreakdown = Object.entries(typeCounts).map(([k,v]) => v + '× ' + k).join(', ');
                
                issues.push({
                    severity: criticalConflicts.length > 0 ? 'warning' : 'notice',
                    category:'Content', title:'Page Cannibalization — '+serpConflicts.length+' Keywords Confirmed',
                    impact:4, effort:'medium', count:serpConflicts.length,
                    why:'Google search results show <strong>multiple pages from your site competing for the same keywords</strong> in local search'+(marketsAffected > 1 ? ' across '+marketsAffected+' markets' : '')+'. Conflict breakdown: <strong>'+typeBreakdown+'</strong>.'+(wrongPageCount > 0 ? ' <span style="color:var(--danger);">'+wrongPageCount+' keywords have the WRONG page winning</span> — sending potential customers to the wrong page type.' : '')+' Your pages are splitting ranking signals and weakening each other instead of consolidating authority.',
                    fix:'<strong>Each conflict type requires a different fix.</strong> Go to the Local Rankings tab → Cannibalization for per-keyword diagnosis with conflict-type-specific recommendations. Common patterns: Homepage authority hogging (reduce service keywords on homepage), Blog stealing service traffic (re-angle blog to informational intent), City pages cannibalizing (add unique local content to differentiate).',
                    urls:serpConflicts.slice(0,25).map(c=>({url: c.conflictIcon+' '+c.keyword+' — '+c.conflictType, status: '#'+c.primary.position+' vs #'+c.competitors[0].position}))
                });
            }
            
            // Wrong page ranking (new issue type)
            if(wrongPageRankings.length) {
                const highPriority = wrongPageRankings.filter(w=>w.severity==='high');
                const totalVol = wrongPageRankings.reduce((s,w)=>s+w.volume,0);
                issues.push({
                    severity: highPriority.length > 0 ? 'warning' : 'notice',
                    category:'Content', title:'Wrong Page Type Ranking — '+wrongPageRankings.length+' Keywords',
                    impact:3, effort:'medium', count:wrongPageRankings.length,
                    why:'<strong>'+wrongPageRankings.length+' keywords are ranking with the wrong page type for the search intent.</strong> For example, a blog post ranking for "auto body shop near me" sends ready-to-buy customers to an article instead of a service page. These keywords have '+totalVol.toLocaleString()+' combined monthly searches — visitors landing on the wrong page type are far less likely to convert into paying customers.',
                    fix:'<strong>For each mismatched keyword:</strong> Create or strengthen the correct page type (usually a service or location page) targeting that keyword with conversion-focused content. Then re-angle the currently-ranking page to target a different, intent-appropriate keyword. See the Local Rankings tab → Cannibalization → "Wrong Page Ranking" section for specific per-keyword fixes.',
                    urls:wrongPageRankings.slice(0,25).map(w=>({url: (PAGE_TYPE_LABELS[w.pageType]?.icon||'📄')+' '+w.keyword+' → should be '+(PAGE_TYPE_LABELS[w.idealPageType]?.icon||'🔧')+' '+PAGE_TYPE_LABELS[w.idealPageType]?.label, status: '#'+w.position}))
                });
            }
            
            // N-gram overlap (heuristic)
            const highOverlaps = ngramOverlaps.filter(c=>c.risk==='high');
            const medOverlaps = ngramOverlaps.filter(c=>c.risk==='medium');
            if(highOverlaps.length) issues.push({
                severity:'notice', category:'Content', title:'High Keyword Overlap Between Pages',
                impact:2, effort:'medium', count:highOverlaps.length,
                why:'Content analysis shows '+highOverlaps.length+' pairs of pages targeting very similar keyword themes ('+Math.round(highOverlaps.reduce((s,c)=>s+c.overlapPct,0)/highOverlaps.length)+'% average overlap). These may start competing in search results as the site grows.',
                fix:'<strong>Review each overlapping pair</strong> in the Local Rankings tab → Cannibalization section. Differentiate pages by updating titles, H1s, and content to target distinct keyword clusters. Use internal linking to signal the preferred page for each topic.',
                urls:highOverlaps.slice(0,25).map(c=>({url:c.sharedTopics.join(', '), status:c.overlapPct+'% overlap'}))
            });
            
            // Declining keywords issue
            const declining = kwData.items.filter(k=>k.isDown||k.isLost);
            const lostKws = kwData.items.filter(k=>k.isLost);
            if(lostKws.length >= 3) issues.push({
                severity:'warning', category:'Content', title:'Lost Keyword Rankings',
                impact:4, effort:'hard', count:lostKws.length,
                why:'Your site has lost ranking for '+lostKws.length+' keywords entirely. These keywords previously drove traffic to your site and no longer do. Lost rankings can indicate content quality issues, increased competition, algorithm updates, or technical problems preventing indexing.',
                fix:'<strong>Investigate why rankings were lost.</strong> Check if the pages are still indexed (use site: search). Compare your content against what now ranks in the top positions. Consider freshening content, adding new information, improving page speed, and building internal links to affected pages.',
                urls:lostKws.sort((a,b)=>b.volume-a.volume).slice(0,25).map(k=>({url:k.keyword+' → '+shortUrl(k.url), status:'Lost'}))
            });
            if(declining.length > lostKws.length) {
                const dropping = declining.filter(k=>k.isDown&&!k.isLost);
                if(dropping.length >= 5) issues.push({
                    severity:'notice', category:'Content', title:'Declining Keyword Positions',
                    impact:3, effort:'medium', count:dropping.length,
                    why:dropping.length+' keywords are dropping in position. While they haven\'t been lost yet, continued decline will reduce traffic. Early intervention is much easier than recovering lost rankings.',
                    fix:'<strong>Prioritize keywords with highest traffic value.</strong> Refresh the content on affected pages, improve internal linking, and ensure pages load quickly. Monitor these keywords weekly — if decline continues, a more aggressive content overhaul may be needed.',
                    urls:dropping.sort((a,b)=>b.volume-a.volume).slice(0,25).map(k=>({url:k.keyword+' (pos #'+k.position+')', status:'Dropping'}))
                });
            }
        }

        // Sort: critical first, then warning, then notice; within same severity by priority desc
        const sevOrder = { critical: 0, warning: 1, notice: 2 };
        return issues.sort((a, b) => {
            const s = sevOrder[a.severity] - sevOrder[b.severity];
            if (s !== 0) return s;
            return b.priority - a.priority;
        });
    }

    function getCompletedTasks() {
        try { return JSON.parse(localStorage.getItem('cac_completed_tasks') || '{}'); } catch(e) { return {}; }
    }
    function toggleTaskComplete(title, el) {
        const completed = getCompletedTasks();
        if (completed[title]) { delete completed[title]; } else { completed[title] = Date.now(); }
        localStorage.setItem('cac_completed_tasks', JSON.stringify(completed));
        // Update UI
        const card = el.closest('.ix-card') || el.closest('.qw-card');
        if (card) {
            card.classList.toggle('task-done', !!completed[title]);
            card.classList.toggle('done', !!completed[title]);
        }
        el.classList.toggle('checked', !!completed[title]);
        el.innerHTML = completed[title] ? ic('check','ic-check') : '';
        updateTaskProgress();
    }
    function updateTaskProgress() {
        const bar = document.getElementById('taskProgressFill');
        const text = document.getElementById('taskProgressText');
        if (!bar || !text) return;
        const completed = getCompletedTasks();
        const total = document.querySelectorAll('.ix-card').length;
        const done = document.querySelectorAll('.ix-card').length > 0 ?
            [...document.querySelectorAll('.ix-card')].filter(c => completed[c.dataset.title]).length : 0;
        const pct = total > 0 ? Math.round(done / total * 100) : 0;
        bar.style.width = pct + '%';
        text.textContent = done + '/' + total + ' tasks done (' + pct + '%)';
    }
    function formatTime(mins) {
        if (mins < 60) return mins + ' min';
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return h + 'h' + (m > 0 ? ' ' + m + 'm' : '');
    }

    function renderIssues() {
        const issues = generateDetailedIssues();
        const completed = getCompletedTasks();
        const critCount = issues.filter(i => i.severity === 'critical').length;
        const warnCount = issues.filter(i => i.severity === 'warning').length;
        const noticeCount = issues.filter(i => i.severity === 'notice').length;
        const total = issues.length;
        const completedCount = issues.filter(i => completed[i.title]).length;
        const categories = [...new Set(issues.map(i => i.category))].sort();

        // Quick Wins: high impact + easy effort, sorted by priority
        const quickWins = issues.filter(i => i.effort === 'easy' && i.impact >= 3 && !completed[i.title]).sort((a, b) => b.priority - a.priority).slice(0, 6);
        const totalTime = issues.reduce((a, i) => a + (i.totalTime || 0), 0);
        const remainingTime = issues.filter(i => !completed[i.title]).reduce((a, i) => a + (i.totalTime || 0), 0);

        let html = '';

        // Task Progress Bar
        const pct = total > 0 ? Math.round(completedCount / total * 100) : 0;
        html += '<div class="task-progress">';
        html += '<div class="task-progress-label">Task Progress</div>';
        html += '<div class="task-progress-bar"><div class="task-progress-fill" id="taskProgressFill" style="width:' + pct + '%"></div></div>';
        html += '<div class="task-progress-text" id="taskProgressText">' + completedCount + '/' + total + ' done (' + pct + '%)</div>';
        html += '<div class="time-est">~' + formatTime(remainingTime) + ' remaining</div>';
        html += '</div>';

        // Score Projection Panel
        const proj = computeScoreProjections();
        if (proj.projectedOverall > proj.currentOverall) {
            html += '<div class="score-proj">';
            html += '<div class="score-proj-header"><div class="score-proj-title"> Projected Score After Fixes</div>';
            html += '<button class="export-all-btn" onclick="exportAllTasks()">Export All Tasks</button></div>';
            html += '<div class="score-proj-grid">';
            html += '<div class="score-proj-item"><div class="score-proj-label">Overall</div><div class="score-proj-current" style="color:'+scoreColor(proj.currentOverall)+'">'+proj.currentOverall+'</div><div class="score-proj-arrow">'+ic('down','ic-sm')+'</div><div class="score-proj-target">'+proj.projectedOverall+'</div></div>';
            Object.entries(proj.projections).forEach(([k, v]) => {
                if (v.projected && v.projected > v.current) {
                    html += '<div class="score-proj-item"><div class="score-proj-label">'+v.label+'</div><div class="score-proj-current" style="color:'+scoreColor(v.current)+'">'+v.current+'</div><div class="score-proj-arrow">'+ic('down','ic-sm')+'</div><div class="score-proj-target">'+v.projected+'</div></div>';
                }
            });
            html += '</div></div>';
        } else {
            html += '<div style="display:flex;justify-content:flex-end;margin-bottom:0.75rem;"><button class="export-all-btn" onclick="exportAllTasks()">Export All Tasks</button></div>';
        }

        // Quick Wins Board
        if (quickWins.length) {
            html += '<div class="qw-board">';
            html += '<div class="qw-header"><div class="qw-title">Quick Wins — High Impact, Easy Fixes</div><div class="qw-subtitle">Start here for maximum ROI on your time</div></div>';
            html += '<div class="qw-grid">';
            quickWins.forEach(qw => {
                const isDone = completed[qw.title];
                html += '<div class="qw-card' + (isDone ? ' done' : '') + '" data-title="' + escHtml(qw.title) + '" onclick="toggleTaskComplete(this.dataset.title, this.querySelector(&quot;.qw-check&quot;))">';
                html += '<div class="qw-check' + (isDone ? ' checked' : '') + '">' + (isDone ? '\u2713' : '') + '</div>';
                html += '<div class="qw-card-body"><div class="qw-card-title">' + qw.title + '</div>';
                html += '<div class="qw-card-meta">';
                html += '<span class="qw-card-time">~' + formatTime(qw.timeMin || 5) + '/ea</span>';
                html += '<span class="qw-card-impact high-roi">High ROI</span>';
                html += '</div></div>';
                html += '<div class="qw-card-pages">' + qw.count + '</div>';
                html += '</div>';
            });
            html += '</div></div>';
        }

        // Severity summary pills
        html += '<div class="issues-summary-bar">';
        html += '<div class="issues-sev-pill sev-all active" onclick="filterIssues(\'all\',this)"><div class="pill-dot"></div><div class="pill-count">' + total + '</div><div class="pill-label">All Issues</div></div>';
        html += '<div class="issues-sev-pill sev-critical" onclick="filterIssues(\'critical\',this)"><div class="pill-dot"></div><div class="pill-count">' + critCount + '</div><div class="pill-label">Critical</div></div>';
        html += '<div class="issues-sev-pill sev-warning" onclick="filterIssues(\'warning\',this)"><div class="pill-dot"></div><div class="pill-count">' + warnCount + '</div><div class="pill-label">High</div></div>';
        html += '<div class="issues-sev-pill sev-notice" onclick="filterIssues(\'notice\',this)"><div class="pill-dot"></div><div class="pill-count">' + noticeCount + '</div><div class="pill-label">Medium / Low</div></div>';
        html += '</div>';

        // Category filter chips
        html += '<div class="issues-cat-filters">';
        html += '<button class="issues-cat-chip active" onclick="filterIssuesCat(\'all\',this)">All Categories</button>';
        categories.forEach(cat => {
            const count = issues.filter(i => i.category === cat).length;
            html += '<button class="issues-cat-chip" onclick="filterIssuesCat(\'' + cat + '\',this)">' + cat + ' (' + count + ')</button>';
        });
        html += '</div>';

        // Issue cards grouped by action priority
        html += '<div id="issuesList">';
        if (issues.length === 0) {
            html += '<div class="ix-no-issues"><div class="ni-icon"></div><div class="ni-title">No issues found!</div><p style="margin-top:0.5rem;">Your site is in great shape.</p></div>';
        }

        // Group: Fix Now (critical), Plan This Week (warning), Backlog (notice)
        const groups = [
            { sev: 'critical', title: 'Fix Now — Blocking Issues', items: issues.filter(i => i.severity === 'critical') },
            { sev: 'warning', title: 'Plan This Week — High Impact', items: issues.filter(i => i.severity === 'warning') },
            { sev: 'notice', title: 'Backlog — Improvements', items: issues.filter(i => i.severity === 'notice') },
        ];

        groups.forEach(grp => {
            if (!grp.items.length) return;
            const grpTime = grp.items.reduce((a, i) => a + (i.totalTime || 0), 0);
            html += '<div class="task-group" data-group="' + grp.sev + '">';
            html += '<div class="task-group-header"><span class="task-group-title">' + grp.title + '</span><span class="task-group-count">' + grp.items.length + ' tasks</span><span class="task-group-time">~' + formatTime(grpTime) + ' total</span></div>';

            grp.items.forEach((iss, idx) => {
                const isDone = completed[iss.title];
                const sevLabel = { critical: 'Critical', warning: 'High', notice: 'Medium' }[iss.severity] || 'Notice';
                const effortClass = { easy: 'effort-easy', medium: 'effort-medium', hard: 'effort-hard' }[iss.effort] || '';
                const effortLabel = { easy: 'Quick Fix', medium: 'Moderate', hard: ' Major Effort' }[iss.effort] || '';
                const countClass = iss.count >= 10 ? 'high-count' : iss.count >= 3 ? 'med-count' : 'low-count';
                const prioClass = iss.priority >= 15 ? 'p-high' : iss.priority >= 8 ? 'p-med' : 'p-low';

                html += '<div class="ix-card' + (isDone ? ' task-done' : '') + '" data-sev="' + iss.severity + '" data-cat="' + iss.category + '" data-title="' + escHtml(iss.title) + '">';
                html += '<div class="ix-head" onclick="toggleIssueCard(this)">';
                html += '<div class="ix-check' + (isDone ? ' checked' : '') + '" data-title="' + escHtml(iss.title) + '" onclick="event.stopPropagation();toggleTaskComplete(this.dataset.title, this)">' + (isDone ? '\u2713' : '') + '</div>';
                html += '<div class="ix-sev-badge ' + iss.severity + '"><span class="sev-shape ' + iss.severity + '"></span> ' + sevLabel + '</div>';
                html += '<div class="ix-info">';
                html += '<div class="ix-title">' + iss.title + '</div>';
                html += '<div class="ix-subtitle">';
                html += '<span class="ix-tag">' + iss.category + '</span>';
                html += '<span class="ix-tag ' + effortClass + '">' + effortLabel + '</span>';
                html += '<span class="time-est">~' + formatTime(iss.timeMin || 5) + '/ea</span>';
                html += '<span class="priority-score ' + prioClass + '">P' + iss.priority + '</span>';
                const estImpact = estimateScoreImpact(iss);
                html += '<span class="score-impact' + (estImpact >= 5 ? ' high-impact' : '') + '">+' + estImpact + ' pts</span>';
                html += '<span class="ix-impact" title="Impact: ' + iss.impact + '/5">';
                for (let d = 0; d < 5; d++) html += '<div class="ix-impact-dot' + (d < iss.impact ? ' filled' : '') + '"></div>';
                html += '</span>';
                html += '</div></div>';
                html += '<div class="ix-count-badge ' + countClass + '">' + iss.count + '</div>';
                html += '<button class="ix-copy-btn" data-title="' + escHtml(iss.title) + '" onclick="event.stopPropagation();copyTask(this.dataset.title, this)">Copy</button>';
                html += '<div class="ix-chevron">'+ic('chevron')+'</div>';
                html += '</div>';

                // Expandable detail
                html += '<div class="ix-detail">';
                html += '<div class="ix-detail-section"><div class="ix-detail-label">Why This Matters</div><div class="ix-why">' + iss.why + '</div></div>';
                html += '<div class="ix-detail-section"><div class="ix-detail-label">How to Fix</div><div class="ix-fix">' + iss.fix + '</div></div>';
                if (iss.urls && iss.urls.length) {
                    html += '<div class="ix-detail-section"><div class="ix-detail-label">Affected URLs (' + Math.min(iss.urls.length, iss.count) + (iss.count > iss.urls.length ? ' of ' + iss.count : '') + ')</div>';
                    html += '<div class="ix-affected-list">';
                    iss.urls.forEach(u => {
                        const statusColor = typeof u.status === 'number' ? (u.status >= 500 ? 'var(--danger)' : u.status >= 400 ? 'var(--warning)' : u.status >= 300 ? 'var(--info)' : 'var(--success)') : 'var(--text-muted)';
                        html += '<div class="ix-affected-url">';
                        if (u.status !== undefined) html += '<span class="af-status" style="color:' + statusColor + ';">' + u.status + '</span>';
                        html += '<a href="' + (u.url?.startsWith('http') ? u.url : '#') + '" target="_blank" rel="noopener">' + (u.url || '—') + '</a>';
                        html += '</div>';
                    });
                    html += '</div></div>';
                }
                html += '</div></div>';
            });
            html += '</div>';
        });
        html += '</div>';

        $('tabContent').innerHTML = html;
    }

    // Issues tab interaction helpers
    function toggleIssueCard(el) {
        el.closest('.ix-card').classList.toggle('expanded');
    }
    function filterIssues(sev, btn) {
        document.querySelectorAll('.issues-sev-pill').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.ix-card').forEach(card => {
            const show = sev === 'all' || card.dataset.sev === sev;
            const catChip = document.querySelector('.issues-cat-chip.active');
            const cat = catChip ? catChip.textContent.split(' (')[0] : 'All Categories';
            const catMatch = cat === 'All Categories' || card.dataset.cat === cat;
            card.style.display = (show && catMatch) ? '' : 'none';
        });
        // Show/hide groups
        document.querySelectorAll('.task-group').forEach(g => {
            const cards = g.querySelectorAll('.ix-card');
            const anyVisible = [...cards].some(c => c.style.display !== 'none');
            g.style.display = anyVisible ? '' : 'none';
        });
    }
    function filterIssuesCat(cat, btn) {
        document.querySelectorAll('.issues-cat-chip').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const sevPill = document.querySelector('.issues-sev-pill.active');
        let sev = 'all';
        if (sevPill?.classList.contains('sev-critical')) sev = 'critical';
        else if (sevPill?.classList.contains('sev-warning')) sev = 'warning';
        else if (sevPill?.classList.contains('sev-notice')) sev = 'notice';
        document.querySelectorAll('.ix-card').forEach(card => {
            const sevMatch = sev === 'all' || card.dataset.sev === sev;
            const catMatch = cat === 'all' || card.dataset.cat === cat;
            card.style.display = (sevMatch && catMatch) ? '' : 'none';
        });
        document.querySelectorAll('.task-group').forEach(g => {
            const cards = g.querySelectorAll('.ix-card');
            const anyVisible = [...cards].some(c => c.style.display !== 'none');
            g.style.display = anyVisible ? '' : 'none';
        });
    }

    function filterCanniMarket(market, btn) {
        // Filter cannibalization cards by market (respects type filter)
        const container = document.getElementById('kwsub-cannibalization');
        if (!container) return;
        // Only deactivate sibling chips in the same filter row
        btn.closest('.issues-cat-filters').querySelectorAll('.issues-cat-chip').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        // Get current type filter
        const typeChips = container.querySelectorAll('.issues-cat-filters');
        let activeType = 'all';
        if (typeChips.length > 1) {
            const activeTypeChip = typeChips[1]?.querySelector('.issues-cat-chip.active');
            if (activeTypeChip) activeType = activeTypeChip.textContent.split(' (')[0].trim();
            if (activeType === 'All Types') activeType = 'all';
        }
        container.querySelectorAll('.ix-card[data-cannimarket]').forEach(card => {
            const marketMatch = market === 'all' || card.dataset.cannimarket === market;
            const typeMatch = activeType === 'all' || card.dataset.cannitype === activeType;
            card.style.display = (marketMatch && typeMatch) ? '' : 'none';
        });
    }
    
    function filterCanniType(type, btn) {
        // Filter cannibalization cards by conflict type (respects market filter)
        const container = document.getElementById('kwsub-cannibalization');
        if (!container) return;
        btn.closest('.issues-cat-filters').querySelectorAll('.issues-cat-chip').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        // Get current market filter
        const filterRows = container.querySelectorAll('.issues-cat-filters');
        let activeMarket = 'all';
        if (filterRows.length > 0) {
            const activeMarketChip = filterRows[0]?.querySelector('.issues-cat-chip.active');
            if (activeMarketChip) {
                const txt = activeMarketChip.textContent.trim();
                if (txt.startsWith('All')) activeMarket = 'all';
                else activeMarket = activeMarketChip.getAttribute('onclick')?.match(/'([^']+)'/)?.[1] || 'all';
            }
        }
        container.querySelectorAll('.ix-card[data-cannitype]').forEach(card => {
            const marketMatch = activeMarket === 'all' || card.dataset.cannimarket === activeMarket;
            const typeMatch = type === 'all' || card.dataset.cannitype === type;
            card.style.display = (marketMatch && typeMatch) ? '' : 'none';
        });
    }
    
    function filterCrossMarket(type, btn) {
        btn.closest('.issues-cat-filters').querySelectorAll('.issues-cat-chip').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.ix-card[data-cmtype]').forEach(card => {
            card.style.display = (type === 'all' || card.dataset.cmtype === type) ? '' : 'none';
        });
    }

    // ═══════════════════════════════════════════════════════════
    // TAB: META TAGS
    // ═══════════════════════════════════════════════════════════
    function renderMeta() {
        const pages = state.data.pages?.items || [];
        const dupes = state.data.duplicateTags?.items || [];
        const noTitle = pages.filter(p=>!p.meta?.title);
        const noDesc = pages.filter(p=>!p.meta?.description);
        const shortTitle = pages.filter(p=>p.meta?.title && p.meta.title.length<30);
        const longTitle = pages.filter(p=>p.meta?.title && p.meta.title.length>60);
        const shortDesc = pages.filter(p=>p.meta?.description && p.meta.description.length<70);
        const longDesc = pages.filter(p=>p.meta?.description && p.meta.description.length>160);

        let html = '<div class="stat-grid">';
        html += statBox(noTitle.length, 'Missing Titles', '', noTitle.length>0);
        html += statBox(noDesc.length, 'Missing Descriptions', '', noDesc.length>0);
        html += statBox(shortTitle.length+longTitle.length, 'Bad Title Length', '<30 or >60 chars');
        html += statBox(shortDesc.length+longDesc.length, 'Bad Desc Length', '<70 or >160 chars');
        html += statBox(dupes.filter(d=>d.type==='title').length, 'Duplicate Titles', '', dupes.filter(d=>d.type==='title').length>0);
        html += statBox(dupes.filter(d=>d.type==='description').length, 'Duplicate Descriptions', '', dupes.filter(d=>d.type==='description').length>0);
        html += '</div>';

        // Pages with issues
        const issuePages = pages.filter(p=>!p.meta?.title||!p.meta?.description||(p.meta?.title||'').length<30||(p.meta?.title||'').length>60||(p.meta?.description||'').length<70||(p.meta?.description||'').length>160);
        html += renderTable(issuePages.length ? issuePages : pages, [
            {key:'url', label:'URL', render:p=>'<div class="url-cell"><a href="'+p.url+'" target="_blank">'+shortUrl(p.url)+'</a></div>'},
            {key:'title', label:'Title', render:p=>{const t=p.meta?.title||''; const c=!t?'var(--danger)':t.length<30||t.length>60?'var(--warning)':'var(--success)'; return '<span style="color:'+c+'">'+escHtml(t||'—')+'</span> <span style="color:var(--text-muted);font-size:0.65rem;">('+t.length+')</span>';}},
            {key:'desc', label:'Description', render:p=>{const d=p.meta?.description||''; const c=!d?'var(--danger)':d.length<70||d.length>160?'var(--warning)':'var(--success)'; return '<span style="color:'+c+'">'+(d?escHtml(d.substring(0,60))+'...':'—')+'</span> <span style="color:var(--text-muted);font-size:0.65rem;">('+d.length+')</span>';}},
        ], 'meta-table');

        // Duplicate tags detail
        if(dupes.length) {
            html += '<div class="section-hdr" style="margin-top:1.5rem;">Duplicate Tags</div>';
            html += renderTable(dupes, [
                {key:'type', label:'Type', render:d=>'<span class="status-pill status-301">'+d.type+'</span>'},
                {key:'acc', label:'Count', render:d=>''+(d.accumulator||d.pages_count||'?')},
                {key:'pages', label:'Pages', render:d=>(d.pages||[]).slice(0,3).map(p=>'<div class="url-cell"><a href="'+p.url+'" target="_blank">'+shortUrl(p.url||p)+'</a></div>').join('')},
            ], 'dupes-table');
        }

        $('tabContent').innerHTML = html;
    }

    // ═══════════════════════════════════════════════════════════
    // TAB: CONTENT
    // ═══════════════════════════════════════════════════════════
    function renderContent() {
        const pages = state.data.pages?.items || [];
        const dupeContent = state.data.duplicateContent?.items || [];
        const thin = pages.filter(p=>(p.meta?.content?.plain_text_word_count||0)<300);
        const noH1 = pages.filter(p=>!p.meta?.htags?.h1?.length);
        const multiH1 = pages.filter(p=>(p.meta?.htags?.h1||[]).length>1);
        const avgWords = pages.length ? Math.round(pages.reduce((a,p)=>a+(p.meta?.content?.plain_text_word_count||0),0)/pages.length) : 0;

        let html = '<div class="stat-grid">';
        html += statBox(avgWords, 'Avg Word Count', 'Across all pages');
        html += statBox(thin.length, 'Thin Pages', '<300 words', thin.length>0);
        html += statBox(noH1.length, 'Missing H1', '', noH1.length>0);
        html += statBox(multiH1.length, 'Multiple H1s', '', multiH1.length>0);
        html += statBox(dupeContent.length, 'Duplicate Content', 'Similar page bodies', dupeContent.length>0);
        html += '</div>';

        html += renderTable(pages, [
            {key:'url', label:'URL', render:p=>'<div class="url-cell"><a href="'+p.url+'" target="_blank">'+shortUrl(p.url)+'</a></div>'},
            {key:'words', label:'Words', render:p=>''+(p.meta?.content?.plain_text_word_count||0), sort:p=>p.meta?.content?.plain_text_word_count||0},
            {key:'h1', label:'H1', render:p=>{const h=(p.meta?.htags?.h1||[]); return h.length===0?'<span style="color:var(--danger)">None</span>':h.length>1?'<span style="color:var(--warning)">'+h.length+'</span>':'<span style="color:var(--success)">'+ic('check')+'</span>';}},
            {key:'readability', label:'Readability', render:p=>{const r=p.meta?.content?.automated_readability_index; return r?r.toFixed(1):'—';}},
        ], 'content-table');

        $('tabContent').innerHTML = html;
    }

    // ═══════════════════════════════════════════════════════════
    // TAB: LINKS
    // ═══════════════════════════════════════════════════════════
    function renderLinks() {
        const links = state.data.links?.items || [];
        const broken = links.filter(l=>l.status_code>=400||l.status_code===0);
        const redirecting = links.filter(l=>l.status_code>=300&&l.status_code<400);
        const internal = links.filter(l=>l.direction==='internal');
        const external = links.filter(l=>l.direction==='external');
        const redirectChains = state.data.redirectChains?.items || [];

        let html = '<div class="stat-grid">';
        html += statBox(links.length, 'Total Links');
        html += statBox(internal.length, 'Internal Links');
        html += statBox(external.length, 'External Links');
        html += statBox(broken.length, 'Broken (4xx/5xx)', '', broken.length>0);
        html += statBox(redirecting.length, 'Redirecting (3xx)', '', redirecting.length>3);
        html += statBox(redirectChains.length, 'Redirect Chains', '', redirectChains.length>0);
        html += '</div>';

        if(broken.length) {
            html += '<div class="section-hdr">Broken Links</div>';
            html += renderTable(broken, [
                {key:'url', label:'Broken URL', render:l=>'<div class="url-cell">'+escHtml(shortUrl(l.url||l.link_to||''))+'</div>'},
                {key:'status', label:'Status', render:l=>'<span class="status-pill status-'+(l.status_code>=400?'404':'err')+'">'+(l.status_code||'ERR')+'</span>'},
                {key:'from', label:'Found On', render:l=>'<div class="url-cell"><a href="'+(l.page_from||l.link_from||'')+'" target="_blank">'+shortUrl(l.page_from||l.link_from||'')+'</a></div>'},
                {key:'dir', label:'Direction', render:l=>l.direction||'—'},
            ], 'broken-table');
        }

        if(redirectChains.length) {
            html += '<div class="section-hdr" style="margin-top:1.5rem;">Redirect Chains</div>';
            html += '<div class="section-sub">Multi-hop redirects waste crawl budget and slow page loads.</div>';
            html += renderTable(redirectChains, [
                {key:'from', label:'From', render:r=>'<div class="url-cell">'+escHtml(shortUrl(r.url||r.from_url||''))+'</div>'},
                {key:'to', label:'Final Destination', render:r=>'<div class="url-cell">'+escHtml(shortUrl(r.redirect_url||r.to_url||''))+'</div>'},
                {key:'hops', label:'Hops', render:r=>''+(r.chain?.length||r.is_redirect_loop?'∞':r.redirect_count||'?')},
            ], 'redirects-table');
        }

        $('tabContent').innerHTML = html;
    }

    // ═══════════════════════════════════════════════════════════
    // TAB: RESOURCES
    // ═══════════════════════════════════════════════════════════
    function renderResources() {
        const resources = state.data.resources?.items || [];
        const images = resources.filter(r=>r.resource_type==='image');
        const scripts = resources.filter(r=>r.resource_type==='script');
        const styles = resources.filter(r=>r.resource_type==='stylesheet');
        const broken = resources.filter(r=>r.status_code>=400||r.status_code===0);
        const totalSize = resources.reduce((a,r)=>a+(r.size||0),0);
        const heavyImages = images.filter(i=>(i.size||0)>200000);

        let html = '<div class="stat-grid">';
        html += statBox(resources.length, 'Total Resources');
        html += statBox(images.length, 'Images');
        html += statBox(scripts.length, 'Scripts');
        html += statBox(styles.length, 'Stylesheets');
        html += statBox(broken.length, 'Broken Resources', '', broken.length>0);
        html += statBox(formatBytes(totalSize), 'Total Size');
        html += '</div>';

        if(heavyImages.length) {
            html += '<div class="section-hdr">Oversized Images (>200KB)</div>';
            html += renderTable(heavyImages.sort((a,b)=>(b.size||0)-(a.size||0)), [
                {key:'url', label:'Image URL', render:r=>'<div class="url-cell"><a href="'+r.url+'" target="_blank">'+shortUrl(r.url)+'</a></div>'},
                {key:'size', label:'Size', render:r=>formatBytes(r.size||0)},
                {key:'type', label:'Type', render:r=>r.media_type||'—'},
                {key:'pages', label:'Used On', render:r=>''+(r.total_count||'?')+' pages'},
            ], 'heavy-img-table');
        }

        if(broken.length) {
            html += '<div class="section-hdr" style="margin-top:1.5rem;">Broken Resources</div>';
            html += renderTable(broken, [
                {key:'url', label:'Resource URL', render:r=>'<div class="url-cell">'+escHtml(shortUrl(r.url))+'</div>'},
                {key:'type', label:'Type', render:r=>r.resource_type||'—'},
                {key:'status', label:'Status', render:r=>'<span class="status-pill status-404">'+(r.status_code||'ERR')+'</span>'},
                {key:'size', label:'Size', render:r=>formatBytes(r.size||0)},
            ], 'broken-res-table');
        }

        $('tabContent').innerHTML = html;
    }

    // ═══════════════════════════════════════════════════════════
    // TAB: TECHNICAL
    // ═══════════════════════════════════════════════════════════
    function renderTechnical() {
        const pages = state.data.pages?.items || [];
        const nonIdx = state.data.nonIndexable?.items || [];
        const redirects = state.data.redirectChains?.items || [];
        const httpPages = pages.filter(p=>p.checks?.is_http);
        const noEncoding = pages.filter(p=>p.checks?.no_content_encoding);
        const brokenPages = pages.filter(p=>p.status_code>=400);
        const canonicalIssues = pages.filter(p=>p.checks?.recursive_canonical||p.checks?.canonical_chain||p.checks?.canonical_to_redirect||p.checks?.canonical_to_broken);

        let html = '<div class="stat-grid">';
        html += statBox(httpPages.length, 'HTTP Pages', 'Should be HTTPS', httpPages.length>0);
        html += statBox(brokenPages.length, 'Error Pages', '4xx/5xx status', brokenPages.length>0);
        html += statBox(nonIdx.length, 'Non-Indexable', 'Blocked pages', nonIdx.length>0);
        html += statBox(redirects.length, 'Redirect Chains', '', redirects.length>0);
        html += statBox(canonicalIssues.length, 'Canonical Issues', '', canonicalIssues.length>0);
        html += statBox(noEncoding.length, 'No Compression', '', noEncoding.length>0);
        html += '</div>';

        if(nonIdx.length) {
            html += '<div class="section-hdr">Non-Indexable Pages</div>';
            html += '<div class="section-sub">These pages are blocked from search engines via robots.txt, noindex, or other directives.</div>';
            html += renderTable(nonIdx, [
                {key:'url', label:'URL', render:p=>'<div class="url-cell"><a href="'+(p.url||'')+'" target="_blank">'+shortUrl(p.url||'')+'</a></div>'},
                {key:'reason', label:'Reason', render:p=>p.reason||p.meta?.robots_txt_blocked?'robots.txt':p.checks?.is_noindex?'noindex':'Unknown'},
                {key:'status', label:'Status', render:p=>'<span class="status-pill status-'+(p.status_code>=400?'404':'200')+'">'+(p.status_code||'—')+'</span>'},
            ], 'nonidx-table');
        }

        if(brokenPages.length) {
            html += '<div class="section-hdr" style="margin-top:1.5rem;">Error Pages</div>';
            html += renderTable(brokenPages, [
                {key:'url', label:'URL', render:p=>'<div class="url-cell"><a href="'+p.url+'" target="_blank">'+shortUrl(p.url)+'</a></div>'},
                {key:'status', label:'Status', render:p=>'<span class="status-pill status-404">'+p.status_code+'</span>'},
                {key:'type', label:'Type', render:p=>p.resource_type||'—'},
            ], 'error-pages-table');
        }

        $('tabContent').innerHTML = html;
    }

    // ═══════════════════════════════════════════════════════════
    // TAB: ALL PAGES
    // ═══════════════════════════════════════════════════════════
    function renderAllPages() {
        const pages = state.data.pages?.items || [];
        let html = '<div class="section-hdr">All Crawled Pages ('+pages.length+')</div>';
        html += renderTable(pages, [
            {key:'url', label:'URL', render:p=>'<div class="url-cell"><a href="'+p.url+'" target="_blank">'+shortUrl(p.url)+'</a></div>'},
            {key:'status', label:'Status', render:p=>'<span class="status-pill status-'+(p.status_code>=400?'404':p.status_code>=300?'301':'200')+'">'+p.status_code+'</span>'},
            {key:'title', label:'Title', render:p=>'<span style="color:'+(p.meta?.title?'var(--text-secondary)':'var(--danger)')+'">'+escHtml((p.meta?.title||'—').substring(0,50))+'</span>'},
            {key:'words', label:'Words', render:p=>''+(p.meta?.content?.plain_text_word_count||0), sort:p=>p.meta?.content?.plain_text_word_count||0},
            {key:'links_int', label:'Int. Links', render:p=>''+(p.meta?.internal_links_count||0)},
            {key:'images', label:'Images', render:p=>''+(p.meta?.images_count||0)},
        ], 'all-pages-table', 50);
        $('tabContent').innerHTML = html;
    }

    // ═══════════════════════════════════════════════════════════
    // TAB: LIGHTHOUSE
    // ═══════════════════════════════════════════════════════════
    function renderPageSpeed() {
        const pages = state.data.pages?.items || [];
        const resources = state.data.resources?.items || [];
        const lh = state.data.lighthouse;
        
        const images = resources.filter(r => r.resource_type === 'image');
        const scripts = resources.filter(r => r.resource_type === 'script');
        const styles = resources.filter(r => r.resource_type === 'stylesheet');
        const totalSize = resources.reduce((a,r) => a + (r.size||0), 0);
        const imgSize = images.reduce((a,r) => a + (r.size||0), 0);
        const jsSize = scripts.reduce((a,r) => a + (r.size||0), 0);
        const cssSize = styles.reduce((a,r) => a + (r.size||0), 0);
        const heavyImages = images.filter(i => (i.size||0) > 200000);
        const heavyScripts = scripts.filter(s => (s.size||0) > 100000);
        const noEncoding = pages.filter(p => p.checks?.no_content_encoding);
        const brokenRes = resources.filter(r => r.status_code >= 400);
        
        // Pages with timing data, sorted slowest first
        const pagesWithTiming = pages
            .filter(p => p.page_timing && (p.page_timing.duration_time || p.page_timing.time_to_interactive))
            .sort((a,b) => (b.page_timing.duration_time||0) - (a.page_timing.duration_time||0));
        
        let html = '<div class="section-hdr">Page Speed Analysis</div>';

        // Aggregate speed stats
        if (pagesWithTiming.length > 0) {
            const avgLoad = pagesWithTiming.reduce((a,p) => a + (p.page_timing.duration_time||0), 0) / pagesWithTiming.length;
            const avgTTFB = pagesWithTiming.filter(p=>p.page_timing.waiting_time).reduce((a,p) => a + p.page_timing.waiting_time, 0) / Math.max(1, pagesWithTiming.filter(p=>p.page_timing.waiting_time).length);
            const slowPages = pagesWithTiming.filter(p => (p.page_timing.duration_time||0) > 3).length;
            const fastest = pagesWithTiming.length > 0 ? pagesWithTiming[pagesWithTiming.length-1].page_timing.duration_time||0 : 0;
            const slowest = pagesWithTiming.length > 0 ? pagesWithTiming[0].page_timing.duration_time||0 : 0;
            
            html += '<div class="stat-grid">';
            html += statBox(avgLoad.toFixed(2)+'s', 'Avg Load Time', avgLoad > 3 ? 'Needs work' : avgLoad > 1.5 ? 'Acceptable' : 'Fast', avgLoad > 3);
            html += statBox(avgTTFB.toFixed(3)+'s', 'Avg TTFB', avgTTFB > 0.8 ? 'High' : 'Good', avgTTFB > 0.8);
            html += statBox(slowPages, 'Slow Pages', '>3s load time', slowPages > 0);
            html += statBox(slowest.toFixed(2)+'s', 'Slowest Page', '', slowest > 3);
            html += statBox(fastest.toFixed(2)+'s', 'Fastest Page', '');
            html += statBox(pagesWithTiming.length, 'Pages Measured', 'of '+pages.length+' total');
            html += '</div>';
        } else {
            html += '<div class="section-sub" style="padding:0.85rem;background:var(--bg-tertiary);border:1px solid var(--border-color);border-radius:8px;margin-bottom:1.5rem;">';
            html += 'No page timing data available. Enable JavaScript rendering in crawl options for load time measurements.</div>';
        }

        // Lighthouse scores (if available)
        if (lh && lh.categories) {
            html += '<div class="section-hdr" style="margin-top:1.5rem;">Lighthouse Scores (Homepage)</div>';
            html += '<div class="stat-grid">';
            Object.entries(lh.categories||{}).forEach(([k,v]) => {
                const s = Math.round((v.score||0)*100);
                const c = s>=90?'var(--success)':s>=50?'var(--warning)':'var(--danger)';
                html += '<div class="stat-box"><div class="stat-box-val" style="color:'+c+'">'+s+'</div><div class="stat-box-lbl">'+v.title+'</div></div>';
            });
            html += '</div>';

            const audits = lh.audits || {};
            const cwvMetrics = [
                {key:'first-contentful-paint', label:'First Contentful Paint'},
                {key:'largest-contentful-paint', label:'Largest Contentful Paint'},
                {key:'total-blocking-time', label:'Total Blocking Time'},
                {key:'cumulative-layout-shift', label:'Cumulative Layout Shift'},
                {key:'speed-index', label:'Speed Index'},
                {key:'interactive', label:'Time to Interactive'},
            ];
            const hasCwv = cwvMetrics.some(m => audits[m.key]);
            if (hasCwv) {
                html += '<div class="section-hdr" style="margin-top:1.5rem;">Core Web Vitals</div>';
                html += '<div class="stat-grid">';
                cwvMetrics.forEach(m => {
                    const audit = audits[m.key];
                    if(audit) {
                        const s = Math.round((audit.score||0)*100);
                        const c = s>=90?'var(--success)':s>=50?'var(--warning)':'var(--danger)';
                        html += '<div class="stat-box"><div class="stat-box-val" style="color:'+c+'">'+(audit.displayValue||'\u2014')+'</div><div class="stat-box-lbl">'+m.label+'</div></div>';
                    }
                });
                html += '</div>';
            }

            const opportunities = Object.entries(audits)
                .filter(([k,v]) => v.score !== null && v.score < 0.9 && v.details?.type === 'opportunity')
                .sort((a,b) => (a[1].score||0) - (b[1].score||0))
                .slice(0, 12);
            if (opportunities.length) {
                html += '<div class="section-hdr" style="margin-top:1.5rem;">Optimization Opportunities</div>';
                html += '<div class="issue-list">';
                opportunities.forEach(([key, audit]) => {
                    const s = Math.round((audit.score||0)*100);
                    const sev = s < 50 ? 'high' : s < 90 ? 'medium' : 'low';
                    html += '<div class="issue-card"><div class="issue-sev '+sev+'"></div><div class="issue-body">';
                    html += '<div class="issue-title">'+escHtml(audit.title||key)+'</div>';
                    html += '<div class="issue-desc">'+(audit.displayValue||'')+(audit.description ? ' \u2014 '+escHtml(audit.description).substring(0,150) : '')+'</div>';
                    html += '</div><div class="issue-count">'+s+'</div></div>';
                });
                html += '</div>';
            }

            const passed = Object.entries(audits).filter(([k,v]) => v.score === 1).length;
            const total = Object.entries(audits).filter(([k,v]) => v.score !== null).length;
            if (total > 0) {
                html += '<div style="margin-top:0.5rem;font-size:0.8rem;color:var(--text-muted);">'+passed+' of '+total+' audits passed</div>';
            }
        } else {
            html += '<div class="section-sub" style="display:flex;align-items:flex-start;gap:0.75rem;padding:0.85rem;background:var(--bg-tertiary);border:1px solid var(--border-color);border-radius:8px;margin:1.5rem 0;">';
            html += '<div><span style="font-weight:600;color:var(--text-primary);">Lighthouse unavailable</span> \u2014 ';
            html += 'Speed data below is from crawl timing. For full Lighthouse scores, visit ';
            html += '<a href="https://pagespeed.web.dev/analysis?url=https://'+escHtml(state.domain)+'" target="_blank" rel="noopener" style="color:var(--accent-pink);">PageSpeed Insights</a>.</div>';
            html += '</div>';
        }

        // Page Speed Table - slowest to fastest
        if (pagesWithTiming.length > 0) {
            html += '<div class="section-hdr" style="margin-top:1.5rem;">All Pages by Load Time (Slowest First)</div>';
            html += renderTable(pagesWithTiming, [
                {key:'url', label:'URL', render:p=>'<div class="url-cell"><a href="'+p.url+'" target="_blank">'+shortUrl(p.url)+'</a></div>'},
                {key:'load', label:'Load Time', render:p=>{
                    const t = p.page_timing.duration_time||0;
                    const c = t>5?'var(--danger)':t>3?'var(--warning)':t>1.5?'var(--text-secondary)':'var(--success)';
                    return '<span style="color:'+c+';font-family:Space Mono,monospace;font-weight:600;">'+t.toFixed(2)+'s</span>';
                }},
                {key:'ttfb', label:'TTFB', render:p=>{
                    const w = p.page_timing.waiting_time;
                    if(!w) return '<span style="color:var(--text-muted);">\u2014</span>';
                    const c = w>0.8?'var(--danger)':w>0.4?'var(--warning)':'var(--success)';
                    return '<span style="color:'+c+';font-family:Space Mono,monospace;">'+w.toFixed(3)+'s</span>';
                }},
                {key:'tti', label:'TTI', render:p=>{
                    const t = p.page_timing.time_to_interactive;
                    if(!t) return '<span style="color:var(--text-muted);">\u2014</span>';
                    const c = t>5?'var(--danger)':t>3?'var(--warning)':'var(--success)';
                    return '<span style="color:'+c+';font-family:Space Mono,monospace;">'+t.toFixed(2)+'s</span>';
                }},
                {key:'size', label:'Size', render:p=>{
                    const s = p.size||p.encoded_size||0;
                    return s ? '<span style="font-family:Space Mono,monospace;">'+formatBytes(s)+'</span>' : '\u2014';
                }},
                {key:'status', label:'Status', render:p=>'<span class="status-pill status-'+(p.status_code>=400?'404':p.status_code>=300?'301':'200')+'">'+p.status_code+'</span>'},
            ], 'pagespeed-table', 50);
        }

        // Resource weight breakdown
        html += '<div class="section-hdr" style="margin-top:1.5rem;">Resource Weight</div>';
        html += '<div class="stat-grid">';
        html += statBox(formatBytes(totalSize), 'Total Weight', images.length+' images, '+scripts.length+' scripts, '+styles.length+' styles');
        html += statBox(formatBytes(imgSize), 'Images', heavyImages.length > 0 ? heavyImages.length+' oversized (>200KB)' : 'All optimized', heavyImages.length > 0);
        html += statBox(formatBytes(jsSize), 'JavaScript', heavyScripts.length > 0 ? heavyScripts.length+' heavy bundles' : scripts.length+' files', heavyScripts.length > 0);
        html += statBox(formatBytes(cssSize), 'CSS', styles.length+' stylesheets');
        html += statBox(noEncoding.length, 'No Compression', 'Missing gzip/brotli', noEncoding.length > 0);
        html += statBox(brokenRes.length, 'Broken Resources', '', brokenRes.length > 0);
        html += '</div>';
        
        // Heaviest resources table
        const heaviestRes = [...resources].sort((a,b) => (b.size||0) - (a.size||0)).slice(0, 15);
        if (heaviestRes.length) {
            html += '<div class="section-hdr" style="margin-top:1.5rem;">Heaviest Resources</div>';
            html += renderTable(heaviestRes, [
                {key:'url', label:'Resource', render:r=>'<div class="url-cell"><a href="'+r.url+'" target="_blank">'+shortUrl(r.url)+'</a></div>'},
                {key:'type', label:'Type', render:r=>r.resource_type||'\u2014'},
                {key:'size', label:'Size', render:r=>{const s=r.size||0; const c=s>500000?'var(--danger)':s>200000?'var(--warning)':'var(--text-secondary)'; return '<span style="color:'+c+';font-family:Space Mono,monospace;">'+formatBytes(s)+'</span>';}},
                {key:'status', label:'Status', render:r=>'<span class="status-pill status-'+(r.status_code>=400?'404':r.status_code>=300?'301':'200')+'">'+(r.status_code||'\u2014')+'</span>'},
            ], 'heaviest-res-table', 15);
        }
        
        $('tabContent').innerHTML = html;
    }


    // ═══════════════════════════════════════════════════════════
    // TAB: SOCIAL / OPEN GRAPH
    // ═══════════════════════════════════════════════════════════
    function renderSocial() {
        const pages = state.data.pages?.items || [];
        const withOG = pages.filter(p => {
            const smt = p.meta?.social_media_tags;
            return smt && typeof smt === 'object' && (smt['og:title'] || smt['og:description']);
        });
        const withoutOG = pages.filter(p => {
            const smt = p.meta?.social_media_tags;
            return !smt || typeof smt !== 'object' || (!smt['og:title'] && !smt['og:description']);
        });
        const withOGImage = pages.filter(p => p.meta?.social_media_tags?.['og:image']);
        const withTwitter = pages.filter(p => {
            const smt = p.meta?.social_media_tags;
            return smt && (smt['twitter:card'] || smt['twitter:title']);
        });

        let html = '<div class="section-hdr"> Social Media & Open Graph Analysis</div>';
        html += '<div class="section-sub">How your pages appear when shared on Facebook, LinkedIn, Twitter, and messaging apps.</div>';
        html += '<div class="stat-grid">';
        html += statBox(withOG.length, 'Have OG Tags', 'Open Graph title/description');
        html += statBox(withoutOG.length, 'Missing OG Tags', 'No social preview data', withoutOG.length > 0);
        html += statBox(withOGImage.length, 'Have OG Image', 'Social share image set');
        html += statBox(pages.length - withOGImage.length, 'Missing OG Image', 'No share image', (pages.length - withOGImage.length) > 0);
        html += statBox(withTwitter.length, 'Twitter Cards', 'Have twitter: meta tags');
        html += '</div>';

        if (withoutOG.length) {
            html += '<div class="section-hdr" style="margin-top:1rem;">Pages Missing Open Graph Tags</div>';
            html += renderTable(withoutOG, [
                {key:'url', label:'URL', render:p=>'<div class="url-cell"><a href="'+p.url+'" target="_blank">'+shortUrl(p.url)+'</a></div>'},
                {key:'title', label:'Page Title', render:p=>'<span style="color:var(--text-secondary)">'+escHtml((p.meta?.title||'—').substring(0,50))+'</span>'},
                {key:'og', label:'OG Tags', render:p=>'<span style="color:var(--danger)">Missing</span>'},
            ], 'social-table');
        }

        if (withOG.length) {
            html += '<div class="section-hdr" style="margin-top:1rem;">Pages with Open Graph Tags</div>';
            html += renderTable(withOG, [
                {key:'url', label:'URL', render:p=>'<div class="url-cell"><a href="'+p.url+'" target="_blank">'+shortUrl(p.url)+'</a></div>'},
                {key:'ogtitle', label:'OG Title', render:p=>'<span style="color:var(--success)">'+escHtml((p.meta?.social_media_tags?.['og:title']||'—').substring(0,40))+'</span>'},
                {key:'ogimg', label:'OG Image', render:p=>p.meta?.social_media_tags?.['og:image']?'<span style="color:var(--success)">'+ic('check')+'</span>':'<span style="color:var(--warning)">—</span>'},
                {key:'twitter', label:'Twitter', render:p=>(p.meta?.social_media_tags?.['twitter:card']||p.meta?.social_media_tags?.['twitter:title'])?'<span style="color:var(--success)">'+ic('check')+'</span>':'<span style="color:var(--text-muted)">—</span>'},
            ], 'social-good-table');
        }

        $('tabContent').innerHTML = html;
    }


    // ═══════════════════════════════════════════════════════════
    // PAGE HEALTH ENGINE — Per-page issue aggregation
    // ═══════════════════════════════════════════════════════════
    function computePageHealth() {
        const pages = state.data.pages?.items || [];
        const links = state.data.links?.items || [];
        const nonIdx = state.data.nonIndexable?.items || [];
        const dupeContent = state.data.duplicateContent?.items || [];
        const nonIdxUrls = new Set(nonIdx.map(p => p.url));
        const dupeContentUrls = new Set(dupeContent.map(d => d.url || d.page || d.page1));
        const brokenLinksByPage = {};
        links.filter(l => l.status_code >= 400 || l.status_code === 0).forEach(l => {
            const from = l.page_from || l.link_from || '';
            if (!brokenLinksByPage[from]) brokenLinksByPage[from] = [];
            brokenLinksByPage[from].push(l);
        });

        return pages.map(p => {
            const issues = [];
            const url = p.url || '';
            const m = p.meta || {};
            const c = p.checks || {};
            const wc = m.content?.plain_text_word_count || 0;
            const h1s = m.htags?.h1 || [];
            const smt = m.social_media_tags;
            const timing = p.page_timing || {};
            const intLinks = m.internal_links_count || 0;
            const extLinks = m.external_links_count || 0;

            if (p.status_code >= 500) issues.push({ sev:'critical', label:'Server error ('+p.status_code+')' });
            else if (p.status_code >= 400) issues.push({ sev:'critical', label:'Page broken ('+p.status_code+')' });
            if (c.is_http) issues.push({ sev:'critical', label:'Served over HTTP' });
            if (c.https_to_http_links) issues.push({ sev:'critical', label:'Mixed content' });
            if (nonIdxUrls.has(url)) issues.push({ sev:'critical', label:'Blocked from indexing' });
            if (c.has_meta_refresh_redirect) issues.push({ sev:'warning', label:'Meta refresh redirect' });
            if (c.no_canonical) issues.push({ sev:'warning', label:'Missing canonical tag' });
            if (c.recursive_canonical) issues.push({ sev:'warning', label:'Recursive canonical' });
            if (c.canonical_chain) issues.push({ sev:'warning', label:'Canonical chain' });
            if (c.canonical_to_broken) issues.push({ sev:'critical', label:'Canonical → broken page' });
            if (c.canonical_to_redirect) issues.push({ sev:'warning', label:'Canonical → redirect' });
            if (!m.title) issues.push({ sev:'critical', label:'Missing title tag' });
            else {
                if (m.title.length < 30) issues.push({ sev:'notice', label:'Title too short ('+m.title.length+')' });
                if (m.title.length > 60) issues.push({ sev:'notice', label:'Title too long ('+m.title.length+')' });
                if (c.irrelevant_title) issues.push({ sev:'warning', label:'Title doesn\'t match content' });
            }
            if (!m.description) issues.push({ sev:'notice', label:'Missing meta description' });
            else {
                if (m.description.length < 70) issues.push({ sev:'notice', label:'Description too short' });
                if (m.description.length > 160) issues.push({ sev:'notice', label:'Description too long' });
                if (c.irrelevant_description) issues.push({ sev:'warning', label:'Description doesn\'t match content' });
            }
            if (p.status_code === 200) {
                if (wc < 100) issues.push({ sev:'warning', label:'Very thin content ('+wc+' words)' });
                else if (wc < 300) issues.push({ sev:'notice', label:'Thin content ('+wc+' words)' });
            }
            if (h1s.length === 0) issues.push({ sev:'notice', label:'Missing H1' });
            if (h1s.length > 1) issues.push({ sev:'notice', label:'Multiple H1s ('+h1s.length+')' });
            if (c.low_content_rate) issues.push({ sev:'notice', label:'Low text-to-HTML ratio' });
            if (dupeContentUrls.has(url)) issues.push({ sev:'warning', label:'Duplicate content' });
            if (m.htags) {
                const levels = [];
                for (let i = 1; i <= 6; i++) { if (m.htags['h'+i]?.length) levels.push(i); }
                for (let i = 1; i < levels.length; i++) { if (levels[i] - levels[i-1] > 1) { issues.push({ sev:'notice', label:'Skipped heading level' }); break; } }
            }
            if (brokenLinksByPage[url]) issues.push({ sev:'warning', label:brokenLinksByPage[url].length+' broken link(s)' });
            if (c.is_orphan_page) issues.push({ sev:'warning', label:'Orphan page' });
            if (intLinks < 2 && p.status_code === 200) issues.push({ sev:'notice', label:'Poor internal linking ('+intLinks+')' });
            if (intLinks + extLinks > 150) issues.push({ sev:'notice', label:'Too many links ('+(intLinks+extLinks)+')' });
            if (c.no_image_alt) issues.push({ sev:'notice', label:'Images missing alt text' });
            if (c.high_loading_time) issues.push({ sev:'warning', label:'Slow page load' });
            if (c.high_waiting_time) issues.push({ sev:'warning', label:'High TTFB' });
            if (c.size_greater_than_3mb) issues.push({ sev:'warning', label:'Page over 3MB' });
            if (c.no_content_encoding) issues.push({ sev:'notice', label:'No compression' });
            if ((m.render_blocking_scripts_count||0) + (m.render_blocking_stylesheets_count||0) > 5)
                issues.push({ sev:'warning', label:'Render-blocking resources' });
            if ((p.total_dom_size||0) > 3000000) issues.push({ sev:'notice', label:'Large DOM' });
            if (c.no_doctype) issues.push({ sev:'notice', label:'Missing DOCTYPE' });
            if (c.deprecated_html_tags) issues.push({ sev:'notice', label:'Deprecated HTML' });
            if (c.frame) issues.push({ sev:'notice', label:'Contains frames' });
            if (c.seo_friendly_url === false) issues.push({ sev:'notice', label:'URL not SEO-friendly' });
            if (!smt || typeof smt !== 'object' || (!smt['og:title'] && !smt['og:description']))
                issues.push({ sev:'notice', label:'Missing Open Graph tags' });
            if (p.cache_control?.cachable === false && p.status_code === 200)
                issues.push({ sev:'notice', label:'Caching disabled' });
            if ((p.click_depth||0) > 4 && p.status_code === 200)
                issues.push({ sev:'notice', label:'Deep in site ('+p.click_depth+' clicks)' });

            let score = p.onpage_score || 100;
            if (!p.onpage_score) {
                issues.forEach(i => { score -= i.sev === 'critical' ? 15 : i.sev === 'warning' ? 8 : 3; });
            }
            score = Math.max(0, Math.min(100, Math.round(score)));
            return { url, status: p.status_code, score, issues, page: p, timing, wordCount: wc, intLinks, extLinks, clickDepth: p.click_depth||0 };
        }).sort((a,b) => a.score - b.score);
    }

    // ═══════════════════════════════════════════════════════════
    // TAB: PAGE HEALTH
    // ═══════════════════════════════════════════════════════════
    function renderPageHealth() {
        const ph = computePageHealth();
        const total = ph.length;
        const healthy = ph.filter(p => p.score >= 80).length;
        const needsWork = ph.filter(p => p.score >= 50 && p.score < 80).length;
        const critical = ph.filter(p => p.score < 50).length;
        const avgScore = total ? Math.round(ph.reduce((a,p) => a + p.score, 0) / total) : 0;
        const totalIssues = ph.reduce((a,p) => a + p.issues.length, 0);
        let html = '<div class="stat-grid">';
        html += statBox(total, 'Pages Analyzed');
        html += statBox(avgScore, 'Avg Health', avgScore >= 80 ? 'Good' : avgScore >= 50 ? ' Needs work' : 'Poor', avgScore < 50);
        html += statBox(healthy, 'Healthy', '80+ score');
        html += statBox(needsWork, 'Needs Work', '50-79', needsWork > 0);
        html += statBox(critical, 'Critical', 'Under 50', critical > 0);
        html += statBox(totalIssues, 'Total Issues', (totalIssues/Math.max(1,total)).toFixed(1)+' avg/page');
        html += '</div>';

        // Distribution chart
        html += '<div class="section-hdr">Health Distribution</div>';
        const buckets = [{l:'90-100',mn:90,mx:101,c:'var(--success)'},{l:'80-89',mn:80,mx:90,c:'#34d399'},{l:'70-79',mn:70,mx:80,c:'var(--warning)'},{l:'60-69',mn:60,mx:70,c:'#f59e0b'},{l:'50-59',mn:50,mx:60,c:'#f97316'},{l:'40-49',mn:40,mx:50,c:'#ef4444'},{l:'30-39',mn:30,mx:40,c:'#dc2626'},{l:'0-29',mn:0,mx:30,c:'#991b1b'}];
        const maxB = Math.max(1, ...buckets.map(b => ph.filter(p => p.score >= b.mn && p.score < b.mx).length));
        html += '<div class="depth-chart">';
        buckets.forEach(b => { const n = ph.filter(p => p.score >= b.mn && p.score < b.mx).length; html += '<div class="depth-bar-wrap"><div class="depth-bar-count" style="color:'+b.c+'">'+n+'</div><div class="depth-bar" style="height:'+Math.max(2,n/maxB*100)+'%;background:'+b.c+';"></div><div class="depth-bar-label">'+b.l+'</div></div>'; });
        html += '</div>';

        // Sort & filter
        html += '<div class="ph-sort-bar"><span style="font-size:0.75rem;color:var(--text-muted);">Sort:</span>';
        ['score:Worst First','issues:Most Issues','depth:Deepest','words:Thinnest','best:Best First'].forEach((s,i) => {
            const [k,l] = s.split(':');
            html += '<button class="ph-sort-btn'+(i===0?' active':'')+'" onclick="sortPH(\''+k+'\',this)">'+l+'</button>';
        });
        html += '</div><div class="ph-sort-bar"><span style="font-size:0.75rem;color:var(--text-muted);">Show:</span>';
        html += '<button class="ph-sort-btn active" onclick="filterPH(\'all\',this)">All ('+total+')</button>';
        html += '<button class="ph-sort-btn" onclick="filterPH(\'critical\',this)" style="color:var(--danger)">Critical ('+critical+')</button>';
        html += '<button class="ph-sort-btn" onclick="filterPH(\'warning\',this)" style="color:var(--warning)">Needs Work ('+needsWork+')</button>';
        html += '<button class="ph-sort-btn" onclick="filterPH(\'good\',this)" style="color:var(--success)">Healthy ('+healthy+')</button>';
        html += '</div>';

        html += '<div id="phList">';
        ph.slice(0, 50).forEach((p, i) => { html += renderPHCard(p, i); });
        html += '</div>';
        if (total > 50) html += '<div id="ph-loadmore" style="text-align:center;margin-top:1rem;"><button class="btn btn-sm" style="background:var(--bg-tertiary);border:1px solid var(--border-color);color:var(--text-secondary);" onclick="loadMorePH()">Load More ('+(total-50)+' remaining)</button></div>';
        $('tabContent').innerHTML = html;
        window._phData = ph;
    }

    function renderPHCard(ph, idx) {
        const sc = ph.score >= 80 ? 'ph-score-good' : ph.score >= 50 ? 'ph-score-warn' : 'ph-score-bad';
        const ci = ph.issues.filter(i => i.sev === 'critical').length;
        const wi = ph.issues.filter(i => i.sev === 'warning').length;
        let h = '<div class="ph-page-card" data-score="'+ph.score+'" data-filter="'+(ph.score >= 80 ? 'good' : ph.score >= 50 ? 'warning' : 'critical')+'">';
        h += '<div class="ph-head" onclick="this.parentElement.classList.toggle(\'expanded\')">';
        h += '<div class="ph-score-badge '+sc+'">'+ph.score+'</div><div class="ph-info">';
        h += '<div class="ph-url"><a href="'+ph.url+'" target="_blank">'+shortUrl(ph.url)+'</a></div>';
        h += '<div class="ph-meta-row"><span class="ph-tag">'+ph.status+'</span><span class="ph-tag">'+ph.wordCount+' words</span><span class="ph-tag">'+ph.intLinks+' links</span>';
        if (ph.clickDepth > 0) h += '<span class="ph-tag'+(ph.clickDepth > 3 ? ' warn-tag' : '')+'">depth:'+ph.clickDepth+'</span>';
        if (ci) h += '<span class="ph-tag issue-tag">'+ci+' critical</span>';
        if (wi) h += '<span class="ph-tag warn-tag">'+wi+' warning</span>';
        h += '</div></div><div class="ph-issue-count">'+(ph.issues.length === 0 ? '<span style="color:var(--success)">'+ic('check')+'</span>' : ph.issues.length)+'</div>';
        h += '<div class="ph-chevron">'+ic('chevron')+'</div></div>';

        h += '<div class="ph-detail">';
        if (!ph.issues.length) h += '<div style="padding:0.75rem 0;text-align:center;color:var(--success);">'+ic('check','ic-check')+' No issues — healthy page!</div>';
        else {
            h += '<div class="ix-detail-label" style="margin-top:0.5rem;">Issues ('+ph.issues.length+')</div>';
            ph.issues.forEach(i => { h += '<div class="ph-issue-item"><div class="ph-issue-sev '+(i.sev==='critical'?'crit':i.sev==='warning'?'warn':'note')+'"></div><span class="ph-issue-label">'+i.label+'</span></div>'; });
        }

        const t = ph.timing;
        if (t && (t.duration_time || t.time_to_interactive || t.dom_complete)) {
            h += '<div class="ix-detail-label" style="margin-top:0.75rem;">Page Timing</div><div class="ph-timing">';
            if (t.duration_time != null) { const c = t.duration_time > 3 ? 'var(--danger)' : t.duration_time > 1.5 ? 'var(--warning)' : 'var(--success)'; h += '<div class="ph-timing-box"><div class="ph-timing-val" style="color:'+c+'">'+t.duration_time.toFixed(2)+'s</div><div class="ph-timing-lbl">Total Load</div></div>'; }
            if (t.time_to_interactive != null) { const c = t.time_to_interactive > 5 ? 'var(--danger)' : t.time_to_interactive > 3 ? 'var(--warning)' : 'var(--success)'; h += '<div class="ph-timing-box"><div class="ph-timing-val" style="color:'+c+'">'+t.time_to_interactive.toFixed(2)+'s</div><div class="ph-timing-lbl">Time to Interactive</div></div>'; }
            if (t.dom_complete != null) { const c = t.dom_complete > 4 ? 'var(--danger)' : t.dom_complete > 2 ? 'var(--warning)' : 'var(--success)'; h += '<div class="ph-timing-box"><div class="ph-timing-val" style="color:'+c+'">'+t.dom_complete.toFixed(2)+'s</div><div class="ph-timing-lbl">DOM Complete</div></div>'; }
            if (t.waiting_time != null) { const c = t.waiting_time > 1 ? 'var(--danger)' : t.waiting_time > 0.5 ? 'var(--warning)' : 'var(--success)'; h += '<div class="ph-timing-box"><div class="ph-timing-val" style="color:'+c+'">'+t.waiting_time.toFixed(3)+'s</div><div class="ph-timing-lbl">TTFB</div></div>'; }
            if (t.connection_time != null) h += '<div class="ph-timing-box"><div class="ph-timing-val">'+t.connection_time.toFixed(3)+'s</div><div class="ph-timing-lbl">Connection</div></div>';
            if (t.download_time != null) h += '<div class="ph-timing-box"><div class="ph-timing-val">'+t.download_time.toFixed(3)+'s</div><div class="ph-timing-lbl">Download</div></div>';
            h += '</div>';
        }

        h += '<div class="ix-detail-label" style="margin-top:0.75rem;">Details</div><div class="ph-timing">';
        const m = ph.page.meta || {};
        h += '<div class="ph-timing-box"><div class="ph-timing-val" style="font-size:0.72rem;">'+(m.title ? escHtml(m.title.substring(0,35))+'...' : '—')+'</div><div class="ph-timing-lbl">Title ('+((m.title||'').length)+')</div></div>';
        h += '<div class="ph-timing-box"><div class="ph-timing-val">'+(ph.page.onpage_score != null ? ph.page.onpage_score : '—')+'</div><div class="ph-timing-lbl">API Score</div></div>';
        h += '<div class="ph-timing-box"><div class="ph-timing-val">'+(m.images_count||0)+'</div><div class="ph-timing-lbl">Images</div></div>';
        h += '<div class="ph-timing-box"><div class="ph-timing-val">'+ph.extLinks+'</div><div class="ph-timing-lbl">External Links</div></div>';
        const ari = m.content?.automated_readability_index;
        if (ari) h += '<div class="ph-timing-box"><div class="ph-timing-val">'+ari.toFixed(1)+'</div><div class="ph-timing-lbl">Readability</div></div>';
        h += '</div></div></div>';
        return h;
    }

    function sortPH(by, btn) {
        btn.parentElement.querySelectorAll('.ph-sort-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const d = window._phData || [];
        let s;
        switch(by) {
            case 'score': s=[...d].sort((a,b)=>a.score-b.score); break;
            case 'issues': s=[...d].sort((a,b)=>b.issues.length-a.issues.length); break;
            case 'depth': s=[...d].sort((a,b)=>b.clickDepth-a.clickDepth); break;
            case 'words': s=[...d].sort((a,b)=>a.wordCount-b.wordCount); break;
            case 'best': s=[...d].sort((a,b)=>b.score-a.score); break;
            default: s=d;
        }
        window._phData = s;
        document.getElementById('phList').innerHTML = s.slice(0,50).map((p,i) => renderPHCard(p,i)).join('');
        // Reset Load More button
        const lmWrap = document.getElementById('ph-loadmore');
        if (lmWrap) {
            const remaining = s.length - 50;
            if (remaining > 0) { lmWrap.style.display = ''; lmWrap.querySelector('button').textContent = 'Load More ('+remaining+' remaining)'; }
            else { lmWrap.style.display = 'none'; }
        }
    }
    function filterPH(type, btn) {
        btn.parentElement.querySelectorAll('.ph-sort-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.ph-page-card').forEach(c => { c.style.display = type === 'all' || c.dataset.filter === type ? '' : 'none'; });
    }
    function loadMorePH() {
        const d = window._phData || [];
        const list = document.getElementById('phList');
        if (!list) return;
        const cur = list.children.length;
        const batch = d.slice(cur, cur + 50);
        batch.forEach((p, i) => { list.insertAdjacentHTML('beforeend', renderPHCard(p, cur + i)); });
        const remaining = d.length - (cur + batch.length);
        const lmWrap = document.getElementById('ph-loadmore');
        if (lmWrap) {
            if (remaining <= 0) { lmWrap.style.display = 'none'; }
            else { lmWrap.querySelector('button').textContent = 'Load More ('+remaining+' remaining)'; }
        }
    }

    // ═══════════════════════════════════════════════════════════
    // TAB: SITE STRUCTURE — Click depth, crawl budget, architecture
    // ═══════════════════════════════════════════════════════════
    function renderStructure() {
        const pages = state.data.pages?.items || [];
        const nonIdx = state.data.nonIndexable?.items || [];
        const total = pages.length || 1;
        const depthMap = {};
        let maxDepth = 0;
        pages.forEach(p => { const d = p.click_depth||0; depthMap[d] = (depthMap[d]||0)+1; if(d>maxDepth) maxDepth=d; });

        const healthyPages = pages.filter(p => p.status_code === 200 && !p.checks?.is_noindex);
        const redirectPages = pages.filter(p => p.status_code >= 300 && p.status_code < 400);
        const errorPages = pages.filter(p => p.status_code >= 400);
        const blockedPages = nonIdx.length;
        const wastedPages = redirectPages.length + errorPages.length + blockedPages;
        const wastedPct = Math.round(wastedPages / Math.max(1, total + blockedPages) * 100);
        const orphans = pages.filter(p => p.checks?.is_orphan_page);
        const lowLinkPages = pages.filter(p => (p.meta?.internal_links_count||0) < 2 && p.status_code === 200);
        const linkCounts = pages.filter(p => p.status_code === 200).map(p => p.meta?.internal_links_count||0);
        const avgLinks = linkCounts.length ? Math.round(linkCounts.reduce((a,b)=>a+b,0)/linkCounts.length) : 0;

        let html = '<div class="section-hdr"> Crawl Budget Analysis</div>';
        html += '<div class="section-sub">Every non-productive page (errors, redirects, blocked) wastes Google\'s crawl budget. Fix these to ensure Google spends its time on your valuable pages.</div>';

        const allPages = total + blockedPages;
        const hPct = Math.round(healthyPages.length/Math.max(1,allPages)*100);
        const rPct = Math.round(redirectPages.length/Math.max(1,allPages)*100);
        const ePct = Math.round(errorPages.length/Math.max(1,allPages)*100);
        const bPct = Math.max(0, 100-hPct-rPct-ePct);

        html += '<div class="cb-bar">';
        if (hPct > 0) html += '<div class="cb-segment healthy" style="width:'+hPct+'%">'+hPct+'%</div>';
        if (rPct > 0) html += '<div class="cb-segment redirects" style="width:'+Math.max(rPct,3)+'%">'+rPct+'%</div>';
        if (ePct > 0) html += '<div class="cb-segment errors" style="width:'+Math.max(ePct,3)+'%">'+ePct+'%</div>';
        if (bPct > 0) html += '<div class="cb-segment blocked" style="width:'+Math.max(bPct,3)+'%">'+bPct+'%</div>';
        html += '</div><div class="cb-legend">';
        html += '<div class="cb-legend-item"><div class="cb-legend-dot" style="background:rgba(34,197,94,0.5)"></div>Healthy ('+healthyPages.length+')</div>';
        html += '<div class="cb-legend-item"><div class="cb-legend-dot" style="background:rgba(245,158,11,0.5)"></div>Redirects ('+redirectPages.length+')</div>';
        html += '<div class="cb-legend-item"><div class="cb-legend-dot" style="background:rgba(239,68,68,0.5)"></div>Errors ('+errorPages.length+')</div>';
        html += '<div class="cb-legend-item"><div class="cb-legend-dot" style="background:rgba(59,130,246,0.5)"></div>Blocked ('+blockedPages+')</div>';
        html += '</div>';

        html += '<div class="stat-grid">';
        html += statBox(wastedPct+'%', 'Budget Wasted', wastedPages+' non-productive', wastedPct > 10);
        html += statBox(healthyPages.length, 'Indexable Pages', 'Pages Google can rank');
        html += statBox(redirectPages.length, 'Redirects', 'Wasting crawl', redirectPages.length > 0);
        html += statBox(errorPages.length, 'Errors', '4xx/5xx', errorPages.length > 0);
        html += '</div>';

        html += '<div class="section-hdr" style="margin-top:1.5rem;"> Site Architecture — Click Depth</div>';
        html += '<div class="section-sub">Pages more than 3 clicks from homepage are harder for Google to find and rank. Keep important pages within 3 clicks.</div>';

        const maxCount = Math.max(1, ...Object.values(depthMap));
        html += '<div class="depth-chart">';
        for (let d = 0; d <= Math.min(maxDepth, 8); d++) {
            const count = depthMap[d]||0;
            const color = d <= 2 ? 'var(--success)' : d <= 3 ? 'var(--warning)' : 'var(--danger)';
            html += '<div class="depth-bar-wrap"><div class="depth-bar-count" style="color:'+color+'">'+count+'</div><div class="depth-bar" style="height:'+Math.max(2,count/maxCount*100)+'%;background:'+color+';"></div><div class="depth-bar-label">'+(d===0?'Home':d+' click'+(d>1?'s':''))+'</div></div>';
        }
        html += '</div>';

        html += '<div class="stat-grid">';
        html += statBox(depthMap[0]||0, 'Homepage');
        html += statBox((depthMap[1]||0)+(depthMap[2]||0), 'Easy Access', '1-2 clicks');
        html += statBox(depthMap[3]||0, 'Standard', '3 clicks');
        const deepCount = Object.entries(depthMap).filter(([d]) => parseInt(d) > 3).reduce((a,[,c]) => a+c, 0);
        html += statBox(deepCount, 'Too Deep', '4+ clicks', deepCount > 0);
        html += '</div>';

        html += '<div class="section-hdr" style="margin-top:1.5rem;">Internal Linking Health</div>';
        html += '<div class="section-sub">Internal links distribute PageRank and help discovery. Pages with few inbound links are underserved.</div>';
        html += '<div class="stat-grid">';
        html += statBox(avgLinks, 'Avg Int. Links', 'Per page');
        html += statBox(orphans.length, 'Orphan Pages', 'No links in', orphans.length > 0);
        html += statBox(lowLinkPages.length, 'Poorly Linked', '<2 internal links', lowLinkPages.length > 0);
        html += '</div>';

        if (lowLinkPages.length > 0) {
            html += '<div class="section-hdr" style="margin-top:1rem;">Pages Needing More Internal Links</div>';
            html += renderTable(lowLinkPages, [
                {key:'url',label:'URL',render:p=>'<div class="url-cell"><a href="'+p.url+'" target="_blank">'+shortUrl(p.url)+'</a></div>'},
                {key:'links',label:'Int. Links',render:p=>''+(p.meta?.internal_links_count||0)},
                {key:'words',label:'Words',render:p=>''+(p.meta?.content?.plain_text_word_count||0)},
                {key:'score',label:'Score',render:p=>{const s=p.onpage_score||'—';const c=s>=80?'var(--success)':s>=50?'var(--warning)':'var(--danger)';return '<span style="color:'+c+'">'+s+'</span>';}},
            ], 'link-opps');
        }
        $('tabContent').innerHTML = html;
    }

    // ═══════════════════════════════════════════════════════════
    // COPY TASK & EXPORT ALL TASKS
    // ═══════════════════════════════════════════════════════════
    function copyTask(title, btn) {
        const iss = generateDetailedIssues().find(i => i.title === title);
        if (!iss) return;
        let t = '## ' + iss.title + '\n';
        t += 'Priority: ' + iss.severity.toUpperCase() + ' | Impact: ' + iss.impact + '/5 | Effort: ' + iss.effort + '\n';
        t += 'Affected: ' + iss.count + ' pages\n\n';
        t += 'WHY: ' + iss.why.replace(/<[^>]*>/g,'') + '\n\n';
        t += 'FIX: ' + iss.fix.replace(/<[^>]*>/g,'').replace(/&[a-z]+;/gi,'') + '\n\n';
        if (iss.urls?.length) {
            t += 'AFFECTED URLS:\n';
            iss.urls.slice(0,20).forEach(u => { t += '  - ' + (u.url||'—') + (u.status ? ' ['+u.status+']' : '') + '\n'; });
            if (iss.count > 20) t += '  ... and ' + (iss.count - 20) + ' more\n';
        }
        t += '\n— Crocs and Clicks Site Audit';
        navigator.clipboard.writeText(t).then(() => { btn.textContent = 'Copied'; btn.classList.add('copied'); setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000); });
    }

    function exportAllTasks() {
        const issues = generateDetailedIssues();
        const completed = getCompletedTasks();
        let t = '# SITE AUDIT — ' + state.domain + '\n';
        t += '# ' + new Date().toLocaleDateString() + ' | Issues: ' + issues.length + ' | Done: ' + issues.filter(i => completed[i.title]).length + '\n\n';
        [{l:'CRITICAL',s:'critical'},{l:'HIGH',s:'warning'},{l:'MEDIUM/LOW',s:'notice'}].forEach(g => {
            const items = issues.filter(i => i.severity === g.s);
            if (!items.length) return;
            t += '\n' + g.l + '\n' + '='.repeat(40) + '\n\n';
            items.forEach(i => {
                t += (completed[i.title] ? '[x]' : '[ ]') + ' ' + i.title + ' (' + i.count + ' pages)\n';
                t += '   Impact: ' + i.impact + '/5 | Effort: ' + i.effort + ' | ~' + formatTime(i.totalTime||0) + '\n';
                t += '   Fix: ' + i.fix.replace(/<[^>]*>/g,'').replace(/&[a-z]+;/gi,'').substring(0,200) + '\n\n';
            });
        });
        t += '\n— Crocs and Clicks (crocsandclicks.com)';
        navigator.clipboard.writeText(t).then(() => toast('All tasks copied!','success'));
    }

    // ═══════════════════════════════════════════════════════════
    // SCORE IMPACT ESTIMATOR
    // ═══════════════════════════════════════════════════════════
    function estimateScoreImpact(issue) {
        const catW = { meta:1, content:1.2, links:1.3, resources:0.8, performance:1.1, accessibility:0.8, technical:1.2, seo:1.1, social:0.6, security:1.3 };
        const totalW = Object.values(catW).reduce((a,b)=>a+b,0);
        const catMap = { 'Meta':['meta','seo'],'Content':['content','seo'],'Links':['links'],'Resources':['resources','performance'],'Technical':['technical'],'Performance':['performance'],'Security':['security'] };
        const cats = catMap[issue.category] || ['technical'];
        const sev = { critical:3, warning:1.5, notice:0.5 }[issue.severity] || 1;
        let impact = 0;
        cats.forEach(c => { impact += (sev * issue.impact * (catW[c]||1) / totalW) * 1.5; });
        return Math.min(15, Math.max(1, Math.round(impact)));
    }

    function computeScoreProjections() {
        const scores = computeScores();
        const issues = generateDetailedIssues();
        const completed = getCompletedTasks();
        const proj = {};
        Object.entries(scores).filter(([k]) => k !== '_overall').forEach(([k,v]) => { proj[k] = { current:v.score, label:v.label }; });
        const catMap = { 'Meta':['meta','seo'],'Content':['content','seo'],'Links':['links'],'Resources':['resources','performance'],'Technical':['technical'],'Performance':['performance'],'Security':['security'] };
        issues.filter(i => (i.severity==='critical'||i.severity==='warning') && !completed[i.title]).forEach(iss => {
            (catMap[iss.category]||['technical']).forEach(cat => {
                if (proj[cat]) { proj[cat].projected = Math.min(100, (proj[cat].projected||proj[cat].current) + Math.round(iss.impact * ({critical:2,warning:1}[iss.severity]||0.5))); }
            });
        });
        const weights = { meta:1, content:1.2, links:1.3, resources:0.8, performance:1.1, accessibility:0.8, technical:1.2, seo:1.1, social:0.6, security:1.3 };
        let wS=0, wT=0;
        Object.entries(proj).forEach(([k,v]) => { const w=weights[k]||1; wS+=(v.projected||v.current)*w; wT+=w; });
        return { projections:proj, currentOverall:scores._overall, projectedOverall:Math.min(100,Math.round(wS/wT)) };
    }



    // ═══════════════════════════════════════════════════════════
    // LOCAL SEO CLASSIFIERS — URL Type + Keyword Intent
    // ═══════════════════════════════════════════════════════════
    
    /**
     * Classify a URL into page type for local business context.
     * Returns: homepage | service | blog | location | about | contact | gallery | testimonials | faq | other
     */
    function classifyUrlType(urlOrPath) {
        if (!urlOrPath) return 'other';
        let path;
        try { path = new URL(urlOrPath).pathname; } catch(e) { path = urlOrPath; }
        path = path.toLowerCase().replace(/\/+$/, '').replace(/^\/+/, '');
        
        // Homepage — empty path or just index
        if (!path || path === '' || /^index\.(html?|php|aspx?)$/i.test(path)) return 'homepage';
        
        const segments = path.split('/').filter(Boolean);
        const full = segments.join('/');
        const last = segments[segments.length - 1] || '';
        
        // Blog / article patterns
        if (/^(blog|posts?|articles?|news|resources|tips|insights|guides?)/.test(full) || 
            /\/(blog|posts?|articles?|news)\//i.test(full) ||
            /\d{4}\/\d{2}\//.test(full) || // date-based blog URLs
            /^(how-to|why-|what-is|guide-to|tips-for|signs-|benefits-of|cost-of|when-to|should-)/i.test(last)) {
            return 'blog';
        }
        
        // Location / city / area pages
        if (/^(locations?|areas?|cities|service-area|serving|coverage)/.test(full) ||
            /\/(locations?|areas?|cities)\//i.test(full) ||
            // Pattern: /service-in-city or /city-service or /service-city-state
            /-(in|near|for|serving)-/i.test(last) ||
            // Common city page patterns with state abbreviations
            /-(wa|or|ca|tx|fl|ny|il|oh|pa|mi|ga|nc|nj|va|az|ma|tn|mn|mo|md|wi|co|al|sc|la|ky|ct|ok|ia|ms|ar|ks|ut|nv|nm|ne|wv|id|hi|nh|me|mt|ri|de|sd|nd|ak|vt|wy|dc)$/i.test(last)) {
            return 'location';
        }
        
        // Service pages
        if (/^(services?|solutions?|what-we-do|our-work|offerings?|specialties|capabilities)/.test(full) ||
            /\/(services?|solutions?)\//i.test(full)) {
            return 'service';
        }
        
        // For single-segment paths not caught above, check if it looks like a service
        // (common for contractor sites: /roofing, /plumbing, /collision-repair)
        if (segments.length === 1 && !/(about|contact|faq|testimonial|review|gallery|portfolio|team|staff|career|privacy|terms|sitemap|tag|category|author|page|search|cart|checkout|account|login|wp-)/i.test(last)) {
            // If it's a short slug that's NOT a known utility page, likely a service page
            return 'service';
        }
        
        // About / team pages
        if (/^(about|who-we-are|our-team|our-story|team|staff|meet-|company)/.test(full)) return 'about';
        
        // Contact
        if (/^(contact|get-in-touch|reach-us|request|schedule|book|appointment|free-estimate|quote)/.test(full)) return 'contact';
        
        // Gallery / portfolio / projects
        if (/^(gallery|portfolio|projects?|our-work|before-and-after|photos?)/.test(full)) return 'gallery';
        
        // Testimonials / reviews
        if (/^(testimonials?|reviews?|customer-stories|success-stories)/.test(full)) return 'testimonials';
        
        // FAQ
        if (/^(faq|frequently-asked|help|support)/.test(full)) return 'faq';
        
        // Sub-service pages (e.g., /services/collision-repair or /plumbing/water-heater)
        if (segments.length >= 2) {
            const parent = segments[0];
            if (/^(services?|solutions?|what-we-do)$/i.test(parent)) return 'service';
            // Location sub-pages (e.g., /areas/vancouver or /locations/portland)
            if (/^(locations?|areas?|service-area)$/i.test(parent)) return 'location';
        }
        
        return 'other';
    }
    
    /**
     * Classify keyword search intent for local business context.
     * Returns: local-commercial | commercial | informational | branded | navigational
     * 
     * For local businesses, the critical distinction is:
     * - local-commercial: "auto body shop vancouver" — buying intent + location
     * - commercial: "collision repair cost" — buying intent, no location
     * - informational: "how to fix a dent in your car" — learning, not buying
     */
    function classifyKeywordIntent(keyword) {
        if (!keyword) return 'informational';
        const kw = keyword.toLowerCase().trim();
        const words = kw.split(/\s+/);
        
        // Branded / navigational (contains a known brand or domain)
        if (state.domain) {
            const brand = state.domain.replace(/\.(com|net|org|ca|co|io)$/i, '').replace(/[-_]/g, ' ');
            if (kw.includes(brand) || kw.includes(state.domain)) return 'branded';
        }
        
        // Strong informational signals
        const infoPatterns = /^(how to|how do|what is|what are|why do|why is|when to|when should|should i|can i|can you|do i need|is it|will |does |tips for|guide to|ways to|benefits of|advantages|disadvantages|difference between|vs |meaning of|definition|explained|understanding|learn|tutorial|checklist|steps to)/i;
        const infoWords = /\b(tips|guide|tutorial|explained|checklist|ideas|inspiration|examples|diy|signs|symptoms|causes|prevention|how|why|what|when|should|can|does|meaning|definition|process|steps|phases|stages|timeline|faq|questions|info|information|advice|help|learn|understand)\b/i;
        
        if (infoPatterns.test(kw)) return 'informational';
        
        // "cost of" and "how much" are commercial investigation, not purely informational
        const commercialInvestigation = /\b(cost|price|pricing|rates?|how much|estimate|quote|cheap|affordable|best|top|review|reviews|rated|rating|compare|comparison|vs|versus|alternative|pros and cons|worth it|recommend)\b/i;
        
        // Location modifiers — indicates local intent
        const locationSignals = /\b(near me|near by|nearby|in my area|around here|local)\b/i;
        // Common city/state/region patterns (crude but effective for NA)
        // We also check if any word looks like a city name by checking against the domain or known markets
        let hasLocationModifier = locationSignals.test(kw);
        
        // Check against tracked markets
        if (!hasLocationModifier && state.data?.keywords?.locations) {
            state.data.keywords.locations.forEach(loc => {
                const city = loc.split(',')[0].trim().toLowerCase();
                if (city.length > 2 && kw.includes(city)) hasLocationModifier = true;
            });
        }
        
        // Transactional / commercial signals
        const transactionalWords = /\b(buy|hire|book|schedule|call|get|find|need|want|looking for|emergency|urgent|same day|24.?7|free estimate|free quote|consultation|appointment|service|services|repair|install|replace|remove|clean|maintain|inspect|contractor|company|companies|business|professional|expert|specialist|technician|near)\b/i;
        
        // Strong info keyword at start overrides even if location is present
        if (infoPatterns.test(kw) && !commercialInvestigation.test(kw)) return 'informational';
        
        // Has location modifier AND service/commercial terms → local-commercial
        if (hasLocationModifier && (transactionalWords.test(kw) || commercialInvestigation.test(kw))) return 'local-commercial';
        if (hasLocationModifier) return 'local-commercial'; // location + anything = local commercial intent
        
        // Commercial investigation without location
        if (commercialInvestigation.test(kw)) return 'commercial';
        
        // Transactional without location
        if (transactionalWords.test(kw)) return 'commercial';
        
        // Informational signals (weaker)
        if (infoWords.test(kw)) return 'informational';
        
        // Default: if it's short (1-3 words) and none of the above, likely commercial for a business site
        if (words.length <= 3) return 'commercial';
        
        return 'informational';
    }
    
    /**
     * Determine the conflict type when two page types compete for a keyword.
     * Returns descriptive conflict type + specific fix recommendation.
     */
    function classifyConflictType(primaryType, competitorType, intent) {
        const pair = [primaryType, competitorType].sort().join('+');
        const winning = primaryType;
        const losing = competitorType;
        
        const conflicts = {
            // Homepage vs service page — the #1 local SEO cannibalization pattern
            'homepage+service': {
                type: 'Homepage Authority Hogging',
                icon: '🏠',
                description: 'Your homepage\'s backlink authority is outmuscling your dedicated service page. Google can\'t tell which page should rank for this service keyword.',
                fix: function(primary, competitor, keyword) {
                    if (winning === 'homepage') {
                        return '<strong>Your homepage is stealing rankings from your service page.</strong> This is extremely common — homepages naturally accumulate more backlinks and authority.<br><br>' +
                            '<strong>Fix:</strong> (1) Remove or reduce service-specific keyword optimization from your homepage — keep it broad. ' +
                            '(2) Strengthen the service page with deeper content, unique testimonials, and project examples. ' +
                            '(3) Add a strong internal link from homepage to the service page with descriptive anchor text like "' + keyword + '". ' +
                            '(4) Set up your Google Business Profile to link to the service page instead of the homepage for this service category.';
                    } else {
                        return '<strong>Your service page is outranking your homepage</strong> for what appears to be a broad/brand query. ' +
                            'This usually means your homepage is too thin on content.<br><br>' +
                            '<strong>Fix:</strong> Strengthen your homepage content — add 300-400 words covering your main services and location. ' +
                            'Ensure the homepage H1 and title clearly state your business + primary location.';
                    }
                }
            },
            // Blog vs service page — wrong intent ranking
            'blog+service': {
                type: 'Blog Stealing Service Traffic',
                icon: '📝',
                description: 'A blog post is competing with your service page for a commercial keyword. Blog posts satisfy informational intent; service pages convert customers.',
                fix: function(primary, competitor, keyword) {
                    if (winning === 'blog') {
                        return '<strong>Your blog post is outranking your service page for a commercial keyword.</strong> Visitors landing on a blog post when they\'re ready to hire are less likely to convert.<br><br>' +
                            '<strong>Fix:</strong> (1) Update the blog post\'s title and H1 to target an informational angle (e.g., "How to Choose..." or "X Things to Know About..."). ' +
                            '(2) Add a prominent CTA in the blog linking to the service page. ' +
                            '(3) Add a canonical tag on the blog pointing to the service page if the content substantially overlaps. ' +
                            '(4) Strengthen the service page with more conversion-focused content, schema markup, and clear calls-to-action.';
                    } else {
                        return '<strong>Your service page and blog post are competing.</strong> The service page is winning, but the blog is diluting its ranking power.<br><br>' +
                            '<strong>Fix:</strong> Differentiate the blog post to target informational keywords (add "how to", "guide", "tips" angles). ' +
                            'Link from the blog to the service page with keyword-rich anchor text to pass authority where it matters.';
                    }
                }
            },
            // Service page vs location/city page
            'location+service': {
                type: 'Service vs. City Page Overlap',
                icon: '📍',
                description: 'Your main service page and a location-specific page are fighting for the same local keyword. This typically means the city page isn\'t differentiated enough.',
                fix: function(primary, competitor, keyword) {
                    return '<strong>Your service page and city/location page are competing for the same keyword.</strong><br><br>' +
                        '<strong>Fix:</strong> (1) Your main service page should target the broad service term (e.g., "collision repair"). ' +
                        '(2) The location page should target "[service] + [city]" with unique local content — local projects, area-specific testimonials, driving directions, local landmarks. ' +
                        '(3) Don\'t just swap city names across pages — add genuinely unique content per location. ' +
                        '(4) Link from the service page to each location page, and vice versa, using location-modified anchor text.';
                }
            },
            // Location page vs location page (neighboring cities)
            'location+location': {
                type: 'City Pages Cannibalizing Each Other',
                icon: '🗺️',
                description: 'Two of your city/location pages are ranking for the same keyword. This usually happens with neighboring suburbs or when city pages have too-similar content.',
                fix: function(primary, competitor, keyword) {
                    return '<strong>Two location pages are fighting each other.</strong> This is a classic sign of template-based city pages with insufficient unique content.<br><br>' +
                        '<strong>Fix:</strong> (1) Make each page genuinely unique — add location-specific project photos, testimonials from that area, local landmark references, and unique service details. ' +
                        '(2) Consider consolidating very small/nearby cities into one broader regional page. ' +
                        '(3) Ensure each page\'s title and H1 clearly include the specific city name. ' +
                        '(4) Check your internal linking — each city page should link to the others, not compete in isolation.';
                }
            },
            // Homepage vs location page (multi-location)
            'homepage+location': {
                type: 'Homepage vs. Location Page',
                icon: '🏠📍',
                description: 'Your homepage is competing with a dedicated location page. For multi-location businesses, the homepage should stay broad while location pages handle city-specific queries.',
                fix: function(primary, competitor, keyword) {
                    return '<strong>Your homepage and a location page are competing.</strong><br><br>' +
                        '<strong>Fix:</strong> (1) Keep your homepage optimized for your brand + broad service terms, NOT city-specific keywords. ' +
                        '(2) Strengthen the location page with unique, city-specific content. ' +
                        '(3) Add a clear "Areas We Serve" section on the homepage linking to each location page. ' +
                        '(4) If single-location, consider whether you even need a separate location page — the homepage may be sufficient.';
                }
            },
            // Blog vs blog
            'blog+blog': {
                type: 'Blog Posts Competing',
                icon: '📝📝',
                description: 'Two blog posts are ranking for the same keyword. One should be consolidated into the other or re-targeted.',
                fix: function(primary, competitor, keyword) {
                    return '<strong>Two blog posts are competing for the same keyword.</strong><br><br>' +
                        '<strong>Fix:</strong> (1) Merge the best content from both posts into a single comprehensive article. ' +
                        '(2) 301 redirect the weaker post to the stronger one. ' +
                        '(3) If both posts serve different angles, update titles and content to target distinct long-tail keywords.';
                }
            },
            // Homepage vs blog
            'blog+homepage': {
                type: 'Blog Competing with Homepage',
                icon: '📝🏠',
                description: 'A blog post is competing with your homepage. The blog may be too broadly optimized, or your homepage content overlaps with the blog topic.',
                fix: function(primary, competitor, keyword) {
                    return '<strong>Your blog post and homepage are competing.</strong><br><br>' +
                        '<strong>Fix:</strong> (1) Narrow the blog post\'s keyword focus to a more specific, long-tail topic. ' +
                        '(2) Ensure the homepage targets broad business terms while the blog handles specific informational queries. ' +
                        '(3) Add a canonical tag if appropriate, or consolidate content.';
                }
            }
        };
        
        // Look up conflict type, falling back to generic
        const conflict = conflicts[pair];
        if (conflict) return conflict;
        
        // Generic fallback
        return {
            type: primaryType.charAt(0).toUpperCase() + primaryType.slice(1) + ' vs. ' + competitorType.charAt(0).toUpperCase() + competitorType.slice(1),
            icon: '⚔️',
            description: 'Two pages are competing for the same keyword in search results.',
            fix: function(primary, competitor, keyword) {
                return '<strong>Two pages are competing for "' + keyword + '".</strong><br><br>' +
                    '<strong>Fix:</strong> (1) Decide which page should own this keyword. (2) Redirect the weaker page or re-target it with different keywords. (3) Consolidate the best content from both pages if they serve the same purpose.';
            }
        };
    }
    
    // Page type labels and icons for display
    const PAGE_TYPE_LABELS = {
        homepage: { label: 'Homepage', icon: '🏠', color: '#8b5cf6' },
        service: { label: 'Service Page', icon: '🔧', color: '#3b82f6' },
        blog: { label: 'Blog / Article', icon: '📝', color: '#f59e0b' },
        location: { label: 'City / Location', icon: '📍', color: '#10b981' },
        about: { label: 'About Page', icon: 'ℹ️', color: '#6b7280' },
        contact: { label: 'Contact Page', icon: '📞', color: '#6b7280' },
        gallery: { label: 'Gallery', icon: '🖼️', color: '#6b7280' },
        testimonials: { label: 'Reviews / Testimonials', icon: '⭐', color: '#6b7280' },
        faq: { label: 'FAQ', icon: '❓', color: '#6b7280' },
        other: { label: 'Other', icon: '📄', color: '#6b7280' }
    };
    
    const INTENT_LABELS = {
        'local-commercial': { label: 'Local Commercial', icon: '📍💰', color: '#ef4444', description: 'Ready to hire + location-specific' },
        'commercial': { label: 'Commercial', icon: '💰', color: '#f59e0b', description: 'Research / buying intent' },
        'informational': { label: 'Informational', icon: '📚', color: '#3b82f6', description: 'Learning / research' },
        'branded': { label: 'Branded', icon: '🏢', color: '#8b5cf6', description: 'Brand search' },
        'navigational': { label: 'Navigational', icon: '🧭', color: '#6b7280', description: 'Finding a specific page' }
    };

    // ═══════════════════════════════════════════════════════════
    // TAB: KEYWORD INTELLIGENCE (Ranked Keywords + Local Validation)
    // ═══════════════════════════════════════════════════════════
    function getKeywordData() {
        const kw = state.data.keywords;
        if(!kw || !kw.markets) return null;
        
        const { markets, locations } = kw;
        
        // ═══════════════════════════════════════════════════════
        // PHASE 1: Per-market cannibalization detection (BEFORE merge)
        // This runs on raw per-market SERP data so nothing is lost
        // ═══════════════════════════════════════════════════════
        const cannibalizationByMarket = {};
        
        Object.entries(markets).forEach(([loc, mData]) => {
            const marketConflicts = [];
            (mData.items || []).forEach(item => {
                const matches = item._serpMatches || [];
                if (matches.length < 2) return; // No cannibalization
                
                const kd = item.keyword_data || {};
                const vol = kd.keyword_info?.search_volume || 0;
                const primary = matches[0]; // highest position
                const competitors = matches.slice(1);
                const posGap = competitors[0].position - primary.position;
                
                // Classify page types and keyword intent
                const primaryType = classifyUrlType(primary.url || primary.path);
                const competitorTypes = competitors.map(c => classifyUrlType(c.url || c.path));
                const keywordIntent = classifyKeywordIntent(kd.keyword || '');
                const conflictInfo = classifyConflictType(primaryType, competitorTypes[0], keywordIntent);
                
                // Smart severity: weighs conflict type + intent + position gap
                // Blog outranking service for commercial keyword = critical
                // Two service sub-pages close together = medium
                let severity = posGap <= 5 ? 'critical' : posGap <= 10 ? 'high' : 'medium';
                
                // Escalate: commercial/local-commercial intent with wrong page winning
                const isCommercialIntent = keywordIntent === 'local-commercial' || keywordIntent === 'commercial';
                const wrongPageWinning = isCommercialIntent && (
                    (primaryType === 'blog' && (competitorTypes[0] === 'service' || competitorTypes[0] === 'location')) ||
                    (primaryType === 'homepage' && (competitorTypes[0] === 'service' || competitorTypes[0] === 'location'))
                );
                if (wrongPageWinning && severity !== 'critical') severity = 'critical';
                
                // Escalate: homepage authority hogging on service keywords
                if (primaryType === 'homepage' && competitorTypes[0] === 'service' && isCommercialIntent) severity = 'critical';
                
                // De-escalate: informational intent conflicts are less damaging
                if (keywordIntent === 'informational' && severity === 'critical') severity = 'high';
                
                // De-escalate: branded queries are typically fine
                if (keywordIntent === 'branded') severity = 'medium';
                
                marketConflicts.push({
                    keyword: kd.keyword || '',
                    volume: vol,
                    cpc: kd.keyword_info?.cpc || 0,
                    market: loc,
                    primary: { url: primary.url, path: primary.path, position: primary.position, title: primary.title, pageType: primaryType },
                    competitors: competitors.map((c, ci) => ({ url: c.url, path: c.path, position: c.position, title: c.title, pageType: competitorTypes[ci] || classifyUrlType(c.url || c.path) })),
                    positionGap: posGap,
                    allMatches: matches,
                    severity,
                    // New: classification data
                    intent: keywordIntent,
                    conflictType: conflictInfo.type,
                    conflictIcon: conflictInfo.icon,
                    conflictDescription: conflictInfo.description,
                    conflictFix: typeof conflictInfo.fix === 'function' ? conflictInfo.fix(primary, competitors[0], kd.keyword || '') : conflictInfo.fix,
                    primaryType,
                    competitorType: competitorTypes[0],
                    wrongPageWinning
                });
            });
            marketConflicts.sort((a,b) => b.volume - a.volume);
            cannibalizationByMarket[loc] = marketConflicts;
        });
        
        // ═══════════════════════════════════════════════════════
        // PHASE 2: Merge items across markets for unified view
        // Dedup keeps best position but preserves cannibalization
        // flags per-market (not on the merged entry)
        // ═══════════════════════════════════════════════════════
        const allKws = [];
        const seenKeys = {};  // keyword+url dedup
        let totalRankingAllMarkets = 0;
        
        const aggregateByMarket = {};
        let aggPos1 = 0, aggPos2_3 = 0, aggPos4_10 = 0, aggPos11_20 = 0;
        let aggNew = 0, aggLost = 0;
        
        // Build set of cannibalized keyword+market combos for fast lookup
        const canniSet = new Set();
        Object.entries(cannibalizationByMarket).forEach(([loc, conflicts]) => {
            conflicts.forEach(c => canniSet.add(c.keyword.toLowerCase() + '||' + loc));
        });
        
        Object.entries(markets).forEach(([loc, mData]) => {
            const org = mData.metrics?.organic || {};
            aggregateByMarket[loc] = org;
            totalRankingAllMarkets += mData.totalCount || 0;
            aggPos1 += org.pos_1 || 0;
            aggPos2_3 += org.pos_2_3 || 0;
            aggPos4_10 += org.pos_4_10 || 0;
            aggPos11_20 += org.pos_11_20 || 0;
            aggNew += org.is_new || 0;
            aggLost += org.is_lost || 0;
            
            (mData.items || []).forEach(item => {
                const kd = item.keyword_data || {};
                const serp = item.ranked_serp_element?.serp_item || {};
                const rc = item.rank_changes || {};
                const url = serp.relative_url || serp.url || '';
                const fullUrl = serp.url || ('https://'+state.domain+url);
                const key = (kd.keyword||'').toLowerCase() + '||' + fullUrl;
                
                // Cannibalization is tracked per-market, not on merged entries
                const isCannibInThisMarket = canniSet.has((kd.keyword||'').toLowerCase() + '||' + loc);
                
                // Dedup: keep best position across markets
                if (seenKeys[key] && seenKeys[key].position <= (serp.rank_group || 999)) {
                    seenKeys[key].markets.push(loc);
                    // Preserve cannibalization flag if ANY market has it
                    if (isCannibInThisMarket) seenKeys[key].isCannibalized = true;
                    return;
                }
                
                const entry = {
                    keyword: kd.keyword || '',
                    volume: kd.keyword_info?.search_volume || 0,
                    cpc: kd.keyword_info?.cpc || 0,
                    competition: kd.keyword_info?.competition_level || '',
                    difficulty: kd.keyword_properties?.keyword_difficulty || item.keyword_difficulty || 0,
                    position: serp.rank_group || serp.rank_absolute || 999,
                    url: fullUrl,
                    relUrl: url,
                    etv: 0,
                    paidCost: 0,
                    type: serp.type || 'organic',
                    isNew: rc.is_new || false,
                    isUp: rc.is_up || false,
                    isDown: rc.is_down || false,
                    isLost: rc.is_lost || false,
                    serpTypes: item.serp_item_types || [],
                    hasAiOverview: (item.serp_item_types||[]).includes('ai_overview'),
                    serpMatches: item._serpMatches || [],
                    isCannibalized: isCannibInThisMarket,
                    market: loc,
                    markets: [loc],
                    // Maps data
                    mapsRank: item._mapsRank || null,
                    mapsUrl: item._mapsUrl || '',
                    mapsData: item._mapsData || null,
                    surfaceComparison: item._surfaceComparison || null
                };
                
                if (seenKeys[key]) {
                    const idx = allKws.indexOf(seenKeys[key]);
                    entry.markets = [...seenKeys[key].markets, loc];
                    // Preserve cannibalization if previous entry had it
                    if (seenKeys[key].isCannibalized) entry.isCannibalized = true;
                    if (idx >= 0) allKws[idx] = entry;
                    seenKeys[key] = entry;
                } else {
                    allKws.push(entry);
                    seenKeys[key] = entry;
                }
            });
        });
        
        // ═══════════════════════════════════════════════════════
        // PHASE 3: Build pageMap enriched with secondary URLs
        // Secondary URLs from _serpMatches get pageMap entries
        // so the page rankings view shows ALL pages in SERPs
        // ═══════════════════════════════════════════════════════
        const pageMap = {};
        allKws.forEach(entry => {
            if(!pageMap[entry.url]) pageMap[entry.url] = [];
            pageMap[entry.url].push(entry);
        });
        
        // Enrich: add secondary SERP matches to pageMap
        // These are pages that appeared in SERPs but weren't the primary match
        Object.values(cannibalizationByMarket).forEach(conflicts => {
            conflicts.forEach(conflict => {
                conflict.competitors.forEach(comp => {
                    const compUrl = comp.url;
                    if (!compUrl) return;
                    if (!pageMap[compUrl]) pageMap[compUrl] = [];
                    // Check if this keyword is already in this page's list
                    const exists = pageMap[compUrl].some(k => 
                        k.keyword.toLowerCase() === conflict.keyword.toLowerCase()
                    );
                    if (!exists) {
                        pageMap[compUrl].push({
                            keyword: conflict.keyword,
                            volume: conflict.volume,
                            cpc: conflict.cpc,
                            position: comp.position,
                            url: compUrl,
                            relUrl: comp.path || '',
                            etv: 0, // Don't inflate traffic estimates
                            paidCost: 0,
                            isCannibalized: true,
                            isSecondaryMatch: true, // Flag so we don't double-count
                            market: conflict.market,
                            markets: [conflict.market],
                            serpTypes: [], hasAiOverview: false,
                            isNew: false, isUp: false, isDown: false, isLost: false
                        });
                    }
                });
            });
        });
        
        return {
            items: allKws,
            pageMap,
            totalRanking: totalRankingAllMarkets,
            locations,
            locationLabel: locations.map(l => l.split(',')[0]).join(', '),
            aggregate: {
                etv: 0,
                paidValue: 0,
                pos1: aggPos1,
                pos2_3: aggPos2_3,
                pos4_10: aggPos4_10,
                pos11_20: aggPos11_20,
                isNew: aggNew,
                isLost: aggLost
            },
            aggregateByMarket,
            cannibalizationByMarket,
            rawMarkets: markets,
            isMultiMarket: locations.length > 1
        };
    }
    
    function detectCannibalization(kwData) {
        if(!kwData) return { serpConflicts: [], ngramOverlaps: [], wrongPageRankings: [], crossSurfaceConflicts: [], crossMarketConflicts: [], marketKeywordMatrix: [] };
        const { items, pageMap, cannibalizationByMarket, rawMarkets, locations, isMultiMarket } = kwData;
        
        // ═══════════════════════════════════════════════════════════
        // TIER 1: SERP-Verified Cannibalization (per-market, definitive)
        // Pre-computed in getKeywordData Phase 1 — enriched with page types,
        // intent classification, and smart severity
        // ═══════════════════════════════════════════════════════════
        const serpConflicts = [];
        Object.entries(cannibalizationByMarket || {}).forEach(([loc, conflicts]) => {
            conflicts.forEach(c => {
                serpConflicts.push({
                    keyword: c.keyword,
                    volume: c.volume,
                    cpc: c.cpc,
                    market: c.market,
                    primary: c.primary,
                    competitors: c.competitors,
                    positionGap: c.positionGap,
                    allMatches: c.allMatches,
                    severity: c.severity,
                    // Enriched fields
                    intent: c.intent || 'commercial',
                    conflictType: c.conflictType || 'Unknown',
                    conflictIcon: c.conflictIcon || '⚔️',
                    conflictDescription: c.conflictDescription || '',
                    conflictFix: c.conflictFix || '',
                    primaryType: c.primaryType || 'other',
                    competitorType: c.competitorType || 'other',
                    wrongPageWinning: c.wrongPageWinning || false
                });
            });
        });
        
        // Sort: critical first, then by volume descending
        const sevOrder = { critical: 0, high: 1, medium: 2 };
        serpConflicts.sort((a,b) => {
            const s = (sevOrder[a.severity]||2) - (sevOrder[b.severity]||2);
            if (s !== 0) return s;
            return b.volume - a.volume;
        });
        
        // ═══════════════════════════════════════════════════════════
        // TIER 1.5: Wrong Page Ranking Detection
        // Single page ranking, but it's the WRONG page type for the intent.
        // Not traditional cannibalization but equally damaging for conversions.
        // ═══════════════════════════════════════════════════════════
        const wrongPageRankings = [];
        const cannibKws = new Set(serpConflicts.map(c => c.keyword.toLowerCase()));
        
        items.forEach(item => {
            // Skip already-detected cannibalization
            if (cannibKws.has(item.keyword.toLowerCase())) return;
            // Only care about ranking keywords
            if (item.position >= 999 || item.position > 20) return;
            // Need enough volume to matter
            if (item.volume < 10) return;
            
            const intent = classifyKeywordIntent(item.keyword);
            const pageType = classifyUrlType(item.url || item.relUrl);
            
            // Detect mismatches: commercial intent keyword ranking with informational page
            let isMismatch = false;
            let mismatchReason = '';
            let idealPageType = '';
            let mismatchSeverity = 'medium';
            
            if ((intent === 'local-commercial' || intent === 'commercial') && pageType === 'blog') {
                isMismatch = true;
                mismatchReason = 'Blog post ranking for a commercial keyword — visitors looking to hire land on an article instead of a service page.';
                idealPageType = 'service';
                mismatchSeverity = item.position <= 10 ? 'high' : 'medium';
            } else if ((intent === 'local-commercial' || intent === 'commercial') && pageType === 'about') {
                isMismatch = true;
                mismatchReason = 'About page ranking for a commercial keyword — visitors looking for a service land on your team bio.';
                idealPageType = 'service';
                mismatchSeverity = 'medium';
            } else if ((intent === 'local-commercial' || intent === 'commercial') && pageType === 'faq') {
                isMismatch = true;
                mismatchReason = 'FAQ page ranking for a commercial keyword — may convert less than a dedicated service page.';
                idealPageType = 'service';
                mismatchSeverity = 'medium';
            } else if (intent === 'local-commercial' && pageType === 'homepage' && item.position > 5) {
                // Homepage ranking poorly for a city+service keyword means you probably need a location page
                isMismatch = true;
                mismatchReason = 'Homepage ranking for a local keyword — a dedicated service or location page would likely rank better and convert more.';
                idealPageType = 'location';
                mismatchSeverity = 'medium';
            }
            
            if (isMismatch) {
                wrongPageRankings.push({
                    keyword: item.keyword,
                    volume: item.volume,
                    cpc: item.cpc,
                    position: item.position,
                    url: item.url,
                    relUrl: item.relUrl,
                    pageType,
                    idealPageType,
                    intent,
                    reason: mismatchReason,
                    severity: mismatchSeverity,
                    market: item.markets?.[0] || '',
                    etv: item.etv || 0
                });
            }
        });
        
        wrongPageRankings.sort((a,b) => {
            const s = (sevOrder[a.severity]||2) - (sevOrder[b.severity]||2);
            if (s !== 0) return s;
            return b.volume - a.volume;
        });
        
        // ═══════════════════════════════════════════════════════════
        // TIER 2: N-gram Overlap Analysis (heuristic supplement)
        // Pages targeting similar keywords that COULD cannibalize
        // ═══════════════════════════════════════════════════════════
        const pages = Object.entries(pageMap);
        const ngramOverlaps = [];
        if(pages.length >= 2) {
            function getNgrams(keywords, n) {
                const grams = {};
                keywords.forEach(kw => {
                    const words = kw.keyword.toLowerCase().replace(/[^a-z0-9\s]/g,'').split(/\s+/).filter(w=>w.length>2);
                    for(let i=0; i<=words.length-n; i++) {
                        const gram = words.slice(i,i+n).join(' ');
                        if(!grams[gram]) grams[gram] = { count:0, volume:0, keywords:[] };
                        grams[gram].count++;
                        grams[gram].volume += kw.volume;
                        grams[gram].keywords.push(kw);
                    }
                });
                return grams;
            }
            
            const pageProfiles = {};
            pages.forEach(([url, kws]) => {
                // Exclude secondary matches from n-gram analysis to avoid false positives
                const primaryKws = kws.filter(k => !k.isSecondaryMatch);
                const bi = getNgrams(primaryKws, 2);
                const tri = getNgrams(primaryKws, 3);
                const all = {...bi, ...tri};
                const sorted = Object.entries(all).sort((a,b) => b[1].volume - a[1].volume).slice(0,20);
                pageProfiles[url] = { ngrams: Object.fromEntries(sorted), kws: primaryKws, totalEtv: primaryKws.reduce((a,k)=>a+k.etv,0) };
            });
            
            const urls = Object.keys(pageProfiles);
            for(let i=0; i<urls.length; i++) {
                for(let j=i+1; j<urls.length; j++) {
                    const a = pageProfiles[urls[i]], b = pageProfiles[urls[j]];
                    if (!a.kws.length || !b.kws.length) continue;
                    const aNgrams = Object.keys(a.ngrams), bNgrams = Object.keys(b.ngrams);
                    const shared = aNgrams.filter(g => bNgrams.includes(g));
                    if(shared.length < 2) continue;
                    
                    const overlapPct = shared.length / Math.min(aNgrams.length, bNgrams.length);
                    const sharedVolume = shared.reduce((sum,g) => sum + Math.max(a.ngrams[g].volume, b.ngrams[g].volume), 0);
                    const totalTraffic = a.totalEtv + b.totalEtv;
                    
                    if(overlapPct > 0.15 || shared.length >= 3) {
                        const risk = overlapPct > 0.5 ? 'high' : overlapPct > 0.25 ? 'medium' : 'low';
                        ngramOverlaps.push({
                            pages: [
                                { url:urls[i], kws:a.kws.length, etv:a.totalEtv, topPos:Math.min(...a.kws.map(k=>k.position)) },
                                { url:urls[j], kws:b.kws.length, etv:b.totalEtv, topPos:Math.min(...b.kws.map(k=>k.position)) }
                            ],
                            sharedTopics: shared.slice(0,5),
                            overlapPct: Math.round(overlapPct*100),
                            sharedVolume,
                            totalTraffic,
                            risk
                        });
                    }
                }
            }
            ngramOverlaps.sort((a,b) => {
                const riskOrder = {high:0,medium:1,low:2};
                return (riskOrder[a.risk]-riskOrder[b.risk]) || (b.sharedVolume-a.sharedVolume);
            });
        }
        
        // ═══════════════════════════════════════════════════════════
        // TIER 3: Cross-Surface Cannibalization (Organic vs Maps)
        // Detects misalignments between organic and Local Pack presence
        // ═══════════════════════════════════════════════════════════
        const crossSurfaceConflicts = [];
        
        items.forEach(item => {
            if (!item.mapsData && item.surfaceComparison === null) return; // Not checked
            
            const organicPos = item.position < 999 ? item.position : null;
            const mapsRank = item.mapsRank;
            const mapsRanked = mapsRank !== null && mapsRank !== 'NF';
            const organicRanked = organicPos !== null;
            const vol = item.volume || 0;
            const intent = classifyKeywordIntent(item.keyword);
            const isLocal = intent === 'local-commercial' || intent === 'commercial';
            
            if (vol < 10) return; // Skip low-volume
            
            // Case 1: Organic ranks but NOT in Local Pack — GBP optimization gap
            if (organicRanked && !mapsRanked && isLocal) {
                let severity = 'medium';
                if (organicPos <= 10 && vol >= 50) severity = 'high';
                if (organicPos <= 3 && vol >= 100) severity = 'critical';
                
                crossSurfaceConflicts.push({
                    keyword: item.keyword,
                    volume: vol,
                    cpc: item.cpc || 0,
                    market: item.markets?.[0] || '',
                    type: 'missing-maps',
                    organicPosition: organicPos,
                    organicUrl: item.url,
                    mapsRank: 'NF',
                    mapsUrl: '',
                    severity,
                    intent,
                    title: 'Not in Local Pack',
                    description: 'Ranks #' + organicPos + ' organically but does not appear in the Google Maps/Local Pack for this keyword. Local Pack gets ~42% of clicks for local searches — this is significant lost visibility.',
                    fix: 'Optimize your Google Business Profile: ensure the primary category matches this service, add the keyword to your GBP description, post regular updates mentioning this service, and build local citations. Request reviews mentioning this service type.',
                    competitors: item.mapsData?.competitors || []
                });
            }
            
            // Case 2: In Local Pack but NOT ranking organically — content gap
            if (!organicRanked && mapsRanked && isLocal) {
                let severity = vol >= 100 ? 'high' : 'medium';
                
                crossSurfaceConflicts.push({
                    keyword: item.keyword,
                    volume: vol,
                    cpc: item.cpc || 0,
                    market: item.markets?.[0] || '',
                    type: 'missing-organic',
                    organicPosition: null,
                    organicUrl: '',
                    mapsRank: mapsRank,
                    mapsUrl: item.mapsUrl || '',
                    severity,
                    intent,
                    title: 'Maps Only — No Organic Presence',
                    description: 'Ranks #' + mapsRank + ' in Local Pack but has no organic ranking in the top 20. You\'re capturing Maps traffic but missing all organic clicks. Creating a dedicated service page targeting this keyword could double your visibility.',
                    fix: 'Create or optimize a page specifically targeting "' + item.keyword + '". Include the keyword in title, H1, and throughout the content. Add LocalBusiness schema markup. Internal link from your homepage and related service pages.',
                    competitors: item.mapsData?.competitors || []
                });
            }
            
            // Case 3: Both rank but with very different positions — alignment issue
            if (organicRanked && mapsRanked && isLocal) {
                const posDiff = Math.abs(organicPos - mapsRank);
                if (posDiff >= 8 && (organicPos > 10 || mapsRank > 10)) {
                    const betterSurface = organicPos < mapsRank ? 'organic' : 'maps';
                    const worseSurface = betterSurface === 'organic' ? 'maps' : 'organic';
                    const worsePos = betterSurface === 'organic' ? mapsRank : organicPos;
                    const betterPos = betterSurface === 'organic' ? organicPos : mapsRank;
                    let severity = 'medium';
                    if (worsePos > 10 && betterPos <= 5 && vol >= 50) severity = 'high';
                    
                    crossSurfaceConflicts.push({
                        keyword: item.keyword,
                        volume: vol,
                        cpc: item.cpc || 0,
                        market: item.markets?.[0] || '',
                        type: 'surface-gap',
                        organicPosition: organicPos,
                        organicUrl: item.url,
                        mapsRank: mapsRank,
                        mapsUrl: item.mapsUrl || '',
                        severity,
                        intent,
                        title: 'Ranking Gap: Organic vs Maps',
                        description: 'Ranks #' + organicPos + ' organically but #' + mapsRank + ' in Local Pack (' + posDiff + ' position gap). Strong ' + betterSurface + ' performance isn\'t translating to ' + worseSurface + '.',
                        fix: worseSurface === 'maps' 
                            ? 'Your website content is strong for this keyword but GBP needs work. Update your primary GBP category, add this service to GBP services, and ensure your business name/address/phone is consistent across all directories.'
                            : 'Your GBP performs well but your website content for this keyword needs strengthening. Create or expand the service page, add more relevant content, and build internal links to it from related pages.',
                        competitors: item.mapsData?.competitors || []
                    });
                }
            }
        });
        
        crossSurfaceConflicts.sort((a, b) => {
            const s = (sevOrder[a.severity] || 2) - (sevOrder[b.severity] || 2);
            if (s !== 0) return s;
            return b.volume - a.volume;
        });
        
        // ═══════════════════════════════════════════════════════════
        // TIER 4: Cross-Market Cannibalization (Multi-Market Only)
        // Detects inconsistencies when the same keyword has different
        // ranking pages, position gaps, or location page leaking
        // across different geographic markets
        // ═══════════════════════════════════════════════════════════
        const crossMarketConflicts = [];
        const marketKeys = Object.keys(kwData.cannibalizationByMarket || {});
        const allMarkets = Object.keys((state.data.keywords?.markets) || {});
        
        if (allMarkets.length >= 2) {
            // Build per-keyword per-market ranking map from raw market data
            // { keyword: { market1: [{url, position, title}], market2: [...] } }
            const kwMarketMap = {};
            
            allMarkets.forEach(loc => {
                const mData = state.data.keywords.markets[loc];
                if (!mData?.items) return;
                
                mData.items.forEach(item => {
                    const kd = item.keyword_data || {};
                    const kw = (kd.keyword || '').toLowerCase();
                    if (!kw) return;
                    
                    const serp = item.ranked_serp_element?.serp_item || {};
                    const pos = serp.rank_group || serp.rank_absolute || 999;
                    const url = serp.url || ('https://' + state.domain + (serp.relative_url || ''));
                    const relUrl = serp.relative_url || '';
                    const vol = kd.keyword_info?.search_volume || 0;
                    const cpc = kd.keyword_info?.cpc || 0;
                    
                    if (!kwMarketMap[kw]) kwMarketMap[kw] = { keyword: kd.keyword, volume: vol, cpc };
                    if (!kwMarketMap[kw][loc]) kwMarketMap[kw][loc] = [];
                    
                    // Include all SERP matches for this keyword in this market
                    const serpMatches = item._serpMatches || [];
                    const seenUrls = new Set();
                    if (serpMatches.length > 0) {
                        serpMatches.forEach(m => {
                            // Skip not-ranking entries that leaked through
                            if (!m.position || m.position >= 999) return;
                            const mUrl = m.url || ('https://' + state.domain + (m.path || ''));
                            // Deduplicate: same URL shouldn't appear twice for same keyword+market
                            const normUrl = mUrl.split('?')[0].split('#')[0].replace(/\/$/, '').toLowerCase();
                            if (seenUrls.has(normUrl)) return;
                            seenUrls.add(normUrl);
                            kwMarketMap[kw][loc].push({
                                url: mUrl,
                                relUrl: m.path || relUrl,
                                position: m.position,
                                title: m.title || ''
                            });
                        });
                    }
                    // Fallback: use the primary ranked element if no serpMatches were valid
                    if (kwMarketMap[kw][loc].length === 0 && pos < 999) {
                        kwMarketMap[kw][loc].push({ url, relUrl, position: pos, title: serp.title || '' });
                    }
                });
            });
            
            // Analyze each keyword across markets
            Object.entries(kwMarketMap).forEach(([kwLower, kwInfo]) => {
                const vol = kwInfo.volume || 0;
                const cpc = kwInfo.cpc || 0;
                const keyword = kwInfo.keyword || kwLower;
                if (vol < 10) return; // Skip low-volume keywords
                
                // Collect which markets have rankings for this keyword
                const marketRankings = {};
                allMarkets.forEach(loc => {
                    const rankings = kwInfo[loc];
                    if (rankings && rankings.length > 0) {
                        // Get the best-ranking URL for this keyword in this market
                        const sorted = [...rankings].sort((a, b) => a.position - b.position);
                        marketRankings[loc] = sorted;
                    }
                });
                
                const rankedMarkets = Object.keys(marketRankings);
                if (rankedMarkets.length < 2) return; // Need 2+ markets with rankings
                
                // ──────────────────────────────────────────
                // TYPE 1: Split Ranking — Different winning page across markets
                // ──────────────────────────────────────────
                const winningPages = {};
                rankedMarkets.forEach(loc => {
                    const bestUrl = marketRankings[loc][0].url;
                    winningPages[loc] = {
                        url: bestUrl,
                        position: marketRankings[loc][0].position,
                        relUrl: marketRankings[loc][0].relUrl || '',
                        title: marketRankings[loc][0].title || '',
                        pageType: classifyUrlType(bestUrl)
                    };
                });
                
                // Normalize URLs for comparison
                const normalizeForCompare = (url) => {
                    try {
                        const u = new URL(url);
                        return u.pathname.replace(/\/$/, '').toLowerCase();
                    } catch { 
                        // Strip query strings, hashes, trailing slashes from raw strings
                        return (url || '').split('?')[0].split('#')[0].replace(/\/$/, '').toLowerCase(); 
                    }
                };
                
                const uniqueWinners = new Set(Object.values(winningPages).map(w => normalizeForCompare(w.url)));
                
                if (uniqueWinners.size >= 2) {
                    // Different pages winning in different markets
                    const intent = classifyKeywordIntent(keyword);
                    const isCommercial = intent === 'local-commercial' || intent === 'commercial';
                    
                    // Build market comparison
                    const marketComparison = rankedMarkets.map(loc => ({
                        market: loc,
                        marketShort: loc.split(',')[0],
                        ...winningPages[loc]
                    }));
                    
                    // Determine severity
                    // Critical: commercial keyword with location page winning in wrong market
                    // High: commercial keyword with blog vs service page split
                    // Medium: informational or low-volume splits
                    let severity = 'medium';
                    let subType = 'split-ranking';
                    let description = '';
                    let fix = '';
                    
                    // Check if any location page is winning in the wrong market
                    const locationLeaks = marketComparison.filter(mc => {
                        if (mc.pageType !== 'location') return false;
                        // Extract city from URL path
                        const urlPath = mc.relUrl || mc.url;
                        const urlCity = extractCityFromPath(urlPath);
                        if (!urlCity) return false;
                        // Check if this location page's city matches its market
                        const marketCity = mc.market.split(',')[0].toLowerCase().trim();
                        return urlCity !== marketCity;
                    });
                    
                    if (locationLeaks.length > 0) {
                        subType = 'location-leak';
                        severity = isCommercial ? 'critical' : 'high';
                        const leaker = locationLeaks[0];
                        const leakerCity = extractCityFromPath(leaker.relUrl || leaker.url);
                        description = 'Your ' + leakerCity + ' location page is ranking in ' + leaker.marketShort + '\'s search results instead of the correct page. This signals to Google that your geo-targeting is confused, diluting ranking power in BOTH markets.';
                        fix = '<strong>Fix geo-targeting confusion:</strong> Strengthen the correct page for ' + leaker.marketShort + ' by adding city-specific content, schema markup with local address, and internal links from the homepage. On the leaking page (' + leakerCity + '), reinforce its target market with local landmarks, testimonials, and NAP data. Add hreflang or geo-specific canonical signals if applicable.';
                    } else {
                        // Check for page type mismatch across markets
                        const pageTypes = new Set(marketComparison.map(mc => mc.pageType));
                        if (pageTypes.size >= 2 && isCommercial) {
                            severity = 'high';
                            const typeList = marketComparison.map(mc => {
                                const pt = PAGE_TYPE_LABELS[mc.pageType] || PAGE_TYPE_LABELS['other'];
                                return mc.marketShort + ': ' + pt.icon + ' ' + pt.label;
                            }).join(', ');
                            description = 'Google is choosing different page types as the best result in each market: ' + typeList + '. This means no single page has strong enough signals for "' + keyword + '", and Google is guessing differently based on local context.';
                            fix = '<strong>Consolidate ranking signals:</strong> Identify the best page type for this keyword\'s intent and make it the clear winner everywhere. If a service page should rank, strengthen it with internal links, better on-page optimization, and location-specific content. De-optimize competing pages by shifting their keyword focus.';
                        } else {
                            severity = isCommercial && vol >= 50 ? 'high' : 'medium';
                            description = 'Different pages from your site rank #1 for "' + keyword + '" in different markets. This splits your authority and means no single page accumulates maximum ranking power.';
                            fix = '<strong>Decide on a primary page</strong> for this keyword and strengthen it with internal links, updated content, and clear topical focus. If markets genuinely need different pages (e.g., location-specific services), ensure each page has strong local signals for its target market.';
                        }
                    }
                    
                    crossMarketConflicts.push({
                        keyword, volume: vol, cpc,
                        type: subType,
                        severity,
                        intent: classifyKeywordIntent(keyword),
                        marketComparison,
                        description,
                        fix,
                        uniquePages: uniqueWinners.size,
                        marketCount: rankedMarkets.length
                    });
                }
                
                // ──────────────────────────────────────────
                // TYPE 2: Ranking Variance — Same page, wildly different positions
                // ──────────────────────────────────────────
                if (uniqueWinners.size === 1) {
                    // Same page wins everywhere — check for position variance
                    const positions = rankedMarkets.map(loc => ({
                        market: loc,
                        marketShort: loc.split(',')[0],
                        position: winningPages[loc].position,
                        url: winningPages[loc].url
                    }));
                    
                    const bestPos = Math.min(...positions.map(p => p.position));
                    const worstPos = Math.max(...positions.map(p => p.position));
                    const posGap = worstPos - bestPos;
                    
                    if (posGap >= 10 && (bestPos <= 10 || vol >= 100)) {
                        const strongMarkets = positions.filter(p => p.position <= 10);
                        const weakMarkets = positions.filter(p => p.position > 10);
                        
                        let severity = 'medium';
                        if (bestPos <= 5 && worstPos > 20 && vol >= 50) severity = 'high';
                        if (bestPos <= 3 && worstPos > 30 && vol >= 100) severity = 'critical';
                        
                        const intent = classifyKeywordIntent(keyword);
                        const isCommercial = intent === 'local-commercial' || intent === 'commercial';
                        if (isCommercial && severity === 'medium') severity = 'high';
                        
                        crossMarketConflicts.push({
                            keyword, volume: vol, cpc,
                            type: 'ranking-variance',
                            severity,
                            intent,
                            marketComparison: positions.map(p => ({
                                market: p.market,
                                marketShort: p.marketShort,
                                url: p.url,
                                position: p.position,
                                pageType: classifyUrlType(p.url)
                            })),
                            description: 'Ranks #' + bestPos + ' in ' + (strongMarkets[0]?.marketShort || '?') + ' but #' + worstPos + ' in ' + (weakMarkets[weakMarkets.length-1]?.marketShort || '?') + ' — a ' + posGap + '-position gap for the same page. This suggests weak local authority in underperforming markets.',
                            fix: '<strong>Boost local signals in weak markets:</strong> Build local citations in ' + weakMarkets.map(m=>m.marketShort).join(', ') + ', get reviews mentioning those areas, create locally-relevant content, and ensure Google Business Profile (if applicable) covers these service areas. Internal link from location pages to this service page.',
                            positionGap: posGap,
                            bestPosition: bestPos,
                            worstPosition: worstPos,
                            strongMarkets: strongMarkets.map(m => m.marketShort),
                            weakMarkets: weakMarkets.map(m => m.marketShort),
                            uniquePages: 1,
                            marketCount: rankedMarkets.length
                        });
                    }
                }
                
                // ──────────────────────────────────────────
                // TYPE 3: Missing Market Coverage
                // Ranks in some markets but not others, especially with location pages
                // ──────────────────────────────────────────
                const missingMarkets = allMarkets.filter(loc => !marketRankings[loc]);
                if (missingMarkets.length > 0 && rankedMarkets.length > 0 && vol >= 30) {
                    const bestRanked = rankedMarkets.reduce((best, loc) => {
                        const pos = winningPages[loc]?.position || 999;
                        return pos < (best.position || 999) ? { market: loc, position: pos, url: winningPages[loc].url } : best;
                    }, { position: 999 });
                    
                    // Only flag if it ranks well somewhere (top 20) but is missing elsewhere
                    if (bestRanked.position <= 20) {
                        const intent = classifyKeywordIntent(keyword);
                        const isCommercial = intent === 'local-commercial' || intent === 'commercial';
                        let severity = 'medium';
                        if (bestRanked.position <= 5 && vol >= 100 && isCommercial) severity = 'high';
                        if (bestRanked.position <= 3 && vol >= 200 && isCommercial) severity = 'critical';
                        
                        crossMarketConflicts.push({
                            keyword, volume: vol, cpc,
                            type: 'missing-coverage',
                            severity,
                            intent,
                            marketComparison: [
                                ...rankedMarkets.map(loc => ({
                                    market: loc, marketShort: loc.split(',')[0],
                                    url: winningPages[loc].url, position: winningPages[loc].position,
                                    pageType: classifyUrlType(winningPages[loc].url), ranked: true
                                })),
                                ...missingMarkets.map(loc => ({
                                    market: loc, marketShort: loc.split(',')[0],
                                    url: '', position: 999, pageType: '', ranked: false
                                }))
                            ],
                            description: 'Ranks #' + bestRanked.position + ' in ' + bestRanked.market.split(',')[0] + ' but doesn\'t appear in the top 100 in ' + missingMarkets.map(m => m.split(',')[0]).join(', ') + '. You\'re capturing traffic in some markets but completely invisible in others.',
                            fix: '<strong>Create market-specific content:</strong> Build or optimize landing pages for ' + missingMarkets.map(m => m.split(',')[0]).join(', ') + ' targeting "' + keyword + '" with local content, testimonials, and NAP data. If you already have location pages, ensure they mention this service and are properly interlinked. Build local citations and get reviews in the missing markets.',
                            rankedIn: rankedMarkets.map(m => m.split(',')[0]),
                            missingIn: missingMarkets.map(m => m.split(',')[0]),
                            bestPosition: bestRanked.position,
                            uniquePages: uniqueWinners.size,
                            marketCount: allMarkets.length
                        });
                    }
                }
            });
            
            // Sort cross-market conflicts
            crossMarketConflicts.sort((a, b) => {
                const s = (sevOrder[a.severity] || 2) - (sevOrder[b.severity] || 2);
                if (s !== 0) return s;
                return b.volume - a.volume;
            });
        }
        
        // Helper: extract city name from URL path for location leak detection
        function extractCityFromPath(urlOrPath) {
            try {
                const path = new URL(urlOrPath, 'https://x.com').pathname.toLowerCase();
                // Normalize hyphens/underscores to spaces for multi-word city matching
                // "/locations/fort-worth-tx/" → " locations fort worth tx "
                const normalized = ' ' + path.replace(/[-_/]/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
                
                for (const loc of allMarkets) {
                    const city = loc.split(',')[0].toLowerCase().trim();
                    if (!city || city.length < 3) continue;
                    // Build regex with word boundaries for exact city match
                    // "fort worth" → / fort worth / (space-bounded in our normalized string)
                    const escaped = city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const pattern = new RegExp('(?:^|\\s)' + escaped.replace(/\s+/g, '\\s+') + '(?:\\s|$)');
                    if (pattern.test(normalized)) return city;
                }
                return null;
            } catch { return null; }
        }
        
        return { serpConflicts, ngramOverlaps, wrongPageRankings, crossSurfaceConflicts, crossMarketConflicts, cannibalizationByMarket: cannibalizationByMarket || {} };
    }
    
    function renderLocalRankings() {
        const kwData = getKeywordData();
        if(!kwData) {
            const dbg = state.data.keywordDebug || ['No debug info available'];
            $('tabContent').innerHTML = '<div style="text-align:center;padding:3rem;"><div style="font-size:2rem;margin-bottom:0.5rem;">📍</div><div style="font-size:1.1rem;font-weight:600;color:var(--text-secondary);margin-bottom:0.5rem;">Ranking Data Not Available</div><div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:1.5rem;">Could not find local rankings for this domain. This typically means the domain is new, not yet indexed, or the local SERP check returned no results for the configured markets.</div><div style="text-align:left;max-width:500px;margin:0 auto;background:var(--bg-tertiary);border:1px solid var(--border-color);border-radius:8px;padding:1rem;"><div style="font-size:0.75rem;font-weight:600;color:var(--text-muted);margin-bottom:0.5rem;">DIAGNOSTIC LOG</div><div style="font-size:0.72rem;font-family:\'Space Mono\',monospace;color:var(--text-secondary);line-height:1.6;">'+dbg.map(l=>escHtml(l)).join('<br>')+'</div><div style="font-size:0.7rem;color:var(--text-muted);margin-top:0.75rem;">Open browser console (F12) for full API responses.</div></div></div>';
            return;
        }
        
        const { items, pageMap, totalRanking, locations, locationLabel, aggregate, aggregateByMarket, isMultiMarket } = kwData;
        const canniData = detectCannibalization(kwData);
        const { serpConflicts, ngramOverlaps, wrongPageRankings, crossSurfaceConflicts, crossMarketConflicts } = canniData;
        
        const agg = aggregate;
        const rankingCount = items.filter(k=>k.position < 999).length;
        const checkedCount = items.length;
        const notRanking = items.filter(k=>k.position>=999);
        const notRankingWithVol = notRanking.filter(k=>k.volume>0);
        const page2 = items.filter(k=>k.position>=11&&k.position<=20);
        const aiKws = items.filter(k=>k.hasAiOverview).length;
        const canniCount = serpConflicts.length;
        const wrongPageCount = wrongPageRankings.length;
        const crossSurfaceCount = crossSurfaceConflicts.length;
        const crossMarketCount = crossMarketConflicts.length;
        const totalIssueCount = canniCount + wrongPageCount + crossSurfaceCount + crossMarketCount;
        
        // Maps stats
        const mapsCheckedItems = items.filter(k => k.mapsRank !== null);
        const mapsRanking = mapsCheckedItems.filter(k => k.mapsRank !== 'NF' && k.mapsRank !== null);
        const hasMapsData = mapsCheckedItems.length > 0;
        
        let html = '';
        
        // ── Business Info Banner (if detected) ──
        if (state.business) {
            const biz = state.business;
            html += '<div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:10px;padding:0.75rem 1rem;margin-bottom:1rem;display:flex;gap:1rem;align-items:center;flex-wrap:wrap;">';
            html += '<div style="font-size:1.2rem;">📍</div>';
            html += '<div style="flex:1;min-width:200px;">';
            html += '<div style="font-size:0.85rem;font-weight:600;">'+escHtml(biz.name)+'</div>';
            html += '<div style="font-size:0.72rem;color:var(--text-muted);">'+escHtml(biz.address)+'</div>';
            html += '</div>';
            if (biz.rating) {
                html += '<div style="text-align:center;"><div style="font-family:Space Mono,monospace;font-size:1rem;font-weight:700;color:var(--warning);">★ '+biz.rating+'</div><div style="font-size:0.65rem;color:var(--text-muted);">'+biz.reviewCount+' reviews</div></div>';
            }
            if (biz.categoryNames) {
                html += '<div style="font-size:0.68rem;color:var(--text-muted);background:var(--bg-tertiary);padding:0.25rem 0.5rem;border-radius:4px;">'+escHtml(biz.categoryNames)+'</div>';
            }
            html += '</div>';
        }
        
        // ── Market indicator ──
        if (isMultiMarket) {
            html += '<div style="margin-bottom:0.75rem;display:flex;flex-wrap:wrap;gap:0.35rem;align-items:center;">';
            html += '<span style="font-size:0.75rem;color:var(--text-muted);">Markets:</span>';
            locations.forEach(loc => {
                const short = loc.split(',')[0];
                html += '<span class="market-tag">'+escHtml(short)+'</span>';
            });
            html += '</div>';
        }
        
        // ── Hero Stats ──
        html += '<div class="kw-hero-stats">';
        html += '<div class="kw-hero-stat"><div class="khs-val" style="color:var(--accent-pink);">'+rankingCount+'/'+checkedCount+'</div><div class="khs-lbl">Keywords Ranking</div><div class="khs-sub">In top 20 · '+locationLabel+'</div></div>';
        html += '<div class="kw-hero-stat"><div class="khs-val" style="color:var(--success);">'+(agg.pos1+agg.pos2_3+agg.pos4_10)+'</div><div class="khs-lbl">Page 1 Rankings</div><div class="khs-sub">'+(agg.pos1+agg.pos2_3)+' in top 3 · '+agg.pos4_10+' in 4-10</div></div>';
        if (hasMapsData) {
            html += '<div class="kw-hero-stat"><div class="khs-val" style="color:#818cf8;">'+mapsRanking.length+'/'+mapsCheckedItems.length+'</div><div class="khs-lbl">Local Pack Visibility</div><div class="khs-sub">In Google Maps results</div></div>';
        }
        html += '<div class="kw-hero-stat"><div class="khs-val" style="color:'+(totalIssueCount>0?'var(--danger)':'var(--success)')+';">'+totalIssueCount+'</div><div class="khs-lbl">Cannibalization Issues</div><div class="khs-sub">'+(canniCount>0?canniCount+' competing pages':'')+(canniCount>0&&(wrongPageCount>0||crossSurfaceCount>0||crossMarketCount>0)?' · ':'')+(wrongPageCount>0?wrongPageCount+' wrong page':'')+(wrongPageCount>0&&(crossSurfaceCount>0||crossMarketCount>0)?' · ':'')+(crossMarketCount>0?crossMarketCount+' cross-market':'')+(crossMarketCount>0&&crossSurfaceCount>0?' · ':'')+(crossSurfaceCount>0?crossSurfaceCount+' cross-surface':'')+(totalIssueCount===0?'No issues detected':'')+'</div></div>';
        html += '<div class="kw-hero-stat"><div class="khs-val" style="color:var(--warning);">'+(page2.length+notRankingWithVol.length)+'</div><div class="khs-lbl">Opportunities</div><div class="khs-sub">'+page2.length+' page 2 · '+notRankingWithVol.length+' not ranking</div></div>';
        if(aiKws > 0) html += '<div class="kw-hero-stat"><div class="khs-val" style="color:#a78bfa;">'+aiKws+'</div><div class="khs-lbl">AI Overview Keywords</div><div class="khs-sub">'+Math.round(aiKws/items.length*100)+'% trigger AI</div></div>';
        html += '</div>';
        
        // ── Per-market breakdown (if multi-market) ──
        if (isMultiMarket) {
            html += '<div class="section-hdr">Market Breakdown</div>';
            html += '<div class="stat-grid">';
            locations.forEach(loc => {
                const mData = aggregateByMarket[loc] || {};
                const kw = state.data.keywords;
                const mMaps = kw?.markets?.[loc]?.metrics?.maps;
                const short = loc.split(',')[0];
                const mP1 = (mData.pos_1||0) + (mData.pos_2_3||0) + (mData.pos_4_10||0);
                const mTotal = (mData.count || 0);
                let mapsLine = '';
                if (mMaps) mapsLine = ' · Maps: ' + mMaps.ranking + '/' + mMaps.checked;
                html += '<div class="stat-box"><div class="stat-box-val" style="font-size:1rem;">'+escHtml(short)+'</div><div class="stat-box-lbl" style="font-size:0.75rem;margin-top:0.3rem;">'+mTotal+' ranking · '+mP1+' page 1</div><div class="stat-box-sub">'+(mData.pos_11_20||0)+' page 2 opportunities'+mapsLine+'</div></div>';
            });
            html += '</div>';
        }
        
        // ── Sub-tabs ──
        const oppCount = page2.length + notRankingWithVol.length;
        html += '<div class="kw-subtabs">';
        html += '<div class="kw-subtab active" onclick="switchKwSub(\'pagerankings\',this)">Page Rankings ('+Object.keys(pageMap).length+')</div>';
        html += '<div class="kw-subtab" onclick="switchKwSub(\'cannibalization\',this)">Cannibalization'+(totalIssueCount?'<span class="kw-sub-badge" style="background:var(--danger-bg);color:var(--danger);">'+totalIssueCount+'</span>':'')+'</div>';
        if (hasMapsData) html += '<div class="kw-subtab" onclick="switchKwSub(\'localpack\',this)">Local Pack ('+mapsRanking.length+'/'+mapsCheckedItems.length+')</div>';
        html += '<div class="kw-subtab" onclick="switchKwSub(\'opportunities\',this)">Opportunities ('+(oppCount)+')</div>';
        html += '<div class="kw-subtab" onclick="switchKwSub(\'allkeywords\',this)">All Keywords</div>';
        html += '</div>';
        
        // ══════════════════════════════════════════════════════
        // SUB: PAGE RANKINGS — primary view
        // ══════════════════════════════════════════════════════
        html += '<div class="kw-subcontent active" id="kwsub-pagerankings">';
        html += '<div class="section-sub">How each page on your site performs in local search results. Shows which keywords each page ranks for, its positions, and estimated traffic value.</div>';
        
        // Build page data with rankings
        const pagesData = state.data.pages?.items || [];
        const pageRankings = Object.entries(pageMap).map(([url, kws]) => {
            const onPage = pagesData.find(p => p.url === url);
            const rankingKws = kws.filter(k => k.position < 999);
            const page1Kws = rankingKws.filter(k => k.position <= 10);
            const totalEtv = kws.reduce((a,k)=>a+k.etv,0);
            const totalValue = kws.reduce((a,k)=>a+(k.paidCost||k.etv*k.cpc),0);
            const topPos = rankingKws.length ? Math.min(...rankingKws.map(k=>k.position)) : 999;
            const canniKws = kws.filter(k => k.isCannibalized);
            const pageType = classifyUrlType(url);
            return { url, kws, rankingKws, page1Kws, totalEtv, totalValue, topPos, title: onPage?.meta?.title || '', words: onPage?.meta?.content?.plain_text_word_count || 0, canniKws, pageType };
        }).sort((a,b) => b.rankingKws.length - a.rankingKws.length);
        
        pageRankings.forEach((pg, idx) => {
            const posColor = pg.topPos <= 3 ? 'var(--success)' : pg.topPos <= 10 ? '#22d3ee' : pg.topPos <= 20 ? 'var(--warning)' : 'var(--text-muted)';
            const hasCannibal = pg.canniKws.length > 0;
            html += '<div class="ix-card" data-idx="'+idx+'">';
            html += '<div class="ix-head" onclick="toggleIssueCard(this)">';
            // Position badge
            html += '<div style="font-family:Space Mono,monospace;font-size:1rem;font-weight:700;color:'+posColor+';min-width:36px;text-align:center;">'+(pg.topPos<999?'#'+pg.topPos:'—')+'</div>';
            html += '<div class="ix-info">';
            const pgPT = PAGE_TYPE_LABELS[pg.pageType] || PAGE_TYPE_LABELS['other'];
            html += '<div class="ix-title" style="font-size:0.82rem;display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap;">'+shortUrl(pg.url)+' <span style="font-size:0.58rem;background:'+pgPT.color+'15;color:'+pgPT.color+';padding:0.08rem 0.3rem;border-radius:3px;border:1px solid '+pgPT.color+'30;font-weight:600;">'+pgPT.icon+' '+pgPT.label+'</span></div>';
            html += '<div class="ix-subtitle">';
            html += '<span style="font-family:Space Mono,monospace;font-size:0.72rem;color:var(--accent-pink);">'+pg.rankingKws.length+' keywords</span>';
            html += '<span style="font-family:Space Mono,monospace;font-size:0.72rem;color:var(--success);">Best: #'+pg.topPos+'</span>';
            if(pg.page1Kws.length) html += '<span class="ix-tag effort-easy">'+pg.page1Kws.length+' on page 1</span>';
            if(hasCannibal) html += '<span class="ix-tag effort-hard">⚠️ '+pg.canniKws.length+' cannibalized</span>';
            html += '</div></div>';
            html += '<div class="ix-chevron">▶</div>';
            html += '</div>';
            
            // Expanded detail: keywords this page ranks for
            html += '<div class="ix-detail">';
            if(pg.title) html += '<div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.5rem;margin-bottom:0.5rem;">'+escHtml(pg.title)+'</div>';
            if(pg.rankingKws.length) {
                html += '<div class="ix-detail-section"><div class="ix-detail-label">Ranking Keywords ('+pg.rankingKws.length+')</div>';
                html += '<div class="ix-affected-list" style="max-height:300px;">';
                pg.rankingKws.sort((a,b) => a.position - b.position).forEach(k => {
                    const kColor = k.position <= 3 ? 'var(--success)' : k.position <= 10 ? '#22d3ee' : 'var(--warning)';
                    html += '<div class="ix-affected-url" style="justify-content:space-between;">';
                    html += '<span style="flex:1;">'+escHtml(k.keyword)+(k.isCannibalized?' <span style="color:var(--danger);font-size:0.6rem;">⚠️ COMPETING</span>':'')+'</span>';
                    html += '<span style="color:'+kColor+';font-weight:700;min-width:35px;text-align:right;">#'+k.position+'</span>';
                    html += '</div>';
                });
                html += '</div></div>';
            }
            // Show not-ranking keywords for this page
            const notRankingForPage = pg.kws.filter(k => k.position >= 999 && k.volume > 0);
            if(notRankingForPage.length) {
                html += '<div class="ix-detail-section"><div class="ix-detail-label">Not Ranking ('+notRankingForPage.length+' keywords with volume)</div>';
                html += '<div class="ix-affected-list" style="max-height:150px;">';
                notRankingForPage.sort((a,b) => b.volume - a.volume).slice(0,10).forEach(k => {
                    html += '<div class="ix-affected-url"><span style="flex:1;">'+escHtml(k.keyword)+'</span><span style="color:var(--text-muted);">'+k.volume.toLocaleString()+'/mo</span></div>';
                });
                html += '</div></div>';
            }
            html += '</div></div>';
        });
        
        if(!pageRankings.length) {
            html += '<div style="text-align:center;padding:2rem;color:var(--text-muted);">No page ranking data available</div>';
        }
        html += '</div>';
        
        // ══════════════════════════════════════════════════════
        // SUB: CANNIBALIZATION — Enriched with page types, intent, conflict diagnosis
        // ══════════════════════════════════════════════════════
        html += '<div class="kw-subcontent" id="kwsub-cannibalization">';
        
        if(serpConflicts.length) {
            // SERP-verified section
            html += '<div class="section-hdr" style="color:var(--danger);">🚨 SERP-Verified Cannibalization</div>';
            html += '<div class="section-sub">These keywords have <strong>multiple pages from your site appearing in the same Google results</strong>. Each card shows <em>what type</em> of conflict it is and exactly how to fix it for your business.</div>';
            
            const criticalCount = serpConflicts.filter(c=>c.severity==='critical').length;
            const highCount = serpConflicts.filter(c=>c.severity==='high').length;
            const wrongPageCount2 = serpConflicts.filter(c=>c.wrongPageWinning).length;
            const marketsAffected = [...new Set(serpConflicts.map(c=>c.market))];
            const totalVolume = serpConflicts.reduce((s,c) => s + c.volume, 0);
            
            // Conflict type summary
            const conflictTypeCounts = {};
            serpConflicts.forEach(c => { conflictTypeCounts[c.conflictType] = (conflictTypeCounts[c.conflictType]||0) + 1; });
            
            html += '<div class="stat-grid">';
            html += statBox(serpConflicts.length, 'Cannibalized Keywords', 'Multiple pages competing', true);
            html += statBox(criticalCount, 'Critical', wrongPageCount2 > 0 ? wrongPageCount2 + ' wrong page winning' : 'Needs immediate action', criticalCount > 0);
            html += statBox(Object.keys(conflictTypeCounts).length, 'Conflict Types', Object.entries(conflictTypeCounts).map(([k,v])=>v+'× '+k.split(' ')[0]).join(', '));
            html += statBox(totalVolume.toLocaleString(), 'Nat\'l Search Vol', 'Combined volume of affected keywords');
            html += '</div>';
            
            // Filters: market + conflict type
            const conflictTypes = [...new Set(serpConflicts.map(c=>c.conflictType))];
            if (marketsAffected.length > 1 || conflictTypes.length > 1) {
                html += '<div class="issues-cat-filters" style="margin-bottom:0.5rem;">';
                html += '<button class="issues-cat-chip active" onclick="filterCanniMarket(\'all\',this)">All (' + serpConflicts.length + ')</button>';
                if (marketsAffected.length > 1) {
                    marketsAffected.forEach(m => {
                        const ct = serpConflicts.filter(c=>c.market===m).length;
                        html += '<button class="issues-cat-chip" onclick="filterCanniMarket(\''+m.replace(/'/g,"\\'")+'\',this)">📍 '+m.split(',')[0]+' ('+ct+')</button>';
                    });
                }
                html += '</div>';
                if (conflictTypes.length > 1) {
                    html += '<div class="issues-cat-filters" style="margin-bottom:1rem;">';
                    html += '<button class="issues-cat-chip active" onclick="filterCanniType(\'all\',this)">All Types</button>';
                    conflictTypes.forEach(ct => {
                        const count = serpConflicts.filter(c=>c.conflictType===ct).length;
                        html += '<button class="issues-cat-chip" onclick="filterCanniType(\''+escHtml(ct)+'\',this)">'+ct+' ('+count+')</button>';
                    });
                    html += '</div>';
                }
            }
            
            // Cannibalization cards with enriched data
            serpConflicts.forEach((conflict, idx) => {
                const sevColor = conflict.severity === 'critical' ? 'var(--danger)' : conflict.severity === 'high' ? 'var(--warning)' : 'var(--info)';
                const sevLabel = conflict.severity === 'critical' ? 'CRITICAL' : conflict.severity === 'high' ? 'HIGH' : 'MEDIUM';
                const intentInfo = INTENT_LABELS[conflict.intent] || INTENT_LABELS['commercial'];
                const primaryPT = PAGE_TYPE_LABELS[conflict.primaryType] || PAGE_TYPE_LABELS['other'];
                const compPT = PAGE_TYPE_LABELS[conflict.competitorType] || PAGE_TYPE_LABELS['other'];
                
                html += '<div class="ix-card" data-idx="cannibal-'+idx+'" data-cannimarket="'+escHtml(conflict.market)+'" data-cannitype="'+escHtml(conflict.conflictType)+'">';
                html += '<div class="ix-head" onclick="toggleIssueCard(this)">';
                html += '<div class="ix-sev-badge" style="background:'+sevColor+'15;color:'+sevColor+';border:1px solid '+sevColor+'40;">'+sevLabel+'</div>';
                html += '<div class="ix-info">';
                // Keyword + conflict type badge
                html += '<div class="ix-title">'+escHtml(conflict.keyword);
                if(conflict.wrongPageWinning) html += ' <span style="font-size:0.62rem;background:var(--danger-bg);color:var(--danger);padding:0.1rem 0.35rem;border-radius:3px;font-weight:600;vertical-align:middle;">⚠ WRONG PAGE</span>';
                html += '</div>';
                html += '<div class="ix-subtitle">';
                // Conflict type pill
                html += '<span style="font-size:0.62rem;background:rgba(232,123,164,0.1);border:1px solid rgba(232,123,164,0.3);padding:0.1rem 0.45rem;border-radius:3px;color:var(--accent-pink);font-weight:600;">'+conflict.conflictIcon+' '+conflict.conflictType+'</span>';
                // Intent pill
                html += '<span style="font-size:0.62rem;background:'+intentInfo.color+'15;border:1px solid '+intentInfo.color+'30;padding:0.1rem 0.4rem;border-radius:3px;color:'+intentInfo.color+';">'+intentInfo.icon+' '+intentInfo.label+'</span>';
                // Volume + market
                html += '<span style="font-family:Space Mono,monospace;font-size:0.68rem;">'+conflict.volume.toLocaleString()+'/mo</span>';
                html += '<span style="font-size:0.62rem;background:var(--bg-tertiary);border:1px solid var(--border-color);padding:0.1rem 0.4rem;border-radius:3px;color:var(--text-muted);">📍 '+conflict.market.split(',')[0]+'</span>';
                html += '</div></div>';
                // Position comparison
                html += '<div style="font-family:Space Mono,monospace;font-size:0.82rem;font-weight:700;color:'+sevColor+';text-align:center;min-width:65px;">#'+conflict.primary.position+' vs #'+conflict.competitors[0].position+'</div>';
                html += '<div class="ix-chevron">▶</div>';
                html += '</div>';
                
                html += '<div class="ix-detail">';
                
                // Conflict type description
                if(conflict.conflictDescription) {
                    html += '<div class="ix-detail-section"><div class="ix-detail-label">'+conflict.conflictIcon+' '+conflict.conflictType.toUpperCase()+'</div>';
                    html += '<div class="ix-why">'+conflict.conflictDescription+'</div></div>';
                }
                
                // Competing pages with page type badges
                html += '<div class="ix-detail-section"><div class="ix-detail-label">COMPETING PAGES IN SERP — '+conflict.market.split(',')[0]+'</div>';
                html += '<div style="display:flex;flex-direction:column;gap:0.35rem;">';
                // Primary page
                html += '<div style="display:flex;align-items:center;gap:0.5rem;padding:0.5rem;background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.2);border-radius:6px;flex-wrap:wrap;">';
                html += '<span style="font-family:Space Mono,monospace;font-weight:700;color:var(--success);min-width:30px;">#'+conflict.primary.position+'</span>';
                html += '<span style="font-size:0.6rem;background:var(--success-bg);color:var(--success);padding:0.1rem 0.35rem;border-radius:3px;font-weight:600;">WINNING</span>';
                html += '<span style="font-size:0.6rem;background:'+primaryPT.color+'15;color:'+primaryPT.color+';padding:0.1rem 0.35rem;border-radius:3px;border:1px solid '+primaryPT.color+'30;font-weight:600;">'+primaryPT.icon+' '+primaryPT.label+'</span>';
                html += '<a href="'+conflict.primary.url+'" target="_blank" style="color:var(--accent-pink);text-decoration:none;font-family:Space Mono,monospace;font-size:0.7rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:100px;">'+shortUrl(conflict.primary.url)+'</a>';
                html += '</div>';
                // Competitor pages
                conflict.competitors.forEach(comp => {
                    const cPT = PAGE_TYPE_LABELS[comp.pageType] || PAGE_TYPE_LABELS['other'];
                    html += '<div style="display:flex;align-items:center;gap:0.5rem;padding:0.5rem;background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:6px;flex-wrap:wrap;">';
                    html += '<span style="font-family:Space Mono,monospace;font-weight:700;color:var(--danger);min-width:30px;">#'+comp.position+'</span>';
                    html += '<span style="font-size:0.6rem;background:var(--danger-bg);color:var(--danger);padding:0.1rem 0.35rem;border-radius:3px;font-weight:600;">COMPETING</span>';
                    html += '<span style="font-size:0.6rem;background:'+cPT.color+'15;color:'+cPT.color+';padding:0.1rem 0.35rem;border-radius:3px;border:1px solid '+cPT.color+'30;font-weight:600;">'+cPT.icon+' '+cPT.label+'</span>';
                    html += '<a href="'+comp.url+'" target="_blank" style="color:var(--accent-pink);text-decoration:none;font-family:Space Mono,monospace;font-size:0.7rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:100px;">'+shortUrl(comp.url)+'</a>';
                    html += '</div>';
                });
                html += '</div></div>';
                
                // Conflict-specific fix recommendation
                html += '<div class="ix-detail-section"><div class="ix-detail-label">HOW TO FIX</div>';
                if (conflict.conflictFix) {
                    html += '<div class="ix-fix">'+conflict.conflictFix+'</div>';
                } else {
                    html += '<div class="ix-fix"><strong>Option 1:</strong> 301 redirect the weaker page ('+shortUrl(conflict.competitors[0].url)+') to the stronger page ('+shortUrl(conflict.primary.url)+'). This consolidates all ranking signals into one page.<br><br>';
                    html += '<strong>Option 2:</strong> If both pages serve different purposes, differentiate them by changing the title, H1, and content focus of the competing page to target different keywords.<br><br>';
                    html += '<strong>Option 3:</strong> Merge the best content from both pages into the winning page, then redirect the other.</div>';
                }
                html += '</div></div></div>';
            });
        }
        
        // ── Wrong Page Ranking section ──
        if(wrongPageRankings.length) {
            html += '<div class="section-hdr" style="margin-top:2rem;color:var(--warning);">🎯 Wrong Page Ranking</div>';
            html += '<div class="section-sub">These keywords are ranking with the <strong>wrong page type</strong> for the search intent. A blog post ranking for "auto body shop near me" sends ready-to-buy customers to an article instead of a service page. Not traditional cannibalization, but equally damaging for conversions.</div>';
            
            html += '<div class="stat-grid">';
            html += statBox(wrongPageRankings.length, 'Mismatched Pages', 'Wrong page type for intent', true);
            const wpHighCount = wrongPageRankings.filter(w=>w.severity==='high').length;
            html += statBox(wpHighCount, 'High Priority', 'Page 1 rankings with wrong page', wpHighCount > 0);
            const wpVolume = wrongPageRankings.reduce((s,w)=>s+w.volume,0);
            html += statBox(wpVolume.toLocaleString(), 'Affected Volume', 'Monthly searches');
            html += '</div>';
            
            wrongPageRankings.forEach((wp, idx) => {
                const sevColor = wp.severity === 'high' ? 'var(--warning)' : 'var(--info)';
                const sevLabel = wp.severity === 'high' ? 'HIGH' : 'MEDIUM';
                const pagePT = PAGE_TYPE_LABELS[wp.pageType] || PAGE_TYPE_LABELS['other'];
                const idealPT = PAGE_TYPE_LABELS[wp.idealPageType] || PAGE_TYPE_LABELS['service'];
                const intentInfo = INTENT_LABELS[wp.intent] || INTENT_LABELS['commercial'];
                
                html += '<div class="ix-card" data-idx="wrongpage-'+idx+'">';
                html += '<div class="ix-head" onclick="toggleIssueCard(this)">';
                html += '<div class="ix-sev-badge" style="background:'+sevColor+'15;color:'+sevColor+';border:1px solid '+sevColor+'40;">'+sevLabel+'</div>';
                html += '<div class="ix-info">';
                html += '<div class="ix-title">'+escHtml(wp.keyword)+'</div>';
                html += '<div class="ix-subtitle">';
                // Page type mismatch visualization
                html += '<span style="font-size:0.62rem;background:'+pagePT.color+'15;color:'+pagePT.color+';padding:0.1rem 0.4rem;border-radius:3px;border:1px solid '+pagePT.color+'30;font-weight:600;">'+pagePT.icon+' '+pagePT.label+'</span>';
                html += '<span style="font-size:0.62rem;color:var(--danger);">→ should be →</span>';
                html += '<span style="font-size:0.62rem;background:'+idealPT.color+'15;color:'+idealPT.color+';padding:0.1rem 0.4rem;border-radius:3px;border:1px solid '+idealPT.color+'30;font-weight:600;">'+idealPT.icon+' '+idealPT.label+'</span>';
                html += '<span style="font-size:0.62rem;background:'+intentInfo.color+'15;border:1px solid '+intentInfo.color+'30;padding:0.1rem 0.4rem;border-radius:3px;color:'+intentInfo.color+';">'+intentInfo.icon+' '+intentInfo.label+'</span>';
                html += '<span style="font-family:Space Mono,monospace;font-size:0.68rem;">'+wp.volume.toLocaleString()+'/mo</span>';
                html += '</div></div>';
                html += '<div style="font-family:Space Mono,monospace;font-size:0.82rem;font-weight:700;color:'+sevColor+';min-width:40px;text-align:center;">#'+wp.position+'</div>';
                html += '<div class="ix-chevron">▶</div>';
                html += '</div>';
                
                html += '<div class="ix-detail">';
                html += '<div class="ix-detail-section"><div class="ix-detail-label">WHY THIS MATTERS</div>';
                html += '<div class="ix-why">'+wp.reason+'</div></div>';
                
                html += '<div class="ix-detail-section"><div class="ix-detail-label">CURRENTLY RANKING</div>';
                html += '<div style="display:flex;align-items:center;gap:0.5rem;padding:0.5rem;background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.2);border-radius:6px;">';
                html += '<span style="font-family:Space Mono,monospace;font-weight:700;color:var(--warning);min-width:30px;">#'+wp.position+'</span>';
                html += '<span style="font-size:0.6rem;background:'+pagePT.color+'15;color:'+pagePT.color+';padding:0.1rem 0.35rem;border-radius:3px;border:1px solid '+pagePT.color+'30;font-weight:600;">'+pagePT.icon+' '+pagePT.label+'</span>';
                html += '<a href="'+wp.url+'" target="_blank" style="color:var(--accent-pink);text-decoration:none;font-family:Space Mono,monospace;font-size:0.7rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+shortUrl(wp.url)+'</a>';
                html += '</div></div>';
                
                html += '<div class="ix-detail-section"><div class="ix-detail-label">HOW TO FIX</div>';
                html += '<div class="ix-fix">';
                if (wp.pageType === 'blog' && wp.idealPageType === 'service') {
                    html += '<strong>Create or strengthen a dedicated service page</strong> targeting "'+escHtml(wp.keyword)+'" with commercial-intent content (pricing, process, CTA, testimonials). Then re-angle the blog post toward an informational keyword (e.g., "how to choose a...", "signs you need..."). Add a prominent CTA in the blog post linking to the service page.';
                } else if (wp.pageType === 'homepage' && wp.idealPageType === 'location') {
                    html += '<strong>Create a dedicated location/service page</strong> for this keyword with city-specific content — local project photos, area testimonials, driving directions, and local landmarks. The homepage should link to this page but not try to rank for the city-specific term itself.';
                } else {
                    html += '<strong>Create the right page type for this keyword</strong> — a dedicated '+idealPT.label.toLowerCase()+' targeting "'+escHtml(wp.keyword)+'" with intent-matched content. Ensure the current page ('+pagePT.label.toLowerCase()+') doesn\'t compete by differentiating its keyword focus.';
                }
                html += '</div></div></div></div>';
            });
        }
        
        // N-gram overlap section (supplementary)
        if(ngramOverlaps.length) {
            html += '<div class="section-hdr" style="margin-top:2rem;">📊 Keyword Overlap Analysis</div>';
            html += '<div class="section-sub">Pages targeting similar keyword themes based on content analysis. These pages <em>may</em> be competing for similar searches even if not yet appearing in the same SERP results.</div>';
            
            ngramOverlaps.forEach((cl,idx) => {
                // Add page type classification to n-gram overlaps
                const pageTypes = cl.pages.map(p => {
                    const pt = classifyUrlType(p.url);
                    return PAGE_TYPE_LABELS[pt] || PAGE_TYPE_LABELS['other'];
                });
                
                html += '<div class="cannibal-cluster" data-idx="'+idx+'">';
                html += '<div class="cannibal-head" onclick="this.closest(\'.cannibal-cluster\').classList.toggle(\'expanded\')">';
                html += '<div class="cannibal-risk risk-'+cl.risk+'">'+cl.risk.toUpperCase()+'</div>';
                html += '<div class="cannibal-kw">'+cl.sharedTopics.map(t=>'<span style="background:var(--bg-tertiary);padding:0.1rem 0.4rem;border-radius:3px;font-size:0.75rem;margin-right:0.25rem;">'+escHtml(t)+'</span>').join('')+'</div>';
                html += '<div style="font-size:0.72rem;color:var(--text-muted);">'+cl.overlapPct+'% overlap · '+Math.round(cl.totalTraffic)+' visits</div>';
                html += '<div class="cannibal-chevron">'+ic('chevron')+'</div>';
                html += '</div>';
                html += '<div class="cannibal-detail">';
                html += '<div style="font-size:0.72rem;color:var(--text-muted);margin:0.5rem 0 0.35rem;font-weight:600;">OVERLAPPING PAGES:</div>';
                cl.pages.forEach((p, pi) => {
                    const posColor = p.topPos <= 10 ? 'var(--success)' : p.topPos <= 20 ? 'var(--warning)' : 'var(--danger)';
                    const pt = pageTypes[pi];
                    html += '<div class="cannibal-page">';
                    html += '<div class="cp-pos" style="color:'+posColor+'">#'+p.topPos+'</div>';
                    html += '<span style="font-size:0.58rem;background:'+pt.color+'15;color:'+pt.color+';padding:0.1rem 0.3rem;border-radius:3px;border:1px solid '+pt.color+'30;font-weight:600;flex-shrink:0;">'+pt.icon+' '+pt.label+'</span>';
                    html += '<div class="cp-url"><a href="'+p.url+'" target="_blank">'+shortUrl(p.url)+'</a></div>';
                    html += '<div class="cp-vol">'+p.kws+' kws</div>';
                    html += '<div class="cp-traffic">Best: #'+p.topPos+'</div>';
                    html += '</div>';
                });
                html += '<div style="margin-top:0.75rem;padding:0.65rem;background:rgba(34,197,94,0.05);border:1px solid rgba(34,197,94,0.15);border-radius:6px;font-size:0.78rem;color:var(--text-secondary);"><strong style="color:var(--success);">Fix:</strong> Differentiate these pages by updating titles, H1s, and content to target distinct keyword clusters. Or consolidate into a single stronger page.</div>';
                html += '</div></div>';
            });
        }
        
        // ── Cross-Market Conflicts (Multi-Market Only) ──
        if (crossMarketConflicts.length > 0) {
            const splitRankings = crossMarketConflicts.filter(c => c.type === 'split-ranking' || c.type === 'location-leak');
            const rankingVariance = crossMarketConflicts.filter(c => c.type === 'ranking-variance');
            const missingCoverage = crossMarketConflicts.filter(c => c.type === 'missing-coverage');
            const locationLeaks = crossMarketConflicts.filter(c => c.type === 'location-leak');
            const criticalCM = crossMarketConflicts.filter(c => c.severity === 'critical').length;
            const highCM = crossMarketConflicts.filter(c => c.severity === 'high').length;
            const cmVolume = crossMarketConflicts.reduce((s, c) => s + c.volume, 0);
            
            html += '<div class="section-hdr" style="margin-top:2rem;color:#818cf8;">🌎 Cross-Market Inconsistencies (' + crossMarketConflicts.length + ')</div>';
            html += '<div class="section-sub">When you serve multiple markets, the same keyword can behave differently across geographic regions. These conflicts show where Google is choosing <strong>different pages</strong> or <strong>different rankings</strong> for the same keyword depending on the searcher\'s location — a critical multi-market cannibalization signal.</div>';
            
            // Summary stats
            html += '<div class="stat-grid">';
            html += statBox(crossMarketConflicts.length, 'Cross-Market Issues', 'Across ' + locations.length + ' markets', true);
            if (locationLeaks.length) html += statBox(locationLeaks.length, 'Location Leaks', 'Wrong city page ranking', true);
            if (splitRankings.length) html += statBox(splitRankings.length - locationLeaks.length, 'Split Rankings', 'Different page per market', splitRankings.length > locationLeaks.length);
            if (rankingVariance.length) html += statBox(rankingVariance.length, 'Position Gaps', 'Same page, different rank');
            if (missingCoverage.length) html += statBox(missingCoverage.length, 'Missing Markets', 'No ranking in some areas', true);
            html += statBox(cmVolume.toLocaleString(), 'Affected Volume', 'Combined monthly searches');
            html += '</div>';
            
            // Type filter chips
            html += '<div class="issues-cat-filters" style="margin-bottom:1rem;">';
            html += '<button class="issues-cat-chip active" onclick="filterCrossMarket(\'all\',this)">All (' + crossMarketConflicts.length + ')</button>';
            if (locationLeaks.length) html += '<button class="issues-cat-chip" onclick="filterCrossMarket(\'location-leak\',this)">🚨 Location Leaks (' + locationLeaks.length + ')</button>';
            if (splitRankings.length > locationLeaks.length) html += '<button class="issues-cat-chip" onclick="filterCrossMarket(\'split-ranking\',this)">🔀 Split Rankings (' + (splitRankings.length - locationLeaks.length) + ')</button>';
            if (rankingVariance.length) html += '<button class="issues-cat-chip" onclick="filterCrossMarket(\'ranking-variance\',this)">📊 Position Gaps (' + rankingVariance.length + ')</button>';
            if (missingCoverage.length) html += '<button class="issues-cat-chip" onclick="filterCrossMarket(\'missing-coverage\',this)">🕳️ Missing Coverage (' + missingCoverage.length + ')</button>';
            html += '</div>';
            
            // Render each cross-market conflict
            crossMarketConflicts.forEach((cm, ci) => {
                const sevColor = cm.severity === 'critical' ? 'var(--danger)' : cm.severity === 'high' ? 'var(--warning)' : 'var(--info)';
                const sevLabel = { critical: 'CRITICAL', high: 'HIGH', medium: 'MED' }[cm.severity] || 'MED';
                const typeIcon = { 'location-leak': '🚨', 'split-ranking': '🔀', 'ranking-variance': '📊', 'missing-coverage': '🕳️' }[cm.type] || '🌎';
                const typeLabel = { 'location-leak': 'Location Leak', 'split-ranking': 'Split Ranking', 'ranking-variance': 'Position Gap', 'missing-coverage': 'Missing Coverage' }[cm.type] || cm.type;
                const intentInfo = INTENT_LABELS[cm.intent] || INTENT_LABELS['commercial'];
                
                html += '<div class="ix-card" data-idx="cm-' + ci + '" data-cmtype="' + cm.type + '">';
                html += '<div class="ix-head" onclick="toggleIssueCard(this)">';
                html += '<div class="ix-sev-badge" style="background:' + sevColor + '15;color:' + sevColor + ';border:1px solid ' + sevColor + '40;">' + sevLabel + '</div>';
                html += '<div class="ix-info">';
                html += '<div class="ix-title">' + escHtml(cm.keyword);
                if (cm.type === 'location-leak') html += ' <span style="font-size:0.62rem;background:var(--danger-bg);color:var(--danger);padding:0.1rem 0.35rem;border-radius:3px;font-weight:600;vertical-align:middle;">GEO LEAK</span>';
                html += '</div>';
                html += '<div class="ix-subtitle">';
                html += '<span style="font-size:0.62rem;background:#818cf815;border:1px solid #818cf830;padding:0.1rem 0.45rem;border-radius:3px;color:#818cf8;font-weight:600;">' + typeIcon + ' ' + typeLabel + '</span>';
                html += '<span style="font-size:0.62rem;background:' + intentInfo.color + '15;border:1px solid ' + intentInfo.color + '30;padding:0.1rem 0.4rem;border-radius:3px;color:' + intentInfo.color + ';">' + intentInfo.icon + ' ' + intentInfo.label + '</span>';
                html += '<span style="font-family:Space Mono,monospace;font-size:0.68rem;">' + cm.volume.toLocaleString() + '/mo</span>';
                html += '<span style="font-family:Space Mono,monospace;font-size:0.68rem;color:var(--text-muted);">' + cm.marketCount + ' markets</span>';
                html += '</div></div>';
                
                // Market position badges inline
                html += '<div style="display:flex;gap:3px;flex-shrink:0;align-items:center;">';
                (cm.marketComparison || []).forEach(mc => {
                    const posColor = !mc.ranked && mc.position >= 999 ? 'var(--text-muted)' : mc.position <= 3 ? 'var(--success)' : mc.position <= 10 ? '#22d3ee' : mc.position <= 20 ? 'var(--warning)' : 'var(--danger)';
                    const posText = mc.position >= 999 ? '—' : '#' + mc.position;
                    html += '<div style="text-align:center;min-width:36px;"><div style="font-family:Space Mono,monospace;font-size:0.72rem;font-weight:700;color:' + posColor + ';">' + posText + '</div><div style="font-size:0.55rem;color:var(--text-muted);white-space:nowrap;">' + escHtml(mc.marketShort) + '</div></div>';
                });
                html += '</div>';
                html += '<div class="ix-chevron">▶</div>';
                html += '</div>';
                
                // Detail section
                html += '<div class="ix-detail">';
                html += '<div class="ix-detail-section"><div class="ix-detail-label">Why This Matters</div><div class="ix-why">' + cm.description + '</div></div>';
                
                // Market comparison visualization
                html += '<div class="ix-detail-section"><div class="ix-detail-label">Market-by-Market Breakdown</div>';
                html += '<div style="display:grid;gap:0.35rem;">';
                (cm.marketComparison || []).forEach(mc => {
                    const pos = mc.position >= 999 ? 'Not Ranking' : '#' + mc.position;
                    const posColor = mc.position >= 999 ? 'var(--text-muted)' : mc.position <= 3 ? 'var(--success)' : mc.position <= 10 ? '#22d3ee' : mc.position <= 20 ? 'var(--warning)' : 'var(--danger)';
                    const pt = mc.pageType ? (PAGE_TYPE_LABELS[mc.pageType] || PAGE_TYPE_LABELS['other']) : null;
                    
                    html += '<div style="display:flex;align-items:center;gap:0.5rem;padding:0.45rem 0.6rem;background:var(--bg-tertiary);border:1px solid var(--border-color);border-radius:6px;">';
                    html += '<span style="font-size:0.72rem;font-weight:600;min-width:70px;color:var(--text-secondary);">📍 ' + escHtml(mc.marketShort) + '</span>';
                    html += '<span style="font-family:Space Mono,monospace;font-weight:700;font-size:0.82rem;color:' + posColor + ';min-width:65px;">' + pos + '</span>';
                    if (pt && mc.url) html += '<span style="font-size:0.58rem;background:' + pt.color + '15;color:' + pt.color + ';padding:0.1rem 0.3rem;border-radius:3px;border:1px solid ' + pt.color + '30;font-weight:600;flex-shrink:0;">' + pt.icon + ' ' + pt.label + '</span>';
                    if (mc.url) html += '<a href="' + mc.url + '" target="_blank" style="color:var(--accent-pink);text-decoration:none;font-family:Space Mono,monospace;font-size:0.68rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;">' + shortUrl(mc.url) + '</a>';
                    html += '</div>';
                });
                html += '</div></div>';
                
                html += '<div class="ix-detail-section"><div class="ix-detail-label">How to Fix</div><div class="ix-fix">' + cm.fix + '</div></div>';
                html += '</div></div>';
            });
        }
        
        // ── Cross-Surface Conflicts (Organic vs Maps) ──
        if (crossSurfaceConflicts.length > 0) {
            const missingMaps = crossSurfaceConflicts.filter(c => c.type === 'missing-maps');
            const missingOrganic = crossSurfaceConflicts.filter(c => c.type === 'missing-organic');
            const surfaceGap = crossSurfaceConflicts.filter(c => c.type === 'surface-gap');
            
            html += '<div class="section-hdr" style="margin-top:1.5rem;">🗺️ Cross-Surface Conflicts — Organic vs Local Pack ('+crossSurfaceConflicts.length+')</div>';
            html += '<div class="section-sub">Misalignments between your organic (blue link) rankings and Google Maps/Local Pack visibility. For local businesses, presence on <em>both</em> surfaces is critical — the Local Pack captures ~42% of clicks for local searches.</div>';
            
            // Summary pills
            html += '<div style="display:flex;gap:0.5rem;margin-bottom:1rem;flex-wrap:wrap;">';
            if (missingMaps.length) html += '<div style="background:var(--danger-bg);border:1px solid rgba(239,68,68,0.3);border-radius:8px;padding:0.5rem 0.85rem;font-size:0.8rem;"><span style="font-family:Space Mono,monospace;font-weight:700;color:var(--danger);">'+missingMaps.length+'</span> <span style="color:var(--text-secondary);">Not in Local Pack</span></div>';
            if (missingOrganic.length) html += '<div style="background:var(--warning-bg);border:1px solid rgba(245,158,11,0.3);border-radius:8px;padding:0.5rem 0.85rem;font-size:0.8rem;"><span style="font-family:Space Mono,monospace;font-weight:700;color:var(--warning);">'+missingOrganic.length+'</span> <span style="color:var(--text-secondary);">Maps Only — No Organic</span></div>';
            if (surfaceGap.length) html += '<div style="background:var(--info-bg);border:1px solid rgba(59,130,246,0.3);border-radius:8px;padding:0.5rem 0.85rem;font-size:0.8rem;"><span style="font-family:Space Mono,monospace;font-weight:700;color:var(--info);">'+surfaceGap.length+'</span> <span style="color:var(--text-secondary);">Ranking Gap</span></div>';
            html += '</div>';
            
            crossSurfaceConflicts.forEach((c, ci) => {
                const sevColor = c.severity === 'critical' ? 'var(--danger)' : c.severity === 'high' ? 'var(--warning)' : 'var(--info)';
                const typeIcon = c.type === 'missing-maps' ? '🚫📍' : c.type === 'missing-organic' ? '📍🚫' : '⚖️';
                const organicLabel = c.organicPosition ? '#'+c.organicPosition : 'Not ranking';
                const mapsLabel = c.mapsRank !== 'NF' && c.mapsRank ? '#'+c.mapsRank : 'Not found';
                
                html += '<div class="ix-card" data-idx="cs-'+ci+'">';
                html += '<div class="ix-head" onclick="toggleIssueCard(this)">';
                html += '<div class="ix-sev-badge '+(c.severity==='critical'?'critical':c.severity==='high'?'warning':'notice')+'" style="font-size:0.6rem;">'+({critical:'CRITICAL',high:'HIGH',medium:'MED'}[c.severity]||'MED')+'</div>';
                html += '<div class="ix-info">';
                html += '<div class="ix-title" style="font-size:0.85rem;">'+typeIcon+' '+escHtml(c.keyword)+'</div>';
                html += '<div class="ix-subtitle">';
                html += '<span style="font-family:Space Mono,monospace;font-size:0.7rem;">Organic: <strong style="color:'+(c.organicPosition?'var(--accent-pink)':'var(--text-muted)')+'">'+organicLabel+'</strong></span>';
                html += '<span style="font-family:Space Mono,monospace;font-size:0.7rem;">Maps: <strong style="color:'+(c.mapsRank!=='NF'&&c.mapsRank?'#818cf8':'var(--text-muted)')+'">'+mapsLabel+'</strong></span>';
                html += '<span class="ix-tag">'+escHtml(c.market.split(',')[0])+'</span>';
                html += '<span style="font-family:Space Mono,monospace;font-size:0.68rem;color:var(--text-muted);">'+c.volume.toLocaleString()+' vol · $'+(c.cpc||0).toFixed(2)+' CPC</span>';
                html += '</div></div>';
                html += '<div class="ix-chevron">▶</div>';
                html += '</div>';
                
                // Detail
                html += '<div class="ix-detail">';
                html += '<div class="ix-detail-section"><div class="ix-detail-label">Why This Matters</div><div class="ix-why">'+c.description+'</div></div>';
                html += '<div class="ix-detail-section"><div class="ix-detail-label">How to Fix</div><div class="ix-fix"><strong>'+c.title+':</strong> '+c.fix+'</div></div>';
                
                // Show Maps competitors if available
                if (c.competitors && c.competitors.length > 0) {
                    html += '<div class="ix-detail-section"><div class="ix-detail-label">Local Pack Competitors</div>';
                    html += '<div class="ix-affected-list">';
                    c.competitors.forEach((comp, ri) => {
                        html += '<div class="ix-affected-url">';
                        html += '<span class="af-status" style="color:var(--text-muted);font-weight:700;">#'+(ri+1)+'</span>';
                        html += '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+escHtml(comp.title || comp.domain)+'</span>';
                        if (comp.rating) html += '<span style="color:var(--warning);font-size:0.65rem;">★'+comp.rating+'</span>';
                        if (comp.reviews) html += '<span style="color:var(--text-muted);font-size:0.6rem;">('+comp.reviews+')</span>';
                        html += '</div>';
                    });
                    html += '</div></div>';
                }
                html += '</div></div>';
            });
        }
        
        if(!serpConflicts.length && !ngramOverlaps.length && !wrongPageRankings.length && !crossSurfaceConflicts.length && !crossMarketConflicts.length) {
            html += '<div style="text-align:center;padding:2.5rem;"><div style="color:var(--success);font-weight:600;font-size:1rem;">'+ic('check','ic-check ic-lg')+' No cannibalization detected</div><div style="color:var(--text-muted);font-size:0.82rem;margin-top:0.4rem;">Your pages have well-differentiated keyword targets. No pages are competing against each other in local search results.</div></div>';
        }
        html += '</div>';
        
        // ══════════════════════════════════════════════════════
        // SUB: OPPORTUNITIES
        // ══════════════════════════════════════════════════════
        html += '<div class="kw-subcontent" id="kwsub-opportunities">';
        html += '<div class="section-sub">Keywords where your site could gain more traffic — either by pushing page 2 rankings to page 1, or by creating content for keywords you don\'t rank for yet.</div>';
        
        if(notRankingWithVol.length) {
            html += '<div class="section-hdr" style="margin-top:0;">🎯 Not Ranking — Untapped Keywords</div>';
            html += '<div class="section-sub">Keywords with search volume where your site doesn\'t appear in the top 20. Creating or optimizing content could capture this traffic.</div>';
            const potentialTraffic = notRankingWithVol.reduce((sum,k) => sum + k.volume * 0.05, 0);
            html += '<div style="background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.2);border-radius:8px;padding:0.75rem 1rem;margin-bottom:1rem;font-size:0.82rem;"><strong style="color:var(--info);">Potential traffic:</strong> ~'+Math.round(potentialTraffic).toLocaleString()+' visits/mo if you rank in top 10 for these keywords</div>';
            html += renderTable(notRankingWithVol, [
                {key:'kw', label:'Keyword', render:k=>'<span style="font-weight:500;">'+escHtml(k.keyword)+'</span>'},
                {key:'pos', label:'Status', render:k=>'<span style="font-family:Space Mono,monospace;font-size:0.7rem;color:var(--text-muted);background:var(--bg-tertiary);padding:0.15rem 0.4rem;border-radius:4px;">NOT RANKING</span>'},
            ], 'norank-table', 20);
        }
        
        if(page2.length) {
            html += '<div class="section-hdr" style="margin-top:1.5rem;">📈 Page 2 — Low-Hanging Fruit</div>';
            html += '<div class="section-sub">Keywords ranking on page 2 (positions 11-20). A content refresh, better internal linking, or a few backlinks could push these to page 1.</div>';
            html += renderTable(page2.sort((a,b)=>a.position-b.position), [
                {key:'kw', label:'Keyword', render:k=>'<span style="font-weight:500;">'+escHtml(k.keyword)+'</span>'},
                {key:'pos', label:'Position', render:k=>'<span style="font-family:Space Mono,monospace;font-weight:700;color:var(--warning);">#'+k.position+'</span>'},
                {key:'url', label:'Page', render:k=>'<div class="url-cell"><a href="'+k.url+'" target="_blank">'+shortUrl(k.url)+'</a></div>'},
            ], 'opp-table', 30);
        }
        
        if(!notRankingWithVol.length && !page2.length) {
            html += '<div style="text-align:center;padding:2rem;color:var(--text-muted);">No keyword opportunities identified</div>';
        }
        html += '</div>';
        
        // ══════════════════════════════════════════════════════
        // SUB: ALL KEYWORDS
        // ══════════════════════════════════════════════════════
        html += '<div class="kw-subcontent" id="kwsub-allkeywords">';
        const allKwCols = [
            {key:'kw', label:'Keyword', render:k=>{
                let s = '<span style="font-weight:500;">'+escHtml(k.keyword)+'</span>';
                if(k.isCannibalized) s += ' <span style="color:var(--danger);font-size:0.6rem;font-weight:600;">⚠️ CANNIBAL</span>';
                return s;
            }},
            {key:'pos', label:'Pos', render:k=>{if(k.position>=999) return '<span style="font-family:Space Mono,monospace;font-size:0.7rem;color:var(--text-muted);">—</span>'; const c=k.position<=3?'var(--success)':k.position<=10?'#22d3ee':k.position<=20?'var(--warning)':'var(--danger)'; return '<span style="font-family:Space Mono,monospace;font-weight:700;color:'+c+';">#'+k.position+'</span>';}},
            {key:'ai', label:'AI', render:k=>k.hasAiOverview?'<span class="ai-badge ai-yes">AI</span>':''},
            {key:'url', label:'Page', render:k=>k.url?'<div class="url-cell"><a href="'+k.url+'" target="_blank">'+shortUrl(k.url)+'</a></div>':'<span style="color:var(--text-muted);font-size:0.72rem;">Not ranking</span>'},
        ];
        if (isMultiMarket) {
            allKwCols.splice(1, 0, {key:'market', label:'Market', render:k=>'<span class="market-tag">'+escHtml(k.market.split(',')[0])+'</span>'});
        }
        html += renderTable(items.sort((a,b)=>a.position-b.position), allKwCols, 'all-kw-table', 50);
        html += '</div>';
        
        $('tabContent').innerHTML = html;
    }
    
    function switchKwSub(id, btn) {
        document.querySelectorAll('.kw-subtab').forEach(t=>t.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.kw-subcontent').forEach(c=>c.classList.remove('active'));
        const el = document.getElementById('kwsub-'+id);
        if(el) el.classList.add('active');
    }

    // ═══════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════
    function statBox(val, label, sub, warn) {
        const cls = warn ? ' val-warn' : '';
        return '<div class="stat-box"><div class="stat-box-val'+cls+'">'+val+'</div><div class="stat-box-lbl">'+label+'</div>'+(sub?'<div class="stat-box-sub">'+sub+'</div>':'')+'</div>';
    }

    function renderTable(items, cols, id, perPage=25) {
        if(!items.length) return '<div style="padding:1rem;color:var(--text-muted);text-align:center;font-size:0.85rem;">No items found</div>';
        // Store data for Load More
        window._tableSources[id] = { items, cols, perPage, shown: Math.min(perPage, items.length) };
        const shown = items.slice(0, perPage);
        let html = '<div class="table-controls"><div class="page-info" id="'+id+'-info">Showing '+Math.min(perPage,items.length)+' of '+items.length+'</div></div>';
        html += '<div style="overflow-x:auto;"><table class="data-table" id="'+id+'"><thead><tr>';
        cols.forEach(c => { html += '<th>'+c.label+'</th>'; });
        html += '</tr></thead><tbody>';
        shown.forEach(item => {
            html += '<tr>';
            cols.forEach(c => { html += '<td>'+c.render(item)+'</td>'; });
            html += '</tr>';
        });
        html += '</tbody></table></div>';
        if(items.length > perPage) {
            const remaining = items.length - perPage;
            html += '<div id="'+id+'-loadmore" style="text-align:center;margin-top:0.75rem;"><button class="btn btn-sm" style="background:var(--bg-tertiary);border:1px solid var(--border-color);color:var(--text-secondary);margin:0 auto;" onclick="expandTable(\''+id+'\')">Load More ('+remaining+' remaining)</button></div>';
        }
        return html;
    }

    // Store table data for expansion
    window._tableSources = {};
    function expandTable(id) {
        const src = window._tableSources[id];
        if (!src) return;
        const { items, cols, perPage } = src;
        const nextBatch = items.slice(src.shown, src.shown + perPage);
        if (!nextBatch.length) return;
        
        // Build new rows
        let rowsHtml = '';
        nextBatch.forEach(item => {
            rowsHtml += '<tr>';
            cols.forEach(c => { rowsHtml += '<td>'+c.render(item)+'</td>'; });
            rowsHtml += '</tr>';
        });
        
        // Append to table body
        const table = document.getElementById(id);
        if (table) {
            table.querySelector('tbody').insertAdjacentHTML('beforeend', rowsHtml);
        }
        
        // Update shown count
        src.shown += nextBatch.length;
        
        // Update info text
        const info = document.getElementById(id+'-info');
        if (info) info.textContent = 'Showing '+src.shown+' of '+items.length;
        
        // Update or hide Load More button
        const remaining = items.length - src.shown;
        const loadMore = document.getElementById(id+'-loadmore');
        if (loadMore) {
            if (remaining <= 0) {
                loadMore.style.display = 'none';
            } else {
                loadMore.querySelector('button').textContent = 'Load More ('+remaining+' remaining)';
            }
        }
    }

    function shortUrl(url) { try { const u=new URL(url); return u.pathname+(u.search||''); } catch(e) { return (url||'').replace(/^https?:\/\/[^/]+/,'').substring(0,60); } }
    function escHtml(s) { const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
    function formatBytes(b) { if(b===0) return '0 B'; const k=1024; const s=['B','KB','MB','GB']; const i=Math.floor(Math.log(b)/Math.log(k)); return parseFloat((b/Math.pow(k,i)).toFixed(1))+' '+s[i]; }
    function toast(msg,type='success') { const t=$('toast'); t.textContent=msg; t.className='toast '+type+' show'; setTimeout(()=>t.classList.remove('show'),3000); }
    function log(msg,type='') { const l=document.createElement('div'); l.className='log-line'+(type?' '+type:''); l.textContent=new Date().toLocaleTimeString()+' '+msg; $('progressLog').appendChild(l); l.scrollIntoView({block:'nearest'}); }
    function showProgress() { $('inputSection').style.display='none'; $('progressSection').classList.add('active'); $('progressDomain').textContent=state.domain; }
    function newScan() { location.reload(); }
    function exportPDF() {
        if(!state.data) { toast('Run a scan first','warning'); return; }
        toast('Generating full report...','success');

        const tabEl = $('tabContent');
        const savedTab = tabEl.innerHTML;
        const sections = [];

        const tabDefs = [
            {id:'overview',  label:'Overview', fn:renderOverview},
            {id:'issues',    label:'All Issues', fn:renderIssues},
            {id:'meta',      label:'Meta Tags', fn:renderMeta},
            {id:'content',   label:'Content', fn:renderContent},
            {id:'links',     label:'Links', fn:renderLinks},
            {id:'resources', label:'Resources', fn:renderResources},
            {id:'technical', label:'Technical', fn:renderTechnical},
            {id:'pages',     label:'All Pages', fn:renderAllPages},
            {id:'pagespeed',label:'Page Speed', fn:renderPageSpeed},
            {id:'localrankings', label:'Local Rankings', fn:renderLocalRankings},
            {id:'pagehealth',label:'Page Health', fn:renderPageHealth},
            {id:'structure',label:'Site Structure', fn:renderStructure},
        ];
        tabDefs.forEach(t => {
            try { t.fn(); sections.push({label:t.label, html:tabEl.innerHTML}); } catch(e) { console.warn('Export skip',t.id,e); }
        });
        tabEl.innerHTML = savedTab;

        // Clone the ACTUAL app CSS — every component auto-styled, never out of sync
        const appStyle = document.querySelector('style')?.textContent || '';
        const scoreHtml = $('scoreOverview')?.innerHTML || '';
        const domain = state.domain || 'Site Audit';
        const now = new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});

        // Light-mode overrides + print rules appended AFTER the cloned app CSS
        const printOverrides = `
/* ══════ LIGHT-MODE VARIABLE OVERRIDES ══════ */
:root {
    --bg-primary: #ffffff !important; --bg-secondary: #f8f9fa !important; --bg-tertiary: #f1f3f5 !important; --bg-card: #ffffff !important;
    --bg-elevated: #eef0f3 !important; --bg-input: #f5f6f8 !important;
    --accent-pink: #EC4899 !important; --accent-light: #FBCFE8 !important; --accent-hot: #EC4899 !important;
    --accent-glow: rgba(236,72,153,0.08) !important; --accent-subtle: rgba(236,72,153,0.04) !important;
    --accent-blue: #3B82F6 !important; --accent-blue-deep: #2563EB !important;
    --blue-glow: rgba(59,130,246,0.08) !important; --blue-subtle: rgba(59,130,246,0.04) !important;
    --text-primary: #1a1a2e !important; --text-secondary: #4a5568 !important; --text-muted: #718096 !important;
    --border-color: #e2e8f0 !important; --border-hover: #cbd5e1 !important; --border-input: #d1d8e3 !important;
    --success: #16a34a !important; --success-bg: rgba(22,163,74,0.1) !important;
    --warning: #ca8a04 !important; --warning-bg: rgba(202,138,4,0.1) !important;
    --danger: #dc2626 !important; --danger-bg: rgba(220,38,38,0.1) !important;
    --info: #3B82F6 !important; --info-bg: rgba(59,130,246,0.1) !important;
    --focus-ring: none !important;
}
@page { size: A4; margin: 0.5in; }
body { background: #fff !important; color: #1a1a2e !important; font-size: 10px !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.header, .resume-banner, .progress-container, .toast, #inputSection, .tabs, .header-actions { display: none !important; }
[style*="background-clip"], [style*="-webkit-text-fill-color"], .scan-hero h1, .dash-domain {
    background: none !important; -webkit-background-clip: unset !important;
    -webkit-text-fill-color: var(--accent-pink) !important; color: var(--accent-pink) !important;
}
.stat-grid { grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)) !important; gap: 0.3rem !important; }
.stat-box { padding: 0.4rem !important; } .stat-box-val { font-size: 14px !important; } .stat-box-lbl { font-size: 8px !important; } .stat-box-sub { font-size: 7px !important; }
.data-table { font-size: 8px !important; } .data-table th { padding: 0.25rem 0.4rem !important; font-size: 7px !important; } .data-table td { padding: 0.2rem 0.4rem !important; }
.url-cell { max-width: 220px !important; font-size: 7px !important; }
.score-ring-wrap { width: 110px !important; height: 110px !important; } .score-ring-num { font-size: 24px !important; }
.score-cards { grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)) !important; }
.score-card { padding: 0.3rem !important; } .score-card-val { font-size: 12px !important; } .score-card-name { font-size: 7px !important; }
.ix-detail { display: block !important; } .ix-chevron { display: none !important; }
.ix-card { page-break-inside: avoid !important; margin-bottom: 0.35rem !important; }
.ix-head { padding: 0.4rem 0.6rem !important; } .ix-title { font-size: 9px !important; }
.ix-sev-badge { font-size: 6px !important; } .ix-subtitle { font-size: 7px !important; } .ix-tag { font-size: 6px !important; }
.ix-count-badge { font-size: 9px !important; min-width: 24px !important; height: 24px !important; }
.ix-why, .ix-fix { font-size: 8px !important; } .ix-affected-url { font-size: 7px !important; }
.ix-affected-list { max-height: none !important; overflow: visible !important; }
.issues-cat-filters, .ix-copy-btn, .export-all-btn { display: none !important; }
.ph-detail { display: block !important; } .ph-chevron { display: none !important; }
.ph-page-card { page-break-inside: avoid !important; } .ph-sort-bar { display: none !important; }
.kw-subtabs { display: none !important; } .kw-section { display: block !important; }
button, .filter-chip, .table-search, .pagination { display: none !important; }
.section-hdr { font-size: 11px !important; } .section-sub { font-size: 8px !important; }
.issue-card { page-break-inside: avoid !important; } .issue-title { font-size: 9px !important; } .issue-desc { font-size: 8px !important; }
.report-header { border-bottom: 3px solid #EC4899; padding-bottom: 0.8rem; margin-bottom: 1.2rem; display: flex !important; justify-content: space-between; align-items: flex-end; }
.report-header h1 { font-size: 22px !important; color: #EC4899 !important; font-family: 'Fraunces', serif; -webkit-text-fill-color: #EC4899 !important; }
.report-header .rh-meta { font-size: 10px; color: #666; text-align: right; }
.report-section { margin-bottom: 1.5rem; border-top: 2px solid #e2e8f0; padding-top: 0.8rem; }
.report-section:first-of-type { border-top: none; }
.report-section-title { font-size: 15px; font-weight: 700; color: #EC4899; margin-bottom: 0.6rem; font-family: 'Fraunces', serif; }
.report-footer { margin-top: 1.5rem; padding-top: 0.6rem; border-top: 1px solid #e2e8f0; text-align: center; font-size: 8px; color: #999; }
`;

        const sectionsHtml = sections.map(s => `
<div class="report-section">
    <div class="report-section-title">${s.label}</div>
    ${s.html}
</div>`).join('');

        const printDoc = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escHtml(domain)} \u2014 Full Site Audit Report</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Fraunces:wght@700;800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>${appStyle}${printOverrides}</style></head><body>
<div class="report-header">
    <div>
        <h1>${escHtml(domain)}</h1>
        <div style="font-size:11px;color:#666;margin-top:0.2rem;">Full Site Health Audit Report</div>
    </div>
    <div class="rh-meta">
        <div>${now}</div>
        <div style="color:#EC4899;font-weight:600;">Crocs and Clicks</div>
    </div>
</div>
<div class="score-overview">${scoreHtml}</div>
${sectionsHtml}
<div class="report-footer">Generated by Crocs and Clicks &mdash; Full Site Audit &middot; ${now} &middot; ${escHtml(domain)}</div>
</body></html>`;

        const win = window.open('','_blank');
        if(!win) { toast('Popup blocked \u2014 allow popups to export','error'); return; }
        win.document.write(printDoc);
        win.document.close();
        setTimeout(() => { win.print(); }, 1200);
    }
    function scoreColor(s) { return s>=80?'var(--success)':s>=50?'var(--warning)':'var(--danger)'; }

    // [Demo mode removed — production build]
    </script>
</body>
</html>