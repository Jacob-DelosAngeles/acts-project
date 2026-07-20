# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this project is

**Project ACTS** is a transportation-engineering / urban-mobility toolset for
**activity-based travel-demand modeling**. Given a coded travel-survey dataset, it
estimates a chain of discrete-choice (multinomial / binary logit) models —
**travel decision → activity choice → destination choice → mode choice** — and
visualizes agents, desire lines, origin–destination flows, and route heatmaps on a
map. The bundled sample dataset is **Quezon City, Philippines** (OSM road network +
travel survey).

This repo is a **monorepo of four originally-separate components**. The upstream
repos live under `github.com/project-acts/*`; this repository collects them into one
project (newly created, not yet the canonical upstream).

## Repository layout

```
acts-project/
├─ core/        # Python modeling library (the engine) — was acts-core-main
├─ api/         # Flask API on Google App Engine — was acts-api-main
├─ gui/         # Electron desktop UI — was acts-gui-main
├─ backend/     # Laravel onboarding backend — was acts-get-started-backend-main
├─ archive/     # pristine original .zip deliverables (do not edit; reference only)
├─ UI/          # ACTS_1..5.jpg — UI reference screenshots
└─ CLAUDE.md
```

Each of `core/`, `api/`, `gui/`, `backend/` was originally its own GitHub repo
(`project-acts/acts-core`, etc.) and is now vendored flat at the project root. Work
directly in these directories. The `.zip` files under `archive/` are the pristine
delivery — don't edit them.

## Components

### 1. `acts-core` — modeling engine (Python, ~2022)
The statistical core. Everything else orchestrates it.

- **Discrete-choice models** wrap `statsmodels` `MNLogit` / `Logit`
  (`acts/model/base.py`): `MultinomialLogisticRegression`, `LogisticRegression`,
  with `.get_significant_vars(threshold)` helpers.
- **Model pipeline** (`acts/model/__init__.py`) — the *active* implementation:
  `TravelDecisionMLogit`, `ActivityChoiceMLogit`, `ModeChoiceMLogit`,
  `DestinationChoiceMLogit`. `_DynamicBaseMLogit` iteratively refits, dropping
  insignificant vars until all p-values < `pvalue_threshold` (default 0.05) or
  `MAX_ITERATIONS` (100) is hit.
- **Dataset utils** (`acts/model/dataset.py`): `divide(df, indep_var=...)` splits
  X/y and lowercases columns; `apply_collinearity_filter(X, vif_threshold=10.0)`
  drops collinear columns via VIF (parallelized with joblib).
- **OSM loader** (`acts/core/dataset/osm.py`): `load_osm(name)` reads a slugified
  `parquets/<name>.parquet` (e.g. `quezon-city.parquet`).
- **Entry points**: `lambda.py` (AWS Lambda — reads a parquet from S3, runs all four
  models, writes `*-overview/analysis/correlation.parquet` back to S3);
  `output-actual.py` (local reference run).

> ⚠️ **Two model implementations coexist.** `acts/model/` is the current pipeline
> (used by `lambda.py`). `acts/core/model/` is an older/partial variant with an
> incomplete `DestinationChoiceMLogit`. Prefer `acts.model.*`; confirm which is
> imported before editing model code.

### 2. `acts-api` — backend API (Python / Flask, GCP App Engine, ~2022)
`main.py` exposes:
- `GET /osm/ways?q=<dataset>` — road-network way IDs → lat/lng polylines.
- `POST /inputs/upload` — uploads a survey file to Google Cloud Storage.
- `POST /inputs/load` — reads a CSV by URL, returns columns + rows as JSON.

Depends on `acts.core`. Config via `app.yaml` (`runtime: python39`,
`CLOUD_STORAGE_INPUT_FILES` env var). Public base URL in the README is a GAE
deployment.

### 3. `acts-gui` — desktop UI (Electron + Leaflet, ~2025)
Cross-platform desktop app (`electron-forge`). Main process `src/main/index.js`;
renderer under `src/renderer/` with pages `index.html` / `inputs.html` /
`outputs.html`. Map/visualization logic in `src/renderer/js/`: `map.js`, `agent.js`,
`desire-lines.js`, `heatmap.js`, `graphhopper.js` (routing),
`events/{upload,model,download}.js`. Uses Leaflet + leaflet-routing-machine +
PapaParse + Material Web Components. CSV templates in `src/renderer/template/`
(`survey.csv`, `od.csv`, `data choice.csv`).

### 4. `acts-get-started-backend` — onboarding API (Laravel 11 / PHP, 2025)
Lightweight project-onboarding service. `ProjectUserController` stores name/email
(no unique constraint); Sanctum auth; SQLite by default. Newest and mostly separate
from the modeling stack.

## Data flow

```
survey CSV ──> acts-api /inputs/upload ──> GCS/S3
                                            │
                       lambda.py / acts-core models
                                            │
        overview / analysis / correlation parquet  ──> acts-gui (map, desire lines,
                                                                  heatmaps, OD flows)
```

Model inputs are **coded** survey tables: columns like `travel`, `act`, `mode`,
`dest*`, plus explanatory variables. Column names are lowercased internally, so
casing in CSVs doesn't matter.

## Dev commands

Run these **inside the relevant top-level component directory** (`core/`, `api/`,
`gui/`, `backend/`).

**acts-core** (Python 3.10; pins matter — `pandas<2.0`, `statsmodels<1.0`,
`numpy<2.0`, `scipy<1.11`):
```bash
pip install -e .                 # editable install
pytest                           # config in pyproject.toml (coverage on acts.core)
black .                          # line-length 79

# Run the models standalone (CSV in, JSON out). Writes to -o rather than
# stdout because statsmodels prints its optimizer log to stdout.
python acts_engine.py "base input.csv" -o results.json

# Build the bundled desktop engine (~350MB, gitignored). gui's `npm run make`
# packages whatever is in engine-dist/, so build this FIRST for a release.
python -m PyInstaller --onedir --noconfirm --clean --name acts-engine \
  --collect-all statsmodels --collect-data acts \
  --distpath ./engine-dist --workpath ./engine-build --specpath ./engine-build \
  acts_engine.py
```

> `--onedir`, not `--onefile`: one-file re-extracts ~350MB to temp on every
> run, which would erase the speed advantage over the hosted API.

**acts-api** (Flask):
```bash
pip install -r requirements.txt
python main.py                   # serves http://127.0.0.1:8080
```

**acts-gui** (Node ≥ 16.14, Electron 17):
```bash
npm install
npm start                        # electron-forge start
npm run make                     # build installers (bundles core/engine-dist/)
npm run lint
```

> **Run Model is local-first.** The renderer calls the bundled engine through
> `src/main/preload.js` → `src/main/engine.js` (the renderer is sandboxed with
> no Node access, so that bridge is the only route). If no engine is present
> it falls back to the hosted API. Build the engine in `core/` before
> `npm run make`, or the installer ships without local compute.

**acts-get-started-backend** (Laravel 11, PHP 8.2+, Composer):
```bash
composer install && npm install
cp .env.example .env && php artisan key:generate
php artisan migrate
php artisan serve                # http://127.0.0.1:8000
php artisan test
```

## Environment notes

- **OS is Windows 11**; default shell is PowerShell (a Bash tool is also available).
  Prefer forward-slash paths; watch for stray `.DS_Store` files from macOS authors.
- The Python components pin **old** dependency ranges (pandas 1.x, pyarrow 7.x,
  statsmodels 0.13.x). Use a dedicated virtualenv per component — don't upgrade the
  pins without checking the model math still runs.
- `acts-core` reads `.parquet` via `pyarrow`; the sample `quezon-city.parquet`
  ships inside `acts/core/dataset/parquets/`.

## Conventions

- Python style: `black`, 79-col; imports one-per-line as in existing files.
- Keep the four components independent — no cross-imports except `acts-api` and the
  Lambda depending on `acts.core`.
- When touching model estimation, preserve the p-value / VIF thresholds as tunable
  parameters (don't hard-code 0.05 / 10.0 at call sites).
- Reference UI behavior against the screenshots in `UI/` before changing renderer
  layout.
