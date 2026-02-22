<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Crocs & Clicks — Content Strategy Engine</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Fraunces:wght@700;800;900&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-primary: #0b0d14; --bg-secondary: #12141f; --bg-tertiary: #181b28;
            --bg-card: #1a1d2c; --bg-elevated: #22263a; --bg-input: #10121b;
            --accent-pink: #F472B6; --accent-light: #FBCFE8; --accent-hot: #EC4899;
            --accent-glow: rgba(244,114,182,0.15); --accent-subtle: rgba(244,114,182,0.06);
            --accent-blue: #60A5FA; --accent-blue-deep: #3B82F6;
            --blue-glow: rgba(96,165,250,0.12); --blue-subtle: rgba(96,165,250,0.06);
            --text-primary: #F1F5F9; --text-secondary: #94A3B8; --text-muted: #586578;
            --border-color: #252942; --border-hover: #363b58; --border-input: #2a2f48;
            --success: #22c55e; --success-bg: rgba(34,197,94,0.1);
            --warning: #f59e0b; --warning-bg: rgba(245,158,11,0.1);
            --danger: #ef4444; --danger-bg: rgba(239,68,68,0.1);
            --info: #60A5FA; --info-bg: rgba(96,165,250,0.1);
            --purple: #A78BFA; --purple-bg: rgba(167,139,250,0.1);
            --emerald: #34d399; --emerald-bg: rgba(52,211,153,0.1);
            --orange: #fb923c; --orange-bg: rgba(251,146,60,0.1);
        }
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Outfit',sans-serif; background:var(--bg-primary); color:var(--text-primary); min-height:100vh; overflow-x:hidden; }
        body::before { content:''; position:fixed; top:0; left:0; right:0; height:400px; background:radial-gradient(ellipse at 50% 0%, rgba(244,114,182,0.06) 0%, transparent 70%); pointer-events:none; z-index:0; }

        /* ─── HEADER ─── */
        .header { background:var(--bg-secondary); display:flex; align-items:center; justify-content:space-between; padding:0 2rem; height:58px; position:sticky; top:0; z-index:100; border-bottom:1px solid var(--border-color); }
        .header::after { content:''; position:absolute; bottom:-1px; left:0; right:0; height:1px; background:linear-gradient(90deg, transparent, var(--accent-pink), var(--accent-blue), transparent); }
        .logo { display:flex; align-items:center; gap:0.55rem; font-size:1rem; font-weight:700; }
        .logo-icon { width:32px; height:32px; border-radius:7px; background:linear-gradient(135deg, var(--accent-pink), var(--accent-blue)); display:flex; align-items:center; justify-content:center; font-size:1rem; }
        .logo-badge { font-size:0.58rem; color:var(--accent-blue); font-weight:600; background:var(--blue-subtle); border:1px solid rgba(96,165,250,0.2); padding:0.12rem 0.4rem; border-radius:4px; letter-spacing:0.03em; }
        .header-actions { display:flex; gap:0.5rem; align-items:center; }
        .hdr-btn { background:transparent; border:1px solid var(--border-color); color:var(--text-secondary); padding:0.42rem 0.8rem; border-radius:7px; cursor:pointer; font-size:0.78rem; display:flex; align-items:center; gap:0.35rem; transition:all 0.2s; font-family:inherit; font-weight:500; }
        .hdr-btn:hover { border-color:var(--border-hover); color:var(--text-primary); background:var(--accent-subtle); }
        .hdr-btn-primary { background:var(--accent-hot); border:1px solid var(--accent-hot); color:white; padding:0.45rem 1rem; border-radius:7px; cursor:pointer; font-size:0.78rem; font-family:inherit; font-weight:600; transition:all 0.2s; }
        .hdr-btn-primary:hover { box-shadow:0 2px 16px rgba(236,72,153,0.35); }

        /* ─── LAYOUT ─── */
        .container { max-width:1360px; margin:0 auto; padding:0 1.5rem; position:relative; z-index:1; }

        /* ─── INPUT SECTION ─── */
        .input-section { padding:2.5rem 0 3rem; }
        .input-hero { text-align:center; margin-bottom:2rem; }
        .input-hero h1 { font-family:'Fraunces',serif; font-size:2.4rem; font-weight:900; line-height:1.15; margin-bottom:0.5rem; }
        .input-hero h1 span { background:linear-gradient(135deg,var(--accent-light),var(--accent-pink),var(--accent-blue)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
        .input-hero p { color:var(--text-secondary); font-size:0.88rem; max-width:600px; margin:0 auto; line-height:1.65; }

        .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:1rem; max-width:840px; margin:0 auto; }
        @media(max-width:768px) { .form-grid { grid-template-columns:1fr; } }
        .form-card { background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:12px; padding:1.15rem; }
        .form-card.full { grid-column:1/-1; }
        .fc-title { font-size:0.7rem; font-weight:700; color:var(--accent-pink); text-transform:uppercase; letter-spacing:0.07em; margin-bottom:0.75rem; display:flex; align-items:center; gap:0.35rem; }
        .fc-title .num { background:var(--accent-glow); color:var(--accent-pink); width:18px; height:18px; border-radius:4px; display:inline-flex; align-items:center; justify-content:center; font-size:0.62rem; font-family:'Space Mono',monospace; }

        .field { margin-bottom:0.65rem; }
        .field:last-child { margin-bottom:0; }
        .field-row { display:flex; gap:0.65rem; }
        .field-row .field { flex:1; }
        label.fl { display:block; font-size:0.72rem; color:var(--text-secondary); font-weight:500; margin-bottom:0.25rem; }
        .fi { background:var(--bg-input); border:1.5px solid var(--border-input); color:var(--text-primary); padding:0.6rem 0.8rem; border-radius:7px; font-size:0.85rem; font-family:inherit; width:100%; transition:all 0.2s; }
        .fi:focus { outline:none; border-color:var(--accent-pink); box-shadow:0 0 0 3px var(--accent-glow); }
        .fi::placeholder { color:var(--text-muted); }
        select.fi { cursor:pointer; appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' fill='%23586578' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 0.7rem center; padding-right:1.8rem; }
        textarea.fi { resize:vertical; min-height:56px; font-family:'Space Mono',monospace; font-size:0.75rem; }
        .fhelp { font-size:0.64rem; color:var(--text-muted); margin-top:0.15rem; line-height:1.35; }

        .loc-tags { display:flex; flex-wrap:wrap; gap:0.3rem; margin-top:0.3rem; }
        .loc-tag { background:var(--blue-subtle); border:1px solid rgba(96,165,250,0.2); color:var(--accent-blue); padding:0.2rem 0.5rem; border-radius:5px; font-size:0.72rem; display:flex; align-items:center; gap:0.3rem; }
        .loc-tag .x { cursor:pointer; opacity:0.5; font-size:0.75rem; }
        .loc-tag .x:hover { opacity:1; }

        /* Service chips */
        .svc-chips { display:flex; flex-wrap:wrap; gap:0.3rem; margin-top:0.4rem; max-height:200px; overflow-y:auto; }
        .svc-chip { background:var(--bg-elevated); border:1px solid var(--border-color); color:var(--text-secondary); padding:0.25rem 0.55rem; border-radius:5px; font-size:0.7rem; cursor:pointer; transition:all 0.15s; user-select:none; }
        .svc-chip:hover { border-color:var(--border-hover); }
        .svc-chip.active { background:var(--accent-glow); border-color:rgba(244,114,182,0.4); color:var(--accent-pink); }

        /* Profit inputs per service */
        .svc-table { width:100%; margin-top:0.5rem; }
        .svc-table-wrap { max-height:300px; overflow-y:auto; border:1px solid var(--border-color); border-radius:8px; }
        .svc-table th { background:var(--bg-elevated); padding:0.5rem 0.65rem; font-size:0.68rem; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em; text-align:left; position:sticky; top:0; z-index:2; border-bottom:1px solid var(--border-color); }
        .svc-table td { padding:0.4rem 0.5rem; border-bottom:1px solid var(--border-color); font-size:0.8rem; vertical-align:middle; }
        .svc-table tr:last-child td { border-bottom:none; }
        .svc-table tr:hover td { background:var(--accent-subtle); }
        .svc-table input { background:var(--bg-input); border:1px solid var(--border-input); color:var(--text-primary); padding:0.35rem 0.5rem; border-radius:5px; font-size:0.78rem; font-family:'Space Mono',monospace; width:90px; text-align:right; }
        .svc-table input:focus { outline:none; border-color:var(--accent-pink); }
        .svc-name { font-weight:500; }

        .btn { padding:0.85rem 1.5rem; border-radius:10px; font-weight:700; cursor:pointer; transition:all 0.2s; font-size:0.92rem; border:none; display:flex; align-items:center; justify-content:center; gap:0.45rem; font-family:inherit; }
        .btn-go { background:linear-gradient(135deg,var(--accent-pink),var(--accent-hot)); color:white; width:100%; font-size:0.95rem; box-shadow:0 2px 16px rgba(236,72,153,0.2); letter-spacing:0.01em; }
        .btn-go:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 6px 32px rgba(236,72,153,0.4); }
        .btn-go:disabled { opacity:0.45; cursor:not-allowed; }
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
        .btn-go.shake { animation:shake 0.4s ease; }
        .btn-sm { padding:0.45rem 0.75rem; font-size:0.78rem; border-radius:7px; font-weight:600; }
        .btn-outline { background:transparent; border:1px solid var(--border-color); color:var(--text-secondary); }
        .btn-outline:hover { border-color:var(--border-hover); color:var(--text-primary); background:var(--accent-subtle); }
        .error-msg { font-size:0.78rem; color:var(--danger); margin-top:0.5rem; text-align:center; }

        /* ─── PROGRESS ─── */
        .progress-section { display:none; padding:3rem 0; text-align:center; }
        .progress-section.active { display:block; }
        .prog-title { font-family:'Fraunces',serif; font-size:1.4rem; color:var(--accent-pink); margin-bottom:0.3rem; }
        .prog-domain { font-size:0.85rem; color:var(--text-secondary); margin-bottom:1.25rem; }
        .prog-bar-wrap { background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:10px; height:28px; max-width:500px; margin:0 auto 1rem; overflow:hidden; position:relative; }
        .prog-bar-fill { height:100%; background:linear-gradient(90deg,var(--accent-pink),var(--accent-blue)); transition:width 0.5s; border-radius:10px; }
        .prog-bar-text { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:600; font-family:'Space Mono',monospace; }
        .prog-log { background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:8px; padding:0.65rem; max-height:220px; overflow-y:auto; text-align:left; max-width:600px; margin:0 auto; }
        .log-ln { font-size:0.7rem; color:var(--text-secondary); font-family:'Space Mono',monospace; margin-bottom:0.15rem; line-height:1.4; }
        .log-ln.ok { color:var(--success); } .log-ln.err { color:var(--danger); } .log-ln.warn { color:var(--warning); }

        /* ─── DASHBOARD ─── */
        .dashboard { display:none; padding:1.25rem 0 3rem; }
        .dashboard.active { display:block; }
        .dash-head { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem; padding-bottom:1rem; margin-bottom:1.25rem; border-bottom:1px solid var(--border-color); }
        .dash-domain { font-family:'Fraunces',serif; font-size:1.4rem; background:linear-gradient(135deg,var(--accent-pink),var(--accent-blue)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
        .dash-meta { font-size:0.72rem; color:var(--text-muted); margin-top:0.15rem; }

        /* Stats */
        .stats { display:grid; grid-template-columns:repeat(auto-fit, minmax(150px,1fr)); gap:0.6rem; margin-bottom:1.25rem; }
        .stat { background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:10px; padding:0.85rem; text-align:center; }
        .stat .v { font-family:'Space Mono',monospace; font-size:1.3rem; font-weight:700; }
        .stat .l { font-size:0.65rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em; margin-top:0.1rem; }
        .stat .s { font-size:0.64rem; color:var(--text-secondary); margin-top:0.1rem; }
        .v-pink { color:var(--accent-pink); } .v-blue { color:var(--accent-blue); } .v-green { color:var(--success); }
        .v-yellow { color:var(--warning); } .v-purple { color:var(--purple); } .v-red { color:var(--danger); }

        /* ROI Explainer */
        .roi-explainer { background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:10px; padding:1rem; margin-bottom:1.25rem; }
        .roi-formula { font-family:'Space Mono',monospace; font-size:0.82rem; color:var(--accent-pink); text-align:center; padding:0.6rem; background:var(--bg-elevated); border-radius:8px; margin-bottom:0.5rem; letter-spacing:0.02em; }
        .roi-formula span { color:var(--accent-blue); }
        .roi-breakdown { display:grid; grid-template-columns:repeat(auto-fit, minmax(180px,1fr)); gap:0.5rem; margin-top:0.5rem; }
        .roi-block { background:var(--bg-input); border:1px solid var(--border-input); border-radius:7px; padding:0.55rem 0.7rem; }
        .roi-block .rb-title { font-size:0.65rem; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em; margin-bottom:0.15rem; }
        .roi-block .rb-val { font-family:'Space Mono',monospace; font-size:0.95rem; font-weight:700; }
        .roi-block .rb-note { font-size:0.62rem; color:var(--text-muted); }

        /* Funnel Legend */
        .funnel-legend { display:flex; gap:0.75rem; flex-wrap:wrap; margin-bottom:0.75rem; }
        .funnel-item { display:flex; align-items:center; gap:0.3rem; font-size:0.72rem; color:var(--text-secondary); }
        .funnel-dot { width:8px; height:8px; border-radius:50%; }
        .funnel-dot.bottom { background:var(--success); } .funnel-dot.middle { background:var(--warning); } .funnel-dot.top { background:var(--info); }

        /* Tabs */
        .tabs { display:flex; gap:0.15rem; border-bottom:1px solid var(--border-color); margin-bottom:1.25rem; overflow-x:auto; }
        .tab { background:none; border:none; color:var(--text-muted); font-family:inherit; font-size:0.8rem; font-weight:500; padding:0.65rem 1rem; cursor:pointer; position:relative; white-space:nowrap; transition:color 0.2s; }
        .tab:hover { color:var(--text-secondary); }
        .tab.on { color:var(--accent-pink); font-weight:600; }
        .tab.on::after { content:''; position:absolute; bottom:-1px; left:0; right:0; height:2px; background:var(--accent-pink); border-radius:2px 2px 0 0; }
        .tpanel { display:none; }
        .tpanel.on { display:block; }

        /* Table */
        .tw { overflow-x:auto; border:1px solid var(--border-color); border-radius:10px; }
        table.kt { width:100%; border-collapse:collapse; font-size:0.8rem; }
        .kt th { background:var(--bg-elevated); padding:0.55rem 0.75rem; text-align:left; font-weight:600; font-size:0.68rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em; white-space:nowrap; border-bottom:1px solid var(--border-color); cursor:pointer; user-select:none; }
        .kt th:hover { color:var(--text-secondary); }
        .kt td { padding:0.5rem 0.75rem; border-bottom:1px solid var(--border-color); vertical-align:middle; }
        .kt tr:hover td { background:var(--accent-subtle); }
        .kt tr:last-child td { border-bottom:none; }
        .kw-name { font-weight:500; }
        .mono { font-family:'Space Mono',monospace; font-size:0.76rem; }

        /* Badges */
        .b { display:inline-block; font-size:0.62rem; font-weight:600; padding:0.12rem 0.4rem; border-radius:4px; letter-spacing:0.02em; white-space:nowrap; }
        .b-service { background:rgba(244,114,182,0.12); color:var(--accent-pink); border:1px solid rgba(244,114,182,0.25); }
        .b-location { background:var(--blue-subtle); color:var(--accent-blue); border:1px solid rgba(96,165,250,0.25); }
        .b-blog { background:var(--emerald-bg); color:var(--emerald); border:1px solid rgba(52,211,153,0.25); }
        .b-gbp { background:var(--warning-bg); color:var(--warning); border:1px solid rgba(245,158,11,0.25); }
        .b-bottom { background:var(--success-bg); color:var(--success); border:1px solid rgba(34,197,94,0.25); }
        .b-middle { background:var(--warning-bg); color:var(--warning); border:1px solid rgba(245,158,11,0.25); }
        .b-top { background:var(--info-bg); color:var(--info); border:1px solid rgba(96,165,250,0.25); }
        .b-existing { background:var(--success-bg); color:var(--success); border:1px solid rgba(34,197,94,0.25); }
        .b-gap { background:var(--danger-bg); color:var(--danger); border:1px solid rgba(239,68,68,0.25); }
        .b-canni { background:rgba(239,68,68,0.15); color:var(--danger); border:1px solid rgba(239,68,68,0.3); }
        .b-high { background:var(--danger-bg); color:var(--danger); } .b-med { background:var(--warning-bg); color:var(--warning); } .b-low { background:var(--info-bg); color:var(--info); }

        /* Content Map Cards */
        .cm-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(280px,1fr)); gap:0.7rem; }
        .cm-card { background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:10px; padding:0.9rem; transition:all 0.2s; cursor:pointer; }
        .cm-card:hover { border-color:var(--border-hover); transform:translateY(-1px); }
        .cm-card.existing { border-left:3px solid var(--success); }
        .cm-card.gap { border-left:3px solid var(--danger); }
        .cm-card-top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.35rem; }
        .cm-roi { font-family:'Space Mono',monospace; font-size:0.88rem; font-weight:700; color:var(--success); }
        .cm-title { font-weight:600; font-size:0.85rem; margin-bottom:0.25rem; }
        .cm-url { font-family:'Space Mono',monospace; font-size:0.66rem; color:var(--accent-blue); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .cm-kws { display:flex; flex-wrap:wrap; gap:0.2rem; margin-top:0.35rem; }
        .cm-kw { font-size:0.62rem; background:var(--bg-elevated); padding:0.1rem 0.35rem; border-radius:3px; color:var(--text-secondary); }
        .cm-meta { font-size:0.66rem; color:var(--text-muted); margin-top:0.3rem; display:flex; gap:0.65rem; }

        /* Calendar */
        .cal-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(240px,1fr)); gap:0.65rem; }
        .cal-week { background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:10px; padding:0.85rem; }
        .cal-hdr { font-weight:600; font-size:0.82rem; margin-bottom:0.55rem; display:flex; justify-content:space-between; align-items:center; }
        .cal-num { font-family:'Space Mono',monospace; color:var(--accent-pink); font-size:0.7rem; }
        .cal-item { background:var(--bg-elevated); border:1px solid var(--border-color); border-radius:6px; padding:0.5rem; margin-bottom:0.35rem; }
        .cal-item:last-child { margin-bottom:0; }
        .cal-item-t { font-size:0.75rem; font-weight:500; margin-bottom:0.2rem; }
        .cal-item-m { font-size:0.62rem; color:var(--text-muted); display:flex; gap:0.4rem; flex-wrap:wrap; }

        /* Gen Panel */
        .gen-panel { display:grid; grid-template-columns:320px 1fr; gap:0.85rem; min-height:480px; }
        @media(max-width:900px) { .gen-panel { grid-template-columns:1fr; } }
        .gen-side { background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:10px; padding:0.85rem; overflow-y:auto; max-height:65vh; }
        .gen-it { padding:0.55rem 0.65rem; border:1px solid var(--border-color); border-radius:7px; margin-bottom:0.4rem; cursor:pointer; transition:all 0.15s; }
        .gen-it:hover { border-color:var(--border-hover); background:var(--accent-subtle); }
        .gen-it.on { border-color:var(--accent-pink); background:var(--accent-glow); }
        .gen-it-t { font-size:0.78rem; font-weight:500; }
        .gen-it-m { font-size:0.65rem; color:var(--text-muted); display:flex; gap:0.4rem; margin-top:0.1rem; }
        .gen-out { background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:10px; padding:1rem; display:flex; flex-direction:column; }
        .gen-out-hdr { display:flex; justify-content:space-between; align-items:center; margin-bottom:0.85rem; flex-wrap:wrap; gap:0.4rem; }
        .gen-tabs { display:flex; gap:0.2rem; }
        .gen-tab { background:var(--bg-elevated); border:1px solid var(--border-color); color:var(--text-muted); padding:0.35rem 0.65rem; border-radius:5px; font-size:0.72rem; cursor:pointer; font-family:inherit; font-weight:500; transition:all 0.2s; }
        .gen-tab.on { background:var(--accent-glow); border-color:var(--accent-pink); color:var(--accent-pink); }
        .gen-area { flex:1; background:var(--bg-input); border:1px solid var(--border-input); border-radius:8px; padding:0.85rem; overflow-y:auto; max-height:50vh; font-size:0.82rem; line-height:1.6; }
        .gen-area pre { white-space:pre-wrap; word-wrap:break-word; font-family:'Space Mono',monospace; font-size:0.75rem; }
        .gen-area .hp h1 { font-size:1.4rem; margin-bottom:0.4rem; } .gen-area .hp h2 { font-size:1.05rem; margin-top:1rem; margin-bottom:0.3rem; color:var(--accent-blue); }
        .gen-area .hp p { margin-bottom:0.5rem; color:var(--text-secondary); } .gen-area .hp ul { padding-left:1.2rem; margin-bottom:0.5rem; color:var(--text-secondary); }
        .gen-acts { display:flex; gap:0.4rem; margin-top:0.7rem; flex-wrap:wrap; }

        /* Chips / Filters */
        .chips { display:flex; gap:0.25rem; flex-wrap:wrap; margin-bottom:0.85rem; }
        .chip { background:var(--bg-elevated); border:1px solid var(--border-color); color:var(--text-muted); padding:0.3rem 0.6rem; border-radius:5px; font-size:0.72rem; cursor:pointer; font-family:inherit; font-weight:500; transition:all 0.15s; }
        .chip:hover { border-color:var(--border-hover); color:var(--text-secondary); }
        .chip.on { background:var(--accent-glow); border-color:rgba(244,114,182,0.35); color:var(--accent-pink); }

        /* Modal */
        .modal-bg { position:fixed; inset:0; background:rgba(0,0,0,0.65); z-index:200; display:none; align-items:center; justify-content:center; }
        .modal-bg.active { display:flex; }
        .modal { background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:14px; padding:1.25rem; max-width:460px; width:90%; max-height:80vh; overflow-y:auto; }
        .modal h3 { font-family:'Fraunces',serif; font-size:1.1rem; margin-bottom:0.65rem; }

        /* Toast */
        .toast { position:fixed; bottom:1.5rem; left:50%; transform:translateX(-50%) translateY(80px); background:var(--success); color:white; padding:0.55rem 1rem; border-radius:7px; font-size:0.82rem; font-weight:600; transition:transform 0.3s; z-index:300; pointer-events:none; }
        .toast.vis { transform:translateX(-50%) translateY(0); }

        .spinner { width:18px; height:18px; border:2px solid var(--border-color); border-top-color:var(--accent-pink); border-radius:50%; animation:spin 0.7s linear infinite; display:inline-block; }
        @keyframes spin { to { transform:rotate(360deg); } }

        ::-webkit-scrollbar { width:5px; height:5px; } ::-webkit-scrollbar-track { background:transparent; } ::-webkit-scrollbar-thumb { background:var(--border-color); border-radius:3px; } ::-webkit-scrollbar-thumb:hover { background:var(--border-hover); }
    </style>
</head>
<body>

<div class="header">
    <div class="logo">
        <div class="logo-icon">🐊</div>
        <span>Crocs & Clicks</span>
        <span class="logo-badge">Content Strategy Engine</span>
    </div>
    <div class="header-actions">
        <button class="hdr-btn" id="exportBtn" style="display:none" onclick="exportCSV()">↓ Export</button>
        <button class="hdr-btn-primary" id="newBtn" style="display:none" onclick="resetAll()">+ New Analysis</button>
    </div>
</div>

<!-- ═══════ INPUT ═══════ -->
<div class="container">
<div class="input-section" id="inputSection">
    <div class="input-hero">
        <h1><span>Content Strategy Engine</span></h1>
        <p>Enter a website, configure your economics, and discover exactly which content is worth building — ranked by real profit, not vanity metrics.</p>
    </div>

    <div class="form-grid">
        <!-- Website -->
        <div class="form-card">
            <div class="fc-title"><span class="num">1</span> Website</div>
            <div class="field">
                <label class="fl">Website URL</label>
                <input type="text" class="fi" id="inUrl" placeholder="https://example.com">
            </div>
            <div class="field">
                <label class="fl">Brand / Business Name</label>
                <input type="text" class="fi" id="inBrand" placeholder="Five Star Plumbing">
            </div>
        </div>

        <!-- Industry -->
        <div class="form-card">
            <div class="fc-title"><span class="num">2</span> Industry</div>
            <div class="field">
                <label class="fl">Trade / Industry</label>
                <select class="fi" id="inIndustry" onchange="onIndustryChange()">
                    <option value="">Select industry...</option>
                    <option value="plumbing">Plumbing</option>
                    <option value="electrical">Electrical</option>
                    <option value="hvac">HVAC</option>
                    <option value="roofing">Roofing</option>
                    <option value="landscaping">Landscaping</option>
                    <option value="painting">Painting</option>
                    <option value="concrete">Concrete / Masonry</option>
                    <option value="flooring">Flooring</option>
                    <option value="auto_body">Auto Body / Collision</option>
                    <option value="pest_control">Pest Control</option>
                    <option value="cleaning">Cleaning / Janitorial</option>
                    <option value="garage_door">Garage Door</option>
                    <option value="general_contractor">General Contractor</option>
                    <option value="remodeling">Remodeling / Renovation</option>
                    <option value="tree_service">Tree Service</option>
                    <option value="solar">Solar Installation</option>
                    <option value="fencing">Fencing</option>
                    <option value="custom">Custom / Other</option>
                </select>
            </div>
            <div class="field">
                <label class="fl">Website Conversion Rate (visitor → lead)</label>
                <input type="number" class="fi" id="inConvRate" placeholder="3" step="0.5" value="3">
                <div class="fhelp">% of visitors that become a lead (form fill, call). Industry avg: 2-5%</div>
            </div>
        </div>

        <!-- Locations -->
        <div class="form-card">
            <div class="fc-title"><span class="num">3</span> Target Markets</div>
            <div class="field">
                <div class="field-row">
                    <div class="field" style="flex:3">
                        <label class="fl">Add Location (city, state)</label>
                        <input type="text" class="fi" id="inLoc" placeholder="Vancouver, WA" onkeydown="if(event.key==='Enter'){event.preventDefault();addLoc()}">
                    </div>
                    <div class="field" style="flex:0 0 auto;display:flex;align-items:flex-end">
                        <button class="btn btn-outline btn-sm" onclick="addLoc()">+ Add</button>
                    </div>
                </div>
                <div class="loc-tags" id="locTags"></div>
            </div>
            <div class="field-row">
                <div class="field">
                    <label class="fl">Country</label>
                    <select class="fi" id="inCountry"><option value="2840">United States</option><option value="2124">Canada</option><option value="2826">United Kingdom</option><option value="2036">Australia</option></select>
                </div>
                <div class="field">
                    <label class="fl">Language</label>
                    <select class="fi" id="inLang"><option value="en">English</option><option value="es">Spanish</option><option value="fr">French</option></select>
                </div>
            </div>
        </div>

        <!-- Brand Context -->
        <div class="form-card">
            <div class="fc-title"><span class="num">4</span> Brand Context <span style="font-weight:400;color:var(--text-muted);text-transform:none;letter-spacing:0">(optional)</span></div>
            <div class="field">
                <label class="fl">Custom CSS (for styled content preview)</label>
                <textarea class="fi" id="inCSS" placeholder="Paste brand colors, fonts..." rows="2"></textarea>
            </div>
            <div class="field">
                <label class="fl">Site Collections / Structure</label>
                <textarea class="fi" id="inCollections" placeholder="Services: /services/&#10;Locations: /areas-served/&#10;Blog: /blog/" rows="2"></textarea>
                <div class="fhelp">Define URL structure. Leave blank to auto-detect.</div>
            </div>
        </div>

        <!-- Service Economics -->
        <div class="form-card full" id="serviceEconCard" style="display:none">
            <div class="fc-title"><span class="num">5</span> Service Economics — Profit & Close Rates</div>
            <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:0.65rem;line-height:1.5">Set the <strong>profit per job</strong> (not revenue — what you actually keep after costs) and your <strong>close rate</strong> (% of leads that become paying customers) for each service. Funnel stage is determined per-keyword based on search intent, not per-service. Click services to toggle them on/off.</p>
            <div class="svc-table-wrap">
                <table class="svc-table" id="svcTable">
                    <thead><tr><th style="width:45%">Service</th><th>Profit / Job</th><th>Close Rate %</th><th style="width:50px"></th></tr></thead>
                    <tbody id="svcTableBody"></tbody>
                </table>
            </div>
        </div>

        <!-- Go -->
        <div class="form-card full" style="background:transparent;border:none;padding:0">
            <button class="btn btn-go" id="goBtn" onclick="startAnalysis()">
                Analyze & Build Strategy
            </button>
            <div id="goError" class="error-msg" style="display:none"></div>
        </div>
    </div>
</div>

<!-- ═══════ PROGRESS ═══════ -->
<div class="progress-section" id="progressSection">
    <div class="prog-title" id="progTitle">Building Strategy...</div>
    <div class="prog-domain" id="progDomain"></div>
    <div class="prog-bar-wrap"><div class="prog-bar-fill" id="progFill" style="width:0%"></div><div class="prog-bar-text" id="progText">0%</div></div>
    <div class="prog-log" id="progLog"></div>
</div>

<!-- ═══════ DASHBOARD ═══════ -->
<div class="dashboard" id="dashboard">
    <div class="dash-head">
        <div>
            <div class="dash-domain" id="dashDomain"></div>
            <div class="dash-meta" id="dashMeta"></div>
        </div>
        <div style="display:flex;gap:0.4rem">
            <button class="btn btn-outline btn-sm" onclick="exportCSV()">↓ Export CSV</button>
        </div>
    </div>

    <!-- ROI Formula -->
    <div class="roi-explainer" id="roiExplainer"></div>

    <!-- Stats -->
    <div class="stats" id="statsGrid"></div>

    <!-- Funnel Legend -->
    <div class="funnel-legend">
        <div class="funnel-item"><div class="funnel-dot bottom"></div> Bottom Funnel — "emergency plumber near me" — ready to buy, highest lead conversion</div>
        <div class="funnel-item"><div class="funnel-dot middle"></div> Mid Funnel — "best plumber Vancouver" — comparing options, moderate conversion</div>
        <div class="funnel-item"><div class="funnel-dot top"></div> Top Funnel — "how much does plumbing cost" — researching, lowest conversion but highest volume</div>
    </div>
    <div style="font-size:0.68rem;color:var(--text-muted);margin-bottom:1.25rem;padding:0.5rem 0.7rem;background:var(--bg-tertiary);border:1px solid var(--border-color);border-radius:7px;line-height:1.5">
        <strong style="color:var(--text-secondary)">How it works:</strong> The <em>keyword</em> determines funnel stage (buying intent → conversion multiplier). The <em>service</em> determines economics (profit per job, close rate). Same service, different keywords: "emergency plumber near me" (bottom, 3× conv) and "how much does plumbing cost" (top, 0.5× conv) both map to Plumbing at $280 profit / 45% close — but the bottom-funnel keyword converts 6× better.
    </div>

    <!-- Tabs -->
    <div class="tabs" id="tabBar">
        <button class="tab on" onclick="switchTab('keywords')">Keywords</button>
        <button class="tab" onclick="switchTab('contentmap')">Content Map</button>
        <button class="tab" onclick="switchTab('calendar')">Calendar</button>
        <button class="tab" onclick="switchTab('generate')">Generate Content</button>
        <button class="tab" onclick="switchTab('cannibalization')">Cannibalization</button>
    </div>

    <div class="tpanel on" id="tp-keywords">
        <div class="chips" id="kwChips"></div>
        <div class="tw"><table class="kt" id="kwTbl"><thead><tr>
            <th onclick="sortKw('keyword')">Keyword ▼</th>
            <th onclick="sortKw('volume')">Volume ▼</th>
            <th onclick="sortKw('cpc')">CPC ▼</th>
            <th onclick="sortKw('funnel')">Funnel ▼</th>
            <th onclick="sortKw('convMultiplier')">Conv Mult ▼</th>
            <th onclick="sortKw('monthlyLeads')">Leads/Mo ▼</th>
            <th onclick="sortKw('roi')">Profit/Mo ▼</th>
            <th onclick="sortKw('pageType')">Page Type ▼</th>
            <th onclick="sortKw('status')">Status ▼</th>
            <th>Service</th>
        </tr></thead><tbody id="kwBody"></tbody></table></div>
    </div>

    <div class="tpanel" id="tp-contentmap">
        <div class="chips" id="mapChips"></div>
        <div class="cm-grid" id="cmGrid"></div>
    </div>

    <div class="tpanel" id="tp-calendar">
        <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:0.85rem">Prioritized by estimated profit. Content sequenced for maximum strategic impact.</p>
        <div class="cal-grid" id="calGrid"></div>
    </div>

    <div class="tpanel" id="tp-generate">
        <div class="gen-panel">
            <div class="gen-side" id="genSide"></div>
            <div class="gen-out" id="genOut">
                <div class="gen-out-hdr">
                    <div style="font-weight:600;font-size:0.85rem">Content Output</div>
                    <div class="gen-tabs" id="genTabs">
                        <button class="gen-tab on" onclick="switchGenTab('preview')">Preview</button>
                        <button class="gen-tab" onclick="switchGenTab('html')">HTML</button>
                        <button class="gen-tab" onclick="switchGenTab('text')">Plain Text</button>
                        <button class="gen-tab" onclick="switchGenTab('deploy')">Deploy</button>
                    </div>
                </div>
                <div class="gen-area" id="genArea">
                    <div style="text-align:center;padding:2.5rem 1rem;color:var(--text-muted)">
                        <div style="font-size:1.8rem;margin-bottom:0.4rem">📝</div>
                        Select a content item then click Generate.
                    </div>
                </div>
                <div class="gen-acts" id="genActs" style="display:none">
                    <button class="btn btn-go btn-sm" style="width:auto;padding:0.5rem 1rem" onclick="generateContent()" id="genBtn">✦ Generate</button>
                    <button class="btn btn-outline btn-sm" onclick="copyGen()">⧉ Copy</button>
                    <button class="btn btn-outline btn-sm" onclick="dlGen()">↓ Download</button>
                </div>
            </div>
        </div>
    </div>

    <div class="tpanel" id="tp-cannibalization" id="canniPanel"></div>
</div>
</div>

<div class="toast" id="toast">Copied!</div>

<script>
// ═══════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════
const S = {
    url:'', domain:'', brand:'', industry:'', convRate:3,
    locations:[], country:2840, language:'en', css:'', collections:'',
    services: [], // { name, profit, close, enabled }
    pages:[], keywords:[], clusters:[], contentMap:[], calendar:[], cannibalizations:[],
    sortCol:'roi', sortDir:'desc', kwFilter:'all',
    selectedGen:null, genContent:{}, totalCost:0
};

// ═══════════════════════════════════════════════════════════════
// INDUSTRY PROFILES
// ═══════════════════════════════════════════════════════════════
const INDUSTRIES = {
    plumbing: { name:'Plumbing', defaultProfit:280, defaultClose:45, services:[
        {name:'Emergency Plumber',profit:450,close:55},
        {name:'Drain Cleaning',profit:180,close:50},
        {name:'Water Heater Installation',profit:600,close:40},
        {name:'Water Heater Repair',profit:300,close:50},
        {name:'Pipe Repair',profit:250,close:45},
        {name:'Sewer Line Repair',profit:800,close:35},
        {name:'Leak Detection',profit:200,close:50},
        {name:'Garbage Disposal',profit:150,close:55},
        {name:'Faucet Repair',profit:120,close:50},
        {name:'Toilet Repair',profit:150,close:55},
        {name:'Sump Pump',profit:350,close:40},
        {name:'Water Line Repair',profit:500,close:35},
        {name:'Gas Line',profit:600,close:30},
        {name:'Bathroom Remodel',profit:3000,close:20},
        {name:'Tankless Water Heater',profit:800,close:30},
        {name:'Slab Leak Repair',profit:900,close:35},
        {name:'Backflow Testing',profit:120,close:60},
        {name:'Hydro Jetting',profit:350,close:40}
    ]},
    electrical: { name:'Electrical', defaultProfit:340, defaultClose:40, services:[
        {name:'Emergency Electrician',profit:500,close:55},
        {name:'Panel Upgrade',profit:700,close:35},
        {name:'Wiring',profit:450,close:35},
        {name:'Outlet Installation',profit:150,close:50},
        {name:'Ceiling Fan Installation',profit:180,close:50},
        {name:'Lighting Installation',profit:300,close:40},
        {name:'Electrical Repair',profit:250,close:45},
        {name:'Generator Installation',profit:1200,close:25},
        {name:'EV Charger Installation',profit:500,close:35},
        {name:'Rewiring',profit:2000,close:20},
        {name:'Circuit Breaker',profit:200,close:50},
        {name:'Smoke Detector',profit:120,close:55},
        {name:'Landscape Lighting',profit:600,close:30}
    ]},
    hvac: { name:'HVAC', defaultProfit:500, defaultClose:38, services:[
        {name:'AC Repair',profit:350,close:55},
        {name:'AC Installation',profit:1500,close:30},
        {name:'Furnace Repair',profit:300,close:55},
        {name:'Furnace Installation',profit:1200,close:28},
        {name:'Heat Pump',profit:1400,close:25},
        {name:'Duct Cleaning',profit:250,close:40},
        {name:'Thermostat Installation',profit:150,close:50},
        {name:'Mini Split Installation',profit:800,close:30},
        {name:'HVAC Maintenance',profit:150,close:60},
        {name:'AC Replacement',profit:1800,close:25},
        {name:'Emergency HVAC',profit:500,close:55},
        {name:'Indoor Air Quality',profit:400,close:30}
    ]},
    roofing: { name:'Roofing', defaultProfit:4500, defaultClose:25, services:[
        {name:'Roof Repair',profit:600,close:45},
        {name:'Roof Replacement',profit:6000,close:20},
        {name:'Roof Inspection',profit:200,close:50},
        {name:'Shingle Repair',profit:400,close:45},
        {name:'Metal Roof',profit:8000,close:15},
        {name:'Flat Roof',profit:3500,close:25},
        {name:'Gutter Installation',profit:500,close:35},
        {name:'Gutter Cleaning',profit:150,close:50},
        {name:'Roof Leak Repair',profit:500,close:50},
        {name:'Storm Damage Repair',profit:3000,close:40},
        {name:'Skylight Installation',profit:700,close:25}
    ]},
    landscaping: { name:'Landscaping', defaultProfit:350, defaultClose:42, services:[
        {name:'Landscaping Design',profit:1200,close:25},
        {name:'Lawn Care',profit:120,close:50},
        {name:'Lawn Mowing',profit:80,close:55},
        {name:'Tree Trimming',profit:300,close:40},
        {name:'Hardscaping',profit:2000,close:20},
        {name:'Patio Installation',profit:1500,close:25},
        {name:'Retaining Wall',profit:1800,close:20},
        {name:'Irrigation Installation',profit:600,close:30},
        {name:'Sod Installation',profit:500,close:35},
        {name:'Mulching',profit:200,close:45},
        {name:'Yard Cleanup',profit:250,close:50}
    ]},
    painting: { name:'Painting', defaultProfit:900, defaultClose:32, services:[
        {name:'Interior Painting',profit:1000,close:35},
        {name:'Exterior Painting',profit:1500,close:28},
        {name:'Cabinet Painting',profit:800,close:30},
        {name:'Deck Staining',profit:400,close:35},
        {name:'Commercial Painting',profit:2500,close:20},
        {name:'Pressure Washing',profit:250,close:45},
        {name:'Drywall Repair',profit:300,close:40}
    ]},
    concrete: { name:'Concrete / Masonry', defaultProfit:2500, defaultClose:28, services:[
        {name:'Foundation Repair',profit:3000,close:35},
        {name:'Driveway Installation',profit:2000,close:25},
        {name:'Stamped Concrete',profit:2500,close:22},
        {name:'Concrete Repair',profit:500,close:40},
        {name:'Retaining Wall',profit:2000,close:22},
        {name:'Sidewalk',profit:800,close:30},
        {name:'Concrete Patio',profit:1500,close:25}
    ]},
    flooring: { name:'Flooring', defaultProfit:2000, defaultClose:30, services:[
        {name:'Hardwood Floor Installation',profit:2500,close:25},
        {name:'Tile Installation',profit:1800,close:28},
        {name:'Carpet Installation',profit:1200,close:30},
        {name:'Vinyl Flooring',profit:1500,close:30},
        {name:'Floor Refinishing',profit:1000,close:35},
        {name:'Epoxy Flooring',profit:1200,close:25},
        {name:'Laminate Flooring',profit:1000,close:32}
    ]},
    auto_body: { name:'Auto Body / Collision', defaultProfit:1500, defaultClose:38, services:[
        {name:'Collision Repair',profit:2000,close:40},
        {name:'Auto Paint',profit:1500,close:30},
        {name:'Dent Repair',profit:300,close:50},
        {name:'Paintless Dent Removal',profit:250,close:50},
        {name:'Bumper Repair',profit:400,close:45},
        {name:'Frame Straightening',profit:1200,close:35},
        {name:'Scratch Repair',profit:200,close:50},
        {name:'Hail Damage Repair',profit:800,close:45}
    ]},
    pest_control: { name:'Pest Control', defaultProfit:180, defaultClose:50, services:[
        {name:'Pest Control',profit:200,close:50},
        {name:'Termite Treatment',profit:500,close:40},
        {name:'Rodent Control',profit:250,close:45},
        {name:'Bed Bug Treatment',profit:400,close:45},
        {name:'Ant Control',profit:150,close:55},
        {name:'Mosquito Control',profit:200,close:40},
        {name:'Wildlife Removal',profit:350,close:45}
    ]},
    cleaning: { name:'Cleaning / Janitorial', defaultProfit:150, defaultClose:48, services:[
        {name:'House Cleaning',profit:120,close:50},
        {name:'Deep Cleaning',profit:250,close:45},
        {name:'Commercial Cleaning',profit:400,close:35},
        {name:'Carpet Cleaning',profit:180,close:45},
        {name:'Window Cleaning',profit:150,close:45},
        {name:'Move Out Cleaning',profit:300,close:50},
        {name:'Post Construction Cleaning',profit:500,close:40}
    ]},
    garage_door: { name:'Garage Door', defaultProfit:350, defaultClose:48, services:[
        {name:'Garage Door Repair',profit:250,close:55},
        {name:'Garage Door Installation',profit:600,close:35},
        {name:'Garage Door Opener',profit:200,close:50},
        {name:'Garage Door Spring Repair',profit:200,close:55},
        {name:'Garage Door Replacement',profit:700,close:30}
    ]},
    general_contractor: { name:'General Contractor', defaultProfit:8000, defaultClose:18, services:[
        {name:'Home Remodel',profit:10000,close:15},
        {name:'Kitchen Remodel',profit:8000,close:18},
        {name:'Bathroom Remodel',profit:5000,close:20},
        {name:'Basement Finishing',profit:7000,close:18},
        {name:'Home Addition',profit:15000,close:12},
        {name:'Deck Building',profit:3000,close:25},
        {name:'New Construction',profit:25000,close:8}
    ]},
    remodeling: { name:'Remodeling / Renovation', defaultProfit:7000, defaultClose:20, services:[
        {name:'Kitchen Remodel',profit:8000,close:18},
        {name:'Bathroom Remodel',profit:5000,close:22},
        {name:'Basement Remodel',profit:7000,close:18},
        {name:'Whole House Remodel',profit:20000,close:10},
        {name:'Room Addition',profit:12000,close:12}
    ]},
    tree_service: { name:'Tree Service', defaultProfit:550, defaultClose:42, services:[
        {name:'Tree Removal',profit:800,close:40},
        {name:'Tree Trimming',profit:350,close:45},
        {name:'Stump Grinding',profit:200,close:50},
        {name:'Emergency Tree Removal',profit:1200,close:55},
        {name:'Tree Pruning',profit:300,close:45},
        {name:'Land Clearing',profit:2000,close:25}
    ]},
    solar: { name:'Solar Installation', defaultProfit:8000, defaultClose:12, services:[
        {name:'Residential Solar Installation',profit:8000,close:12},
        {name:'Commercial Solar',profit:15000,close:8},
        {name:'Solar Battery Storage',profit:3000,close:15},
        {name:'Solar Panel Repair',profit:500,close:40},
        {name:'Solar Roof',profit:12000,close:10}
    ]},
    fencing: { name:'Fencing', defaultProfit:2200, defaultClose:32, services:[
        {name:'Fence Installation',profit:2500,close:30},
        {name:'Fence Repair',profit:400,close:45},
        {name:'Wood Fence',profit:2000,close:32},
        {name:'Vinyl Fence',profit:2500,close:28},
        {name:'Chain Link Fence',profit:1200,close:35},
        {name:'Privacy Fence',profit:2200,close:30},
        {name:'Gate Installation',profit:600,close:40}
    ]},
    custom: { name:'Custom', defaultProfit:500, defaultClose:30, services:[] }
};

// CTR by expected position
const CTR = {1:.284,2:.155,3:.11,4:.079,5:.057,6:.042,7:.033,8:.026,9:.021,10:.018,11:.01,12:.009,13:.008,14:.007,15:.006};

// Funnel stage conversion multipliers
// Bottom = high purchase intent → much higher conversion
// Top = informational → lower conversion but volume compensates
const FUNNEL_MULT = { bottom: 3.0, middle: 1.5, top: 0.5 };

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
const $=id=>document.getElementById(id);
const esc=s=>{const d=document.createElement('div');d.textContent=s;return d.innerHTML};
const money=n=>n>=10000?'$'+(n/1000).toFixed(1)+'K':n>=1000?'$'+(n/1000).toFixed(1)+'K':'$'+Math.round(n);
const toast=m=>{const t=$('toast');t.textContent=m;t.classList.add('vis');setTimeout(()=>t.classList.remove('vis'),2000)};
function log(m,t=''){const el=$('progLog'),ln=document.createElement('div');ln.className='log-ln'+(t?' '+t:'');ln.textContent=m;el.appendChild(ln);el.scrollTop=el.scrollHeight}
function prog(p,t){$('progFill').style.width=p+'%';$('progText').textContent=t||(Math.round(p)+'%')}
function parseDomain(u){try{if(!u.match(/^https?:\/\//))u='https://'+u;return new URL(u).hostname.replace(/^www\./,'')}catch{return u.replace(/^(https?:\/\/)?(www\.)?/,'').split('/')[0]}}

// ═══════════════════════════════════════════════════════════════
// LOCATIONS
// ═══════════════════════════════════════════════════════════════
function addLoc(){const i=$('inLoc'),v=i.value.trim();if(!v||S.locations.includes(v))return;S.locations.push(v);i.value='';renderLocs()}
function rmLoc(i){S.locations.splice(i,1);renderLocs()}
function renderLocs(){$('locTags').innerHTML=S.locations.map((l,i)=>`<span class="loc-tag">${esc(l)}<span class="x" onclick="rmLoc(${i})">✕</span></span>`).join('')}

// ═══════════════════════════════════════════════════════════════
// INDUSTRY / SERVICE CONFIG
// ═══════════════════════════════════════════════════════════════
function onIndustryChange(){
    const ind=$('inIndustry').value;
    if(!ind||!INDUSTRIES[ind]){$('serviceEconCard').style.display='none';return}
    const prof=INDUSTRIES[ind];
    S.services=prof.services.map(s=>({name:s.name,profit:s.profit,close:s.close,enabled:true}));
    $('serviceEconCard').style.display='block';
    renderServiceTable();
}

function renderServiceTable(){
    $('svcTableBody').innerHTML=S.services.map((s,i)=>`
        <tr style="${s.enabled?'':'opacity:0.4'}">
            <td class="svc-name" style="cursor:pointer" onclick="toggleSvc(${i})">${s.enabled?'✓':'○'} ${esc(s.name)}</td>
            <td><input type="number" value="${s.profit}" onchange="S.services[${i}].profit=+this.value" ${s.enabled?'':'disabled'}></td>
            <td><input type="number" value="${s.close}" onchange="S.services[${i}].close=+this.value" step="5" ${s.enabled?'':'disabled'}></td>
            <td style="text-align:center;cursor:pointer" onclick="toggleSvc(${i})">${s.enabled?'<span style="color:var(--success)">ON</span>':'<span style="color:var(--text-muted)">OFF</span>'}</td>
        </tr>
    `).join('');
}
function toggleSvc(i){S.services[i].enabled=!S.services[i].enabled;renderServiceTable()}

// ═══════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════
// API credentials hardcoded

// Hardcoded DataForSEO credentials removed for security
function getAuth(){const l=localStorage.getItem('dfs_login'),p=localStorage.getItem('dfs_password');if(!l||!p)return null;return'Basic '+btoa(l+':'+p)}

async function fetchWithProxy(url, options) {
    try { const resp = await fetch(url, options); if (resp.ok) return resp; } catch(e) {}
    const proxies = ['https://corsproxy.io/?'];
    for (const proxy of proxies) {
        try {
            const proxyUrl = proxy + encodeURIComponent(url);
            const resp = await fetch(proxyUrl, { ...options, headers: { ...options.headers, 'x-requested-with': 'XMLHttpRequest' } });
            if (resp.ok) return resp;
        } catch(e) {}
    }
    throw new Error('API connection failed — CORS blocked');
}

async function dfs(endpoint,body){
    const auth=getAuth();
    const url='https://api.dataforseo.com'+endpoint;
    try{
        const r=await fetchWithProxy(url,{method:'POST',headers:{'Authorization':auth,'Content-Type':'application/json'},body:JSON.stringify(body)});
        if(r.ok){const d=await r.json();d.tasks?.forEach(t=>{S.totalCost+=(t.cost||0)});return d}
        throw new Error('HTTP '+r.status);
    }catch(e){throw new Error('API failed: '+endpoint+' — '+e.message)}
}

// ═══════════════════════════════════════════════════════════════
// MAIN PIPELINE
// ═══════════════════════════════════════════════════════════════
async function startAnalysis(){
    const url=$('inUrl').value.trim();
    if(!url){showErr('Enter a website URL');return}
    if(!$('inIndustry').value){showErr('Select an industry');return}
    if(S.services.filter(s=>s.enabled).length===0){showErr('Enable at least one service');return}
    if(S.locations.length===0){showErr('Add at least one target location (e.g. "Vancouver, WA")');return}
    hideErr();

    S.url=url.match(/^https?:\/\//)?url:'https://'+url;
    S.domain=parseDomain(url);
    S.brand=$('inBrand').value.trim()||S.domain.split('.')[0];
    S.industry=$('inIndustry').value;
    S.convRate=parseFloat($('inConvRate').value)||3;
    S.country=+$('inCountry').value;
    S.language=$('inLang').value;
    S.css=$('inCSS').value.trim();
    S.collections=$('inCollections').value.trim();
    S.totalCost=0;

    $('inputSection').style.display='none';
    $('progressSection').classList.add('active');
    $('progDomain').textContent=S.domain;
    $('progLog').innerHTML='';

    try{
        log('Step 1 — Crawling site...');prog(5,'Crawling...');await crawlSite();
        log('Step 2 — Discovering keywords per service...');prog(20,'Keywords...');await discoverKeywords();
        log('Step 3 — Enriching volume & CPC...');prog(40,'Volume data...');await enrichKeywords();
        log('Step 4 — Classifying funnel stage & clustering...');prog(60,'Classifying...');classifyAndCluster();
        log('Step 5 — Calculating ROI per keyword...');prog(72,'ROI calc...');calculateROI();
        log('Step 6 — Building content map...');prog(82,'Content map...');buildContentMap();
        log('Step 7 — Generating calendar...');prog(90,'Calendar...');generateCalendar();
        log('Step 8 — Cannibalization detection...');prog(96,'Cannibalization...');detectCannibalization();
        log('✓ Complete! API cost: $'+S.totalCost.toFixed(4),'ok');prog(100,'Done!');
        setTimeout(()=>{$('progressSection').classList.remove('active');renderDashboard()},700);
    }catch(e){log('✗ '+e.message,'err');console.error(e)}
}
function showErr(m){const e=$('goError');e.textContent=m;e.style.display='block';e.style.color='var(--danger)';e.scrollIntoView({behavior:'smooth',block:'center'});const b=$('goBtn');b.classList.add('shake');setTimeout(()=>b.classList.remove('shake'),500)}
function hideErr(){$('goError').style.display='none'}

// ═══════════════════════════════════════════════════════════════
// STEP 1: CRAWL
// ═══════════════════════════════════════════════════════════════
async function crawlSite(){
    try{
        const r=await dfs('/v3/on_page/task_post',[{target:S.domain,max_crawl_pages:150,load_resources:false,enable_javascript:false,enable_browser_rendering:false}]);
        if(r.status_code!==20000||!r.tasks?.[0]?.id){log('  Crawl failed — URL-only mode','warn');S.pages=[{url:S.url,title:S.brand,path:'/',wordCount:0,type:'homepage'}];return}
        const tid=r.tasks[0].id;log('  Task: '+tid);
        let att=0;
        while(att<30){await new Promise(r=>setTimeout(r,3000));att++;
            try{const sr=await dfs('/v3/on_page/summary/'+tid,[]);if(sr?.tasks?.[0]?.result?.[0]?.crawl_progress==='finished'){log('  Crawl done','ok');break}
            log('  Crawling... '+(sr?.tasks?.[0]?.result?.[0]?.crawl_status?.pages_crawled||0)+' pages')}catch{}}
        const pr=await dfs('/v3/on_page/pages',[{id:tid,limit:150,order_by:["meta.internal_links_count,desc"],filters:["resource_type","=","html"]}]);
        const items=pr?.tasks?.[0]?.result?.[0]?.items||[];
        S.pages=items.map(p=>({url:p.url||'',path:(()=>{try{return new URL(p.url).pathname}catch{return'/'}})(),title:p.meta?.title||'',h1:p.meta?.htags?.h1?.[0]||'',desc:p.meta?.description||'',wordCount:p.meta?.content?.plain_text_word_count||0,internalLinks:p.meta?.internal_links_count||0,type:classifyPage(p)}));
        log('  '+S.pages.length+' pages found','ok');
    }catch(e){log('  Crawl error: '+e.message+' — minimal mode','warn');S.pages=[{url:S.url,title:S.brand,path:'/',wordCount:0,type:'homepage'}]}
}

function classifyPage(p){
    const url=(p.url||'').toLowerCase();const path=(()=>{try{return new URL(url).pathname.toLowerCase()}catch{return'/'}})();
    if(path==='/'||path==='/index.html')return'homepage';
    if(/\/(blog|news|article|post|tips|guide|how-to|faq)/.test(path))return'blog';
    if(/\/(service|services|what-we-do)/.test(path))return'service';
    if(/\/(area|location|city|service-area|areas-served|serving)/.test(path))return'location';
    if(/\/(about|team|company|contact|privacy|terms|sitemap|wp-|admin|gallery|portfolio|review|testimonial)/.test(path))return'other';
    const t=(p.meta?.title||'').toLowerCase();
    if(/repair|install|replace|service|maintenance|cleaning|removal/.test(t))return'service';
    if(/city|area|serving|near/.test(t))return'location';
    return'other';
}

// ═══════════════════════════════════════════════════════════════
// STEP 2: KEYWORD DISCOVERY (service-based)
// ═══════════════════════════════════════════════════════════════
async function discoverKeywords(){
    const kws={};
    const enabledSvcs=S.services.filter(s=>s.enabled);

    function add(kw,src,svc,score){
        kw=kw.trim().toLowerCase();if(kw.length<3||kw.length>80)return;
        if(!kws[kw])kws[kw]={keyword:kw,sources:new Set(),score:0,serviceName:svc||''};
        kws[kw].sources.add(src);kws[kw].score=Math.max(kws[kw].score,score);
        if(svc&&!kws[kw].serviceName)kws[kw].serviceName=svc;
    }

    // Per-service keyword generation
    enabledSvcs.forEach(svc=>{
        const slug=svc.name.toLowerCase();
        add(slug,'industry',svc.name,5);
        add(slug+' near me','near_me',svc.name,6);
        add(slug+' cost','question',svc.name,3);
        add('how much does '+slug+' cost','question',svc.name,2.5);
        add(slug+' cost calculator','question',svc.name,2.5);

        // Location combos
        S.locations.forEach(loc=>{
            const city=loc.split(',')[0].trim();
            add(slug+' '+city,'local',svc.name,5.5);
            add(city+' '+slug,'local',svc.name,4.5);
            add('best '+slug+' '+city,'modifier',svc.name,4);
            add(slug+' in '+city,'local',svc.name,4);
        });

        // Modifiers
        ['best','affordable','emergency','cheap','licensed','professional','reliable','top rated','24 hour'].forEach(m=>{
            add(m+' '+slug,'modifier',svc.name,3.5);
        });
        // Question variants
        ['how to','when to','signs you need','should i','diy','vs'].forEach(q=>{
            add(q+' '+slug,'question',svc.name,2);
        });
    });

    // Brand
    if(S.brand){add(S.brand,'branded','',3);S.locations.forEach(l=>add(S.brand+' '+l.split(',')[0].trim(),'branded','',2.5))}

    // DataForSEO Labs: Keywords for Site
    try{
        log('  Fetching keywords from DataForSEO Labs...');
        const r=await dfs('/v3/dataforseo_labs/google/keywords_for_site/live',[{target:S.domain,location_code:S.country,language_code:S.language,limit:200,include_serp_info:false}]);
        const items=r?.tasks?.[0]?.result?.[0]?.items||[];
        items.forEach(it=>{
            const k=it.keyword_data?.keyword||it.keyword;if(!k)return;
            add(k,'labs_site',matchService(k,enabledSvcs),4);
            const kl=k.toLowerCase();
            if(kws[kl]){kws[kl]._vol=it.keyword_data?.keyword_info?.search_volume||0;kws[kl]._cpc=it.keyword_data?.keyword_info?.cpc||0;kws[kl]._comp=it.keyword_data?.keyword_info?.competition||0}
        });
        log('  Labs: '+items.length+' keywords','ok');
    }catch(e){log('  Labs failed: '+e.message,'warn')}

    // DataForSEO: Keyword Suggestions for top services
    try{
        const tops=enabledSvcs.slice(0,5);
        for(const svc of tops){
            const r=await dfs('/v3/dataforseo_labs/google/keyword_suggestions/live',[{keyword:svc.name.toLowerCase(),location_code:S.country,language_code:S.language,limit:50,include_serp_info:false}]);
            (r?.tasks?.[0]?.result?.[0]?.items||[]).forEach(it=>{
                const k=it.keyword_data?.keyword||it.keyword;if(!k)return;
                add(k,'suggestions',svc.name,3.5);
                const kl=k.toLowerCase();
                if(kws[kl]){kws[kl]._vol=it.keyword_data?.keyword_info?.search_volume||0;kws[kl]._cpc=it.keyword_data?.keyword_info?.cpc||0}
            });
        }
        log('  Suggestions fetched','ok');
    }catch(e){log('  Suggestions failed: '+e.message,'warn')}

    S.keywords=Object.values(kws).sort((a,b)=>b.score-a.score).slice(0,400).map(k=>({
        keyword:k.keyword, sources:[...k.sources], score:k.score, serviceName:k.serviceName,
        volume:k._vol||0, cpc:k._cpc||0, competition:k._comp||0,
        funnel:'', pageType:'', cluster:-1, status:'', roi:0,
        convMultiplier:1, monthlyVisitors:0, monthlyLeads:0, monthlyClosed:0,
        profitPerJob:0, closeRate:0, assignedPage:null
    }));
    log('  Total: '+S.keywords.length+' keywords','ok');
}

function matchService(kw,svcs){
    kw=kw.toLowerCase();
    for(const s of svcs){if(kw.includes(s.name.toLowerCase().split(' ')[0]))return s.name}
    return '';
}

// ═══════════════════════════════════════════════════════════════
// STEP 3: ENRICH
// ═══════════════════════════════════════════════════════════════
async function enrichKeywords(){
    const need=S.keywords.filter(k=>!k.volume);
    if(!need.length){log('  All have volume data','ok');return}
    const batches=[];for(let i=0;i<need.length;i+=1000)batches.push(need.slice(i,i+1000));
    for(let bi=0;bi<batches.length;bi++){
        const b=batches[bi];log('  Batch '+(bi+1)+'/'+batches.length+' ('+b.length+' kws)...');
        try{
            const r=await dfs('/v3/keywords_data/google_ads/search_volume/live',[{keywords:b.map(k=>k.keyword),location_code:S.country,language_code:S.language}]);
            (r?.tasks?.[0]?.result||[]).forEach(res=>{
                const kw=S.keywords.find(k=>k.keyword===res.keyword?.toLowerCase());
                if(kw){kw.volume=res.search_volume||0;kw.cpc=res.cpc||0;kw.competition=res.competition||0}
            });
            log('  Batch '+(bi+1)+' done','ok');
        }catch(e){log('  Batch '+(bi+1)+' failed: '+e.message,'warn')}
    }
    const before=S.keywords.length;
    S.keywords=S.keywords.filter(k=>k.volume>0||k.sources.includes('labs_site')||k.sources.includes('suggestions'));
    if(S.keywords.length<before)log('  Removed '+(before-S.keywords.length)+' zero-volume');
    log('  '+S.keywords.filter(k=>k.volume>0).length+' keywords with volume','ok');
}

// ═══════════════════════════════════════════════════════════════
// STEP 4: CLASSIFY FUNNEL & CLUSTER
// ═══════════════════════════════════════════════════════════════
function classifyAndCluster(){
    S.keywords.forEach(kw=>{
        kw.funnel=classifyFunnel(kw.keyword);
        kw.pageType=assignPageType(kw.keyword,kw.funnel);
        kw.convMultiplier=FUNNEL_MULT[kw.funnel]||1;

        // Match to service for profit/close rate
        const svc=findServiceForKw(kw);
        if(svc){
            kw.serviceName=svc.name;
            kw.profitPerJob=svc.profit;
            kw.closeRate=svc.close;
        }else{
            const prof=INDUSTRIES[S.industry];
            kw.profitPerJob=prof?.defaultProfit||500;
            kw.closeRate=prof?.defaultClose||30;
        }
    });

    // Cluster
    const clusters=[];const assigned=new Set();
    const sorted=[...S.keywords].sort((a,b)=>b.volume-a.volume);
    sorted.forEach(kw=>{
        if(assigned.has(kw.keyword))return;
        const cl={id:clusters.length,leader:kw.keyword,keywords:[kw],totalVolume:kw.volume,intent:kw.funnel,pageType:kw.pageType};
        sorted.forEach(o=>{
            if(assigned.has(o.keyword)||o.keyword===kw.keyword)return;
            if(kwSim(kw.keyword,o.keyword)>0.55){cl.keywords.push(o);cl.totalVolume+=o.volume;assigned.add(o.keyword)}
        });
        assigned.add(kw.keyword);kw.cluster=cl.id;cl.keywords.forEach(k=>k.cluster=cl.id);
        clusters.push(cl);
    });
    S.clusters=clusters;
    log('  '+clusters.length+' clusters created','ok');
}

function classifyFunnel(kw){
    kw=kw.toLowerCase();
    // BOTTOM FUNNEL — immediate purchase intent
    if(/\b(emergency|24.?hour|same.?day|near me|nearby|hire|call|book|schedule|free estimate|free quote|get a quote)\b/.test(kw))return'bottom';
    if(/\b(repair|fix|broken|leak|clog|burst|flood|infestation|removal)\b/.test(kw)){
        // Repair + location or "near me" = very bottom
        if(/near me|\b(in|near)\s/.test(kw))return'bottom';
        return'bottom';
    }
    // Check for location signals with service terms
    for(const loc of S.locations){
        const city=loc.split(',')[0].trim().toLowerCase();
        if(kw.includes(city)){
            // Service + city = bottom/middle
            if(/\b(repair|install|service|replace|clean|remov|treatment)\b/.test(kw))return'bottom';
            return'middle';
        }
    }
    // MIDDLE FUNNEL — comparing, considering
    if(/\b(best|top|affordable|cheap|vs|versus|compare|review|rated|reliable|licensed|professional|company|contractor|service)\b/.test(kw))return'middle';
    if(/\b(install|replacement|new|upgrade)\b/.test(kw))return'middle';
    // TOP FUNNEL — researching, informational
    if(/^(how|what|why|when|where|can|do|does|is|are|should)\b/.test(kw))return'top';
    if(/\b(cost|price|worth|guide|tips|ideas|diy|tutorial|advice|signs|benefits|types|options|average)\b/.test(kw))return'top';
    // Default commercial-ish terms
    const words=kw.split(/\s+/);
    if(words.length<=3)return'middle';
    return'top';
}

function assignPageType(kw,funnel){
    for(const loc of S.locations){
        const city=loc.split(',')[0].trim().toLowerCase();
        if(kw.includes(city))return'location';
    }
    if(kw.includes('near me'))return'service';
    if(funnel==='top')return'blog';
    return'service';
}

function findServiceForKw(kw){
    const k=kw.keyword.toLowerCase();
    const enabled=S.services.filter(s=>s.enabled);
    // Exact match first
    for(const s of enabled){if(k.includes(s.name.toLowerCase()))return s}
    // Partial match
    for(const s of enabled){
        const words=s.name.toLowerCase().split(/\s+/);
        const matches=words.filter(w=>w.length>3&&k.includes(w));
        if(matches.length>=1)return s;
    }
    return null;
}

function kwSim(a,b){
    const wa=new Set(a.toLowerCase().split(/\s+/).filter(w=>w.length>2));
    const wb=new Set(b.toLowerCase().split(/\s+/).filter(w=>w.length>2));
    if(!wa.size||!wb.size)return 0;let o=0;wa.forEach(w=>{if(wb.has(w))o++});return(2*o)/(wa.size+wb.size);
}

// ═══════════════════════════════════════════════════════════════
// STEP 5: ROI — TWO-AXIS MODEL
// ═══════════════════════════════════════════════════════════════
// AXIS 1 — KEYWORD (search intent determines lead quality):
//   Search Volume × CTR = Monthly Visitors
//   Monthly Visitors × Base Conv Rate × Funnel Multiplier = Monthly Leads
//   Funnel multiplier adjusts conversion by buying intent:
//     Bottom (3×): "emergency plumber near me" — buying NOW
//     Middle (1.5×): "best plumber Vancouver" — comparing
//     Top (0.5×): "how much does plumbing cost" — researching
//
// AXIS 2 — SERVICE (business economics determine deal value):
//   Monthly Leads × Close Rate = Monthly Customers
//   Monthly Customers × Profit Per Job = Monthly Profit
//
// Volume carries heavy weight because:
//   1,000 visitors × 1% eff. conv × 50% close = 5 customers
//   100 visitors × 3% eff. conv × 50% close = 1.5 customers
//   High-volume top-funnel can outprofit low-volume bottom-funnel
function calculateROI(){
    const targetPos=3;
    const baseCTR=CTR[targetPos]||0.11;
    const siteConvRate=S.convRate/100;

    S.keywords.forEach(kw=>{
        // Monthly visitors from organic
        kw.monthlyVisitors=Math.round(kw.volume * baseCTR);

        // Adjusted conversion: site conv rate × funnel multiplier
        const adjustedConvRate=siteConvRate * kw.convMultiplier;

        // Monthly leads
        kw.monthlyLeads=kw.monthlyVisitors * adjustedConvRate;

        // Monthly closed deals
        kw.monthlyClosed=kw.monthlyLeads * (kw.closeRate/100);

        // Monthly profit
        kw.roi=kw.monthlyClosed * kw.profitPerJob;
    });

    // Sort by ROI desc
    S.keywords.sort((a,b)=>b.roi-a.roi);

    // Update clusters
    S.clusters.forEach(cl=>{cl.totalRoi=cl.keywords.reduce((s,k)=>s+k.roi,0)});

    const top=S.keywords[0];
    if(top)log('  Top: "'+top.keyword+'" → '+money(top.roi)+'/mo ('+top.volume+' vol, '+top.funnel+' funnel, '+top.monthlyLeads.toFixed(1)+' leads)','ok');
}

// ═══════════════════════════════════════════════════════════════
// STEP 6: CONTENT MAP
// ═══════════════════════════════════════════════════════════════
function buildContentMap(){
    const cm=[];
    // Map existing pages
    S.pages.forEach(page=>{
        if(['other'].includes(page.type)&&page.type!=='homepage')return;
        const matched=S.keywords.filter(kw=>{
            const txt=(page.title+' '+(page.h1||'')+' '+page.path).toLowerCase();
            const ws=kw.keyword.split(/\s+/).filter(w=>w.length>3);
            return ws.length>0&&ws.filter(w=>txt.includes(w)).length>=Math.ceil(ws.length*0.5);
        });
        if(matched.length>0||page.type==='homepage'){
            cm.push({type:page.type,status:'existing',url:page.url,path:page.path,title:page.title||page.h1||page.path,
                keywords:matched.map(k=>k.keyword),primaryKeyword:matched[0]?.keyword||'',totalVolume:matched.reduce((s,k)=>s+k.volume,0),
                totalRoi:matched.reduce((s,k)=>s+k.roi,0),wordCount:page.wordCount,pageType:page.type,
                avgCloseRate:matched.length?Math.round(matched.reduce((s,k)=>s+k.closeRate,0)/matched.length):0,
                avgProfit:matched.length?Math.round(matched.reduce((s,k)=>s+k.profitPerJob,0)/matched.length):0,
                dominantFunnel:matched.length?mode(matched.map(k=>k.funnel)):''
            });
            matched.forEach(k=>{k.status='existing';k.assignedPage=page.url});
        }
    });

    // Gaps from clusters
    S.clusters.forEach(cl=>{
        if(cl.keywords.some(k=>k.status==='existing'))return;
        if(cl.totalVolume<10&&cl.totalRoi<50)return;
        const pri=cl.keywords[0];
        const path=suggestPath(pri.keyword,pri.pageType);
        cm.push({type:pri.pageType,status:'gap',url:'',path,title:genTitle(pri.keyword,pri.pageType),
            keywords:cl.keywords.map(k=>k.keyword),primaryKeyword:pri.keyword,totalVolume:cl.totalVolume,
            totalRoi:cl.totalRoi,wordCount:0,pageType:pri.pageType,clusterId:cl.id,
            avgCloseRate:Math.round(cl.keywords.reduce((s,k)=>s+k.closeRate,0)/cl.keywords.length),
            avgProfit:Math.round(cl.keywords.reduce((s,k)=>s+k.profitPerJob,0)/cl.keywords.length),
            dominantFunnel:mode(cl.keywords.map(k=>k.funnel))
        });
        cl.keywords.forEach(k=>{k.status='gap'});
    });

    cm.sort((a,b)=>b.totalRoi-a.totalRoi);
    S.contentMap=cm;
    log('  '+cm.filter(c=>c.status==='existing').length+' existing, '+cm.filter(c=>c.status==='gap').length+' gaps','ok');
}

function mode(arr){const m={};arr.forEach(v=>m[v]=(m[v]||0)+1);return Object.entries(m).sort((a,b)=>b[1]-a[1])[0]?.[0]||''}
function suggestPath(kw,pt){const slug=kw.replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase();return pt==='service'?'/services/'+slug+'/':pt==='location'?'/areas-served/'+slug+'/':'/blog/'+slug+'/'}
function genTitle(kw,pt){const t=kw.split(' ').map(w=>w[0]?.toUpperCase()+w.slice(1)).join(' ');return pt==='service'?t+' Services':pt==='location'?t+' | '+S.brand:t+' — Guide'}

// ═══════════════════════════════════════════════════════════════
// STEP 7: CALENDAR
// ═══════════════════════════════════════════════════════════════
function generateCalendar(){
    const gaps=S.contentMap.filter(c=>c.status==='gap');
    const cal=[];
    const svcGaps=gaps.filter(g=>g.pageType==='service').slice(0,4);
    svcGaps.forEach((g,i)=>cal.push({week:i+1,phase:'Foundation',item:g,priority:'high',type:'service'}));
    const locGaps=gaps.filter(g=>g.pageType==='location').slice(0,8);
    locGaps.forEach((g,i)=>cal.push({week:5+Math.floor(i/2),phase:'Geographic',item:g,priority:'high',type:'location'}));
    const blogGaps=gaps.filter(g=>g.pageType==='blog').slice(0,8);
    blogGaps.forEach((g,i)=>cal.push({week:9+Math.floor(i/2),phase:'Authority',item:g,priority:'medium',type:'blog'}));
    for(let w=1;w<=12;w++){
        cal.push({week:w,phase:'Ongoing',item:{title:'GBP Post',pageType:'gbp',primaryKeyword:svcGaps[w%Math.max(svcGaps.length,1)]?.primaryKeyword||S.keywords[0]?.keyword||'',totalRoi:0,keywords:[]},priority:'ongoing',type:'gbp'});
    }
    S.calendar=cal;
    log('  '+cal.length+' items across 12 weeks','ok');
}

// ═══════════════════════════════════════════════════════════════
// STEP 8: CANNIBALIZATION
// ═══════════════════════════════════════════════════════════════
function detectCannibalization(){
    const canni=[];
    const kwPages={};
    S.contentMap.filter(c=>c.status==='existing').forEach(p=>{
        p.keywords.forEach(k=>{if(!kwPages[k])kwPages[k]=[];kwPages[k].push(p)});
    });
    Object.entries(kwPages).forEach(([k,pages])=>{
        if(pages.length>1){
            const kd=S.keywords.find(kk=>kk.keyword===k);
            canni.push({keyword:k,volume:kd?.volume||0,roi:kd?.roi||0,pages:pages.map(p=>({url:p.url,title:p.title,type:p.pageType})),severity:pages.length>2?'high':'medium'});
        }
    });
    S.contentMap.filter(c=>c.status==='gap').forEach(gap=>{
        gap.keywords.forEach(k=>{
            const ex=S.contentMap.find(c=>c.status==='existing'&&c.keywords.includes(k));
            if(ex){
                canni.push({keyword:k,volume:S.keywords.find(kk=>kk.keyword===k)?.volume||0,roi:S.keywords.find(kk=>kk.keyword===k)?.roi||0,
                    pages:[{url:ex.url,title:ex.title,type:ex.pageType},{url:'[NEW] '+gap.path,title:gap.title,type:gap.pageType}],severity:'warning'});
                gap.status='cannibalized';
            }
        });
    });
    S.cannibalizations=canni;
    if(canni.length)log('  ⚠ '+canni.length+' risks','warn');else log('  No risks','ok');
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD RENDERING
// ═══════════════════════════════════════════════════════════════
function renderDashboard(){
    $('dashboard').classList.add('active');$('exportBtn').style.display='flex';$('newBtn').style.display='flex';
    $('dashDomain').textContent=S.domain;
    $('dashMeta').textContent=(INDUSTRIES[S.industry]?.name||S.industry)+' · '+S.locations.join(', ')+' · '+S.keywords.length+' keywords · $'+S.totalCost.toFixed(4)+' API cost';

    renderROIExplainer();renderStats();renderKwTab();renderContentMapTab();renderCalendarTab();renderCanniTab();renderGenSide();
}

function renderROIExplainer(){
    const topKw=S.keywords[0];
    if(!topKw)return;
    $('roiExplainer').innerHTML=`
        <div style="font-size:0.78rem;font-weight:600;margin-bottom:0.4rem">ROI Calculation Model — Two-Axis Scoring</div>
        <div class="roi-formula">
            <span>Volume × CTR</span> = Visitors × <span>Conv Rate × Funnel Mult</span> = Leads × <span>Close Rate</span> × <span>Profit/Job</span> = Monthly Profit
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin:0.65rem 0">
            <div style="background:var(--bg-input);border:1px solid rgba(244,114,182,0.2);border-radius:7px;padding:0.55rem 0.7rem">
                <div style="font-size:0.65rem;font-weight:700;color:var(--accent-pink);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.2rem">↳ From Keyword (search intent)</div>
                <div style="font-size:0.72rem;color:var(--text-secondary);line-height:1.5">Search Volume • Funnel Stage • Conversion Multiplier<br>
                <span style="font-size:0.65rem;color:var(--text-muted)">Same service, different keywords = different conversion rates</span></div>
            </div>
            <div style="background:var(--bg-input);border:1px solid rgba(96,165,250,0.2);border-radius:7px;padding:0.55rem 0.7rem">
                <div style="font-size:0.65rem;font-weight:700;color:var(--accent-blue);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.2rem">↳ From Service (business economics)</div>
                <div style="font-size:0.72rem;color:var(--text-secondary);line-height:1.5">Profit Per Job • Lead Close Rate<br>
                <span style="font-size:0.65rem;color:var(--text-muted)">Same keyword intent, different services = different job values</span></div>
            </div>
        </div>
        <div style="font-size:0.72rem;color:var(--text-secondary);text-align:center;margin-bottom:0.35rem;line-height:1.5">
            Example: "<strong>${esc(topKw.keyword)}</strong>" → ${topKw.volume} vol × 11% CTR = <strong>${topKw.monthlyVisitors}</strong> visitors × ${S.convRate}% base conv × <strong style="color:${topKw.funnel==='bottom'?'var(--success)':topKw.funnel==='middle'?'var(--warning)':'var(--info)'}">${topKw.convMultiplier}× ${topKw.funnel}</strong> = ${topKw.monthlyLeads.toFixed(1)} leads × ${topKw.closeRate}% close = ${topKw.monthlyClosed.toFixed(2)} jobs × $${topKw.profitPerJob} = <strong style="color:var(--success)">${money(topKw.roi)}/mo</strong>
        </div>
        <div class="roi-breakdown">
            <div class="roi-block"><div class="rb-title">Site Conv Rate</div><div class="rb-val" style="color:var(--accent-pink)">${S.convRate}%</div><div class="rb-note">Visitor → Lead (base)</div></div>
            <div class="roi-block"><div class="rb-title">Bottom Funnel</div><div class="rb-val" style="color:var(--success)">${FUNNEL_MULT.bottom}× conv</div><div class="rb-note">"near me", "emergency", "hire"</div></div>
            <div class="roi-block"><div class="rb-title">Mid Funnel</div><div class="rb-val" style="color:var(--warning)">${FUNNEL_MULT.middle}× conv</div><div class="rb-note">"best", "vs", "reviews"</div></div>
            <div class="roi-block"><div class="rb-title">Top Funnel</div><div class="rb-val" style="color:var(--info)">${FUNNEL_MULT.top}× conv</div><div class="rb-note">"how much", "guide", "tips"</div></div>
        </div>
        <div style="font-size:0.68rem;color:var(--text-muted);margin-top:0.5rem;text-align:center;line-height:1.45">
            Volume is weighted heavily: 1,000 visitors × 1% conv × 50% close = <strong>5 customers</strong> beats 100 visitors × 3% conv × 50% close = <strong>1.5 customers</strong>. High-volume top-funnel content can outperform low-volume bottom-funnel keywords in total profit.
        </div>
    `;
}

function renderStats(){
    const totalRoi=S.keywords.reduce((s,k)=>s+k.roi,0);
    const totalLeads=S.keywords.reduce((s,k)=>s+k.monthlyLeads,0);
    const totalClosed=S.keywords.reduce((s,k)=>s+k.monthlyClosed,0);
    const gaps=S.contentMap.filter(c=>c.status==='gap');
    const gapRoi=gaps.reduce((s,c)=>s+c.totalRoi,0);
    const totalVol=S.keywords.reduce((s,k)=>s+k.volume,0);
    $('statsGrid').innerHTML=`
        <div class="stat"><div class="v v-pink">${S.keywords.length}</div><div class="l">Keywords</div><div class="s">${totalVol.toLocaleString()} searches/mo</div></div>
        <div class="stat"><div class="v v-green">${money(totalRoi)}</div><div class="l">Total Profit Opportunity</div><div class="s">Per month at position 3</div></div>
        <div class="stat"><div class="v v-blue">${totalLeads.toFixed(0)}</div><div class="l">Est. Monthly Leads</div><div class="s">${totalClosed.toFixed(1)} closed/mo</div></div>
        <div class="stat"><div class="v v-yellow">${gaps.length}</div><div class="l">Content Gaps</div><div class="s">${money(gapRoi)} untapped</div></div>
        <div class="stat"><div class="v v-purple">${S.clusters.length}</div><div class="l">Topic Clusters</div></div>
        <div class="stat"><div class="v v-red">${S.cannibalizations.length}</div><div class="l">Cannibalization Risks</div></div>
    `;
}

function renderKwTab(){
    const counts={all:S.keywords.length};
    S.keywords.forEach(k=>{counts[k.funnel]=(counts[k.funnel]||0)+1;counts[k.pageType]=(counts[k.pageType]||0)+1;counts[k.status]=(counts[k.status]||0)+1});
    $('kwChips').innerHTML=`<button class="chip on" onclick="filterKw('all',this)">All (${counts.all})</button>`+
        ['bottom','middle','top'].filter(f=>counts[f]).map(f=>`<button class="chip" onclick="filterKw('funnel:${f}',this)">${f} funnel (${counts[f]})</button>`).join('')+
        ['service','location','blog'].filter(t=>counts[t]).map(t=>`<button class="chip" onclick="filterKw('type:${t}',this)">${t} (${counts[t]})</button>`).join('')+
        ['existing','gap'].filter(s=>counts[s]).map(s=>`<button class="chip" onclick="filterKw('status:${s}',this)">${s} (${counts[s]})</button>`).join('');
    renderKwRows(S.keywords);
}

function renderKwRows(kws){
    $('kwBody').innerHTML=kws.slice(0,250).map(k=>`<tr>
        <td class="kw-name">${esc(k.keyword)}</td>
        <td class="mono">${k.volume.toLocaleString()}</td>
        <td class="mono">$${k.cpc.toFixed(2)}</td>
        <td><span class="b b-${k.funnel}">${k.funnel}</span></td>
        <td class="mono">${k.convMultiplier}×</td>
        <td class="mono" style="color:var(--accent-blue)">${k.monthlyLeads.toFixed(1)}</td>
        <td class="mono" style="color:var(--success);font-weight:600">${money(k.roi)}</td>
        <td><span class="b b-${k.pageType}">${k.pageType}</span></td>
        <td><span class="b b-${k.status||'gap'}">${k.status||'—'}</span></td>
        <td style="font-size:0.7rem;color:var(--text-muted);max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(k.serviceName)}</td>
    </tr>`).join('');
}

function filterKw(f,btn){
    document.querySelectorAll('#kwChips .chip').forEach(c=>c.classList.remove('on'));btn.classList.add('on');
    let list=S.keywords;
    if(f!=='all'){const[k,v]=f.split(':');list=S.keywords.filter(kw=>k==='funnel'?kw.funnel===v:k==='type'?kw.pageType===v:kw.status===v)}
    renderKwRows(list);
}

function sortKw(col){
    if(S.sortCol===col)S.sortDir=S.sortDir==='desc'?'asc':'desc';else{S.sortCol=col;S.sortDir='desc'}
    const d=S.sortDir==='desc'?-1:1;
    S.keywords.sort((a,b)=>{let va=a[col],vb=b[col];if(typeof va==='string')return va.localeCompare(vb)*d;return((va||0)-(vb||0))*d});
    renderKwRows(S.keywords);
}

function renderContentMapTab(){
    const counts={all:S.contentMap.length,existing:S.contentMap.filter(c=>c.status==='existing').length,gap:S.contentMap.filter(c=>c.status==='gap').length};
    $('mapChips').innerHTML=Object.entries(counts).map(([k,v])=>`<button class="chip ${k==='all'?'on':''}" onclick="filterCM('${k}',this)">${k} (${v})</button>`).join('');
    renderCMCards(S.contentMap);
}

function renderCMCards(items){
    $('cmGrid').innerHTML=items.map((c,i)=>`
        <div class="cm-card ${c.status}" onclick="selectGen(${i})">
            <div class="cm-card-top"><span class="b b-${c.pageType}">${c.pageType}</span><span class="cm-roi">${money(c.totalRoi)}/mo</span></div>
            <div class="cm-title">${esc(c.title)}</div>
            ${c.url?`<div class="cm-url">${esc(c.path)}</div>`:`<div class="cm-url" style="color:var(--warning)">${esc(c.path)} (proposed)</div>`}
            <div class="cm-kws">${c.keywords.slice(0,5).map(k=>`<span class="cm-kw">${esc(k)}</span>`).join('')}${c.keywords.length>5?`<span class="cm-kw">+${c.keywords.length-5}</span>`:''}</div>
            <div class="cm-meta">
                <span>${c.totalVolume.toLocaleString()} vol</span>
                <span class="b b-${c.dominantFunnel}">${c.dominantFunnel}</span>
                <span>~${c.avgCloseRate}% close</span>
                <span class="b b-${c.status}">${c.status}</span>
            </div>
        </div>
    `).join('');
}

function filterCM(f,btn){
    document.querySelectorAll('#mapChips .chip').forEach(c=>c.classList.remove('on'));btn.classList.add('on');
    renderCMCards(f==='all'?S.contentMap:S.contentMap.filter(c=>c.status===f));
}

function renderCalendarTab(){
    const byWeek={};S.calendar.forEach(c=>{if(!byWeek[c.week])byWeek[c.week]=[];byWeek[c.week].push(c)});
    $('calGrid').innerHTML=Object.entries(byWeek).map(([w,items])=>`
        <div class="cal-week"><div class="cal-hdr"><span>Week ${w}</span><span class="cal-num">${items[0].phase}</span></div>
        ${items.map(it=>`<div class="cal-item"><div class="cal-item-t"><span class="b b-${it.type}">${it.type}</span> ${esc(it.item.title||it.item.primaryKeyword)}</div>
        <div class="cal-item-m">${it.item.totalRoi>0?`<span style="color:var(--success);font-family:'Space Mono',monospace;font-weight:600">${money(it.item.totalRoi)}/mo</span>`:''}<span class="b b-${it.priority}">${it.priority}</span></div></div>`).join('')}
        </div>
    `).join('');
}

function renderCanniTab(){
    const el=$('tp-cannibalization');
    if(!S.cannibalizations.length){el.innerHTML=`<div style="text-align:center;padding:2.5rem;color:var(--text-muted)"><div style="font-size:1.6rem;margin-bottom:0.3rem">✓</div>No cannibalization risks. Architecture looks clean.</div>`;return}
    el.innerHTML=`<p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:0.85rem">${S.cannibalizations.length} keywords have multiple pages competing, splitting ranking authority.</p>`+
        S.cannibalizations.map(c=>`<div style="background:var(--bg-tertiary);border:1px solid var(--border-color);border-radius:10px;padding:0.85rem;margin-bottom:0.6rem;border-left:3px solid ${c.severity==='high'?'var(--danger)':c.severity==='warning'?'var(--warning)':'var(--info)'}">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.4rem"><span style="font-weight:600">"${esc(c.keyword)}"</span><div style="display:flex;gap:0.4rem"><span class="mono">${c.volume.toLocaleString()} vol</span><span class="mono" style="color:var(--success)">${money(c.roi)}/mo</span><span class="b b-${c.severity==='high'?'high':c.severity==='warning'?'med':'low'}">${c.severity}</span></div></div>
            ${c.pages.map(p=>`<div style="font-size:0.78rem;padding:0.3rem 0.45rem;background:var(--bg-elevated);border-radius:4px;margin-bottom:0.2rem;display:flex;justify-content:space-between"><span style="color:var(--accent-blue);font-family:'Space Mono',monospace;font-size:0.7rem">${esc(p.url||p.title)}</span><span class="b b-${p.type}">${p.type}</span></div>`).join('')}
        </div>`).join('');
}

// ═══════════════════════════════════════════════════════════════
// CONTENT GENERATION
// ═══════════════════════════════════════════════════════════════
function renderGenSide(){
    const items=S.contentMap.filter(c=>c.status==='gap'||c.status==='cannibalized');
    $('genSide').innerHTML=`<div style="font-weight:600;margin-bottom:0.6rem;font-size:0.82rem">Content Queue (${items.length})</div>`+
        items.map((it,i)=>`<div class="gen-it" data-i="${i}" onclick="pickGen(${i})"><div class="gen-it-t"><span class="b b-${it.pageType}" style="margin-right:0.2rem">${it.pageType}</span>${esc(it.title)}</div><div class="gen-it-m"><span>${money(it.totalRoi)}/mo</span><span>${it.keywords.length} kws</span><span class="b b-${it.dominantFunnel}">${it.dominantFunnel}</span></div></div>`).join('');
}

function pickGen(idx){
    const items=S.contentMap.filter(c=>c.status==='gap'||c.status==='cannibalized');
    S.selectedGen=items[idx];
    document.querySelectorAll('.gen-it').forEach(e=>e.classList.remove('on'));
    document.querySelector(`.gen-it[data-i="${idx}"]`)?.classList.add('on');
    $('genActs').style.display='flex';
    const it=S.selectedGen;
    const kwList=it.keywords.map(k=>{const kd=S.keywords.find(kk=>kk.keyword===k);return`${k} — ${kd?.volume||0} vol, $${kd?.cpc?.toFixed(2)||'0'} CPC, ${kd?.funnel||''} funnel, ${kd?.monthlyLeads?.toFixed(1)||0} leads/mo`}).join('\n');
    $('genArea').innerHTML=`<div class="hp">
        <h2 style="color:var(--accent-pink);margin-top:0">Content Brief</h2>
        <p><strong>Page Type:</strong> ${it.pageType} · <strong>Funnel:</strong> <span class="b b-${it.dominantFunnel}">${it.dominantFunnel}</span></p>
        <p><strong>URL:</strong> ${it.path}</p>
        <p><strong>Est. Monthly Profit:</strong> <span style="color:var(--success);font-weight:700">${money(it.totalRoi)}</span> · Avg Close Rate: ${it.avgCloseRate}% · Avg Profit/Job: $${it.avgProfit}</p>
        <h2>Target Keywords</h2><pre style="font-size:0.72rem;color:var(--text-secondary)">${esc(kwList)}</pre>
        <h2>Internal Linking Strategy</h2><p style="font-size:0.78rem">${getLinkSuggestions(it)}</p>
        <div style="margin-top:0.85rem;padding:0.65rem;background:var(--accent-glow);border-radius:8px;border:1px solid rgba(244,114,182,0.25)">
            <div style="font-weight:600;font-size:0.82rem;margin-bottom:0.15rem">✦ Click Generate to create optimized content</div>
            <div style="font-size:0.75rem;color:var(--text-secondary)">Content will match funnel stage, use service-specific language, and include proper internal linking.</div>
        </div>
    </div>`;
}

function getLinkSuggestions(it){
    const existing=S.contentMap.filter(c=>c.status==='existing');
    const sugs=['→ Link from homepage'];
    existing.filter(c=>c.pageType==='service'&&c!==it).slice(0,3).forEach(p=>sugs.push('→ Cross-link: <code>'+p.path+'</code>'));
    if(it.pageType==='location')sugs.push('→ Link from main services page with geo anchor');
    if(it.pageType==='blog')sugs.push('→ Link to service pages with commercial anchors');
    return sugs.join('<br>');
}

function selectGen(cmIdx){switchTab('generate');const items=S.contentMap.filter(c=>c.status==='gap'||c.status==='cannibalized');const gi=items.indexOf(S.contentMap[cmIdx]);if(gi>=0)pickGen(gi)}

async function generateContent(){
    if(!S.selectedGen)return;
    const btn=$('genBtn');btn.disabled=true;btn.innerHTML='<span class="spinner"></span> Generating...';
    const it=S.selectedGen;
    const aiKey=localStorage.getItem('ai_api_key');
    let content;
    if(aiKey){try{content=await genAI(it,aiKey)}catch(e){console.error(e);content=genTemplate(it)}}
    else{content=genTemplate(it)}
    S.genContent[it.path]=content;showGenContent('preview',content,it);
    btn.disabled=false;btn.innerHTML='✦ Generate';
}

async function genAI(it,key){
    const prof=INDUSTRIES[S.industry];
    const kwDet=it.keywords.map(k=>{const d=S.keywords.find(kk=>kk.keyword===k);return`"${k}" — ${d?.volume||0} vol, $${d?.cpc?.toFixed(2)||'0'} CPC, ${d?.funnel||''} funnel, ${d?.monthlyLeads?.toFixed(1)||0} leads/mo, close rate ${d?.closeRate||0}%`}).join('\n');
    const existing=S.contentMap.filter(c=>c.status==='existing').map(c=>`${c.path} — "${c.title}" (${c.pageType})`).join('\n');

    const funnelInstructions={
        bottom:`This is BOTTOM FUNNEL content — the reader is ready to buy NOW. Lead with urgency, trust signals, availability. CTA should be direct: call now, book today, get free estimate. This person has a problem and wants it solved immediately.`,
        middle:`This is MID FUNNEL content — the reader is comparing options. Focus on differentiators, why choose this company, social proof, process transparency. Help them decide THIS company is the right choice.`,
        top:`This is TOP FUNNEL content — the reader is researching. Be genuinely helpful, educational, authoritative. Build trust through expertise. Soft CTA: "If you need professional help, we're here." Don't oversell.`
    };

    const prompt=`You are a content strategist creating content for ${S.brand}, a ${prof.name} contractor in ${S.locations.join(', ')}.

CONTENT TYPE: ${it.pageType.toUpperCase()} PAGE
URL: ${it.path}
TITLE: ${it.title}
FUNNEL STAGE: ${it.dominantFunnel?.toUpperCase()}

${funnelInstructions[it.dominantFunnel]||funnelInstructions.middle}

TARGET KEYWORDS:
${kwDet}

EXISTING PAGES (link TO these, don't overlap):
${existing}

BUSINESS ECONOMICS:
- Avg Profit Per Job: $${it.avgProfit}
- Avg Close Rate: ${it.avgCloseRate}%
- This content could generate ${money(it.totalRoi)}/month in profit

Write 800-1200 words of HTML content (no DOCTYPE/html/head/body tags). Use h1, h2, h3, p, ul, strong. Naturally incorporate keywords. Include FAQ section with 3-4 questions. End with CTA appropriate for the funnel stage. Use [PHONE] for phone placeholder.`;

    const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',
        headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
        body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:4000,messages:[{role:'user',content:prompt}]})});
    if(!r.ok)throw new Error('AI API: '+r.status);
    const d=await r.json();const txt=d.content?.[0]?.text||'';
    return{html:txt,text:txt.replace(/<[^>]+>/g,''),title:it.title,pageType:it.pageType,path:it.path,keywords:it.keywords};
}

function genTemplate(it){
    const prof=INDUSTRIES[S.industry];const pk=it.primaryKeyword||it.keywords[0]||'';
    const tc=pk.split(' ').map(w=>w[0]?.toUpperCase()+w.slice(1)).join(' ');
    const loc=S.locations[0]?.split(',')[0]?.trim()||'';
    const svc=findServiceForKw({keyword:pk,serviceName:''});
    let html='';

    if(it.pageType==='service'){
        html=`<h1>${tc} Services${loc?' in '+loc:''}</h1>
<p>When you need reliable ${pk} services, ${S.brand} delivers professional results backed by years of experience. We understand that finding a trustworthy contractor is stressful — that's why we focus on transparent pricing, quality workmanship, and clear communication.</p>
<h2>Our ${tc} Services</h2>
<p>We provide comprehensive ${pk} solutions for residential and commercial properties${loc?' throughout '+loc+' and surrounding areas':''}. Whether you need a quick repair or complete installation, our licensed technicians get it done right the first time.</p>
<h2>How It Works</h2>
<p><strong>1. Free Consultation</strong> — Call or fill out our form for a no-obligation assessment.</p>
<p><strong>2. Transparent Quote</strong> — Itemized pricing. No hidden fees.</p>
<p><strong>3. Expert Service</strong> — Certified technicians, on time, within budget.</p>
<p><strong>4. Satisfaction Guarantee</strong> — We stand behind every job.</p>
<h2>Why Choose ${S.brand}?</h2>
<ul><li><strong>Licensed & Insured</strong> — Full coverage for your peace of mind</li>
<li><strong>Transparent Pricing</strong> — Detailed quotes before work begins</li>
<li><strong>5-Star Reviews</strong> — Consistently top-rated</li>
<li><strong>Fast Response</strong> — Same-day service available</li></ul>
<h2>FAQ</h2>
<h3>How much does ${pk} cost?</h3>
<p>Costs vary by scope and materials. Most ${prof.name.toLowerCase()} projects range $${Math.round((svc?.profit||prof.defaultProfit)*0.5)} – $${Math.round((svc?.profit||prof.defaultProfit)*2.5)}. We provide free estimates.</p>
<h3>How long does ${pk} take?</h3>
<p>Most standard jobs complete in 1-3 days. We outline timelines in your quote.</p>
<h3>Do you offer warranties?</h3>
<p>Yes — workmanship guarantee plus manufacturer warranties on materials.</p>
<h2>Get Your Free Estimate</h2>
<p>Contact ${S.brand} today. Call <strong>[PHONE]</strong> or fill out the form below.</p>`;
    }else if(it.pageType==='location'){
        html=`<h1>${tc}</h1>
<p>${S.brand} serves ${loc||'the local area'} with professional ${prof.name.toLowerCase()} services. Our licensed contractors deliver reliable, high-quality workmanship.</p>
<h2>${prof.name} Services in ${loc||'Your Area'}</h2>
<ul>${S.services.filter(s=>s.enabled).slice(0,6).map(s=>`<li>${s.name}</li>`).join('')}</ul>
<h2>Why ${loc} Residents Trust ${S.brand}</h2>
<p>We work in ${loc} every day. We know local building codes, property challenges, and what homeowners here need.</p>
<h2>Service Area</h2><p>We serve ${loc} and surrounding communities. Same-day emergency response available.</p>
<h2>Get a Free Estimate</h2><p>Call <strong>[PHONE]</strong> or request a quote online.</p>`;
    }else{
        html=`<h1>${tc}</h1>
<p>Understanding ${pk} is one of the most common questions we get from homeowners${loc?' in '+loc:''}. Here's what the experts recommend.</p>
<h2>What You Need to Know</h2>
<p>Several factors affect ${pk}: property age, materials, and local codes${loc?' in '+loc:''}.</p>
<h2>Key Factors</h2>
<p><strong>Budget:</strong> Typically $${Math.round((svc?.profit||prof.defaultProfit)*0.3)} – $${Math.round((svc?.profit||prof.defaultProfit)*1.5)}.</p>
<p><strong>Timing:</strong> Address sooner rather than later — delays increase costs.</p>
<p><strong>DIY vs Pro:</strong> For anything involving ${prof.name.toLowerCase()} systems, hire a licensed professional.</p>
<h2>FAQ</h2>
<h3>How much does ${pk} cost on average?</h3><p>Get 3+ quotes from licensed contractors to compare.</p>
<h3>Can I DIY?</h3><p>Some prep work, yes. Core work needs a professional for safety and warranty.</p>
<h2>Need Help?</h2>
<p>Our team at ${S.brand} offers free consultations. Call <strong>[PHONE]</strong>.</p>`;
    }
    return{html,text:html.replace(/<[^>]+>/g,''),title:it.title,pageType:it.pageType,path:it.path,keywords:it.keywords};
}

function switchGenTab(tab){
    document.querySelectorAll('.gen-tab').forEach(t=>t.classList.remove('on'));
    document.querySelector(`.gen-tab[onclick="switchGenTab('${tab}')"]`)?.classList.add('on');
    if(S.selectedGen&&S.genContent[S.selectedGen.path])showGenContent(tab,S.genContent[S.selectedGen.path],S.selectedGen);
}

function showGenContent(tab,c,it){
    const a=$('genArea');
    if(tab==='preview')a.innerHTML=`<div class="hp">${c.html}</div>`;
    else if(tab==='html')a.innerHTML=`<pre>${esc(c.html)}</pre>`;
    else if(tab==='text')a.innerHTML=`<pre>${esc(c.text)}</pre>`;
    else a.innerHTML=`<div class="hp"><h2 style="color:var(--accent-pink);margin-top:0">Deploy Instructions</h2>
        <p>1. Create page at <code>${it.path}</code></p><p>2. Paste HTML content</p><p>3. Set title: <code>${esc(it.title)}</code></p>
        <p>4. Meta description targeting: "${esc(it.primaryKeyword)}"</p><p>5. Update sitemap & submit to Search Console</p>
        <p>6. Internal linking: ${getLinkSuggestions(it)}</p><p>7. Add to Local Grid for rank tracking</p></div>`;
}

function copyGen(){if(!S.selectedGen)return;const c=S.genContent[S.selectedGen.path];if(!c)return;navigator.clipboard.writeText(c.html).then(()=>toast('Copied!'))}
function dlGen(){if(!S.selectedGen)return;const c=S.genContent[S.selectedGen.path];if(!c)return;const b=new Blob([c.html],{type:'text/html'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=(S.selectedGen.path.replace(/\//g,'-').replace(/^-|-$/g,'')||'content')+'.html';a.click()}

// ═══════════════════════════════════════════════════════════════
// TABS / EXPORT / RESET
// ═══════════════════════════════════════════════════════════════
function switchTab(t){
    document.querySelectorAll('.tab').forEach(b=>b.classList.remove('on'));
    document.querySelectorAll('.tpanel').forEach(p=>p.classList.remove('on'));
    document.querySelector(`.tab[onclick="switchTab('${t}')"]`)?.classList.add('on');
    $('tp-'+t)?.classList.add('on');
}

function exportCSV(){
    let csv='Keyword,Volume,CPC,Funnel,Conv Multiplier,Monthly Visitors,Monthly Leads,Monthly Closed,Close Rate %,Profit Per Job,Monthly Profit,Page Type,Status,Service\n';
    S.keywords.forEach(k=>{csv+=`"${k.keyword}",${k.volume},${k.cpc.toFixed(2)},${k.funnel},${k.convMultiplier},${k.monthlyVisitors},${k.monthlyLeads.toFixed(2)},${k.monthlyClosed.toFixed(3)},${k.closeRate},${k.profitPerJob},${k.roi.toFixed(0)},${k.pageType},${k.status},"${k.serviceName}"\n`});
    const b=new Blob([csv],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=S.domain+'-content-strategy.csv';a.click();toast('Exported CSV');
}

function resetAll(){
    $('dashboard').classList.remove('active');$('inputSection').style.display='block';$('exportBtn').style.display='none';$('newBtn').style.display='none';
    S.keywords=[];S.clusters=[];S.contentMap=[];S.calendar=[];S.cannibalizations=[];S.genContent={};S.selectedGen=null;
}

// Init
window.addEventListener('DOMContentLoaded',()=>{});
</script>
</body>
</html>