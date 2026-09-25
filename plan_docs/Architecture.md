# TopoAcoustic Discovery Engine: System Architecture
**Version:** 1.0.0
**Status:** Baseline

## 1. Architectural Overview
The TopoAcoustic Discovery Engine utilizes a heavily decoupled, Domain-Driven Architecture. To prevent heavy mathematical computation from bottlenecking real-time UI rendering, the system is strictly divided into five isolated workstreams. It leverages asynchronous task queues, in-memory graph search, and stateless API gateways to maintain sub-100ms response times for complex topological queries.

## 2. High-Level Component Diagram

```text
[ SPOTIFY API ]
       | (Async Polling)
+------v---------------------------------------------------+
| WORKSTREAM 1: ETL PIPELINE (Async Background Workers)    |
|  [Ingest & Stream] -> [DSP & Sync] -> [Topology]         |
|  (yt-dlp buffer)      (librosa/NumPy) (giotto-tda)       |
+------+-------------------------+-------------------------+
       | (PostgreSQL Metadata)   | (1500-d Vector)
       v                         v
+------v-----------+      +------v-------------------------+
| WORKSTREAM 3:    |      | WORKSTREAM 2:                  |
| RELATIONAL STATE |      | VECTOR SEARCH INFRASTRUCTURE   |
| [Supabase/SQL]   |      | [HNSW Vector Node]             |
| (Tracks, Users)  |      | (hnswlib / RAM Graph)          |
+------+-----------+      +------+-------------------------+
       |                         |
       +----------+   +----------+
                  |   |
+-----------------v---v------------------------------------+
| WORKSTREAM 3: ORCHESTRATION                              |
| [API Gateway] (FastAPI / Uvicorn / Pydantic v2)          |
| Scatter-Gather Routing & JWT Authentication              |
+-----------------^----------------------------------------+
                  | (HTTP / WSS)
+-----------------v------------------------------------+
| WORKSTREAM 4: CLIENT APPLICATION (React/TypeScript)  |
|  [UI Overlays] (Zustand/Tailwind) -> DOM Layer       |
|  [WebGL Manifold] (Three.js/R3F) -> Canvas Layer     |
+------------------------------------------------------+
````

## 3. Data Lifecycles

### A. The Write Path (Asynchronous Ingestion)

1. **Discover:** The Audio Ingestion worker scrapes the Spotify API for tracks with popularity < 50.

2. **Stream & Extract:** The worker spins up `yt-dlp` to stream the audio directly into an in-memory buffer. `librosa` extracts a 12-D Chroma and 12-D Timbre (MFCC) feature matrix, applying beat-synchronous pooling (`librosa.util.sync`) and a Takens delay embedding (yielding a 48-D point cloud). The raw audio buffer is immediately discarded.

3. **Topology Mapping:** The Topology Engine computes Vietoris-Rips filtrations on the beat-synchronized 48-D point cloud, outputting a 1500-d Persistence Landscape.

5. **Storage:** Metadata is written to PostgreSQL (Supabase). The 1500-d vector is written to the HNSW RAM Node.


### B. The Read Path (Real-Time UI Navigation)

1. **User Action:** The user shifts the "Timbral Density" slider on the React UI or inputs a Semantic search.

2. **API Request:** The frontend fires a payload to the FastAPI Gateway.

3. **Scatter-Gather:** - Gateway requests the $k$-nearest topological vectors from the HNSW Node (returns integer IDs).

    - Gateway requests the human-readable metadata for those IDs from PostgreSQL.

4. **Hydration & Render:** The Gateway zips the data and returns it. The React Zustand store updates, and the Three.js camera smoothly interpolates to the new UMAP coordinates.


## 4. Key Architectural Constraints

- **Zero Math in the API:** The API Gateway must remain entirely stateless and perform no topological calculations.

- **Separation of State:** High-dimensional vectors (1500-d) are strictly forbidden from being stored in the relational PostgreSQL database to prevent `JOIN` bloat.

- **Render Isolation:** 2D DOM state updates (React) must never trigger a re-render of the 3D WebGL Canvas (`useFrame` loops only).