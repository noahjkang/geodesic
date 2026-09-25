# Geodesic

Geodesic is a personal project which is a artist/music discovery engine created to solve the "cold-start" recommendation problem for independent, long-tail artists by completely bypassing collaborative filtering, social graphing, and popularity metrics. Instead of relying on user behavior or rigid genre tags, the platform operates using topology: it models raw acoustic waveforms as continuous geometric manifolds. To do this, the engine first extracts a 25-dimensional psychoacoustic feature matrix—comprising Mel-Frequency Cepstral Coefficients (MFCCs), Spectral Centroids, and Daubechies Wavelets—to establish a deterministic acoustic fingerprint. Because music is a dynamic system evolving over time, this linear time-series data is projected into a higher-dimensional phase space using Takens’ Embedding Theorem, which unrolls the audio into a continuous trajectory point cloud without self-intersection. From there, the system applies Vietoris-Rips filtrations to extract persistent homology, tracking the "birth" and "death" of topological invariants across varying scales. This allows the engine to calculate specific Betti numbers ($H_0$, $H_1$, $H_2$) that quantify timbral clusters, cyclic rhythmic patterns, and complex structural voids independent of volume or mastering. Because raw persistence diagrams do not form a vector space, they are subsequently transformed into Persistence Landscapes—stable, piecewise-linear functions mapped into a Banach space and flattened into a strict 1500-dimensional signature. Finally, TopoAcoustic uses Optimal Transport mathematics, specifically the Wasserstein Distance ($\mathcal{W}_p$), to calculate the minimum mathematical work required to deform a user's current "taste manifold" into the geometry of a newly discovered track. By querying these 1500-dimensional vectors against an in-memory Hierarchical Navigable Small World (HNSW) graph, the engine guarantees that a completely obscure track with zero historical plays can surface instantly, provided its underlying acoustic topology perfectly aligns with the user's search space.

## Getting Started

The project is structured into independent frontend and backend microservices. The easiest way to run the entire stack is using Docker Compose.

### Running with Docker (Recommended)
This will spin up the Frontend, FastAPI Gateway, PostgreSQL, Redis, Vector Search Node, and all ETL workers simultaneously.
```bash
docker compose up --build
```

### Running Locally (Development Mode)
If you prefer to run the services individually without Docker for faster iteration:

**1. Run the Frontend (React + Vite)**
```bash
cd frontend
npm install
npm run dev
```

**2. Run the API Gateway (FastAPI)**
```bash
cd backend/api
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**3. Run the Vector Search Node (HNSW)**
```bash
cd backend/vector_search
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

*(Note: The ETL Celery workers require Redis to be running locally to operate).*