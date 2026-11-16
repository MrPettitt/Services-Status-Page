import React, { useMemo, useState } from "react";
import { CheckCircle2, AlertTriangle, AlertOctagon, Wrench, ChevronDown, Bell, Activity } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  CONFIG: swap this out per project. Everything below reads from it. */
/* ------------------------------------------------------------------ */

const STATUS = {
  operational: { label: "Operational", color: "var(--green)", soft: "var(--green-soft)", icon: CheckCircle2, weight: 0 },
  degraded: { label: "Degraded Performance", color: "var(--amber)", soft: "var(--amber-soft)", icon: AlertTriangle, weight: 1 },
  partial: { label: "Partial Outage", color: "var(--amber)", soft: "var(--amber-soft)", icon: AlertTriangle, weight: 2 },
  major: { label: "Major Outage", color: "var(--red)", soft: "var(--red-soft)", icon: AlertOctagon, weight: 3 },
  maintenance: { label: "Under Maintenance", color: "var(--accent)", soft: "var(--accent-soft)", icon: Wrench, weight: 0 },
};

const statusConfig = {
  productName: "Northwind Platform",
  groups: [
    {
      name: "Core Services",
      components: [
        { id: "api", name: "API", description: "Public REST + GraphQL endpoints", incidentDays: [4, 41] },
        { id: "auth", name: "Authentication", description: "Login, sessions, tokens", incidentDays: [] },
        { id: "db", name: "Database", description: "Primary data store", incidentDays: [17] },
        { id: "queue", name: "Job Queue", description: "Background processing", incidentDays: [4, 5, 60] },
      ],
    },
    {
      name: "Edge & Delivery",
      components: [
        { id: "cdn", name: "CDN", description: "Static asset delivery", incidentDays: [] },
        { id: "web", name: "Web App", description: "Primary dashboard", incidentDays: [23] },
        { id: "mobile", name: "Mobile App", description: "iOS & Android clients", incidentDays: [] },
      ],
    },
    {
      name: "Regions",
      components: [
        { id: "af-south", name: "Africa (South)", description: "af-south-1", incidentDays: [] },
        { id: "eu-west", name: "Europe (West)", description: "eu-west-1", incidentDays: [] },
        { id: "us-east", name: "US East", description: "us-east-1", incidentDays: [4] },
      ],
    },
  ],
  incidents: [
    {
      date: "Aug 1, 2026",
      title: "Elevated API latency",
      severity: "degraded",
      updates: [
        { label: "Resolved", time: "Aug 1, 09:42", note: "Latency has returned to baseline for all endpoints." },
        { label: "Monitoring", time: "Aug 1, 09:10", note: "A fix has been deployed. Watching error rates closely." },
        { label: "Investigating", time: "Aug 1, 08:51", note: "We're looking into reports of slow API responses." },
      ],
    },
    {
      date: "Jul 24, 2026",
      title: "Job queue backlog",
      severity: "partial",
      updates: [
        { label: "Resolved", time: "Jul 24, 15:20", note: "Backlog cleared, processing times back to normal." },
        { label: "Identified", time: "Jul 24, 14:05", note: "A stuck worker pool was found and restarted." },
        { label: "Investigating", time: "Jul 24, 13:40", note: "Background jobs are taking longer than expected to process." },
      ],
    },
  ],
};

/* ------------------------------------------------------------------ */
/*  Deterministic 90-day history generator (seeded, so it's stable)    */
/* ------------------------------------------------------------------ */

function seededRand(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashId(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h || 1;
}

function buildHistory(component) {
  const rand = seededRand(hashId(component.id));
  const days = 90;
  const history = [];
  for (let i = 0; i < days; i++) {
    const dayIndex = days - i;
    let status = "operational";
    if (component.incidentDays.includes(dayIndex)) {
      const r = rand();
      status = r < 0.5 ? "major" : r < 0.8 ? "partial" : "degraded";
    }
    history.push({ dayIndex, status });
  }
  return history;
}

function uptimePercent(history) {
  const down = history.filter((h) => h.status !== "operational").length;
  return (100 - (down / history.length) * 100).toFixed(2);
}

function overallStatus(groups) {
  let worst = "operational";
  let worstWeight = 0;
  groups.forEach((g) =>
    g.components.forEach((c) => {
      const h = buildHistory(c);
      const today = h[h.length - 1].status;
      if (STATUS[today].weight > worstWeight) {
        worstWeight = STATUS[today].weight;
        worst = today;
      }
    })
  );
  return worst;
}

/* ------------------------------------------------------------------ */
/*  Signature element: EKG-style pulse trace                          */
/* ------------------------------------------------------------------ */

function EkgTrace({ history, color, height = 40, width = 640, big = false }) {
  const points = useMemo(() => {
    const n = history.length;
    const stepX = width / (n - 1);
    const baseY = height / 2;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const x = i * stepX;
      const st = history[i].status;
      let y = baseY;
      if (st !== "operational") {
        const dir = i % 2 === 0 ? -1 : 1;
        const amp = st === "major" ? height * 0.42 : st === "partial" ? height * 0.3 : height * 0.18;
        y = baseY + dir * amp;
      }
      pts.push([x, y]);
    }
    return pts;
  }, [history, width, height]);

  // build a path with sharp EKG-like spikes at incident points, flat elsewhere
  const path = points
    .map((p, i) => (i === 0 ? `M ${p[0]},${p[1]}` : `L ${p[0]},${p[1]}`))
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={big ? "sp-ekg-big" : "sp-ekg"}
      style={{ width: "100%", height }}
    >
      <path d={path} fill="none" stroke={color} strokeWidth={big ? 2.5 : 1.75} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Component row                                                     */
/* ------------------------------------------------------------------ */

function ComponentRow({ component }) {
  const history = useMemo(() => buildHistory(component), [component]);
  const today = history[history.length - 1].status;
  const meta = STATUS[today];
  const Icon = meta.icon;
  const uptime = uptimePercent(history);
  const [hover, setHover] = useState(null);

  return (
    <div className="sp-row">
      <div className="sp-row-top">
        <div className="sp-row-label">
          <span className="sp-row-name">{component.name}</span>
          <span className="sp-row-desc">{component.description}</span>
        </div>
        <div className="sp-pill" style={{ color: meta.color, background: meta.soft }}>
          <Icon size={14} strokeWidth={2.5} />
          {meta.label}
        </div>
      </div>
      <div className="sp-row-trace" onMouseLeave={() => setHover(null)}>
        <EkgTrace history={history} color={meta.color} />
        <div className="sp-trace-hitgrid">
          {history.map((h, i) => (
            <div
              key={i}
              className="sp-trace-hit"
              onMouseEnter={() => setHover({ i, status: h.status, dayIndex: h.dayIndex })}
            />
          ))}
        </div>
        {hover && (
          <div className="sp-tooltip" style={{ left: `${(hover.i / (history.length - 1)) * 100}%` }}>
            <span className="sp-tooltip-day">{hover.dayIndex === 0 ? "Today" : `${hover.dayIndex}d ago`}</span>
            <span className="sp-tooltip-status" style={{ color: STATUS[hover.status].color }}>
              {STATUS[hover.status].label}
            </span>
          </div>
        )}
      </div>
      <div className="sp-row-bottom">
        <span>90 days ago</span>
        <span className="sp-uptime">{uptime}% uptime</span>
        <span>Today</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Incident timeline                                                  */
/* ------------------------------------------------------------------ */

function IncidentItem({ incident }) {
  const [open, setOpen] = useState(false);
  const meta = STATUS[incident.severity];
  return (
    <div className="sp-incident">
      <button className="sp-incident-head" onClick={() => setOpen((o) => !o)}>
        <span className="sp-incident-dot" style={{ background: meta.color }} />
        <span className="sp-incident-title">{incident.title}</span>
        <span className="sp-incident-date">{incident.date}</span>
        <ChevronDown size={16} className={`sp-chevron ${open ? "sp-chevron-open" : ""}`} />
      </button>
      {open && (
        <div className="sp-incident-body">
          {incident.updates.map((u, i) => (
            <div className="sp-update" key={i}>
              <div className="sp-update-label">{u.label}</div>
              <div className="sp-update-note">{u.note}</div>
              <div className="sp-update-time">{u.time}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Root                                                                */
/* ------------------------------------------------------------------ */

export default function StatusPage() {
  const overall = useMemo(() => overallStatus(statusConfig.groups), []);
  const overallMeta = STATUS[overall];
  const headlineHistory = useMemo(
    () =>
      statusConfig.groups
        .flatMap((g) => g.components)
        .reduce((acc, c) => {
          const h = buildHistory(c);
          return acc.length ? acc.map((a, i) => (STATUS[h[i].status].weight > STATUS[a.status].weight ? h[i] : a)) : h;
        }, []),
    []
  );

  return (
    <div className="sp-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

        .sp-root {
          --bg: #F7F8F6;
          --surface: #FFFFFF;
          --ink: #14171A;
          --muted: #6B7280;
          --line: #E2E5E1;
          --green: #1F8A5F;
          --green-soft: #E6F4EC;
          --amber: #C87F1A;
          --amber-soft: #FBF0DF;
          --red: #C4432B;
          --red-soft: #FBE9E5;
          --accent: #2954E5;
          --accent-soft: #E8EDFC;
          --font-display: 'Space Grotesk', sans-serif;
          --font-body: 'Inter', sans-serif;
          --font-mono: 'IBM Plex Mono', monospace;

          background: var(--bg);
          color: var(--ink);
          font-family: var(--font-body);
          min-height: 100%;
          padding: 0 0 64px;
          box-sizing: border-box;
        }
        .sp-root * { box-sizing: border-box; }

        .sp-header {
          max-width: 880px;
          margin: 0 auto;
          padding: 40px 24px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .sp-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: var(--font-display);
          font-weight: 600;
          font-size: 18px;
          letter-spacing: -0.01em;
        }
        .sp-brand svg { color: var(--accent); }
        .sp-subscribe {
          font-family: var(--font-body);
          font-weight: 600;
          font-size: 13px;
          border: 1px solid var(--line);
          background: var(--surface);
          color: var(--ink);
          border-radius: 8px;
          padding: 9px 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: border-color 0.15s ease;
        }
        .sp-subscribe:hover { border-color: var(--accent); color: var(--accent); }

        .sp-hero {
          max-width: 880px;
          margin: 0 auto;
          padding: 48px 24px 8px;
        }
        .sp-hero-status {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 4px;
        }
        .sp-hero-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--dot-color);
          box-shadow: 0 0 0 6px var(--dot-soft);
        }
        .sp-hero-title {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: clamp(26px, 4vw, 34px);
          letter-spacing: -0.015em;
        }
        .sp-hero-sub {
          font-family: var(--font-mono);
          font-size: 13px;
          color: var(--muted);
          margin-top: 6px;
        }
        .sp-hero-trace-wrap {
          margin-top: 28px;
          border: 1px solid var(--line);
          background: var(--surface);
          border-radius: 12px;
          padding: 20px 20px 12px;
        }

        .sp-ekg-big path {
          animation: sp-draw 2.2s ease-out forwards;
        }
        .sp-ekg path {
          animation: sp-draw 1.4s ease-out forwards;
        }
        @keyframes sp-draw {
          from { stroke-dasharray: 2000; stroke-dashoffset: 2000; }
          to { stroke-dasharray: 2000; stroke-dashoffset: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .sp-ekg-big path, .sp-ekg path { animation: none; }
        }

        .sp-groups {
          max-width: 880px;
          margin: 32px auto 0;
          padding: 0 24px;
        }
        .sp-group {
          margin-bottom: 28px;
        }
        .sp-group-title {
          font-family: var(--font-display);
          font-weight: 600;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--muted);
          margin-bottom: 10px;
        }
        .sp-group-card {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 12px;
          overflow: hidden;
        }

        .sp-row {
          padding: 16px 20px 14px;
          border-bottom: 1px solid var(--line);
        }
        .sp-row:last-child { border-bottom: none; }
        .sp-row-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 10px;
        }
        .sp-row-label {
          display: flex;
          flex-direction: column;
        }
        .sp-row-name {
          font-weight: 600;
          font-size: 14.5px;
        }
        .sp-row-desc {
          font-size: 12.5px;
          color: var(--muted);
          margin-top: 1px;
        }
        .sp-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12.5px;
          font-weight: 600;
          padding: 5px 10px;
          border-radius: 999px;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .sp-row-trace {
          position: relative;
          height: 40px;
        }
        .sp-trace-hitgrid {
          position: absolute;
          inset: 0;
          display: flex;
        }
        .sp-trace-hit {
          flex: 1;
          cursor: default;
        }
        .sp-tooltip {
          position: absolute;
          top: -8px;
          transform: translate(-50%, -100%);
          background: var(--ink);
          color: #fff;
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 11.5px;
          white-space: nowrap;
          pointer-events: none;
          display: flex;
          flex-direction: column;
          gap: 1px;
          z-index: 5;
        }
        .sp-tooltip-day { font-family: var(--font-mono); opacity: 0.75; }
        .sp-tooltip-status { font-weight: 600; }

        .sp-row-bottom {
          display: flex;
          justify-content: space-between;
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--muted);
          margin-top: 6px;
        }
        .sp-uptime { color: var(--ink); font-weight: 500; }

        .sp-incidents {
          max-width: 880px;
          margin: 40px auto 0;
          padding: 0 24px;
        }
        .sp-incidents-title {
          font-family: var(--font-display);
          font-weight: 600;
          font-size: 18px;
          margin-bottom: 14px;
        }
        .sp-incident {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 10px;
          margin-bottom: 10px;
          overflow: hidden;
        }
        .sp-incident-head {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 16px;
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
          font-family: var(--font-body);
        }
        .sp-incident-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .sp-incident-title {
          font-weight: 600;
          font-size: 14px;
          flex: 1;
        }
        .sp-incident-date {
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--muted);
        }
        .sp-chevron { color: var(--muted); transition: transform 0.15s ease; }
        .sp-chevron-open { transform: rotate(180deg); }
        .sp-incident-body {
          padding: 0 16px 16px 34px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .sp-update-label {
          font-weight: 600;
          font-size: 13px;
        }
        .sp-update-note {
          font-size: 13px;
          color: var(--ink);
          margin-top: 2px;
        }
        .sp-update-time {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--muted);
          margin-top: 3px;
        }

        @media (max-width: 560px) {
          .sp-row-top { flex-direction: column; align-items: flex-start; }
        }
      `}</style>

      <div className="sp-header">
        <div className="sp-brand">
          <Activity size={20} strokeWidth={2.5} />
          {statusConfig.productName}
        </div>
        <button className="sp-subscribe">
          <Bell size={14} />
          Subscribe
        </button>
      </div>

      <div className="sp-hero" style={{ "--dot-color": overallMeta.color, "--dot-soft": overallMeta.soft }}>
        <div className="sp-hero-status">
          <span className="sp-hero-dot"></span>
          <span className="sp-hero-title">
            {overall === "operational" ? "All Systems Operational" : overallMeta.label}
          </span>
        </div>
        <div className="sp-hero-sub">Vitals across {statusConfig.groups.reduce((n, g) => n + g.components.length, 0)} components · last 90 days</div>
        <div className="sp-hero-trace-wrap">
          <EkgTrace history={headlineHistory} color={overallMeta.color} height={64} big />
        </div>
      </div>

      <div className="sp-groups">
        {statusConfig.groups.map((group) => (
          <div className="sp-group" key={group.name}>
            <div className="sp-group-title">{group.name}</div>
            <div className="sp-group-card">
              {group.components.map((c) => (
                <ComponentRow key={c.id} component={c} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="sp-incidents">
        <div className="sp-incidents-title">Past Incidents</div>
        {statusConfig.incidents.map((incident, i) => (
          <IncidentItem incident={incident} key={i} />
        ))}
      </div>
    </div>
  );
}
