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
survey CSV ──> gui/ (local) ──> map, agents, desire lines, animation
                  │
                  └──> api/ /inputs/upload ──> Cloud Storage
                                                     │
                                        api/ /models/run (core/)
                                                     │
                                        overview / analysis / correlation
                                                     │
                                              gui/ (results view)
```

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

Actively being brought back to a working, deployed state after sitting as
disconnected components. Current state:

- ✅ **`core/` and `api/` are tested and working locally** — packaging bugs
  fixed, dependency pins corrected, real test coverage added.
- ✅ **`gui/` runs clean and has been verified end-to-end** (upload → map
  animation → export) via an automated smoke test.
- 🚧 **Not yet deployed anywhere.** `api/` is being set up on Render;
  file storage on Google Cloud Storage. `gui/`'s hardcoded endpoints
  still point at retired 2022-era infrastructure and need updating once
  the new API is live.
- 🚧 **`backend/`** works standalone but isn't part of this deployment
  pass yet.

See [CLAUDE.md](CLAUDE.md) for the full architecture writeup, known
gotchas, and conventions.

## Repository layout

```
acts-project/
├─ core/        # Python modeling library (the engine)
├─ api/         # Flask API
├─ gui/         # Electron desktop UI
├─ backend/     # Laravel onboarding backend
├─ archive/     # pristine original .zip deliverables (reference only)
├─ UI/          # UI reference screenshots
└─ CLAUDE.md    # detailed architecture & conventions
```
