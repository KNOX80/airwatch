# AirWatch — Air Quality Dashboard

A React application that turns live environmental data into clear, interactive web tools.
It fetches real-time air quality data from the [Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api)
and presents it three ways: a live dashboard, a forecast chart, and an interactive map.

> Built as a focused exercise in consuming a real API and rendering JSON responses as
> React components — covering dashboards, charts and maps.

**Live demo:** _(add your deployed URL here, e.g. https://airwatch-yourname.vercel.app)_

---

## What it does

| View | Description | Built with |
|------|-------------|------------|
| **Dashboard** | Select a city and see the current European AQI plus individual pollutants (PM2.5, PM10, O₃, NO₂, SO₂, CO). The hero card changes colour with air quality severity. | React, Open-Meteo API |
| **Forecast** | A 48-hour particulate-matter forecast rendered as an area chart. | Recharts |
| **Map** | Live AQI for six Australian cities plotted on an interactive map, colour-coded by severity with hover detail. | React-Leaflet, OpenStreetMap |

## Highlights

- **Real API integration** — all data is fetched live from Open-Meteo; nothing is hardcoded.
- **Parallel requests** — the map view fetches six cities concurrently with `Promise.all`.
- **Loading & error states** — every view handles loading, network errors, and retry.
- **Data-driven colour** — air quality severity maps to a colour band shared across all three views.
- **Responsive** — works on mobile and desktop.

## Tech stack

- [React 18](https://react.dev/) (Vite)
- [Recharts](https://recharts.org/) — charting
- [React-Leaflet](https://react-leaflet.js.org/) + [OpenStreetMap](https://www.openstreetmap.org/) — mapping
- [Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api) — data (free, no API key required)

## Running locally

```bash
# 1. Clone the repo
git clone https://github.com/KNOX80/airwatch.git
cd airwatch

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

Then open the URL shown in the terminal (usually http://localhost:5173).

To create a production build:

```bash
npm run build
npm run preview
```

## Project structure

```
airwatch/
├── index.html          # Entry point (loads Leaflet CSS + Inter font)
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx        # React mount point
    └── App.jsx         # All three views (Dashboard / Forecast / Map)
```

## Notes

The app calls the Open-Meteo API directly from the browser. No backend or API key is needed.
Cities and pollutants are easy to extend — see the `CITIES` and `AQI_BANDS` arrays at the top of `src/App.jsx`.

---

_Built by Sotaro Mitsutake · 2026_
