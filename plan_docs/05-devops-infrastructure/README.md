# DevOps and Infrastructure\n\n## Ci Cd Pipelines\n### **Sub-Project: CI/CD Pipelines**

**1) Description**

The CI/CD (Continuous Integration / Continuous Deployment) Pipelines form the automated quality assurance and delivery mechanism of the TopoAcoustic Discovery Engine. Because this project utilizes a highly decoupled microservice architecture—spanning heavy Python mathematical compute (TDA), C++ wrapped in-memory graphs (HNSW), and high-performance WebGL React frontends—manual testing and deployment are highly prone to human error.

This sub-project exists to ensure that every single code commit is automatically verified before it reaches production. It guarantees that a change to the UI does not accidentally break the topological math engines, that all Docker containers build successfully, and that secure secrets (like Spotify API keys or Supabase JWTs) are correctly injected into the production environment without ever being hardcoded in the repository.

**2) Architecture & Logic**

- **Pattern:** Event-Driven Pipeline / Multi-Stage Build & Deploy.
    
- **Pipeline Logic:**
    
    1. **Trigger:** A developer opens a Pull Request (PR) or pushes directly to the `main` branch.
        
    2. **Stage 1 - Linting & Static Analysis:** The pipeline runs `Ruff` (for Python) and `ESLint` (for TypeScript) to enforce strict code quality and catch type errors early.
        
    3. **Stage 2 - Unit & Integration Testing:** * Spins up an ephemeral test matrix.
        
        - Runs `pytest` on the ETL Pipeline and API Gateway (validating the math and endpoints).
            
        - Runs `vitest` on the React frontend.
            
    4. **Stage 3 - Containerization:** If all tests pass, the pipeline builds independent Docker images for each microservice (API Gateway, Vector Search Node, ETL Worker, Frontend).
        
    5. **Stage 4 - Registry Push:** Tags the Docker images with the Git commit hash and pushes them to a secure Container Registry (e.g., AWS ECR or GitHub Packages).
        
    6. **Stage 5 - Deployment (Main Branch Only):** Triggers a webhook or runs an infrastructure script (Terraform/Ansible) to instruct the production cloud servers to pull the new images and perform a rolling restart.
        

**3) Tech Stack & Libraries**

- **Orchestration:** GitHub Actions (or GitLab CI).
    
- **Containerization:** Docker & Docker Compose.
    
- **Code Quality:** `Ruff`, `mypy` (Python), `ESLint`, `Prettier` (TypeScript/React).
    
- **Testing Frameworks:** `pytest` (Backend), `vitest` (Frontend).
    
- **Registry:** GitHub Container Registry (ghcr.io) or AWS Elastic Container Registry (ECR).
    

**4) Inputs (Ingress)**

- **Source:** Webhook payloads from the Git version control system (e.g., GitHub).
    
- **Payload Schema (Git Event Context):**
    
    JSON
    
    ```
    {
      "event_name": "push",
      "ref": "refs/heads/main",
      "after": "a1b2c3d4e5f6g7h8i9j0...",
      "repository": {
        "name": "topo-acoustic-engine"
      },
      "commits": [
        {
          "message": "feat: optimized vietoris-rips filtration loop",
          "author": { "name": "Dev" }
        }
      ]
    }
    ```
    

**5) Outputs (Egress)**

- **Destination:** Container Registry (Images) & Cloud Provider (Deployment Triggers).
    
- **Output Payload Schema (Deployment Webhook):**
    
    JSON
    
    ```
    {
      "deployment_status": "success",
      "image_tags": {
        "api-gateway": "ghcr.io/user/topo-api:a1b2c3d",
        "hnsw-node": "ghcr.io/user/topo-hnsw:a1b2c3d",
        "etl-worker": "ghcr.io/user/topo-etl:a1b2c3d"
      },
      "timestamp": "2026-07-01T15:00:00Z"
    }
    ```
    

**6) Failure States**

- **Test Failure:** A PR contains code that breaks the mathematical output of the Topology Engine. _Recovery:_ The pipeline immediately halts, marks the GitHub PR with a red "Failed" status, blocks the ability to merge, and sends a notification alerting the developer to fix the failing tests.
    
- **Build Failure (OOM / Dependency Error):** Heavy libraries like `gudhi` or `PyTorch` fail to install during the Docker build step due to runner memory limits or missing C++ compilers. _Recovery:_ The pipeline fails the build stage. The developer must optimize the Dockerfile (e.g., using pre-compiled wheels) or allocate larger runners.
    
- **Deployment Timeout:** The production server fails to pull the new Docker image within the allotted time. _Recovery:_ The deployment script aborts and automatically triggers a rollback to the previous known-good Docker image tag, ensuring zero downtime for live users.
    

**7) Performance Constraints**

- **Pipeline Execution Time:** The entire CI pipeline (Lint $\rightarrow$ Test $\rightarrow$ Build) must complete in **< 10 minutes** to maintain developer velocity.
    
- **Caching:** Because compiling C++ topological libraries or downloading PyTorch models takes significant time, the pipeline MUST utilize strict layer caching (`actions/cache` for pip wheels and node_modules, and Docker layer caching for image builds).
    
- **Runner Compute:** The CI runners executing the tests for the Topology Engine require at least **4GB of RAM** to prevent random Out-Of-Memory crashes during the Vietoris-Rips test suites.
    

**8) Validation Strategy**

- **Red-Green-Refactor Pipeline Test:** Create a "dummy" pull request containing a deliberate syntax error or failing math assertion. Verify that the CI pipeline successfully catches the error and blocks the merge. Fix the error, push the commit, and verify the pipeline passes.
    
- **Deployment Dry-Run:** Configure a staging environment identical to production. Push a benign UI change to a `staging` branch. Observe the CI/CD pipeline automatically build the image and deploy it. Manually visit the staging URL to assert the UI change is visible, proving the end-to-end delivery mechanism functions correctly without human intervention.\n\n## Cloud Provisioning\n### **Sub-Project: Cloud Provisioning**

**1) Description**

Cloud Provisioning is the Infrastructure-as-Code (IaC) backbone of the TopoAcoustic Discovery Engine. Because the platform relies on highly specialized hardware profiles—compute-optimized CPUs for the math-heavy Topology Engine and memory-optimized RAM for the HNSW Vector Node—manually configuring these servers via a cloud console (click-ops) is highly error-prone and unscalable.

This sub-project translates the entire physical architecture of the application into declarative code. It exists to guarantee that the production, staging, and disaster recovery environments are perfectly identical, reproducible from scratch in minutes, and securely partitioned via strict networking rules (VPCs). By automating the provisioning of servers, load balancers, and managed databases, this module allows a solo developer or small team to manage enterprise-grade infrastructure.

**2) Architecture & Logic**

- **Pattern:** Declarative Infrastructure as Code (IaC) / Immutable Infrastructure.
    
- **Pipeline Logic:**
    
    1. **Configuration Definition:** Infrastructure is defined in `.tf` (Terraform) files. These files specify the exact AWS/GCP resources needed (e.g., an ECS cluster, specific EC2 instance types, Security Groups).
        
    2. **State Management:** The "source of truth" regarding what is currently deployed is stored in a remote, encrypted bucket (e.g., AWS S3) with a state lock mechanism (e.g., DynamoDB) to prevent concurrent deployments from corrupting the environment.
        
    3. **Plan (Dry Run):** Triggered by the CI/CD pipeline, the IaC tool compares the code against the remote state and generates an execution plan, detailing exactly what will be created, modified, or destroyed.
        
    4. **Apply (Execution):** Upon approval (or automatic merge to `main`), the tool executes API calls to the Cloud Provider to provision the resources in the exact correct dependency order (e.g., creating the VPC network before spinning up the HNSW container).
        
    5. **Auto-Scaling Orchestration:** Defines the threshold alarms (e.g., "If HNSW RAM > 85%, spin up a read-replica node").
        

**3) Tech Stack & Libraries**

- **IaC Tool:** Terraform (or OpenTofu).
    
- **Cloud Provider (Example):** AWS (Amazon Web Services).
    
- **Target Services:** Amazon ECS (Elastic Container Service) or EKS, EC2 (c6i instances for ETL compute, r6i instances for HNSW memory), Application Load Balancers (ALB), and VPC.
    
- **Security & Linting:** `tfsec` (Security scanner) and `tflint`.
    

**4) Inputs (Ingress)**

- **Source:** Developer commits to the IaC repository and CI/CD environment variables.
    
- **Payload Schema (Configuration File - `variables.tfvars`):**
    
    Terraform
    
    ```
    environment         = "production"
    hnsw_instance_type  = "r6i.large" # 16GB RAM for Vector Graph
    etl_instance_type   = "c6i.xlarge" # Compute optimized for TDA math
    min_etl_workers     = 2
    max_etl_workers     = 10
    vpc_cidr_block      = "10.0.0.0/16"
    ```
    

**5) Outputs (Egress)**

- **Destination:** The Cloud Provider (API calls) and the Remote State Bucket.
    
- **Output Payload Schema (Terraform Output / State File):**
    
    JSON
    
    ```
    {
      "api_gateway_url": "https://api.topoacoustic.io",
      "vpc_id": "vpc-0a1b2c3d4e5f",
      "hnsw_internal_ip": "10.0.1.45",
      "deployment_status": "Apply complete! Resources: 12 added, 0 changed, 0 destroyed."
    }
    ```
    

**6) Failure States**

- **State Lock Timeout:** Two developers (or CI pipelines) attempt to deploy infrastructure simultaneously. _Recovery:_ The DynamoDB state lock blocks the second run, throwing a `LockError`. The pipeline halts gracefully, requiring the second deployment to wait and re-run.
    
- **Cloud Provider Quota Exceeded:** The auto-scaler attempts to spin up 20 compute nodes, but the AWS account has a hard limit of 10. _Recovery:_ The cloud API rejects the request. The IaC pipeline catches the `QuotaExceededException`, marks the deployment as degraded, and alerts DevOps to request a quota increase.
    
- **Configuration Drift:** Someone manually changes a security group rule in the AWS Console, causing the actual infrastructure to drift from the code. _Recovery:_ The next `terraform plan` detects the drift and automatically proposes overwriting the manual change back to the coded baseline, strictly enforcing the Git repository as the single source of truth.
    

**7) Performance Constraints**

- **Provisioning Speed:** A full "from scratch" disaster recovery deployment (spinning up the entire VPC, clusters, and load balancers) must complete in **< 15 minutes**. Standard incremental updates should take **< 2 minutes**.
    
- **Cost Limits (Budget Spikes):** Auto-scaling groups for the ETL workers must have a strict `max_capacity` parameter enforced to prevent infinite horizontal scaling from racking up a massive cloud bill if the Spotify queue accidentally loops.
    
- **Security Isolation:** The HNSW Vector Node and ETL Workers must be placed in **Private Subnets** with no public IP addresses. Only the API Gateway is permitted in the Public Subnet behind a Load Balancer.
    

**8) Validation Strategy**

- **Static Analysis:** Run `tfsec` as a pre-commit hook. Assert that no resources are configured with open ingress ports (e.g., `0.0.0.0/0` on port 22) and that S3 buckets are explicitly set to private and encrypted.
    
- **Automated Plan Verification:** The CI pipeline runs `terraform plan` on every Pull Request and outputs the exact resource changes as a comment on the PR for human review before any real infrastructure is touched.
    
- **Ephemeral Staging Teardown:** Once a week, an automated cron job runs `terraform apply` to an isolated `staging` workspace, runs a suite of API integration tests against the newly built cloud, and then successfully executes `terraform destroy` to ensure the teardown logic cleanly removes all resources without leaving orphaned, billable assets.\n\n## Docker Compose Networks\n### **Sub-Project: Docker Compose Networks**

**1) Description**

The Docker Compose Networks module serves as the localized orchestration layer for the TopoAcoustic Discovery Engine. While Terraform handles the massive cloud infrastructure for production, Docker Compose provides the vital "infrastructure-in-a-box" for local development and Continuous Integration testing. It defines exactly how the disparate microservices—the React frontend, the FastAPI gateway, the Python ETL workers, the C++ HNSW graph, and the Redis broker—boot up, communicate, and share data on a single machine.

This sub-project exists to completely eradicate the "it works on my machine" syndrome. By strictly defining container boundaries, internal bridge networks, environment variables, and persistent volumes in a single declarative YAML file, any developer can clone the repository and spin up a perfect replica of the production ecosystem in under two minutes with a single terminal command.

**2) Architecture & Logic**

- **Pattern:** Local Multi-Container Orchestration / Internal Bridge Networking.
    
- **Pipeline Logic:**
    
    1. **Network Segmentation:** Creates distinct, isolated virtual networks (e.g., `frontend-tier`, `backend-tier`, `data-tier`). The React container cannot speak directly to the PostgreSQL database; it must pass through the API Gateway, exactly mirroring production VPC rules.
        
    2. **Volume Mounting (State & Code):** Maps local host directories to container paths (Bind Mounts) for instantaneous hot-reloading during development. Maps ephemeral named volumes to the HNSW and PostgreSQL containers to ensure databases survive container restarts.
        
    3. **Boot Sequencing:** Uses strict `depends_on` conditions linked to `healthcheck` probes. The API Gateway container will physically refuse to start until the Redis broker and Supabase emulator containers report a "healthy" status.
        
    4. **Resource Allocation:** Enforces strict memory and CPU limits on the local containers to mimic production constraints, preventing the heavy TDA math engines from accidentally locking up the developer's laptop.
        

**3) Tech Stack & Libraries**

- **Orchestration Engine:** Docker Desktop / Docker Engine.
    
- **Definition Standard:** Docker Compose specification (v2/v3 YAML format).
    
- **Environment Management:** `.env` files (injected at runtime, strictly ignored by version control).
    
- **Shell Scripting:** Bash/Zsh for wrapper scripts (e.g., `make up`, `make down-clean`).
    

**4) Inputs (Ingress)**

- **Source:** Developer CLI execution (`docker compose up`) and local `.env` files.
    
- **Payload Schema (YAML Contract Snippet):**
    
    YAML
    
    ```
    version: '3.8'
    services:
      api-gateway:
        build: ./backend/api
        ports:
          - "8000:8000"
        environment:
          - REDIS_URL=redis://broker:6379/0
        networks:
          - backend-tier
        depends_on:
          broker:
            condition: service_healthy
    ```
    

**5) Outputs (Egress)**

- **Destination:** The host operating system's Docker Daemon.
    
- **Output Payload Schema (Containerized System State):**
    
    - **Exposed Ports:** `localhost:3000` (Frontend UI), `localhost:8000` (API Gateway Docs).
        
    - **Running Containers:** 5-7 active Linux containers running in isolated namespaces.
        
    - **Persistent Volumes:** Local disk allocation for `hnsw_index_data` and `postgres_data`.
        

**6) Failure States**

- **Port Collisions:** A developer already has a local instance of PostgreSQL running on port 5432, causing the Compose network to crash on boot. _Recovery:_ The `docker-compose.yml` utilizes host-port mapping variables (e.g., `${DB_PORT:-5432}:5432`) allowing developers to quickly remap the host port without altering the committed code.
    
- **Race Conditions (Connection Refused):** The API Gateway boots faster than the database, crashes, and exits. _Recovery:_ The Gateway container is wrapped in a restart policy (`restart: on-failure`) and strictly waits for the DB's `pg_isready` healthcheck before executing its Uvicorn startup script.
    
- **OOM Kills (Exit Code 137):** The local HNSW index or WebGL build consumes all RAM allocated to the Docker Engine. _Recovery:_ The container is terminated by the host OS. The developer is alerted via standard output, and must adjust their Docker Desktop resource limits or utilize a smaller test dataset locally.
    

**7) Performance Constraints**

- **Boot Time:** A cold boot of the entire ecosystem (pulling/building images and establishing networks) should take **< 5 minutes**. Subsequent hot-boots must take **< 30 seconds**.
    
- **Hot-Reload Latency:** Changes made to a React `.tsx` file or FastAPI `.py` file on the host machine must sync across the bind mount and reflect in the running container in **< 2 seconds**.
    
- **Memory Limits:** The `docker-compose.yml` must explicitly define `deploy.resources.limits` to cap the total RAM usage of the stack at **8GB**, ensuring it remains runnable on standard developer hardware.
    

**8) Validation Strategy**

- **Syntax Validation:** Execute `docker compose config` in the CI pipeline before building. This parses the YAML and `.env` files, asserting that the schema is perfectly valid and all variable interpolations are successful.
    
- **Network Isolation Audit:** Spin up the stack. Exec into the `frontend` container shell and attempt to `ping broker` (the Redis container). Assert that the connection times out or is actively refused, proving that the bridge network strictly isolates the frontend from the data tier.
    
- **Automated Integration Smoke Test:** Write a GitHub Action that runs `docker compose up -d --wait`, curls the API Gateway's `/health` endpoint asserting a `200 OK` response, and then executes `docker compose down -v` to ensure the teardown gracefully removes all networks and volumes without hanging.\n\n## Queue Management\n### **Sub-Project: Queue Management**

**1) Description**

The Queue Management module is the asynchronous circulatory system of the TopoAcoustic Discovery Engine. Because the ETL Pipeline (Workstream 1) involves operations that vary wildly in execution time—from a 200ms API call to a 4-second topological matrix calculation—passing data synchronously between these steps would cause immediate gridlock.

This sub-project implements a robust message broker and distributed task queue infrastructure. It ensures that when the Audio Ingestion worker finishes downloading a file, it can instantly hand off the reference to the next available Feature Extraction worker without waiting. By decoupling the producers from the consumers, this module guarantees fault tolerance; if a Topology Engine worker crashes mid-calculation due to a complex manifold, the queue management system ensures the task is not lost, but rather safely reassigned to another healthy worker.

**2) Architecture & Logic**

- **Pattern:** Distributed Producer-Consumer / Task Queue Architecture.
    
- **Pipeline Logic:**
    
    1. **Topic Segregation:** The broker maintains strictly isolated logical queues: `ingestion_tasks`, `dsp_tasks`, and `topology_tasks`.
        
    2. **Publishing (Producer):** When a module completes its work, it acts as a producer, serializing the resulting data footprint (or file path) into a lightweight message and publishing it to the tail of the next respective queue.
        
    3. **Polling & Locking (Consumer):** Idle worker containers continually poll their assigned queues. When a message is retrieved, the broker places a temporary lock (unacknowledged status) on that message so no other worker picks it up.
        
    4. **Acknowledgment (ACK):** Once the worker successfully completes the computation, it sends an `ACK` back to the broker, which definitively deletes the message from the queue.
        
    5. **Dead Letter Routing:** If a task fails repeatedly (e.g., exceeding 3 retries due to corrupted audio), it is routed to a `dead_letter_queue` (DLQ) for manual inspection, preventing "poison pills" from infinitely crashing workers.
        

**3) Tech Stack & Libraries**

- **Message Broker:** Redis (In-memory data structure store) or RabbitMQ. _(Redis is often preferred for TopoAcoustic to double as a rate-limiting cache for the API Gateway)._
    
- **Task Orchestration (Python):** `Celery` (Enterprise-grade asynchronous task queue system).
    
- **Monitoring & Dashboard:** `Flower` (Real-time web-based monitor for Celery clusters).
    
- **Serialization:** `JSON` or `msgpack` (for more compact binary payloads between workers).
    

**4) Inputs (Ingress)**

- **Source:** Any producer module (Ingestion, Extraction, Topology) pushing a new task.
    
- **Payload Schema (Standardized Celery Task Envelope):**
    
    JSON
    
    ```
    {
      "task": "etl.tasks.run_feature_extraction",
      "id": "c5a6b7c8-d9e0...",
      "args": [
        "3n3PpDZ7sJ...", 
        "/tmp/audio_3n3PpDZ7sJ.mp3"
      ],
      "kwargs": {},
      "retries": 0,
      "eta": null
    }
    ```
    

**5) Outputs (Egress)**

- **Destination:** The designated Consumer worker, and ultimately the Task Result Backend (if task states need to be queried).
    
- **Output Payload Schema (Task State Update):**
    
    JSON
    
    ```
    {
      "task_id": "c5a6b7c8-d9e0...",
      "status": "SUCCESS",
      "result": {
        "next_queue": "topology_tasks",
        "payload_dispatched": true
      },
      "traceback": null
    }
    ```
    

**6) Failure States**

- **Worker Death (Hardware Failure / OOM):** A Topology worker consumes too much RAM and is killed by the OS before sending an `ACK`. _Recovery:_ The broker's visibility timeout expires. The broker assumes the worker died, removes the lock, and automatically requeues the message for the next available worker.
    
- **Broker Memory Exhaustion:** The ingestion script pulls tracks faster than the math engines can process them, filling up Redis RAM. _Recovery:_ Redis must be configured with a strict `maxmemory` limit and an eviction policy (e.g., `noeviction` for strict queues, forcing producers to pause, or offloading to disk). The auto-scaler should concurrently spin up more consumer workers.
    
- **Poison Pill Task:** A specific track's audio causes an uncatchable C++ segmentation fault in the `gudhi` library every time it runs. _Recovery:_ Celery tracks the retry count. After 3 failed attempts, the task is stripped from the main queue and pushed to the `dead_letter_queue`, triggering an alert for the developer to inspect that specific Spotify ID.
    

**7) Performance Constraints**

- **Throughput:** The broker must be capable of handling a minimum of **1,000 messages per second** without noticeable latency degradation.
    
- **Payload Size:** Message queues are not databases. Payloads must remain under **1 MB**. Raw audio `.mp3` files or massive numpy arrays must NEVER be sent through the queue; the queue must only pass the _local file path_ or _S3 URI_ pointing to the data.
    
- **Latency:** The round-trip time for a worker to pull a task and register an active lock must be **< 10 milliseconds**.
    

**8) Validation Strategy**

- **Chaos Engineering (Kill Test):** Write an automated integration test that submits 10 DSP tasks to the queue. While the workers are processing, use a script to aggressively `kill -9` a random worker process. Assert that the overall pipeline still completes all 10 tasks successfully, proving the broker correctly identified the orphaned lock and requeued the interrupted task.
    
- **DLQ Routing Verification:** Submit a mock task specifically engineered to throw a `ValueError`. Assert that the worker attempts the task exactly 3 times (or the configured retry limit) and then successfully routes the task ID and traceback into the Dead Letter Queue without stalling the rest of the queue.
    
- **Monitoring Audit:** Boot the `Flower` dashboard container. Flood the broker with 5,000 dummy messages. Assert that the dashboard correctly tracks the queue backlog in real-time, accurately reflecting active, queued, and succeeded task states.\n\n