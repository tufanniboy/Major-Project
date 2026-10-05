# BRAIN.MD: MASTER TECHNICAL SOURCE-OF-TRUTH & SYSTEM ARCHITECTURE

> **Document Classification**: System Source-of-Truth / Engineering Kundali  
> **Target Audience**: Senior Software Architects, Security Engineers, DevOps, Lead Developers  
> **Status**: Verified Active Repository Audit  

---

## 0. DOCUMENT CONTROL

* **Project Name**: `llm-powered-soc-analyst` (SOC Analyst Lab)
* **Project Description**: Controlled academic Security Operations Center (SOC) simulation lab featuring real-time Windows Event Log collector ingestion, multi-tenant portal simulation, deterministic rule correlation, and AI-assisted investigation via multi-provider LLM fallback (Gemini, OpenAI, Ollama).
* **Documentation Purpose**: Single definitive technical blueprint, architecture memory, codebase kundali, and implementation source of truth for current and future engineers.
* **Repository Root**: `d:\major project`
* **Analysis Date**: October 5, 2026
* **Analysis Scope**: 100% Repository Discovery (Server logic, Frontend client JS/CSS, Storage engine, LLM providers, Windows PowerShell collectors, Suricata forwarder, Test suites, Deployment configs, Documentation).
* **Documentation Status**: Fully Verified & Complete.
* **Confidence & Limitations**: High confidence across core Node.js runtime, storage model, security authentication, and API layer. Discrepancies between legacy Suricata collector scripts/tests and current `server.js` route handlers have been empirically identified and documented.
* **Last-Known Architecture State**: Node.js 22+ ES module monolith, HTTP core server, Vanilla JS/CSS client, single-row PostgreSQL JSONB CAS snapshot store.
* **Maintenance Type**: Automated Deep Audit + Verified Source Traversal.

---

## 1. EXECUTIVE PROJECT SUMMARY

The **LLM-Powered SOC Analyst Lab** is an interactive, academic-grade security operations center simulation platform. It bridges the gap between raw endpoint telemetry, heuristic detection, and artificial intelligence-driven incident response.

### Problem Solved
Traditional SOC training environments require heavy infrastructure (SIEMs, dedicated virtual networks, domain controllers, complex cloud labs). This project provides a zero-dependency (or single-container/Render-hosted) lightweight lab that ingests live Windows host Security events and simulated application traffic, runs deterministic detection rules, and allows an analyst to evaluate automated LLM incident analysis before executing one-click simulated containment actions.

### Core Capabilities
1. **Host Event Ingestion**: Live ingestion of Windows host Security Event Logs (Event IDs 4624, 4625, 4688, 4720, 4722, 4728, 4732, 4756, 5152) via a lightweight PowerShell agent ([scripts/windows-event-collector.ps1](file:///d:/major%20project/scripts/windows-event-collector.ps1)).
2. **Deterministic Correlation Engine**: Rule-based detection ([js/alerts.js](file:///d:/major%20project/js/alerts.js)) mapping events to MITRE ATT&CK techniques (Authentication bursts, Credential compromise, Port scans, Sensitive API denial, Privilege change, DLP file access, Exfiltration).
3. **Multi-Provider LLM Fallback**: Resilient AI analysis engine ([lib/llm-provider.js](file:///d:/major%20project/lib/llm-provider.js)) supporting automatic provider fallback: Google Gemini → OpenAI GPT → Local Ollama. Enforces strict JSON Schema validation and evidence citation verification.
4. **Analyst Console & Employee Portal**: Dual-interface frontend featuring real-time Server-Sent Events (SSE), network topology view, investigation panel, approval gates for simulated firewall blocklists, and employee interaction portal ([employee.html](file:///d:/major%20project/employee.html)).
5. **State Persistence**: PostgreSQL Compare-And-Swap (CAS) JSONB state snapshot engine ([lib/postgres-store.js](file:///d:/major%20project/lib/postgres-store.js)) preventing race conditions in hosted multi-worker or restarted container environments.

### Architectural Overview
```
[ Windows Host Agent ] ----(HTTPS / Bearer Token)----> [ Node.js HTTP Server ]
[ Mobile/LAN Portal  ] ----(Session Token)------------>        |
                                                               | (Deterministic Correlation)
[ Analyst Web UI     ] <---(SSE Stream / REST API)--------- [ SOCEngine State ]
                                                               |         |
                                         (Structured Output)   |         | (JSONB CAS Update)
                                         [ LLM Provider Chain ]       [ PostgreSQL Database ]
                                         (Gemini / OpenAI / Ollama)
```

---

## 2. PROJECT IDENTITY / BUSINESS CONTEXT

* **Product Name**: `llm-powered-soc-analyst` (Internal project code: `Major-Project`)
* **Target Users**: Cybersecurity Students, SOC Analyst Trainees, Security Researchers, Educators.
* **User Roles**:
  * `Analyst / Administrator`: Authenticated operator with full console access, attack scenario triggers, LLM analysis execution, and containment approval privileges ([lib/hosted-auth.js](file:///d:/major%20project/lib/hosted-auth.js:20)).
  * `Employee / Device`: Portal session user generating benign or simulated malicious application requests ([server.js:183-218](file:///d:/major%20project/server.js#L183-L218)).
  * `Sensor Agent`: Authenticated process pushing Windows Security Event logs via HTTP POST ([lib/sensor-auth.js](file:///d:/major%20project/lib/sensor-auth.js)).
* **Monetization**: Open academic repository / Demonstration artifact (Free tier hosting optimized for Render).

---

## 3. COMPLETE TECHNOLOGY STACK

| Layer | Technology | Version | Purpose | Evidence | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Language** | Node.js (ESM) | `>=22.0.0` | Server runtime environment | [package.json:22](file:///d:/major%20project/package.json#L22) | Uses native `node:http`, `node:crypto`, `process.loadEnvFile` |
| **Server Framework**| Custom Node HTTP | Native | REST API, SSE streaming, Static file server | [server.js:20-228](file:///d:/major%20project/server.js#L20-L228) | Zero external web frameworks (no Express/Fastify) |
| **Frontend Core** | Vanilla HTML5 / JS | ES2022 | Interactive Console & Portal | [index.html](file:///d:/major%20project/index.html), [js/app.js](file:///d:/major%20project/js/app.js) | Native ES modules (`type="module"`), no React/Vue/Angular |
| **Styling** | Vanilla CSS | Native CSS3 | Modern dark mode, glassmorphism, responsive UI | [css/theme.css](file:///d:/major%20project/css/theme.css), [css/dashboard.css](file:///d:/major%20project/css/dashboard.css) | Custom CSS variables, native grid & flexbox |
| **Database** | PostgreSQL | `^8.23.0` (`pg`) | Persistent single-table JSONB snapshot store | [lib/postgres-store.js](file:///d:/major%20project/lib/postgres-store.js) | Single-row state checkpoint (`soc_lab_snapshots`) |
| **LLM Provider API**| Google Gemini | `v1beta` | Primary AI evidence analysis provider | [lib/llm-provider.js:89](file:///d:/major%20project/lib/llm-provider.js#L89) | Default model: `gemini-3.7-flash` |
| **LLM Provider API**| OpenAI API | `/v1/responses`| Secondary AI fallback provider | [lib/llm-provider.js:88](file:///d:/major%20project/lib/llm-provider.js#L88) | Default model: `gpt-4.1-mini` |
| **LLM Provider API**| Local Ollama | `/api/chat` | Privacy-focused local fallback provider | [lib/llm-provider.js:90-95](file:///d:/major%20project/lib/llm-provider.js#L90-L95) | Default model: `llama3.2:3b` |
| **Agent / Collector**| Windows PowerShell | 5.1+ | Real-time Windows Security Event log harvester | [scripts/windows-event-collector.ps1](file:///d:/major%20project/scripts/windows-event-collector.ps1) | Uses `Get-WinEvent` & `Invoke-RestMethod` |
| **Utility Library** | `qrcode` | `^1.5.4` | Generates SVG QR codes for LAN device onboarding | [server.js:129-135](file:///d:/major%20project/server.js#L129-L135) | Renders QR directly to browser |
| **Testing** | Node Test Runner | Native (`node --test`)| Unit and integration test suite | [package.json:14](file:///d:/major%20project/package.json#L14), `tests/*.test.js` | Built-in Node test runner |
| **Deployment** | Render Web Service | Free Tier | Production hosted environment | [render.yaml](file:///d:/major%20project/render.yaml) | Dockerless Node 24 runtime + Free PostgreSQL |

---

## 4. COMPLETE REPOSITORY STRUCTURE

```text
major project/
├── .env                       # Local environment configurations and credentials (gitignored)
├── .env.example               # Template environment configuration file
├── .gitignore                 # Specifies intentionally untracked files
├── 1-SETUP.cmd                # Windows setup runner script
├── 2-START-LAB.cmd            # Windows server launcher script
├── 3-CHECK-SETUP.cmd          # Setup diagnostic runner script
├── README.md                  # System overview and quickstart documentation
├── START-HERE.md              # Detailed user setup walkthrough guide
├── TESTING.md                 # Test suite documentation and guide
├── analyst-login.html         # Hosted mode analyst authentication portal page
├── employee.html              # Interactive employee lab portal web page
├── favicon.svg                # Application branding icon
├── index.html                 # Main SOC Analyst Operations Desk SPA entry point
├── package.json               # Node.js project manifest & script commands
├── package-lock.json          # Dependency lockfile
├── render.yaml                # Render platform deployment blueprint
├── server.js                  # Core HTTP Server, REST router, SSE publisher & lab server lifecycle
├── css/                       # CSS stylesheet directory
│   ├── dashboard.css          # Main SOC operations desk layout & card styling
│   ├── operations.css         # Timeline, topology & investigation panel styling
│   ├── portal.css             # Employee portal page styles
│   ├── style.css              # Reset & foundational CSS primitives
│   └── theme.css              # Custom CSS color tokens & dark theme variables
├── data/                      # Data assets & static fixtures
│   ├── images/                # Visual asset images for portals
│   ├── mitre-data.js          # Local dictionary of MITRE ATT&CK techniques
│   └── mock-events.js         # Default lab scenario events & initial devices
├── deployment/                # Bundled offline distribution ZIP archives
├── docs/                      # Technical guides & step-by-step documentation
│   ├── 01-SURICATA-STEPS.md   # Legacy Suricata setup guide
│   ├── 02-SURICATA-COMMANDS.md# Legacy Suricata command references
│   ├── FREE-HOSTING.md        # Hosting setup instructions (Render)
│   ├── LLM-SETUP.md           # Guide for configuring Gemini/OpenAI/Ollama
│   ├── POSTGRESQL.md          # Database configuration guide
│   ├── REAL-SENSOR-SETUP.md   # Windows Event Collector setup guide
│   ├── TEACHER-DEMO-SCRIPT.md # Demo script for presentations
│   └── WINDOWS-LOG-MONITORING.md # Windows logging setup overview
├── js/                        # Client-side JavaScript modules & logic
│   ├── adapter.js             # Client-side adapter bindings
│   ├── ai-analysis.js         # Heuristic rule classification & analysis narratives
│   ├── alerts.js              # Deterministic detection rule detection logic
│   ├── analyst-login.js       # Analyst login form client logic
│   ├── app.js                 # Main SOC Console SPA controller & SSE listener
│   ├── charts.js              # Custom canvas event rate chart rendering
│   ├── connect.js             # Onboarding & device connection UI bindings
│   ├── device-scenarios.js    # Controlled device attack scenario mappings
│   ├── llm-panel.js           # AI investigation panel rendering logic
│   ├── network.js             # SVG Network Topology rendering logic
│   ├── portal.js              # Employee portal client interactions & heartbeats
│   ├── simulation.js          # Core SOCEngine state machine, event ingestion & tick loop
│   ├── utils.js               # Common formatting, sanitization & DOM helpers
│   ├── views.js               # Main views renderer (alerts, events, devices, responses)
│   ├── webmcp.js              # Web Model Context Protocol client bindings
│   └── workspace.js           # Analyst workspace panel state manager
├── lib/                       # Core Node.js server utility libraries
│   ├── config.js              # Environment & Node version loader
│   ├── hosted-auth.js         # Hosted authentication & cookie session management
│   ├── lab-snapshot.js        # Lab snapshot capture & validation serializer
│   ├── llm-provider.js        # Multi-provider LLM client with structured output validation
│   ├── postgres-store.js      # PostgreSQL CAS snapshot persistence store
│   ├── sensor-auth.js         # Bearer token validation helper
│   ├── suricata.js            # Legacy Suricata EVE event normalizer
│   └── windows-events.js      # Windows Security Event normalization pipeline
├── scripts/                   # Utility scripts & sensor agents
│   ├── check.js               # Node setup validation script
│   ├── doctor.js              # Environment diagnostic tool
│   ├── package-project.ps1    # PowerShell project packaging script
│   ├── package-render.ps1     # Render package builder script
│   ├── package-team.ps1       # Team package builder script
│   ├── setup.js               # Automated environment configuration script
│   ├── setup-windows-monitoring.ps1 # Enables Windows Audit Policies
│   ├── stop.js                # Server termination utility
│   ├── suricata-forwarder.js  # Legacy Suricata EVE log forwarder daemon
│   └── windows-event-collector.ps1 # Windows Event Log agent script
└── tests/                     # Test suite directory
    ├── engine.test.js         # SOCEngine state machine tests
    ├── hosted.test.js         # Hosted mode auth & route protection tests
    ├── llm-fallback.test.js   # LLM fallback mechanism tests
    ├── llm.test.js            # LLM provider adapter unit tests
    ├── network.test.js        # Topology rendering logic tests
    ├── persistence.test.js    # Snapshot serialization & restoration tests
    ├── postgres.test.js       # PostgreSQL CAS persistence integration tests
    ├── server.test.js         # Server HTTP API integration tests
    └── suricata.test.js       # Legacy Suricata normalization tests (Failing)
```

---

## 5. FILE-BY-FILE SYSTEM INVENTORY

| File | Type | Responsibility | Key Dependencies | Used By | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [server.js](file:///d:/major%20project/server.js) | Server | HTTP Server, API Routing, SSE Streaming, Server Lifecycle | `node:http`, `lib/*`, `js/simulation.js` | Entry Point | `Verified` |
| [lib/config.js](file:///d:/major%20project/lib/config.js) | Server Lib | Environment loader, Node >=22 validation | `node:fs`, `node:path` | `server.js`, `scripts/*` | `Verified` |
| [lib/hosted-auth.js](file:///d:/major%20project/lib/hosted-auth.js) | Server Lib | Hosted authentication, cookie security, rate-limiting | `node:crypto` | `server.js:22` | `Verified` |
| [lib/llm-provider.js](file:///d:/major%20project/lib/llm-provider.js) | Server Lib | Multi-LLM provider client (Gemini/OpenAI/Ollama), schema validation | Native fetch, `answerSchema` | `server.js:148-164` | `Verified` |
| [lib/postgres-store.js](file:///d:/major%20project/lib/postgres-store.js) | Server Lib | PostgreSQL snapshot persistence with Compare-And-Swap | `pg` Pool | `server.js:280` | `Verified` |
| [lib/lab-snapshot.js](file:///d:/major%20project/lib/lab-snapshot.js) | Server Lib | Lab state serialization, deserialization & schema validation | `js/device-scenarios.js` | `server.js:33-40`, `lib/postgres-store.js` | `Verified` |
| [lib/sensor-auth.js](file:///d:/major%20project/lib/sensor-auth.js) | Server Lib | Constant-time Bearer token verification | `node:crypto` | `server.js:112` | `Verified` |
| [lib/windows-events.js](file:///d:/major%20project/lib/windows-events.js) | Server Lib | Windows Event Log payload batch normalization | `node:crypto`, `js/simulation.js` | `server.js:116` | `Verified` |
| [lib/suricata.js](file:///d:/major%20project/lib/suricata.js) | Server Lib | Suricata EVE JSON alert normalization | `node:crypto`, `js/simulation.js` | Legacy / `tests/suricata.test.js` | `Deprecated` |
| [js/simulation.js](file:///d:/major%20project/js/simulation.js) | Core Engine| In-memory `SOCEngine`, state store, detection & tick loop | `data/mock-events.js`, `js/alerts.js` | `server.js:7`, Client ESM | `Verified` |
| [js/alerts.js](file:///d:/major%20project/js/alerts.js) | Core Engine| Heuristic detection rules mapping events to MITRE ATT&CK | None | `js/simulation.js:2` | `Verified` |
| [js/ai-analysis.js](file:///d:/major%20project/js/ai-analysis.js) | Client/Lib | Rule-based heuristic analysis narratives & adapter fallback | `data/mitre-data.js` | `js/simulation.js:3` | `Verified` |
| [js/app.js](file:///d:/major%20project/js/app.js) | Frontend UI | Analyst Console SPA orchestrator, REST API fetcher & SSE handler | Client JS modules | `index.html` | `Verified` |
| [js/views.js](file:///d:/major%20project/js/views.js) | Frontend UI | Core views rendering engine (Alerts, Timeline, Devices, Metrics) | `js/utils.js` | `js/app.js` | `Verified` |
| [js/llm-panel.js](file:///d:/major%20project/js/llm-panel.js) | Frontend UI | Renders AI Analysis modal/panel, triggering backend LLM requests | Client JS modules | `js/views.js` | `Verified` |
| [js/portal.js](file:///d:/major%20project/js/portal.js) | Frontend UI | Employee Portal interactive app, heartbeat & scenario trigger | Client JS modules | `employee.html` | `Verified` |
| [scripts/windows-event-collector.ps1](file:///d:/major%20project/scripts/windows-event-collector.ps1)| Agent Script| PowerShell agent scanning Security Log and POSTing to backend | Windows Event Log | Manual execution | `Verified` |
| [scripts/suricata-forwarder.js](file:///d:/major%20project/scripts/suricata-forwarder.js) | Agent Script| Node.js daemon tailing Suricata `eve.json` file | `node:fs` | Manual execution | `Orphaned` |

---

## 6. ARCHITECTURE

### High-Level Architecture

```mermaid
flowchart TD
    SubGraphAgents["Host Agents & Collectors"]
        WinAgent["PowerShell Host Agent\n(windows-event-collector.ps1)"]
        PortalUser["User Mobile / Browser Portal\n(employee.html)"]
    end

    SubGraphServer["Node.js Core HTTP Server (server.js)"]
        AuthModule["Authentication Layer\n(lib/hosted-auth.js & sensor-auth.js)"]
        Engine["SOCEngine State Machine\n(js/simulation.js)"]
        RuleDetector["Deterministic Rule Detector\n(js/alerts.js)"]
        LLMManager["LLM Provider Orchestrator\n(lib/llm-provider.js)"]
    end

    SubGraphStorage["Persistence"]
        PostgresDB[("PostgreSQL Database\n(soc_lab_snapshots JSONB)")]
    end

    SubGraphLLM["External AI Providers"]
        Gemini["Google Gemini API\n(gemini-3.7-flash)"]
        OpenAI["OpenAI API\n(gpt-4.1-mini)"]
        Ollama["Local Ollama Service\n(llama3.2:3b)"]
    end

    SubGraphClient["Analyst Operations Desk"]
        ConsoleUI["Analyst Console SPA\n(index.html / js/app.js)"]
    end

    WinAgent -- "POST /api/sensors/windows (Bearer Token)" --> AuthModule
    PortalUser -- "POST /api/portal (Session Token)" --> AuthModule
    AuthModule --> Engine
    Engine --> RuleDetector
    RuleDetector -- "Generate Alerts" --> Engine
    Engine -- "Compare-and-Swap (CAS)" --> PostgresDB
    ConsoleUI -- "GET /api/stream (SSE Events)" --> Engine
    ConsoleUI -- "POST /api/llm/analyze" --> LLMManager
    LLMManager -- "1. Try Primary" --> Gemini
    LLMManager -- "2. Fallback" --> OpenAI
    LLMManager -- "3. Local Fallback" --> Ollama
```

### Request / Data Flow Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Sensor as Windows Collector (PS1)
    participant Server as HTTP Server (server.js)
    participant Engine as SOCEngine (simulation.js)
    participant DB as PostgreSQL (postgres-store.js)
    actor Analyst as Analyst Operations Desk
    participant LLM as Multi-LLM Provider

    Sensor->>Server: POST /api/sensors/windows (Bearer Token + JSON Events)
    Server->>Server: Verify Bearer Token (sensor-auth.js)
    Server->>Engine: Ingest & normalize events (windows-events.js)
    Engine->>Engine: Evaluate rules (alerts.js) & mutate state
    Engine->>DB: UPDATE soc_lab_snapshots (CAS increment revision)
    Server-->>Analyst: Push updated state via Server-Sent Events (SSE)
    Analyst->>Server: POST /api/llm/analyze (Alert ID)
    Server->>LLM: Dispatch structured bundle (buildEvidence)
    LLM-->>Server: Return structured JSON response & citations
    Server->>Engine: Update alert with LLM analysis
    Server-->>Analyst: Broadcast LLM completion via SSE
    Analyst->>Server: POST /api/action (Decision: approve/contain)
    Server->>Engine: Add IP to simulated blocklist
    Engine->>DB: Save updated checkpoint
```

### Component Relationship Diagram

```mermaid
flowchart LR
    server["server.js"] --> config["lib/config.js"]
    server --> auth["lib/hosted-auth.js"]
    server --> sensorAuth["lib/sensor-auth.js"]
    server --> winNorm["lib/windows-events.js"]
    server --> llm["lib/llm-provider.js"]
    server --> db["lib/postgres-store.js"]
    server --> snap["lib/lab-snapshot.js"]
    server --> sim["js/simulation.js"]

    sim --> alerts["js/alerts.js"]
    sim --> mock["data/mock-events.js"]
    sim --> aiNarrative["js/ai-analysis.js"]
    aiNarrative --> mitre["data/mitre-data.js"]
```

---

## 7. APPLICATION STARTUP FLOW

```text
[ Entry Point: node server.js ]
              ↓
[ 1. Environment Loading: loadConfig() ] ---> Validates Node >= 22 & reads .env
              ↓
[ 2. Storage Setup: new PostgresStore() ] --> (If DATABASE_URL set) Opens connection pool
              ↓
[ 3. LLM Setup: createLLMProvider() ] ------> Configures provider chain (Gemini/OpenAI/Ollama)
              ↓
[ 4. Engine Instantiation: SOCEngine ] ------> Creates in-memory state & optional fixture seeding
              ↓
[ 5. Server Creation: createLabServer() ] ---> Registers HTTP handlers & SSE client set
              ↓
[ 6. Database Hydration: ready Promise ] ----> SELECT payload FROM soc_lab_snapshots (Restores lab)
              ↓
[ 7. Server Listening: server.listen() ] ----> Listens on configured Port (0.0.0.0 or 127.0.0.1)
              ↓
[ 8. Simulation Tick Loop: setInterval ] ----> Fires tick() every 1000ms for active simulations
```

* **Entry Point Location**: `server.js:273-294`
* **Bootstrap Failure Handling**: If PostgreSQL is configured but fails to connect, the server logs a fatal startup error and terminates (`process.exit(1)`), preventing state corruption (`server.js:283`).

---

## 8. ROUTING & NAVIGATION

All HTTP endpoints are implemented inside a unified request handler in [server.js:86-227](file:///d:/major%20project/server.js#L86-L227).

| Route | Method | Access Level | Purpose | Data Source / Handler | Important Logic |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/` or `/index.html` | `GET` | Analyst | Serves main SOC Analyst Console | Static file `index.html` | Redirects to `/analyst-login.html` if hosted & unauthenticated |
| `/employee.html` | `GET` | Public / Invited | Serves Employee interaction portal | Static file `employee.html` | Accepts `?join=` query parameter for invitation code |
| `/analyst-login.html`| `GET` | Public | Serves Analyst login screen | Static file `analyst-login.html` | Renders analyst authentication form |
| `/api/health` | `GET` | Public | Backend health probe | Internal state check | Returns HTTP 503 if PostgreSQL CAS store fails |
| `/api/config` | `GET` | Public | Exposes environment capabilities | `lib/config.js` & LLM descriptor | Redacts all secrets and API keys |
| `/api/auth/login` | `POST` | Public | Analyst sign-in | `lib/hosted-auth.js:22` | Sets HTTP-only `__Host-soc_session` cookie |
| `/api/auth/logout` | `POST` | Analyst | Analyst sign-out | `lib/hosted-auth.js:35` | Invalidates active analyst cookie session |
| `/api/sensors/windows`| `POST` | Sensor Agent | Ingests Windows host events | `lib/windows-events.js` | Requires `Bearer SENSOR_INGEST_TOKEN`. Max 120 req/min/IP |
| `/api/join-qr.svg` | `GET` | Analyst | Generates LAN onboarding QR code | `qrcode` SVG generator | Only accessible in `--lan` or `--hosted` mode |
| `/api/state` | `GET` | Analyst | Fetches current complete lab state | `SOCEngine.state` | Returns full state snapshot |
| `/api/stream` | `GET` | Analyst | Real-time Server-Sent Events stream | `clients.add(res)` | Broadcasts SSE update on every engine state revision |
| `/api/llm/analyze` | `POST` | Analyst | Triggers AI incident investigation | `lib/llm-provider.js` | Async background job. Cooldown enforced (5s) |
| `/api/action` | `POST` | Analyst | Analyst actions (Contain/Reset/Seed)| `SOCEngine.action()` | Requires analyst authorization |
| `/api/register` | `POST` | Public / Invited | Registers employee portal device | `SOCEngine.register()` | Assigns synthetic IP in `192.168.1.x` subnet |
| `/api/portal` | `POST` | Registered Session | Employee portal interactive actions| `registrations.get()` | Handles `login`, `probe`, `demo-sequence`, `heartbeat` |

---

## 9. FRONTEND ARCHITECTURE

The frontend is implemented as a lightweight, zero-dependency Single Page Application (SPA) utilizing native browser ES modules.

### Component Structure
* **App Shell & State Controller**: [js/app.js](file:///d:/major%20project/js/app.js) manages client-side routing, initial API fetching (`/api/config`, `/api/state`), SSE stream connection setup (`/api/stream`), and UI tab state (`alerts`, `timeline`, `topology`, `devices`).
* **Views Renderer**: [js/views.js](file:///d:/major%20project/js/views.js) dynamically renders DOM elements for incoming alerts, event timelines, risk gauges, and device tables.
* **Network Topology Renderer**: [js/network.js](file:///d:/major%20project/js/network.js) generates a real-time responsive SVG network topology visualizer showing device trust levels, active connections, and block status.
* **AI Analysis Panel**: [js/llm-panel.js](file:///d:/major%20project/js/llm-panel.js) manages the investigation side-panel modal, rendering rule classification, MITRE ATT&CK technique mappings, evidence citations, and interactive containment approval buttons.
* **Employee Portal App**: [js/portal.js](file:///d:/major%20project/js/portal.js) handles registration, heartbeat polling (every 5 seconds), interactive portal actions (login, document viewing, admin probes), and automated attack scenario execution.

---

## 10. BACKEND ARCHITECTURE

The backend consists of a single-process Node.js HTTP application server running an asynchronous state queue.

### Core Systems
1. **Request Queueing (`enqueue`)**: To prevent state corruption during concurrent REST API calls, SSE streaming, and background tick intervals, all engine state mutations share a unified Promise-chain queue (`server.js:45`).
2. **State Machine (`SOCEngine`)**: The single source of state truth in memory ([js/simulation.js](file:///d:/major%20project/js/simulation.js:5)). Ingests events, updates device risk scores, evaluates detection rules, manages simulation scenarios, and manages tick timers.
3. **LLM Worker Isolation**: To maintain real-time responsiveness for HTTP connections and SSE listeners, external LLM calls execute outside the synchronous state queue (`server.js:69`). Results are queued back into the engine state upon completion.

---

## 11. API DOCUMENTATION

### Selected Endpoints

#### 1. POST `/api/sensors/windows`
* **Purpose**: Ingest real-time Windows host security log batches.
* **Headers**: `Authorization: Bearer <SENSOR_INGEST_TOKEN>`, `Content-Type: application/json`
* **Request Body**: Array of Windows event objects (Max 100 per request, payload size < 512KB).
```json
[
  {
    "eventId": 4625,
    "recordId": "10492",
    "timestamp": "2026-10-05T17:00:00.000Z",
    "computer": "WIN-DESKTOP01",
    "logName": "Security",
    "agentIp": "192.168.1.50",
    "remoteIp": "192.168.1.100",
    "user": "Administrator",
    "detail": "Failed Windows logon"
  }
]
```
* **Response (202 Accepted)**:
```json
{
  "accepted": 1,
  "duplicates": 0,
  "ignored": 0
}
```

#### 2. POST `/api/llm/analyze`
* **Purpose**: Requests LLM incident analysis for a specific investigation alert.
* **Headers**: Analyst Cookie or Local Host Session
* **Request Body**: `{"id": "SOC-841"}`
* **Response (202 Accepted)**:
```json
{
  "ok": true
}
```

---

## 12. DATABASE / DATA MODEL

The system uses PostgreSQL as a persistent snapshot store. Rather than maintaining complex relational tables for a lightweight simulation lab, the database stores the entire serialized `SOCEngine` state state tree in a single JSONB row using Compare-And-Swap (CAS) optimistic concurrency control.

### ER Diagram / Schema Definition

```mermaid
erDiagram
    soc_lab_snapshots {
        text lab_id PK "Default: 'default'"
        bigint revision "Monotonically increasing sequence counter"
        jsonb payload "Complete serialized lab state JSON"
        timestamptz updated_at "Timestamp of last CAS update"
    }
```

### PostgreSQL DDL ([lib/postgres-store.js:15-20](file:///d:/major%20project/lib/postgres-store.js#L15-L20))
```sql
CREATE TABLE IF NOT EXISTS soc_lab_snapshots (
  lab_id text PRIMARY KEY,
  revision bigint NOT NULL DEFAULT 0,
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### Compare-And-Swap (CAS) Logic ([lib/postgres-store.js:29-34](file:///d:/major%20project/lib/postgres-store.js#L29-L34))
```javascript
UPDATE soc_lab_snapshots
SET payload = $1::jsonb, revision = revision + 1, updated_at = now()
WHERE lab_id = $2 AND revision = $3 RETURNING revision;
```
If `rowCount === 0`, the update is rejected with code `SOC_DATABASE` to prevent multiple backend instances from overwriting each other's state.

---

## 13. AUTHENTICATION & AUTHORIZATION

### Authentication Schemes
1. **Analyst Session Authentication** ([lib/hosted-auth.js](file:///d:/major%20project/lib/hosted-auth.js)):
   * Uses password protection (`SOC_ADMIN_PASSWORD`, minimum 12 chars).
   * Generates a 256-bit cryptographically secure session token (`randomBytes(32).toString('base64url')`).
   * Sets secure HTTP-Only cookie `__Host-soc_session` (`SameSite=Strict`).
   * Enforces brute-force rate limiting (Max 10 failed sign-in attempts per IP per minute).
2. **Sensor Bearer Authorization** ([lib/sensor-auth.js](file:///d:/major%20project/lib/sensor-auth.js)):
   * Authenticates host sensor agents via `Authorization: Bearer <SENSOR_INGEST_TOKEN>`.
   * Evaluated using constant-time hash comparison (`crypto.timingSafeEqual`) to eliminate timing attacks.
3. **Device Portal Session Token**:
   * Devices registered via `/api/register` receive a UUID v4 device token (`X-Device-Token`).
   * Stored on the server as a SHA-256 token hash (`tokenHash(token)`).

---

## 14. SECURITY ARCHITECTURE

An audit of the codebase revealed several built-in defensive security controls:

* **Authentication Rate Limiting**: `Implemented` ([lib/hosted-auth.js:25-27](file:///d:/major%20project/lib/hosted-auth.js#L25-L27)) — Rate limits sign-in attempts per IP.
* **Constant-Time Token Comparison**: `Implemented` ([lib/sensor-auth.js:7-8](file:///d:/major%20project/lib/sensor-auth.js#L7-L8)) — SHA-256 hashed comparison via `timingSafeEqual`.
* **Content Security Policy (CSP)**: `Implemented` ([server.js:89](file:///d:/major%20project/server.js#L89)) — Enforces `default-src 'self'`, `frame-ancestors 'none'`, disabling external script loading.
* **HTTP Security Headers**: `Implemented` ([server.js:87-88](file:///d:/major%20project/server.js#L87-L88)) — Sets `X-Content-Type-Options: nosniff` and `Referrer-Policy: same-origin`.
* **Private IP Validation**: `Implemented` ([js/simulation.js:146-150](file:///d:/major%20project/js/simulation.js#L146-L150)) — Enforces RFC 1918 private IPv4 validation (`10.x`, `172.16-31.x`, `192.168.x`). Rejects public IP ingestion to avoid telemetry pollution.
* **Prompt Injection Defense**: `Implemented` ([lib/llm-provider.js:14-20](file:///d:/major%20project/lib/llm-provider.js#L14-L20)) — Instructs LLM providers that all log content is untrusted data, never instructions.
* **LLM Output Schema Validation**: `Implemented` ([lib/llm-provider.js:35-49](file:///d:/major%20project/lib/llm-provider.js#L35-L49)) — Validates LLM responses against a strict JSON schema and verifies that cited evidence IDs actually exist in the supplied bundle.

---

## 15. ENVIRONMENT VARIABLES & CONFIGURATION

| Variable | Purpose | Required | Used In | Example / Format | Secret? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `PORT` | Listening HTTP port | No (Default: `8000`) | [lib/config.js:15](file:///d:/major%20project/lib/config.js#L15) | `8000` | No |
| `SOC_HOSTED` | Enables hosted authentication mode | No (Default: `false`) | [server.js:276](file:///d:/major%20project/server.js#L276) | `true` | No |
| `DATABASE_URL` | PostgreSQL connection URI | Hosted: Yes, Local: No | [lib/postgres-store.js:7](file:///d:/major%20project/lib/postgres-store.js#L7) | `postgresql://user:pass@host/db` | Yes (`<REDACTED>`) |
| `SENSOR_INGEST_TOKEN` | Bearer token for Windows collector | Sensor Mode: Yes | [lib/sensor-auth.js:3](file:///d:/major%20project/lib/sensor-auth.js#L3) | 32+ Random AlphaNumeric Chars | Yes (`<REDACTED>`) |
| `SENSOR_URL` | Target server URL for collectors | Sensor Mode: Yes | [scripts/windows-event-collector.ps1](file:///d:/major%20project/scripts/windows-event-collector.ps1) | `https://soc-analyst-lab.onrender.com` | No |
| `LLM_PROVIDER` | Single LLM selection or `auto` | No (Default: `auto`) | [lib/llm-provider.js:82](file:///d:/major%20project/lib/llm-provider.js#L82) | `auto`, `gemini`, `openai`, `ollama` | No |
| `LLM_PROVIDERS` | Fallback provider fallback sequence| No (Default: `gemini,openai,ollama`) | [lib/llm-provider.js:148](file:///d:/major%20project/lib/llm-provider.js#L148) | `gemini,openai,ollama` | No |
| `GEMINI_API_KEY` | Google Gemini API key | If Gemini used | [lib/llm-provider.js:116](file:///d:/major%20project/lib/llm-provider.js#L116) | `AIzaSy...` | Yes (`<REDACTED>`) |
| `OPENAI_API_KEY` | OpenAI API key | If OpenAI used | [lib/llm-provider.js:116](file:///d:/major%20project/lib/llm-provider.js#L116) | `sk-proj-...` | Yes (`<REDACTED>`) |
| `OLLAMA_BASE_URL` | Local Ollama HTTP origin | If Ollama used | [lib/llm-provider.js:92](file:///d:/major%20project/lib/llm-provider.js#L92) | `http://127.0.0.1:11434` | No |
| `SOC_ADMIN_PASSWORD` | Analyst console login password | Hosted: Yes | [lib/hosted-auth.js:5](file:///d:/major%20project/lib/hosted-auth.js#L5) | 12+ Chars String | Yes (`<REDACTED>`) |
| `LAB_JOIN_CODE` | Employee portal invitation code | Hosted: Yes | [lib/hosted-auth.js:6](file:///d:/major%20project/lib/hosted-auth.js#L6) | 24+ Chars String | Yes (`<REDACTED>`) |
| `PUBLIC_URL` | Public HTTPS origin URL | Hosted: Yes | [lib/hosted-auth.js:9](file:///d:/major%20project/lib/hosted-auth.js#L9) | `https://soc-analyst-lab.onrender.com` | No |

---

## 16. THIRD-PARTY SERVICES & INTEGRATIONS

| Service | Purpose | Integration File(s) | Authentication | Failure Handling |
| :--- | :--- | :--- | :--- | :--- |
| **Google Gemini API** | Primary LLM Provider | [lib/llm-provider.js:89](file:///d:/major%20project/lib/llm-provider.js#L89) | Header `x-goog-api-key` | Automatic fallback to OpenAI / Ollama on failure/cooldown |
| **OpenAI API** | Secondary LLM Provider | [lib/llm-provider.js:88](file:///d:/major%20project/lib/llm-provider.js#L88) | Header `Authorization: Bearer` | Automatic fallback to Ollama on 429/500/timeout |
| **Ollama Local** | Local Privacy LLM Provider | [lib/llm-provider.js:90](file:///d:/major%20project/lib/llm-provider.js#L90) | None (Local HTTP) | Marks analysis failed if all providers exhausted |
| **PostgreSQL Host** | Persistent State Database | [lib/postgres-store.js](file:///d:/major%20project/lib/postgres-store.js) | Connection String URI | Fails backend into HTTP 503 read-only mode to prevent data corruption |

---

## 17. BUSINESS LOGIC

1. **Deterministic Rule Correlation**: When an event is ingested via `SOCEngine.ingest()`, it is passed to `detectRules()` ([js/alerts.js](file:///d:/major%20project/js/alerts.js)). If a rule condition matches recent event history (e.g., $\ge 5$ failed logins within 60s), an Alert object (`SOC-xxx`) is instantiated or updated.
2. **Analysis Invalidation on New Evidence**: If new events matching an active investigation arrive while analysis is pending or complete, the previous analysis is invalidated (`alert.analysis = null`), marked stale, and flagged for re-analysis ([js/simulation.js:65-67](file:///d:/major%20project/js/simulation.js#L65-L67)).
3. **Human-in-the-Loop Approval Gate**: LLM providers generate recommendations, but **never** auto-execute containment. Containment requires explicit analyst interaction via `POST /api/action` (`name: "decision"`, `decision: "approve"`).
4. **Simulated Containment Enforcement**: Approving an alert adds the source IP address to `engine.state.blocked`. Subsequent HTTP requests from that IP address to `/api/portal` are rejected with HTTP 403 Forbidden ([server.js:191](file:///d:/major%20project/server.js#L191)).

---

## 18. STATE MANAGEMENT

* **Single Source of Truth**: The `SOCEngine` instance initialized in `server.js:23`.
* **State Tree Structure**:
  ```json
  {
    "events": [],
    "alerts": [],
    "devices": [],
    "responses": [],
    "blocked": [],
    "running": null,
    "normalTraffic": false,
    "totalEvents": 0,
    "rate": [],
    "sensor": { "received": 0, "lastSeen": null, "recentIds": [] },
    "generation": 1759683800000,
    "revision": 42
  }
  ```
* **Reactivity / Synchronization**: Any change to `engine.state` increments `engine.state.revision` and invokes `publish()`, which serializes state to PostgreSQL and flushes an SSE payload to all connected browser clients ([server.js:60-64](file:///d:/major%20project/server.js#L60-L64)).

---

## 19. DATA FLOW

```text
[ Windows Security Event ] 
        ↓ 
PowerShell Agent (windows-event-collector.ps1) 
        ↓ 
HTTP POST /api/sensors/windows (Bearer Token) 
        ↓ 
Normalization Pipeline (lib/windows-events.js) 
        ↓ 
SOCEngine.ingest() (js/simulation.js) 
        ↓ 
Rule Detector (js/alerts.js) ---> Triggers Alert (SOC-841) 
        ↓ 
Enqueue Database Update (lib/postgres-store.js) ---> Postgres CAS Save 
        ↓ 
Publish Server-Sent Event (SSE) ---> Broadcast to Browser UI 
        ↓ 
Analyst Clicks "Request AI Analysis" ---> POST /api/llm/analyze 
        ↓ 
Multi-Provider LLM Chain (lib/llm-provider.js) ---> Gemini/OpenAI/Ollama 
        ↓ 
Validate Evidence Citations & JSON Schema (validateAnswer) 
        ↓ 
Attach AI Report to Alert ---> Broadcast SSE Update 
        ↓ 
Analyst Clicks "Approve Containment" ---> POST /api/action 
        ↓ 
Source IP added to engine.state.blocked ---> Device Blocked
```

---

## 20. ERROR HANDLING

* **Database Connection Failure**: If PostgreSQL loses connectivity during runtime, `postgres-store.js` rolls back in-memory state changes to `lastSaved` and returns HTTP 503 Service Unavailable, preventing partial state writes ([server.js:53-58](file:///d:/major%20project/server.js#L53-L58)).
* **LLM Provider Outage**: If Gemini returns 429 (Rate Limit) or 503 (Unavailable), `createLLMProvider()` catches the `ProviderFailure`, initiates a cooldown timer for Gemini, and immediately fails over to OpenAI or Ollama ([lib/llm-provider.js:163-178](file:///d:/major%20project/lib/llm-provider.js#L163-L178)).
* **Malformed Event Payload**: Ingestion payloads exceeding max limits or containing invalid IP formats are rejected with HTTP 400 Bad Request, preserving state integrity.

---

## 21. PERFORMANCE ARCHITECTURE

* **Zero Build Step**: Native ES Modules are served directly to the browser without Webpack/Babel/Rollup bundling.
* **Server-Sent Events (SSE)**: Replaces high-overhead HTTP polling with a single persistent SSE stream (`/api/stream`), dramatically reducing CPU and network idle utilization.
* **Bounded In-Memory Logs**: To prevent memory leaks during long-running lab simulations, `SOCEngine` automatically truncates in-memory events exceeding 3,000 items down to 1,500 while preserving all events referenced by active investigations ([js/simulation.js:75-78](file:///d:/major%20project/js/simulation.js#L75-L78)).

---

## 22. TESTING

* **Test Framework**: Native Node.js Test Runner (`node --test`).
* **Execution Command**: `npm test`
* **Test Inventory** (`tests/`):
  * [tests/engine.test.js](file:///d:/major%20project/tests/engine.test.js): Verifies `SOCEngine` rule triggering, containment, and reset logic. (PASS)
  * [tests/hosted.test.js](file:///d:/major%20project/tests/hosted.test.js): Tests authentication, route protection, session rate limiting. (PASS)
  * [tests/llm.test.js](file:///d:/major%20project/tests/llm.test.js): Tests Gemini/OpenAI provider schema validation and structured output. (PASS)
  * [tests/llm-fallback.test.js](file:///d:/major%20project/tests/llm-fallback.test.js): Simulates 429/503 provider outages and fallback routing. (PASS)
  * [tests/network.test.js](file:///d:/major%20project/tests/network.test.js): Tests SVG network topology generation logic. (PASS)
  * [tests/persistence.test.js](file:///d:/major%20project/tests/persistence.test.js): Tests snapshot capture, serialization, and restoration. (PASS)
  * [tests/postgres.test.js](file:///d:/major%20project/tests/postgres.test.js): Tests PostgreSQL Compare-And-Swap integration (SKIPPED if `TEST_DATABASE_URL` absent).
  * [tests/server.test.js](file:///d:/major%20project/tests/server.test.js): Integration tests for HTTP REST endpoints. (PASS)
  * [tests/suricata.test.js](file:///d:/major%20project/tests/suricata.test.js): Legacy Suricata alert normalization tests (**FAILING — see Section 31**).

---

## 23. BUILD / DEVELOPMENT / DEPLOYMENT

### Execution Commands

```bash
# 1. Environment Doctor Check
npm run doctor

# 2. Start Local Lab (127.0.0.1:8000)
npm run start:local

# 3. Start Private LAN Lab (0.0.0.0:8000 for mobile onboarding)
npm run start:lan

# 4. Start Hosted Production Mode
npm run start:hosted

# 5. Execute Test Suite
npm test

# 6. Execute Windows Collector Agent (PowerShell)
npm run sensor:windows
```

### Hosting Architecture (Render)
* **Configuration**: Defined in [render.yaml](file:///d:/major%20project/render.yaml).
* **Service Type**: Web Service (`runtime: node`, Node version `24`).
* **Start Command**: `npm run start:hosted` -> `node server.js --hosted`.
* **Database**: Free tier PostgreSQL database `soc-analyst-db`.

---

## 24. CI/CD & DEVOPS

* **Deployment Automation**: Configured via Infrastructure-as-Code in `render.yaml`.
* **Package Builders**: PowerShell packaging scripts in `scripts/` (`package-render.ps1`, `package-team.ps1`, `package-project.ps1`) create standalone ZIP distributions in `deployment/`.

---

## 25. OBSERVABILITY

* **Health Endpoint**: `GET /api/health` returns operational status, storage backend type (Memory vs. PostgreSQL), and Windows collector ingestion state ([server.js:95](file:///d:/major%20project/server.js#L95)).
* **Server Logging**: Structured console output logging server mode, storage provider, configured LLM providers, and listening network interfaces ([server.js:284-293](file:///d:/major%20project/server.js#L284-L293)).

---

## 26. SEO / ACCESSIBILITY / WEB QUALITY

* **SEO**: `index.html` and `employee.html` include meta description tags, viewport configuration, and semantic meta titles ([index.html:3](file:///d:/major%20project/index.html#L3)).
* **Accessibility**: Includes skip-to-content links (`<a class="skip-link" href="#main">`), proper ARIA landmarks (`role="status"`, `aria-live="polite"`), and high-contrast CSS variable palettes ([index.html:5](file:///d:/major%20project/index.html#L5)).

---

## 27. CODE QUALITY

* **Architecture Score**: **Good** — Decoupled modules, zero heavy framework dependencies, clear data boundaries.
* **Error Handling Score**: **Good** — Strict input boundaries, fail-closed authentication.
* **Test Coverage Score**: **Acceptable** — Core engine, LLMs, and server routes fully tested. Suricata test suite needs cleanup.

---

## 28. DEAD CODE & UNUSED ASSETS

### Confirmed Unused / Orphaned
1. **[scripts/suricata-forwarder.js](file:///d:/major%20project/scripts/suricata-forwarder.js)**: Suricata log forwarder daemon that POSTs to `/api/sensors/suricata`. This route handler was removed from `server.js` during the Windows Event Collector refactoring.
2. **[lib/suricata.js](file:///d:/major%20project/lib/suricata.js)**: Suricata normalization library, no longer referenced in `server.js`.
3. **[docs/01-SURICATA-STEPS.md](file:///d:/major%20project/docs/01-SURICATA-STEPS.md)** & **[docs/02-SURICATA-COMMANDS.md](file:///d:/major%20project/docs/02-SURICATA-COMMANDS.md)**: Legacy Suricata setup documentation superseded by [docs/REAL-SENSOR-SETUP.md](file:///d:/major%20project/docs/REAL-SENSOR-SETUP.md).

---

## 29. DEPENDENCY AUDIT

| Dependency | Type | Version | Purpose | Security Review |
| :--- | :--- | :--- | :--- | :--- |
| `pg` | Production | `^8.23.0` | PostgreSQL Database Driver | Clean. Uses connection pooling & parameterized queries. |
| `qrcode` | Production | `^1.5.4` | Server-Side SVG QR Code Generator | Clean. Zero network calls, renders SVG strings directly. |

*Total external runtime dependencies: **2 packages**.*

---

## 30. TECHNICAL DEBT

| Issue | Severity | Impact | Location | Why It Matters | Suggested Direction |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Failing Suricata Tests** | High | `npm test` fails 3 tests | [tests/suricata.test.js](file:///d:/major%20project/tests/suricata.test.js) | Test suite returns exit code 1 due to missing route | Either restore `/api/sensors/suricata` in `server.js` or archive the test file |
| **Single-Row State Lock** | Medium | Scalability constraint | [lib/postgres-store.js](file:///d:/major%20project/lib/postgres-store.js) | Entire state is stored in a single JSONB row | Acceptable for lab demo; convert to relational tables if scaling to multi-tenant SIEM |
| **In-Memory Session Map** | Low | Session invalidation on restart | [lib/hosted-auth.js:11](file:///d:/major%20project/lib/hosted-auth.js#L11) | Analyst sign-ins are lost when process restarts | Persist analyst sessions into PostgreSQL if persistent sign-in is required |

---

## 31. KNOWN BUGS / RISKS / WEAKNESSES

### 1. Orphaned Suricata Sensor Endpoint Causes Test Failures
* **Location**: `server.js:110` vs. [tests/suricata.test.js:33](file:///d:/major%20project/tests/suricata.test.js#L33)
* **Problem**: `server.js` handles `/api/sensors/windows` but has no route handler for `/api/sensors/suricata`. Requests to `/api/sensors/suricata` return HTTP 404 Not Found.
* **Impact**: Running `npm test` results in 3 failed assertions in `tests/suricata.test.js`.
* **Evidence**:
  ```text
  ✖ authenticated Suricata ingestion creates reviewable real-time evidence
    AssertionError: Expected values to be strictly equal: 404 !== 401
  ```
* **Recommended Fix**: Add a route handler in `server.js` forwarding Suricata payloads to `normalizeSuricataBatch()`, or mark `suricata.test.js` as skipped/archived.

---

## 32. FEATURES INVENTORY

| Feature | Implemented? | Location | Notes |
| :--- | :--- | :--- | :--- |
| **Windows Event Collector** | Fully Implemented | `scripts/windows-event-collector.ps1` | Ingests live host logs |
| **Deterministic Rule Detector** | Fully Implemented | `js/alerts.js` | Maps events to MITRE ATT&CK |
| **Multi-LLM Provider Fallback** | Fully Implemented | `lib/llm-provider.js` | Gemini → OpenAI → Ollama |
| **Analyst Operations Desk** | Fully Implemented | `index.html` & `js/app.js` | Real-time SSE dashboard |
| **Employee Interaction Portal**| Fully Implemented | `employee.html` & `js/portal.js` | Device simulation & onboarding |
| **PostgreSQL CAS Persistence** | Fully Implemented | `lib/postgres-store.js` | Single-row state checkpointing |
| **Simulated Firewall Blocklist** | Fully Implemented | `js/simulation.js:125` | Enforces IP containment |

---

## 33. UI / UX INVENTORY

* **Main Operations Desk (`/index.html`)**: Features dark mode theme ([css/theme.css](file:///d:/major%20project/css/theme.css)), live event rate canvas line chart ([js/charts.js](file:///d:/major%20project/js/charts.js)), SVG network topology ([js/network.js](file:///d:/major%20project/js/network.js)), investigation side-panel modal ([js/llm-panel.js](file:///d:/major%20project/js/llm-panel.js)), and toast notification system.
* **Employee Portal (`/employee.html`)**: Features fictional Northstar company branding, interactive employee login form, document viewer, admin access probe, and automated scenario launcher.

---

## 34. IMPORTANT ALGORITHMS / COMPLEX LOGIC

### Compare-and-Swap Revision Control
[lib/postgres-store.js:27-34](file:///d:/major%20project/lib/postgres-store.js#L27-L34) implements optimistic concurrency locking for single-row JSONB state updates.

### Fallback Provider Cooldown Mechanism
[lib/llm-provider.js:146-185](file:///d:/major%20project/lib/llm-provider.js#L146-L185) maintains failure timestamps and HTTP `Retry-After` header delays per provider. If a provider encounters a 429 Rate Limit, it enters a cooling-down state, causing subsequent requests to seamlessly bypass it and execute against the next provider in the chain until the cooldown expires.

---

## 35. IMPORTANT CODE SNIPPETS / IMPLEMENTATION REFERENCES

### 1. Compare-And-Swap Save ([lib/postgres-store.js:27-34](file:///d:/major%20project/lib/postgres-store.js#L27-L34))
```javascript
async save(snapshot) {
  const result = await this.pool.query(`UPDATE soc_lab_snapshots
    SET payload = $1::jsonb, revision = revision + 1, updated_at = now()
    WHERE lab_id = $2 AND revision = $3 RETURNING revision`, [JSON.stringify(snapshot), this.labId, this.revision]);
  if (result.rowCount !== 1) throw new Error('Another server changed this lab. Run one server per database lab.');
  this.revision = result.rows[0].revision;
}
```

### 2. Multi-Provider LLM Fallback Loop ([lib/llm-provider.js:163-178](file:///d:/major%20project/lib/llm-provider.js#L163-L178))
```javascript
for (const entry of providers) {
  if (signal?.aborted) throw cancelled();
  const { provider, model, configured, message } = entry.adapter.descriptor;
  if (!configured || entry.retryAt > now()) continue;
  try {
    const result = await entry.adapter.analyze(bundle, signal);
    entry.retryAt = 0;
    return { ...result, attempts, fallbackUsed: attempts.length > 1 };
  } catch (error) {
    entry.retryAt = now() + error.cooldownMs;
  }
}
```

---

## 36. DECISION LOG / ARCHITECTURAL DECISIONS

1. **Framework-Free Core Server**: `Explicit Decision Found` ([server.js](file:///d:/major%20project/server.js)) — Built using native Node.js `http` module to ensure zero external framework maintenance overhead and maximum portability.
2. **Single-Row JSONB PostgreSQL Storage**: `Explicit Decision Found` ([lib/postgres-store.js:3-4](file:///d:/major%20project/lib/postgres-store.js#L3-L4)) — Chosen because the application represents a single shared demonstration lab state, eliminating complex SQL ORM migrations while maintaining atomic consistency.
3. **No Auto-Containment Policy**: `Explicit Decision Found` ([lib/llm-provider.js:18](file:///d:/major%20project/lib/llm-provider.js#L18)) — AI models only provide advisory recommendations; human analysts must explicitly approve any containment action.

---

## 37. PROJECT DEPENDENCY GRAPH

```text
llm-powered-soc-analyst
├── Node.js Standard Library (http, crypto, fs, path, os)
├── External Dependencies
│   ├── pg (^8.23.0) ---------> PostgreSQL Database Connection
│   └── qrcode (^1.5.4) ------> LAN Join QR Code SVG Generation
└── External APIs
    ├── Google Gemini API ----> Primary LLM Incident Analysis
    ├── OpenAI API -----------> Secondary LLM Fallback Provider
    └── Ollama Local ---------> Local LLM Fallback Service
```

---

## 38. CRITICAL PATHS

1. **Windows Sensor Ingestion Path**: `Windows Host -> PowerShell -> POST /api/sensors/windows -> SOCEngine.ingest() -> SSE Stream -> Analyst Console`. Breakage causes live host telemetry to stop appearing.
2. **Incident Analysis Path**: `Analyst Request -> POST /api/llm/analyze -> lib/llm-provider.js -> Gemini/OpenAI API -> validateAnswer() -> UI Render`. Breakage prevents AI investigation reports.
3. **Analyst Decision & Containment Path**: `Analyst Approval -> POST /api/action -> SOCEngine.decide() -> Blocked List -> PostgreSQL CAS Update`. Breakage prevents blocking compromised devices.

---

## 39. SINGLE POINTS OF FAILURE

1. **PostgreSQL Database (In Hosted Mode)**: If PostgreSQL fails or rejects CAS writes, `server.js` halts all mutations and returns HTTP 503 ([server.js:57](file:///d:/major%20project/server.js#L57)).
2. **LLM Provider API Keys**: If neither `GEMINI_API_KEY`, `OPENAI_API_KEY`, nor a local `Ollama` instance are available, AI incident investigations return an error message, though manual detection rules continue to function.

---

## 40. BACKUP / RECOVERY / RESILIENCE

* **State Checkpointing**: Automatically saved on every state revision to PostgreSQL when `DATABASE_URL` is set.
* **Server Recovery**: On backend restart, `server.js` reloads the latest snapshot from PostgreSQL and automatically marks any in-flight LLM jobs as `Interrupted`, prompting the analyst to retry ([server.js:36-38](file:///d:/major%20project/server.js#L36-L38)).

---

## 41. PRIVACY / DATA HANDLING

* **Personal Data Handled**: None. All employee accounts (`employee01`, `admin`) and internal documents (`/finance/quarterly.csv`) are synthetic lab fixtures.
* **Log Scrubbing**: Windows Event Collector scripts strip out full process command lines and capture only process file names (`Path.GetFileName`), preventing accidental credential leakage from process parameters ([scripts/windows-event-collector.ps1:39](file:///d:/major%20project/scripts/windows-event-collector.ps1#L39)).

---

## 42. CHANGE IMPACT MAP

```text
SOCEngine (js/simulation.js)
 ├── server.js (All REST API & SSE responses)
 ├── js/alerts.js (Rule detection criteria)
 ├── lib/lab-snapshot.js (State serialization schema)
 └── lib/postgres-store.js (Database JSONB payload format)
```
*Modifying `SOCEngine.state` schema requires updating `lib/lab-snapshot.js` validation rules to avoid breaking database snapshot restoration.*

---

## 43. DEVELOPER ONBOARDING GUIDE

### Quickstart Steps (5 Minutes)

1. **Prerequisites**: Install Node.js 22.0.0 or higher.
2. **Environment Setup**:
   ```bash
   # Copy template environment file
   cp .env.example .env
   ```
3. **Install Dependencies**:
   ```bash
   npm install
   ```
4. **Run System Diagnostic**:
   ```bash
   npm run doctor
   ```
5. **Launch Local Server**:
   ```bash
   npm run start:local
   ```
6. **Access Interfaces**:
   * Analyst Operations Desk: `http://localhost:8000`
   * Employee Portal: `http://localhost:8000/employee.html`

---

## 44. "WHERE SHOULD I LOOK?" INDEX

| I need to change... | Look at this file |
| :--- | :--- |
| **HTTP Server & API Routes** | [server.js](file:///d:/major%20project/server.js) |
| **Detection Rules & MITRE Mapping** | [js/alerts.js](file:///d:/major%20project/js/alerts.js) |
| **State Machine & Event Ingestion** | [js/simulation.js](file:///d:/major%20project/js/simulation.js) |
| **LLM Provider API & Prompts** | [lib/llm-provider.js](file:///d:/major%20project/lib/llm-provider.js) |
| **Windows Event Normalization** | [lib/windows-events.js](file:///d:/major%20project/lib/windows-events.js) |
| **PowerShell Log Collector** | [scripts/windows-event-collector.ps1](file:///d:/major%20project/scripts/windows-event-collector.ps1) |
| **PostgreSQL Snapshot Persistence**| [lib/postgres-store.js](file:///d:/major%20project/lib/postgres-store.js) |
| **Analyst UI Layout & Panels** | [js/views.js](file:///d:/major%20project/js/views.js) & [js/llm-panel.js](file:///d:/major%20project/js/llm-panel.js) |
| **Hosted Auth & Cookies** | [lib/hosted-auth.js](file:///d:/major%20project/lib/hosted-auth.js) |

---

## 45. MASTER ARCHITECTURE DIAGRAM

```mermaid
flowchart TD
    subgraph Clients ["Endpoints & Client Tier"]
        WinHost["Windows Workstation\n(scripts/windows-event-collector.ps1)"]
        MobilePortal["Mobile / LAN User\n(employee.html / js/portal.js)"]
        AnalystDesk["Analyst Operations Desk\n(index.html / js/app.js)"]
    end

    subgraph NodeServer ["Node.js Application Server (server.js)"]
        HTTPRouter["HTTP REST Router & Static Middleware"]
        AuthSystem["Hosted Auth & Sensor Token Validator\n(hosted-auth.js / sensor-auth.js)"]
        QueueManager["Unified State Promise Queue\n(enqueue)"]
        SOCEngineCore["SOCEngine State Machine\n(simulation.js)"]
        RuleEngine["Deterministic Detection Rules\n(alerts.js)"]
        LLMOrchestrator["Multi-Provider LLM Orchestrator\n(llm-provider.js)"]
    end

    subgraph PersistenceLayer ["Database & External Services"]
        PostgresDB[("PostgreSQL Snapshot Store\n(soc_lab_snapshots CAS table)")]
        GeminiAPI["Google Gemini API"]
        OpenAIAPI["OpenAI API"]
        OllamaLocal["Local Ollama Service"]
    end

    WinHost -- "POST /api/sensors/windows" --> HTTPRouter
    MobilePortal -- "POST /api/portal" --> HTTPRouter
    AnalystDesk -- "GET /api/stream (SSE)" --> HTTPRouter
    AnalystDesk -- "POST /api/llm/analyze" --> HTTPRouter

    HTTPRouter --> AuthSystem
    AuthSystem --> QueueManager
    QueueManager --> SOCEngineCore
    SOCEngineCore <--> RuleEngine
    SOCEngineCore -- "Atomic CAS Write" --> PostgresDB
    LLMOrchestrator <--> GeminiAPI
    LLMOrchestrator <--> OpenAIAPI
    LLMOrchestrator <--> OllamaLocal
    HTTPRouter --> LLMOrchestrator
```

---

## 46. MASTER PROJECT STATUS

| Area | Status | Confidence | Notes |
| :--- | :--- | :--- | :--- |
| **Architecture** | Healthy | High | Modular Node.js ESM architecture with zero framework overhead. |
| **Frontend** | Healthy | High | Responsive SPA with native ES modules, SSE updates, and SVG topology. |
| **Backend** | Healthy | High | Reliable HTTP server with queueing, SSE broadcasting, and error boundaries. |
| **Database** | Healthy | High | Robust CAS snapshot model in PostgreSQL preventing multi-server collisions. |
| **Authentication** | Healthy | High | Fail-closed hosted session cookies and constant-time sensor token verification. |
| **Security** | Healthy | High | Built-in CSP headers, private IP filtering, and prompt injection defenses. |
| **Testing** | Needs Attention| High | 45 tests passing. 3 tests failing in `suricata.test.js` due to missing legacy route. |
| **Deployment** | Healthy | High | Production-ready Render IaC configuration (`render.yaml`). |
| **Documentation** | Healthy | High | Comprehensive technical guides, walkthroughs, and source-of-truth `brain.md`. |
| **Technical Debt** | Acceptable | High | Legacy Suricata forwarder scripts present but unused by core server. |

---

## 47. FINAL "BRAIN" SUMMARY

### Project in One Paragraph
The **LLM-Powered SOC Analyst Lab** (`llm-powered-soc-analyst`) is a zero-dependency, full-stack security operations center simulation platform engineered in Node.js 22+ and Vanilla JavaScript. It captures real-time Windows host Security Event logs via a PowerShell agent alongside simulated employee portal activity, correlates telemetry against MITRE ATT&CK techniques via a deterministic rule engine, and provides an AI investigation assistant featuring automated fallback across Google Gemini, OpenAI, and local Ollama models. Designed for high resilience and zero-downtime deployment, it persists lab state to PostgreSQL using single-row Compare-And-Swap (CAS) JSONB snapshots and streams live updates to an interactive analyst console via Server-Sent Events (SSE).

### Project in 10 Lines
1. **Language & Runtime**: Node.js 22+ native ES modules with zero web framework dependencies.
2. **Frontend Stack**: Vanilla HTML5, CSS3 dark theme variables, and modular client JavaScript.
3. **Host Log Agent**: `scripts/windows-event-collector.ps1` harvesters live Windows host event logs.
4. **Detection Engine**: `js/alerts.js` maps heuristic patterns to MITRE ATT&CK techniques.
5. **AI Engine**: `lib/llm-provider.js` executes structured JSON incident analysis with automatic Gemini → OpenAI → Ollama fallback.
6. **Persistence**: `lib/postgres-store.js` implements optimistic Compare-And-Swap JSONB snapshot updates.
7. **Real-time Updates**: `server.js` streams state updates to analyst consoles via Server-Sent Events (SSE).
8. **Security Controls**: CSP headers, constant-time token comparison, rate limiting, and private IPv4 validation.
9. **Deployment**: Hosted on Render with PostgreSQL backing via `render.yaml`.
10. **Known Discrepancy**: Legacy `scripts/suricata-forwarder.js` and `tests/suricata.test.js` target a legacy `/api/sensors/suricata` endpoint replaced by Windows logging.

### Top 10 Critical Files
1. **[server.js](file:///d:/major%20project/server.js)**: Core HTTP server, REST router, SSE publisher, and state queue orchestrator.
2. **[js/simulation.js](file:///d:/major%20project/js/simulation.js)**: `SOCEngine` state machine, event ingestion, risk calculator, and tick loop.
3. **[lib/llm-provider.js](file:///d:/major%20project/lib/llm-provider.js)**: Multi-provider LLM fallback manager with strict JSON schema validation.
4. **[lib/postgres-store.js](file:///d:/major%20project/lib/postgres-store.js)**: PostgreSQL Compare-And-Swap state snapshot engine.
5. **[js/alerts.js](file:///d:/major%20project/js/alerts.js)**: Heuristic detection rules mapping security events to MITRE ATT&CK.
6. **[lib/windows-events.js](file:///d:/major%20project/lib/windows-events.js)**: Windows Event Log normalizer and batch processor.
7. **[scripts/windows-event-collector.ps1](file:///d:/major%20project/scripts/windows-event-collector.ps1)**: Host sensor agent forwarding Windows Event logs.
8. **[lib/hosted-auth.js](file:///d:/major%20project/lib/hosted-auth.js)**: Analyst session authentication, cookie security, and rate limiting.
9. **[js/app.js](file:///d:/major%20project/js/app.js)**: Analyst Operations Desk Single Page Application controller.
10. **[render.yaml](file:///d:/major%20project/render.yaml)**: Production Render deployment specification.

### Top 10 Operational & Technical Risks
1. **Failing Suricata Unit Tests**: 3 unit tests fail because `/api/sensors/suricata` is missing in `server.js`.
2. **Single-Row State Bottleneck**: Storing the entire state in a single JSONB row can become a performance bottleneck under high event volumes.
3. **LLM Provider API Quota Exhaustion**: High AI request volumes can trigger HTTP 429 rate limits across cloud providers.
4. **In-Memory Analyst Sessions**: Hosted analyst sign-ins are lost upon process restart.
5. **PowerShell Agent Administrative Requirement**: Windows collector requires `ExecutionPolicy Bypass` and access to Security Logs.
6. **Unencrypted HTTP Local Mode**: Local/LAN mode uses unencrypted HTTP (HTTPS required only in hosted mode).
7. **Cross-Server CAS Conflicts**: Running multiple server instances against one database lab ID triggers state write rejections.
8. **Free Tier Database Sleep**: Free tier PostgreSQL databases on Render may enter sleep states, causing initial connection delays.
9. **In-Memory Event Truncation**: High event rates trigger automatic truncation down to 1,500 events.
10. **Prompt Injection Risk from Log Messages**: Though mitigated by instructions, raw log payload fields passed to LLMs carry inherent prompt injection risks.

### Top 10 Recommended Improvements
1. **Restore or Archive Suricata Route**: Add `/api/sensors/suricata` handling in `server.js` or update `tests/suricata.test.js` to ensure `npm test` passes 100%.
2. **Relational Database Migration**: Transition from single-row JSONB snapshots to relational tables for events and alerts if multi-tenant SIEM features are desired.
3. **Persistent Analyst Sessions**: Store analyst session tokens in PostgreSQL to preserve sign-ins across restarts.
4. **HTTPS Enforcement for LAN Mode**: Introduce self-signed SSL/TLS certificate support for LAN network demonstrations.
5. **Enhanced Log Sanitization**: Add explicit sanitization for user-controllable log text before passing data to LLM prompts.
6. **Custom Rule Builder**: Expose a UI panel allowing analysts to write custom detection rules dynamically.
7. **Syslog / CEF Ingestion Support**: Add support for standard Linux Syslog or Common Event Format (CEF) log streams.
8. **Extended MITRE Coverage**: Expand `data/mitre-data.js` and `js/alerts.js` to cover additional Cloud & Container ATT&CK techniques.
9. **Automated Dockerfile**: Add a multi-stage `Dockerfile` for standardized containerized deployments outside Render.
10. **WebSocket Alternative**: Add optional WebSocket transport alongside SSE for bi-directional real-time communication.
