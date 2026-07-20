# Project ACTS

**Activity-based travel-demand modeling for urban mobility.** Given a coded
travel-survey dataset, ACTS estimates a chain of discrete-choice models —
**travel decision → activity choice → destination choice → mode choice** —
and visualizes agents, desire lines, origin–destination flows, and route
heatmaps on a map. The bundled sample dataset covers **Quezon City,
Philippines** (OSM road network + travel survey).

![CI - core](https://github.com/Jacob-DelosAngeles/acts-project/actions/workflows/core.yml/badge.svg)
![CI - api](https://github.com/Jacob-DelosAngeles/acts-project/actions/workflows/api.yml/badge.svg)
![CI - backend](https://github.com/Jacob-DelosAngeles/acts-project/actions/workflows/backend.yml/badge.svg)
![CI - gui](https://github.com/Jacob-DelosAngeles/acts-project/actions/workflows/gui.yml/badge.svg)

## What's here

This is a monorepo of four components that were originally separate
projects, consolidated to work together:

| Component | Stack | Role |
|---|---|---|
| [`core/`](core/) | Python (pandas, statsmodels) | The modeling engine — fits the four discrete-choice models against coded survey data |
| [`api/`](api/) | Flask | Backend API — serves OSM road-network data, handles survey/OD/choice-set uploads, runs models on request |
| [`gui/`](gui/) | Electron + Leaflet | Desktop app — the actual user-facing tool: map, agent animation, desire lines, heatmaps, CSV upload/export |
| [`backend/`](backend/) | Laravel 11 | Lightweight onboarding/signup API, independent of the modeling stack |

```
survey CSV ──> gui/ (local blobs) ──> map, agents, desire lines, animation
                  │
                  └── POST the CSV ──> api/ /models/run ──> core/ fits the
                                              │             four models
                                              ▼
                              overview / analysis / correlation
                                              │
                                              ▼
                                    gui/ Outputs (spreadsheet)
```

The desktop app needs **no cloud storage**: the visualization runs entirely
on local blob URLs, and the survey CSV is posted straight to `/models/run`,
which returns the fitted model summaries in the response.

## Getting started

Each component is developed independently — see its own README/CLAUDE.md
for details. Quick start per component (run from inside that directory):

**`core/`** — Python 3.10 (pinned dependencies don't install on newer
Pythons — see [CLAUDE.md](CLAUDE.md)):
```bash
pip install -e .
pytest
```

**`api/`** — depends on `core/` via a local path reference:
```bash
pip install -r requirements.txt -r requirements/dev.txt
python main.py            # http://127.0.0.1:8080
```

**`gui/`** — Node 20+:
```bash
npm install
npm start
```

**`backend/`** — PHP 8.2+, Composer:
```bash
composer install
cp .env.example .env && php artisan key:generate
php artisan migrate
php artisan serve         # http://127.0.0.1:8000
```

Or bring up `core/`+`api/`+`backend/` together with Docker:
```bash
cp api/.env.example api/.env        # fill in real values for cloud storage
cp backend/.env.example backend/.env
docker compose up --build
```

## Project status

Brought back from four disconnected components to a working, deployed
system. Current state:

- ✅ **`core/` and `api/` tested** — packaging bugs fixed, dependency pins
  corrected (Python 3.10, `numpy<2`, `scipy<1.11`), real test coverage.
- ✅ **`api/` is deployed** on Render's free tier and serving requests.
  A full four-model run against the Quezon City sample returns real
  coefficients in ~2 minutes on free-tier hardware.
- ✅ **No cloud storage, no billing account.** `/models/run` accepts the
  CSV directly, so the whole pipeline runs on free infrastructure.
- ✅ **`gui/` is wired to the live API** and off the retired 2022-era
  AWS/S3/UPLB endpoints. Verified in a real Electron launch: boots clean
  and renders model results.
- ✅ **Installer builds** via `npm run make` (Squirrel/Windows). The
  installer is unsigned, so Windows SmartScreen warns on first run.
- 🚧 **Inputs/Outputs spreadsheet round-trip.** The Outputs page renders
  `/models/run` results, but the legacy *Inputs* spreadsheet page still
  expects the old storage-backed contract and is not rebuilt yet.
- 🚧 **`backend/`** (Laravel onboarding) works standalone but isn't
  deployed; the desktop app's get-started form is non-blocking without it.

See [CLAUDE.md](CLAUDE.md) for the full architecture writeup, known
gotchas, and conventions.

## Repository layout

```
acts-project/
├─ core/        # Python modeling library (the engine)
├─ api/         # Flask API (deployed on Render)
├─ gui/         # Electron desktop UI
├─ backend/     # Laravel onboarding backend
├─ web/         # landing / download page (static, for Vercel)
├─ render.yaml  # Render blueprint for the API service
├─ archive/     # pristine original .zip deliverables (reference only)
├─ UI/          # UI reference screenshots
└─ CLAUDE.md    # detailed architecture & conventions
```
