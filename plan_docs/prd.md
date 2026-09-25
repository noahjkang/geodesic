# Project Title: TopoAcoustic Discovery Engine
**Document Version:** 2.0.0
**Date:** July 1, 2026
**Document Status:** Approved / Baseline
## 1. Executive Summary & Core Philosophy
### 1.1 Product Vision
The TopoAcoustic Discovery Engine is a specialized, standalone music discovery platform built to eliminate the "cold-start" problem systemic in modern streaming algorithms. The platform completely bypasses crowd-sourced behavioral loops, social graphing, and popularity metrics. Instead, it operates under a pure mathematical paradigm: modeling audio tracks as continuous geometric manifolds and calculating recommendations based strictly on structural homology and acoustic geometry.
### 1.2 Target Audience & Market Positioning
The primary user base consists of any person who is interested in exploring their music taste. These users actively seek music that exists outside mainstream commercial distribution networks. The core product mandate dictates that the discovery engine exclusively indexes and surfaces independent, underground, or long-tail artists—defined strictly as those possessing fewer than 500,000 lifetime streams on dominant commercial platforms.
### 1.3 Differentiation Strategy
Unlike traditional recommendation engines that use collaborative filtering or content-based linear tagging (e.g., explicit genre strings), this engine treats raw acoustic waveforms as topological point clouds. An obscure track with zero historical plays will be surfaced immediately alongside established indie benchmarks if its underlying geometric shape aligns with the user's taste manifold.

## 2. Mathematical Foundations & Processing Pipeline
The core engine relies on modeling audio signals as continuous bounded metric spaces $X \subset \mathbb{R}^n$. The transformation of raw audio into a searchable vector index follows a strict, non-linear mathematical pipeline.
### 2.1 Digital Signal Processing & Feature Extraction
Audio is streamed into memory (bypassing disk storage) and converted into a uniform numerical matrix. The platform rejects high-level metadata tags in favor of low-level psychoacoustic coordinates:
- **Mel-Frequency Cepstral Coefficients (MFCCs):** 20 coefficients computed over window lengths of 2,048 samples with a hop length of 512 samples, capturing the precise timbral envelope.
- **Spectral Centroid:** Computes the center of gravity of the spectrum, mapping the perceived "brightness" of the audio signal over time.
- **Daubechies Wavelet Histograms:** Wavelet transforms decompose the signal into multi-resolution frequency bands, creating stable histograms that represent transient rhythmic structures and localized energy shifts without sacrificing time-domain localization.
### 2.2 Time-Delay Embedding (Takens' Theorem)

To capture the evolution of acoustic structures over time, the time-series vectors derived from the spectral features are projected into a higher-dimensional phase space. Using Takens' Embedding Theorem, a continuous trajectory point cloud is reconstructed via the formula:
$$X(t) = [x(t), x(t + \tau), x(t + 2\tau), \dots, x(t + (d-1)\tau)]$$
Where:
- $x(t)$ represents the localized acoustic feature value at time $t$.
- $\tau$ is the optimal time delay calculated using the first minimum of the Mutual Information function.
- $d$ is the embedding dimension determined via the False Nearest Neighbors (FNN) algorithm to ensure the trajectory is fully unrolled without self-intersection.
### 2.3 Persistent Homology & Vietoris-Rips Filtration
The reconstructed point cloud undergoes abstract simplicial complex construction to identify global geometric properties that survive across varying scales.
- **Vietoris-Rips Filtration:** An abstract simplicial complex $VR(X, \epsilon)$ is constructed by forming a simplex for every subset of points in $X$ whose pairwise distance is at most $\epsilon$.
- **Homology Groups & Betti Numbers:** As $\epsilon$ varies from 0 to $\infty$, the engine tracks the birth and death of topological invariants across specific homology groups.
- $H_0 (\beta_0)$: Quantifies connected components (timbral clusters).
- $H_1 (\beta_1)$: Quantifies 1-dimensional loops (cyclic rhythmic patterns or recurring harmonic progressions).
- $H_2 (\beta_2)$: Quantifies 2-dimensional voids or cavities (complex structural envelopes enclosing acoustic spaces).


### 2.4 Continuous Vectorization via Persistence Landscapes

Because raw persistence diagrams (birth-death coordinates) do not form a vector space suitable for standard database indexing, they are mapped into stable elements of a Banach space using Persistence Landscapes.

- A sequence of continuous, piecewise-linear functions $\lambda_k(t)$ is generated from the birth-death pairs.

- These landscapes preserve the stability theorem (small perturbations in the audio signal result in small perturbations in the landscape).

- **Fréchet Means:** Multiple tracks chosen by a user can be averaged directly within this landscape space to compute a single, unified topological profile representing the exact geometric "center" of a user's musical preference.


### 2.5 Distance Metrics via Optimal Transport

To evaluate the similarity between two distinct tracks or between a user's profile and a track, the engine calculates the Wasserstein Distance ($\mathcal{W}_p$) between their persistence landscapes. This frames similarity as an optimal transport problem, measuring the minimum mathematical work required to deform one topological manifold into another.

## 3. Domain-Driven System Architecture

The system abandons the traditional frontend/backend monolith in favor of a strictly decoupled, 5-Workstream Domain-Driven Architecture.

### 3.1 Workstream 1: ETL Pipeline (Data & Math)

**Goal:** The asynchronous, headless data engine that scours for tracks, streams audio into memory, applies DSP, and executes Topological Data Analysis to generate 1500-d vectors.

**Sub-Project 1A: Audio Ingestion**

- **Description:** The automated scout interfacing with Spotify Web API to discover tracks and pass their URLs to the stream-and-discard pipeline.

- **Inputs:** Spotify Web API search endpoints. Scheduled via Cron/Daemon.

- **Outputs:** Pushes local audio path and metadata to Redis message queue.

- **Failure States:** API Rate Limiting (applies exponential backoff), Dead URLs (logs and skips), Corrupt Files (deletes partial fragments).

- **Performance:** Buffer memory must be actively managed. Audio is never saved to disk; the in-memory buffer is discarded immediately after extraction.


**Sub-Project 1B: Feature Extraction**

- **Description:** Strips noise and distills the memory buffer into a 48-D point cloud (12-D Chroma, 12-D Timbre, Takens delay embedding, beat-synchronous pooling).

- **Inputs:** Redis message queue payload containing the downloaded `.mp3` path.

- **Outputs:** Serialized Base64 NumPy matrix pushed to the Topology Engine queue. Local file deletion triggered.

- **Failure States:** Corrupt File (drops track), Truncated Time-Series (fails Takens threshold, drops track).

- **Performance:** Must execute in < 1.5 seconds per track. Capped at < 500MB RAM per worker. Multiprocessing mandated.


**Sub-Project 1C: Topology Engine**

- **Description:** Projects the DSP matrix into phase space, computes Vietoris-Rips complexes, extracts homology, and outputs the 1500-d vector.

- **Inputs:** Redis message queue containing the 48-D beat-synchronized point cloud.

- **Outputs:** JSON payload containing the 1500-d topological signature and Betti summaries, sent to Workstream 2 & 3.

- **Failure States:** Manifold Collapse (flags track as Null Topology), Combinatorial Explosion/OOM (aborts heavy point clouds via max_edge_length limits).

- **Performance:** Must execute in < 4.0 seconds per track. Strict 2GB RAM allocation per worker process.


### 3.2 Workstream 2: Vector Search Infrastructure

**Goal:** The high-speed spatial mapping microservice holding the acoustic universe in RAM, accompanied by the NLP router.

**Sub-Project 2A: HNSW Vector Node**

- **Description:** In-memory Hierarchical Navigable Small World graph for sub-millisecond similarity searches across 1500-d spaces.

- **Inputs:** Ingestion payload from ETL, or query payload (target_vector, k limit) from API Gateway.

- **Outputs:** Array of Nearest Neighbor integer IDs mapped to Spotify IDs, with L2 distances.

- **Failure States:** OOM (container restarts from last disk snapshot), Snapshot Failure (read-replica remains active in RAM).

- **Performance:** Query read latency < 10ms. Write latency < 50ms. Minimum 1GB RAM allocation for 50k tracks.


**Sub-Project 2B: Semantic Router**

- **Description:** Translates natural language strings into synthetic "ghost coordinates" (1500-d vectors) using a quantized NLP model.

- **Inputs:** Raw text string from UI command line (via API Gateway).

- **Outputs:** JSON mapping of acoustic axes and the synthesized 1500-d target vector.

- **Failure States:** LLM Hallucination/Parse Error (falls back to a neutral 0.5 parameter vector), Inference Timeout (aborts after 250ms).

- **Performance:** End-to-end translation and synthesis must complete in < 300ms. Requires 6GB+ VRAM or optimized ONNX CPU runtime.


### 3.3 Workstream 3: Orchestration & State API

**Goal:** The stateless Backend-For-Frontend (BFF) handling user auth, routing scatter-gather requests, and storing relational metadata.

**Sub-Project 3A: API Gateway**

- **Description:** The FastAPI traffic controller. Validates JWTs, enforces Pydantic schemas, and stitches HNSW math with PostgreSQL text.

- **Inputs:** HTTP/WSS requests from the React Client.

- **Outputs:** Unified JSON payloads combining track metadata and mathematical distances.

- **Failure States:** Malformed Client Request (returns 422 Unprocessable Entity), Internal Microservice Timeout (returns 503).

- **Performance:** Adds < 15ms overhead per request. Total round-trip < 100ms. Stateless workers utilizing ~150MB RAM each.


**Sub-Project 3B: Relational States**

- **Description:** Supabase/PostgreSQL database storing human-readable track data and tracking active user coordinates.

- **Inputs:** Bulk track ID lookups or episodic user session `UPSERT` commands from the Gateway.

- **Outputs:** JSON rows of metadata or successful transaction confirmations.

- **Failure States:** Connection Exhaustion (mitigated by PgBouncer), RLS Violation (blocks unauthorized row updates).

- **Performance:** Indexed reads < 15ms. Episodic writes < 25ms. Must support 500+ concurrent pooled connections.


### 3.4 Workstream 4: Client Application (Frontend)

**Goal:** The interactive UI split between a WebGL spatial canvas and floating React DOM overlays.

**Sub-Project 4A: WebGL Manifold**

- **Description:** Renders thousands of tracks as a 2D/3D UMAP coordinate point cloud via a single `InstancedMesh`.

- **Inputs:** UMAP coordinates and active target vectors from the Zustand store.

- **Outputs:** Visual rendering to the user, emits selection coordinates back to Zustand upon raycast click.

- **Failure States:** WebGL Context Lost (auto-recovers scene), Mobile GPU Throttling (degrades to 1k node limit).

- **Performance:** Strict adherence to 60fps rendering. Maximum 5 draw calls for the entire dataset.


**Sub-Project 4B: UI Overlays**

- **Description:** The DOM layer (Command Line, HUD). Captures input and dispatches API calls without triggering canvas re-renders.

- **Inputs:** User interactions and API Gateway responses.

- **Outputs:** Debounced HTTP/WSS payloads to the backend, updates Zustand global state.

- **Failure States:** API Timeout (glows red, displays error), WebSocket Disconnect (disables sliders, shows reconnecting UI).

- **Performance:** Slider interaction debounced to ~100ms. UI state changes must NOT trigger `<Canvas>` re-renders.


**Sub-Project 4C: Audio Playback**

- **Description:** Singleton HTML5 Audio component streaming 30-second previews based on active node state.

- **Inputs:** `active_node` state from Zustand (preview URL and distance data).

- **Outputs:** Native audio stream to user speakers, current time to local UI scrubber.

- **Failure States:** Dead Link (displays ERR text), Browser Autoplay Blocked (pulses play button for manual interaction).

- **Performance:** Playback must initiate < 200ms after node click. Scrubber loop detached from global React state.


### 3.5 Workstream 5: DevOps & Infrastructure

**Goal:** The deployment scaffolding, message brokering, and container orchestration for local and cloud environments.

**Sub-Project 5A: Docker Compose Networks**

- **Description:** Local development configuration mimicking production VPCs via isolated bridge networks and bind mounts.

- **Inputs:** `.env` variables and `docker-compose up` execution.

- **Outputs:** A functioning local ecosystem of 5-7 containers.

- **Failure States:** Port Collisions (remappable via env vars), Boot Race Conditions (mitigated by healthcheck dependencies).

- **Performance:** Cold boot < 5 minutes. Hot reload < 2 seconds. Global RAM capped at 8GB.


**Sub-Project 5B: Queue Management**

- **Description:** The Redis/Celery broker managing the handoff of async tasks between ETL worker nodes.

- **Inputs:** Task envelopes from producer modules.

- **Outputs:** Task state updates and delivery to consumer nodes.

- **Failure States:** Worker Death (broker requeues un-ACKed task), Poison Pill (routes to Dead Letter Queue after 3 retries).

- **Performance:** Supports 1,000+ messages per second. Message payloads < 1MB (pass paths, not binary audio).


**Sub-Project 5C: CI/CD Pipelines**
- **Description:** Automated GitHub Actions pipeline for linting, testing, and building Docker images on every commit.
- **Inputs:** Git push/merge webhook payloads.
- **Outputs:** Tested Docker images pushed to registry and deployment triggers.
- **Failure States:** Test Failure (blocks merge), Build OOM (fails runner).
- **Performance:** Full pipeline execution < 10 minutes. Requires layer caching and 4GB+ RAM test runners.

**Sub-Project 5D: Cloud Provisioning**
- **Description:** Terraform IaC defining the production AWS/GCP clusters, load balancers, and isolated subnets.
- **Inputs:** `.tf` configuration files and environment variables.
- **Outputs:** Live cloud infrastructure and remote state file updates.
- **Failure States:** State Lock Timeout (aborts to prevent corruption), Configuration Drift (proposes revert to code baseline).
- **Performance:** Full DR spin-up < 15 minutes. Heavy mathematical compute strictly placed on `c6i` class hardware.

## 4. Database Schemas & API Contracts
### 4.1 Relational Database Schema (Supabase PostgreSQL)
SQL
```
-- Track Metadata Cache Table
CREATE TABLE tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spotify_track_id VARCHAR(255) UNIQUE NOT NULL,
    artist_name VARCHAR(255) NOT NULL,
    track_title VARCHAR(255) NOT NULL,
    preview_url TEXT NOT NULL,
    image_url TEXT,
    popularity INT NOT NULL CHECK (popularity < 50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Profiles Table
CREATE TABLE profiles (
    id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Session Taste States Table
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    active_landscape_vector REAL[] NOT NULL,
    current_x_coord REAL NOT NULL,
    current_y_coord REAL NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 4.2 Core API Ingress Contracts (Pydantic v2 Enforced)
**POST /api/v1/tracks/ingest**
Triggers background ETL queue.
- **Request Schema:** `{"spotify_track_ids": ["string"]}`
- **Response (202):** `{"status": "queued", "job_id": "string"}`

**POST /api/v1/recommend/vector**
Scatter-gather request hitting HNSW RAM graph and Supabase SQL.
- **Request Schema:** `{"landscape_vector": [float], "limit": 20}`
- **Response (200):** Array of objects containing track metadata, `spotify_track_id`, and `distance_l2`.

**POST /api/v1/recommend/semantic**
Hits the Semantic Router NLP model before querying the vector graph.
- **Request Schema:** `{"prompt": "string", "limit": 10}`
- **Response (200):** Same as vector route, appended with `interpreted_parameters` mapping the acoustic weights.

## 5. Security & System Integrity

- **Type Safety Enforcement:** The use of the `any` type keyword is strictly prohibited across all frontend TypeScript files. All incoming and outgoing data structures inside Python routes must explicitly map to strict Pydantic configurations to prevent silent failures.

- **Architectural Isolation:** Mathematical operations (Workstream 1) and HNSW RAM queries (Workstream 2) must be network-isolated from the public internet. Only the API Gateway (Workstream 3) is permitted in the Public Subnet.

- **Row Level Security (RLS):** All `UPDATE` and `INSERT` commands to `user_sessions` must be cryptographically verified against the Supabase JWT `user_id` to prevent cross-account coordinate hijacking.

- **Secrets Safeguarding:** All production access strings, private API keys, and database passwords must reside strictly in protected environment parameter vaults (e.g., AWS Secrets Manager). Hardcoding secrets constitutes an immediate CI pipeline failure.