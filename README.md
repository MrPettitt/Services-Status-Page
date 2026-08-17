# Status Page Template

A self-contained React status page component with an EKG/pulse-trace visual motif instead of the usual row of colored squares. Each component's uptime history renders as a heartbeat-style line that flatlines when healthy and dips on incidents, with an overall "vitals" trace at the top of the page.

![status](https://img.shields.io/badge/status-template-2954E5)

## Preview

- Overall system status banner with an animated pulse trace summarizing the worst active status across all components
- Components grouped into sections (e.g. Core Services, Edge & Delivery, Regions)
- Per-component 90-day EKG trace with hover tooltips (day + status) and an uptime percentage
- Expandable incident timeline with per-update notes and timestamps
- No external CSS framework required — plain CSS variables, easy to retheme

## Getting started

This is a single self-contained component: `status-page-template.jsx`.

### Requirements

- React 18+
- [lucide-react](https://www.npmjs.com/package/lucide-react) for icons

```bash
npm install lucide-react
```

### Usage

Drop the file into your project (e.g. `src/StatusPage.jsx`) and render it:

```jsx
import StatusPage from "./StatusPage";

function App() {
  return <StatusPage />;
}
```

The component is self-styled (fonts + CSS are injected via a `<style>` block inside the component), so no separate stylesheet import is needed.

## Customizing the data

Everything lives in the `statusConfig` object near the top of the file:

```js
const statusConfig = {
  productName: "Northwind Platform",
  groups: [
    {
      name: "Core Services",
      components: [
        { id: "api", name: "API", description: "Public REST + GraphQL endpoints", incidentDays: [4, 41] },
        // ...
      ],
    },
    // more groups...
  ],
  incidents: [
    {
      date: "Aug 1, 2026",
      title: "Elevated API latency",
      severity: "degraded", // "operational" | "degraded" | "partial" | "major" | "maintenance"
      updates: [
        { label: "Resolved", time: "Aug 1, 09:42", note: "Latency has returned to baseline for all endpoints." },
        // reverse-chronological order
      ],
    },
  ],
};
```

- **`groups`** — sections of related components. Each component needs a unique `id`, a `name`, a short `description`, and `incidentDays`: an array of day-offsets (0 = today, 90 = 90 days ago) where that component should show a simulated incident on its trace. This is demo-data generation — swap it for real uptime data from your monitoring system when you wire this up to a backend.
- **`incidents`** — the timeline shown at the bottom of the page. `severity` controls the colored dot; `updates` is the list of status entries shown when the incident is expanded.

### Wiring up real data

The `buildHistory()` and `overallStatus()` functions currently generate deterministic demo history from `incidentDays`. To use real data, replace `buildHistory(component)` with a call that maps your monitoring/incident data into the same shape:

```js
{ dayIndex: number, status: "operational" | "degraded" | "partial" | "major" | "maintenance" }
```

for each of the last 90 days, most recent last.

## Theming

Colors and fonts are defined as CSS variables inside the component's `<style>` block:

```css
--bg: #F7F8F6;
--surface: #FFFFFF;
--ink: #14171A;
--muted: #6B7280;
--line: #E2E5E1;
--green: #1F8A5F;
--amber: #C87F1A;
--red: #C4432B;
--accent: #2954E5;
--font-display: 'Space Grotesk', sans-serif;
--font-body: 'Inter', sans-serif;
--font-mono: 'IBM Plex Mono', monospace;
```

Change any of these to match your own brand.

## License

Use this however you like in your own projects.
