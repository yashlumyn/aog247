# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

**PartSense** (aog247) is an industrial parts anomaly detection system for MRO/AOG operations. It uses a PatchCore-style ML pipeline with a frozen WideResNet50 backbone to compare uploaded part images against a pre-built memory bank of normal parts, returning an anomaly score and heatmap.

**Scope (PoC):** PatchCore only. MSAPC (MAFF + SAE + PLE) is Phase 2 and must not be introduced in the current codebase.

---

## Project Root

```
/Users/yashlinn/Makayan Ltd/LUMYN Consulting/Clients/projects/aog247/
```

## Verified File Structure

```
aog247/
├── CLAUDE.md
├── Dockerfile
├── model_versions.md
├── requirements.txt
├── start_demo.sh
├── stop_demo.sh
│
├── app/
│   ├── __init__.py
│   ├── admin.py          ← admin endpoints
│   ├── api.py            ← inference endpoints + feedback logging
│   ├── audit_log.py      ← CSV audit log utility
│   ├── feedback.py       ← SQLite feedback utility
│   └── main.py           ← FastAPI setup, static serving, routing
│
├── pipeline/
│   ├── __init__.py
│   ├── backbone.py       ← WideResNet50 feature extractor
│   ├── detect.py         ← PatchCore inference + heatmap
│   ├── ingest.py         ← UUID job ingestion
│   └── preprocess.py     ← ImageNet preprocessing
│
├── scripts/
│   ├── anomaly_score.py
│   └── build_memory.py   ← memory bank build script
│
├── artifacts/
│   ├── audit_log.csv           ← inference audit log (append-only)
│   ├── feedback.db             ← SQLite technician feedback store
│   ├── memory_bank.pt          ← active dev memory bank (mutable)
│   ├── demo_memory_bank.pt     ← frozen demo bank (DO NOT MODIFY)
│   └── releases/
│       └── v3.1.1/
│           ├── baseline_meta.txt
│           └── model_meta.json
│
├── data/
│   ├── front_view_smoke_test_only.jpg
│   ├── derived/
│   │   ├── renders_v1/         ← empty
│   │   └── renders_v2_baseline/ ← active training images (being populated)
│   └── raw/
│       ├── Rib /               ← raw iPhone captures (24 originals + 24 edited copies)
│       │   ├── IMG_0234.jpg ... IMG_0296.jpg  (originals)
│       │   └── IMG_E0234.jpg ... IMG_E0296.jpg (iPhone edits — do not use for training)
│       └── [UUID dirs]/        ← ingest job metadata
│
├── ui/partsense-ui/
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── package.json
│   ├── dist/                   ← production build (served by FastAPI) — rebuild after UI changes
│   └── src/
│       ├── App.jsx             ← root component, tab routing (Inspection / Admin)
│       ├── App.css
│       ├── index.css
│       ├── main.jsx
│       └── admin/
│           ├── ActiveModelPanel.jsx   ← reads GET /admin/active-model
│           ├── AdminPage.jsx          ← composes all admin panels
│           ├── AuditLogPanel.jsx      ← inference log table + CSV download
│           ├── BuildPanel.jsx         ← memory bank build trigger + SSE progress
│           ├── ThresholdPanel.jsx     ← view + update threshold
│           ├── TrainingDataPanel.jsx  ← upload/view/delete training images
│           └── ValidationPanel.jsx   ← validation inference view
```

---

## Commands

### Backend

```bash
source .venv/bin/activate

# Run API server
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Run with specific versioned memory bank
MEMORY_BANK=artifacts/releases/v3.1.1/memory_bank.pt uvicorn app.main:app --host 0.0.0.0 --port 8000

# Rebuild memory bank
python scripts/build_memory.py
```

### Frontend

```bash
cd ui/partsense-ui
npm install
npm run dev        # dev server — localhost:5173
npm run build      # production build → dist/ (served by FastAPI)
```

### Demo & Docker

```bash
./start_demo.sh    # API + ngrok tunnel at https://psdemo.ngrok.app
./stop_demo.sh

docker build -t aog247 .
docker run -p 8000:8000 -e MEMORY_BANK=artifacts/releases/v3.1.1/memory_bank.pt aog247
```

---

## Project Phase Status

| Phase | Name | Dates | Status |
|---|---|---|---|
| 1 | Foundations & Feasibility | 26 Jan – 06 Feb 2026 | ✅ Complete |
| 2 | System Integration | 09 Feb – 20 Feb 2026 | ✅ Complete |
| 3A | Backend Admin UI | 23 Feb – 06 Mar 2026 | ✅ Complete |
| 3B | Technician UI & Feedback Capture | 09 Mar – 20 Mar 2026 | ✅ Complete |
| 4 | Validation, Tuning & Roadmap | 23 Mar – 03 Apr 2026 | ⬜ Pending |

### Phase 3B Complete — Next: Training Data + Phase 4

| # | Item | Status |
|---|---|---|
| 1 | Accept/Reject feedback capture (Inspection page) | ✅ Complete |
| 2 | Optional defect category label (dropdown) | ✅ Complete |
| 3 | Feedback storage — SQLite at `artifacts/feedback.db` | ✅ Complete |
| 4 | Threshold refinement based on usage | ⬜ Deferred — needs real feedback data |
| 5 | Technician UX iteration | ⬜ Deferred — needs real usage data |
| 6 | Decision gate: assess FP/FN behaviour | ⬜ Deferred — Phase 4 activity |

### Pre-Phase 4 Requirements (must complete first)

1. Load quality training images into `data/derived/renders_v2_baseline/`
2. Rebuild memory bank via Admin UI
3. Calibrate threshold via Admin UI
4. Then proceed to Phase 4 validation

### Phase 4 Build Order

| # | Item | Status |
|---|---|---|
| 1 | Broader sample set validation | ⬜ Pending |
| 2 | Performance envelope documentation | ⬜ Pending |
| 3 | Validate capture & preprocessing consistency | ⬜ Pending |
| 4 | Demo scenario preparation | ⬜ Pending |
| 5 | Phase 2 upgrade path definition | ⬜ Pending |
| 6 | Final project documentation | ⬜ Pending |

---

## API Endpoints

### Inference (`app/api.py`)

| Method | Path | Description |
|---|---|---|
| POST | /detect_anomaly | Run inference; logs to `audit_log.csv` |
| POST | /feedback | Store technician verdict + optional defect category to `feedback.db` |
| POST | /ingest | UUID-based image ingestion |
| GET | /health | Health check |

### Admin (`app/admin.py`)

| Method | Path | Description |
|---|---|---|
| GET | /admin/active-model | Returns `model_meta.json` contents |
| POST | /admin/build | Triggers memory bank build (SSE stream) |
| POST | /admin/threshold | Updates threshold in `model_meta.json` |
| GET | /admin/log | Returns audit log entries as JSON |
| GET | /admin/log/download | Returns raw CSV for download |
| GET | /admin/training-images | Lists images in `renders_v2_baseline/` |
| POST | /admin/training-images/upload | Uploads images to `renders_v2_baseline/` |
| DELETE | /admin/training-images | Moves all images to trash folder |
| DELETE | /admin/training-images/{filename} | Moves single image to trash folder |

---

## Architecture

### Data Flow

1. Image upload → `POST /detect_anomaly`
2. `pipeline/preprocess.py` — resize 256px, centre-crop 224×224, ImageNet normalise
3. `pipeline/backbone.py` — WideResNet50 (frozen), hooks on `layer2` + `layer3`
4. `pipeline/detect.py` — patch-wise Euclidean distance vs `memory_bank.pt`; max = anomaly score
5. Heatmap — upsample layer3 distances to original resolution, return as base64 PNG
6. Response: `{ anomaly_score, is_anomalous, heatmap_b64, model_version }`
7. `app/audit_log.py` — appends entry to `artifacts/audit_log.csv`

### Feedback Flow

1. Technician views result on Inspection page
2. Clicks Accept or Reject
3. `POST /feedback` → `app/feedback.py` → writes to `artifacts/feedback.db`
4. Fields: `timestamp, image_filename, anomaly_score, is_anomalous, technician_verdict, defect_category (nullable), model_version`

### Single-Port Architecture

FastAPI serves both API and React `dist/` on port 8000. No separate frontend server in production. CORS locked to `localhost:5173` and `192.168.1.12:5173` for dev only.

---

## Admin UI Layout

```
[Active Model — row 1, full width                            ]
[Training Data — row 2, col 1 ] [Build Memory Bank — row 2, col 2]
[Threshold     — row 3, col 1 ] [Validation Inference — row 3, col 2]
[Audit Log     — row 4, col 1 ]
```

### Build Memory Bank — 5 Stages

1. Model load — WideResNet50 weights loading
2. Process images — per-image forward pass (live count)
3. Concatenate patches — merging patch tensors
4. Subsample — reducing to 20,000 patches
5. Save memory bank — writing to disk

SSE event types: `status` → `log` → `done`. Returns 409 if already running.

### AuditLogPanel Behaviour

- Do NOT fetch on mount
- Show "No entries yet" on initial render
- Fetch only on: Refresh click OR after ValidationPanel inference completes

---

## Model Versioning

- Format: `PN-XXX_vX.X.X`
- One model per part number
- Threshold per-model — stored in `model_meta.json`, never hardcoded

### model_meta.json

Location: `artifacts/releases/v3.1.1/model_meta.json`

```json
{
  "model_id": "PN-XXX_v3.1.1",
  "part_number": "PN-XXX",
  "version": "3.1.1",
  "backbone": "WideResNet50",
  "layers": ["layer2", "layer3"],
  "threshold": 0.5,
  "patch_count": 20000,
  "training_images": 24,
  "memory_bank_path": "artifacts/releases/v3.1.1/memory_bank.pt",
  "git_commit": "<commit_hash>",
  "created_at": "YYYY-MM-DD"
}
```

### Active Model Rule

Declared via `MEMORY_BANK` env var. Never silently fall back to an arbitrary `.pt` file.

---

## Dev / Demo Separation

| | Dev | Demo |
|---|---|---|
| Memory bank | `artifacts/memory_bank.pt` | `artifacts/demo_memory_bank.pt` |
| State | Mutable | Frozen (v3.1.1) — DO NOT MODIFY |

---

## Baseline Lock — v3.1.1

Do not alter:
- `artifacts/releases/v3.1.1/memory_bank.pt`
- Backbone: WideResNet50, `layer2` + `layer3`
- Threshold: 0.5
- Training data: `data/derived/renders_v2_baseline/`
- Memory bank shape: `torch.Size([20000, 512])`

To change anything, create a new versioned release.

---

## Training Data

- **Active training images:** `data/derived/renders_v2_baseline/`
- **Raw captures:** `data/raw/Rib /` — 24 originals (`IMG_XXXX.jpg`) + 24 iPhone edits (`IMG_EXXXX.jpg`)
- **Use originals only** for training — ignore `IMG_E*` edited copies
- **Trash folder:** `data/derived/renders_v2_baseline_trash/` — images moved here on delete, not permanently removed

---

## Current System State

| Component | Status |
|---|---|
| PatchCore ML pipeline | ✅ Working |
| WideResNet50 backbone (frozen) | ✅ Working |
| FastAPI backend + `/detect_anomaly` | ✅ Working |
| React technician UI (Inspection page) | ✅ Working |
| Single-port architecture (port 8000) | ✅ Working |
| Docker / ngrok | ✅ Working |
| v3.1.1 baseline locked | ✅ Complete |
| model_meta.json for v3.1.1 | ✅ Complete |
| Admin UI — All 6 panels | ✅ Complete |
| `POST /feedback` endpoint | ✅ Complete |
| `artifacts/feedback.db` SQLite store | ✅ Complete |
| Accept/Reject UI on Inspection page | ✅ Complete |
| Defect category dropdown (Inspection page) | ✅ Complete |
| Training images in renders_v2_baseline | 🔄 Being populated |
| Technician defect category labels | ⬜ Pending |
| Threshold refinement from feedback | ⬜ Pending |
| Validation against broader sample set | ⬜ Pending (Phase 4) |

---

## Key Conventions

- **Threshold:** per-model in `model_meta.json` — never hardcode
- **`.pt` files:** excluded from Git via `.gitignore`
- **API response:** always include `model_version` for traceability
- **Audit log:** append-only — never delete entries
- **Feedback:** SQLite at `artifacts/feedback.db` via `app/feedback.py`
- **Frontend build:** run `npm run build` in `ui/partsense-ui/` after any UI changes before testing via FastAPI
- **Admin vs Technician:** `/admin/*` for engineering controls; `/` for technician inspection

---

## Out of Scope (PoC)

- MSAPC modules (MAFF, SAE, PLE) — Phase 2
- Supervised neural network training
- OEM certification
- Production deployment infrastructure
- Multi-user authentication
- Multi-model / multi-part support — Phase 2

---

## Hardware

- **Dev machine:** Mac mini, Apple M2, 8-core, 16GB
- **Runtime:** CPU / MPS — no NVIDIA GPU required

---

## Containerization & Deployment Architecture

### Decisions (established Mar 2026)

- Containerize now — pipeline is functionally stable and entering the training/data-intensive phase
- Container = disposable compute only; all state lives on NAS volumes
- MSAPC additions (MAFF, SAE, PLE) are additive — container structure unchanged when integrated

### Stateful vs Stateless

**Stateful — must mount from NAS, never inside container:**
- `artifacts/memory_bank.pt`
- `artifacts/releases/*/memory_bank.pt`
- `artifacts/feedback.db`
- `artifacts/audit_log.csv`
- `data/derived/renders_v2_baseline/` (training images)
- Heatmap outputs / results

**Stateless — lives inside container:**
- Python dependencies
- FastAPI app code
- PatchCore inference logic
- Docker image layers

### Volume Mount Pattern

```bash
docker run \
  -v /volume1/datasets:/app/data/derived \
  -v /volume1/models:/app/artifacts/releases \
  -v /volume1/results:/app/artifacts \
  -p 8000:8000 \
  -e MEMORY_BANK=artifacts/releases/v3.1.1/memory_bank.pt \
  aog247
```

### PoC vs Production Architecture

**PoC (current):** Container runs on TerraMaster NAS (TOS Docker Engine). Compute and storage co-located. Acceptable for PoC; ~1–5s CPU inference per image.

**Production (planned):** Container moves to dedicated GPU compute server. NAS remains central storage. UI and API unchanged — only compute location changes.

```
PoC:   Technician UI → REST API (NAS) → PatchCore → NAS storage
Prod:  Technician UI → REST API (GPU server) → PatchCore/MSAPC → NAS storage
```

### TerraMaster NAS Notes

- Client NAS: TerraMaster U12-500 Plus, Intel i7-1255U, ~16GB RAM, ~33TB storage
- TOS supports Docker Engine natively via App Center (Docker Manager GUI)
- TOS ecosystem less mature than standard Linux — expect limited CLI tooling, occasional SSH workarounds for debugging
- Real PoC risks: RAM headroom (16GB shared), no GPU, TOS ecosystem maturity
- None of these block the PoC

### Rule

Treat the container as disposable compute. Treat the NAS as permanent state. Migration from NAS → GPU server is trivial if this rule is followed.

### Containerisation Status (verified 05 Mar 2026)

- **Base image:** `python:3.11-slim` — 3.9 rejected; pinned deps require Python ≥3.10
- **`docker-compose.yml`** in project root; volume mounts: `./data/derived:/app/data/derived` and `./artifacts:/app/artifacts`
- **Container verified healthy locally** — `GET /health` returns `{"status":"ok"}` with clean startup (no errors)
- **`requirements.txt`** regenerated from `.venv` as UTF-8 (original was UTF-16 encoded); `python-multipart==0.0.20` confirmed present
- **Next step:** deploy to TerraMaster NAS
