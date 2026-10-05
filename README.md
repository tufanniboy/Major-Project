# LLM-Powered SOC Analyst

**Windows monitoring:** use the built-in PowerShell collector to read selected Windows Security events and send them to the SOC dashboard. Start with [Windows log monitoring](docs/WINDOWS-LOG-MONITORING.md).

The dashboard supports Windows Security Event Log records, controlled lab scenarios, and activity from devices using the employee portal.

**Intelligent Alert Triage & Incident Response**

**Group mates: read [START-HERE.md](START-HERE.md) first.** On Windows, extract the team ZIP, run `1-SETUP.cmd` once, then run `2-START-LAB.cmd`. Each laptop has its own `.env` settings. Use `3-CHECK-SETUP.cmd` for troubleshooting.

A functioning, controlled final-year engineering demonstration of security event collection, correlation, explainable analysis, and human-approved incident response. The frontend is entirely HTML5, CSS3, and vanilla JavaScript. The optional Node.js server lets multiple phones or laptops intentionally generate events in the same SOC session.

This project is an academic simulation, not a production SIEM. Detection and baseline assessments use deterministic JavaScript. An optional server-side Gemini, OpenAI or Ollama connection provides real, analyst-requested LLM reviews alongside that baseline. Every assessment labels its source. The simulation works without a model; actual LLM answers require provider setup. The local server uses `qrcode` to generate connection codes offline.

## Free online hosting

See [the free hosting guide](docs/FREE-HOSTING.md). The included `render.yaml` configures a Render Free Node service for the frontend/backend and a Free PostgreSQL database. Hosted mode requires an analyst password and participant invitations, uses HTTPS links, and restores saved activity. Render's free PostgreSQL database expires after 30 days. Deployment still requires your Render account and a GitHub repository.

## PostgreSQL persistence

Set `DATABASE_URL` before starting the server to persist events, alerts, devices, decisions, blocklist entries and simulation progress. The server creates its table automatically and restores saved activity on restart. Hosted startup requires PostgreSQL; local mode can still run temporarily in memory without it. See [PostgreSQL setup](docs/POSTGRESQL.md) for connection instructions, storage details and recovery behavior.

## Run locally

Install Node.js 22 or newer, open this folder in a terminal, and run:

```powershell
npm run setup
npm ci
npm start
```

- SOC dashboard: <http://localhost:8000>
- Employee portal: <http://localhost:8000/employee.html>
- Device connection entrypoint: <http://localhost:8000/device>

`npm start` enables private LAN access so the connection QR works on phones. Use `npm run start:local` to bind only to `127.0.0.1`. A new lab starts empty with five baseline assets; an existing PostgreSQL lab is restored. Run `npm run start:demo` only when you explicitly want labeled sample evidence in a new lab. Use **Scenarios → Reset environment** to permanently clear current lab activity, or **Guided walkthrough** for the central presentation.

If port 8000 is occupied, stop the previous server or select another port:

```powershell
$env:PORT = 8001
npm start
```

No build step is needed. `npm run check` validates JavaScript syntax and the HTML entrypoints. `npm test` runs the engine and HTTP integration checks.

To stop a server, use `Ctrl+C` in its terminal or run `npm stop` from this folder. The stop command also works when the server was started in the background. PostgreSQL retains saved activity; memory-only mode loses activity on stop.

### Static frontend alternative

```powershell
python -m http.server 8000
```

Open <http://localhost:8000>. The console detects that the lab API is unavailable and starts the same engine inside that browser. Static mode is isolated per browser tab, resets on reload, and does **not** support cross-device events or the employee portal. ES modules require HTTP; do not open `index.html` directly with `file://`.

## Connect phones on the same Wi-Fi

The blue **Show connection QR** card on the dashboard opens a larger, locally generated QR code. The same connection panel is available under **Devices & connection**. The interface includes a copyable address and a refresh control if you change Wi-Fi networks. If the code cannot load, the panel shows a readable error and keeps the address available.

1. Connect the SOC laptop and participating phones to the same **private** Wi-Fi or personal hotspot.
2. Stop a running local server with `Ctrl+C` or `npm stop`, then run:

   ```powershell
   npm run start:lan
   ```

3. The terminal prints the laptop's detected private IPv4 portal URLs, for example `http://192.168.1.5:8000/employee.html`. Open **Devices & connection** or **Connect a device** on the dashboard to scan a QR code or copy the detected URL. If several network adapters are present, select the address for your Wi-Fi/hotspot. These URLs accept other devices only when the server is running in LAN mode.
4. If Windows prompts about Node.js, allow it on the private network used for the lab. Do not enable public exposure or configure router port forwarding. Some guest networks isolate clients; use a private hotspot if the phone cannot reach the laptop.
5. Scan the QR code or open the printed URL on your phone or second laptop. Register a hostname, role, and operating system. For ordinary activity, choose Employee Device and log in with the demo credentials. Choose Test Device, select an attack under **Attack simulation**, and press **Start selected simulation**; no login is required for these controlled simulations.
6. Keep the SOC dashboard open on `http://localhost:8000` on the laptop. Registration and portal actions appear through server-sent updates, usually within one second.

**Logical versus physical addresses:** the fixed `192.168.1.x` addresses in the topology are simulation identifiers, not a claim about your actual subnet. Each physical browser session gets a unique private logical IP beginning at `192.168.1.40`; its actual socket peer address is shown in the live-device inventory and device details. This allows several sessions behind the same peer address to participate independently. The portal sends a heartbeat every five seconds. After twenty seconds without contact, the inventory marks that browser session offline; mobile background-tab suspension may also cause this. No MAC, OS, or device identity is passively discovered. OS and role are supplied during registration; MAC is explicitly not collected.

In local/LAN mode, only loopback requests may operate the analyst control API. Hosted mode requires an authenticated analyst session. LAN clients can register and use the employee portal. All participants share the same shared lab state; this is not a multi-tenant application. LAN mode rejects non-private peer addresses and cross-origin browser requests. It uses unencrypted HTTP for fictional lab information only, not real credentials or personal data.

## Demo credentials

| Account | Username | Password |
|---|---|---|
| Employee | `employee01` | `employee123` |
| Administrator | `admin` | `secureadmin` |

Only these fictional account pairs are accepted. Passwords are checked locally and never included in stored events. Incorrect credentials produce `LOGIN_ATTEMPT` and `LOGIN_FAILED`; a valid login produces `LOGIN_SUCCESS`. Authenticated Dashboard, Profile, Documents, Administration, and Logout interactions generate corresponding events. Administration requires the admin demo account.

## Central presentation

### Automatic synthetic activity, analyst-paced guide

Select **Guided walkthrough → Start fresh demo**. This intentionally clears the previous session. The guide provides 12 sequential teaching points and Next, Previous, and Exit controls. Scenario events arrive once per second; the presenter controls when to move to the next explanation. Moving backward revisits the current evidence without undoing or replaying completed actions.

1. A normal employee scenario starts.
2. Inspect the successful employee authentication and normal events.
3. Advance to the suspicious authentication step, which starts six failed logins, a success, and two administrative accesses.
4. Observe the failure alert and the separate credential-compromise alert.
5. Inspect its timeline, four local context sources, narrative, heuristic 94% confidence, and T1110 → T1078 mapping.
6. Read the recommendations and explicitly select **Approve response**. The guide never approves on behalf of the analyst.
7. Advance to containment verification. Another synthetic request sequence runs from the restricted source; its requests appear as **Blocked by simulated firewall policy**.
8. Finish and inspect the retained evidence or decision log.

If you reject or escalate the selected alert during the guide, exit the guide and restart it for an approval demonstration. Presentation mode enlarges the network and investigation typography and collapses the navigation.

### Two physical devices

1. On the first phone, register an employee session, log in as `employee01`, and open Dashboard, Profile, and Documents. Show the teacher the corresponding SOC events.
2. On the second phone or laptop, register a Test Device, choose **Suspicious login sequence**, and press **Start selected simulation**. Nine controlled records arrive over nine seconds: six failures, a success, and two admin accesses. The button generates labeled records; it does not authenticate the browser.
3. Find that device’s hostname in **Investigations**. The SOC correlates its logical source, authentication target, and username into a potential credential-compromise investigation. You can still demonstrate the manual path by entering at least five incorrect admin passwords within 60 seconds, then signing in with `admin / secureadmin` and opening Administration.
4. Open the alert on the laptop and wait for the simulated analysis stages to complete. Select **Approve response**.
5. The second device shows **Request blocked** on its next heartbeat, within about five seconds. A subsequent portal request is denied and logged by the simulated policy. Other devices continue working.

The application does not attack a network login service. All incorrect logins are submitted deliberately to this fictional portal.

### Different attacks on multiple devices

Each registered Test Device has its own attack selector and run progress. Available choices: Failed login burst, Suspicious login sequence, Port scan pattern, Suspicious API access, Privilege escalation pattern, Unusual file access, and Data exfiltration pattern.

Choose different attacks on different phones/laptops and start them together. One active run is allowed per device session. **Stop this device’s simulation** affects only that session; after stopping or completing, select another attack. The SOC’s **Devices & connection** inventory shows each session’s scenario and progress. Approved containment prevents that session from starting another run.

All records remain attributed to the initiating device’s lab ID. Port scans model distinct TCP ports and transfers model byte counts; no real scanning or data transfer occurs. The laptop’s built-in Scenarios workspace remains a separate synthetic demonstration.

## Workspaces

| Workspace | Function |
|---|---|
| Overview | Four key metrics, a focused network diagram, review queue, and recent activity |
| Network | Inspect baseline topology nodes and all registered inventory assets |
| Event stream | Search; source, destination, protocol, risk, and action filters; pause; clear view; follow newest |
| Alert queue | Severity, review state, and classification filters; evidence-linked alert queue |
| Investigations | Correlated timeline, structured summary, narrative, local retrieval sources, MITRE mapping, decisions |
| MITRE ATT&CK | Seven local technique references, current detection counts, evidence, and primary-source links |
| Response log | Pending decisions, simulated blocklist, analyst decision log |
| Scenarios | Nine gradual event-generation scenarios, background traffic, stop, and reset |
| Devices & connection | LAN QR code, live session status, physical network addresses, and separate simulated assets |
| Analytics | Ten custom SVG/data views and clearly separated targets versus measured results |
| Architecture | Fourteen clickable stages with purpose, inputs, outputs, technology, and examples |
| About this project | Problem, proposed solution, human oversight, honest scope, and demo access |

`Ctrl+K` (or `Cmd+K`) opens the command palette. Escape closes dialogs. All custom topology nodes support Enter/Space. Reduced-motion preferences are respected.

**Traffic controls:** Pause freezes the traffic view while collection continues. Clear view hides existing rows without deleting investigation evidence. Follow newest returns to the latest events; turning it off preserves the table's scroll position. The view shows up to 150 matching recent records.

## Scenarios and detection logic

| Scenario | Expected detection |
|---|---|
| Normal user activity | No high-severity detection |
| Failed login burst | ≥5 authentication failures for one source, target, and account in 60 seconds |
| Suspicious login sequence | Failure burst followed by successful authentication; administrative access extends the evidence |
| Port scan pattern | ≥6 distinct synthetic destination ports in 60 seconds |
| Suspicious API access | ≥4 denied restricted API requests in 60 seconds |
| Privilege escalation pattern | Unapproved account privilege change |
| Unusual file access | Sensitive file access from an untrusted source |
| Data exfiltration pattern | ≥50 MB recorded synthetic transfer volume within 60 seconds |
| Mixed traffic | Benign events, approved maintenance false positive, and credential-compromise sequence |

The rule engine also handles untrusted device registration, explicitly tagged unusual-hours authentication, and ≥35 same-source/target events within a 60-second window. The unusual-hours event is an explicit normalized input type for future collectors; portal login time is not automatically interpreted as malicious.

Events contain IDs, ISO timestamps, source and destination context, protocol, account, risk, action, and provenance. Windows event IDs and selected log context stay attached to collected records. The dashboard does not store packet payloads or full raw Windows logs. In the synthetic dataset, HTTPS describes a **modeled protocol**. Intentional portal events record HTTP and the actual configured server port.

Rules retain evidence IDs on an alert, scoped by source, destination, account, and time window. Later evidence invalidates an earlier assessment and restarts the local analysis. Stage progression takes approximately 3 seconds **after the last correlated evidence arrives**; the recorded duration is measured rather than a claimed target.

False-positive suppression requires the maintenance rule, a trusted source, and the local approved-change reference `CHG-LAB-042`. Ground-truth labels are not supplied to the classification logic. Manual portal events are unlabeled and excluded from synthetic correctness metrics. The explicit Test Device sequence is labeled synthetic evidence and is shown as a device-triggered simulation.

### Data retention and reset

With `DATABASE_URL` configured, events, alerts, blocklist entries, decisions, device registrations and progress are persisted in PostgreSQL before acknowledgment. Server restart restores them; **Reset environment** permanently clears them. Local mode without a database loses activity on restart. When raw events exceed 3,000, the store retains the latest 1,500 plus every event still referenced by an investigation. Cumulative event counters are not reduced by retention. Alerts and referenced evidence remain until reset. Device registration is capped at 100 portal sessions.

Reset also invalidates portal registration tokens. Phones will be asked to register again on their next request. A refresh of a portal retains that tab's device token and hosted invitation in session storage, but asks the user to log in again. Closing the tab ends that locally stored registration context.

## Architecture and folder structure

```text
index.html             SOC application shell and boot screen
employee.html          Mobile employee portal
server.js              Static server, SSE stream, local control and portal APIs
lib/
  postgres-store.js    Parameterized PostgreSQL checkpoint storage
  lab-snapshot.js      Versioned state/counter/session capture and validation
  hosted-auth.js       Hosted analyst authentication and invitations
  llm-provider.js      Server-only Gemini / OpenAI / Ollama requests and output validation
css/
  style.css            Shared design tokens, controls, tables, dialogs
  dashboard.css        SOC layouts, topology, workspaces, responsive states
  portal.css           Mobile employee portal layout
  theme.css            Ivory, graphite and olive design system
js/
  app.js               Routing, event handlers, dialogs, command palette, guide
  views.js             Investigation, event, scenario and reference workspaces
  workspace.js         Grouped navigation, overview and device inventory
  connect.js           Shared LAN connection and QR interface
  adapter.js           Shared-server transport or isolated browser fallback
  simulation.js        Central state, event normalization, scenarios, responses
  alerts.js            Correlation and detection rules
  ai-analysis.js       Local analysis and future LLM provider boundary
  llm-panel.js         Real model status, cited answers and setup instructions
  network.js           Interactive SVG topology
  charts.js            Custom SVG charts and calculated metrics
  portal.js            Intentional registration/login/page event client
  device-scenarios.js   Shared device attack catalog and synthetic event builder
  utils.js             Escaping, formatting and inline SVG icons
  webmcp.js            Optional browser-native status, navigation and scenario tools
data/
  mock-events.js       Initial assets, roles, scenario definitions, event labels
  mitre-data.js        Local technique descriptions and evidence mappings
tests/
  engine.test.js       All scenarios, correlation, classification, decisions, reset
  server.test.js       Portal-to-SOC and containment integration checks
scripts/check.js       JavaScript and HTML validation
```

Data flow:

```text
Portal / scenario → normalized event → shared lab state
  → 60-second correlation → evidence-linked alert
  → local context retrieval → deterministic analysis
  → classification + narrative + technique mapping + response plan
  → explicit analyst decision → simulated blocklist and audit entry
  → atomic PostgreSQL checkpoint → HTTP acknowledgment / live update
```

### Local API

| Method / route | Purpose |
|---|---|
| GET `/api/config` | Server mode, available portal URLs, whether the client is a local operator |
| GET `/api/join-qr.svg?index=0` | Locally generated SVG QR for a detected private portal address; LAN mode only |
| GET `/api/state` | Current shared lab snapshot |
| GET `/api/stream` | Server-sent state updates |
| POST `/api/action` | Loopback-only scenario, stop, traffic, reset, seed, registration, and decision operations |
| POST `/api/register` | Intentional device registration; returns a session token |
| POST `/api/portal` | Demo login, heartbeat, test request, and Test Device sequence; requires `X-Device-Token` |

The APIs accept JSON. Invalid requests return explicit JSON errors. Server access is limited to the app's public HTML/CSS/JS/data files; project documents and server source are not served.

## Real LLM review

See [LLM setup and teacher demonstration](docs/LLM-SETUP.md). Set `LLM_PROVIDER=ollama` or `openai` and `LLM_MODEL`; OpenAI additionally requires `OPENAI_API_KEY`. Open an investigation and select **Ask LLM** after the scenario finishes. Model calls run in the backend without blocking phone requests. The model name, answer, event citations, suggested steps, limitations and measured duration appear separately from the rule assessment.

`lib/llm-provider.js` handles both provider protocols, bounded evidence, structured output, citation validation, timeouts and sanitized failures. Model output never executes actions or replaces the rule engine's classification. Completed reviews are checkpointed in PostgreSQL when configured. Changed evidence invalidates old answers; requests interrupted by restart can be retried manually. A provider failure never substitutes simulated text as an LLM answer.

## Elasticsearch, Kibana, and RAG integration later

- Add a server-side event-store adapter at the normalization boundary. Index events using `timestamp` as a date, IPs as IP fields, identifiers/types as keywords, and narrative text as text fields. Keep remote credentials outside the frontend.
- Retrieve correlated evidence by alert event IDs, preserving source/target/account/time-window semantics.
- Build Kibana data views and dashboards over that index; the current UI does not imply a connected Kibana instance.
- Replace the four local context sources with a retriever backed by FAISS or ChromaDB and a versioned policy/ATT&CK corpus. Preserve document IDs, retrieval timestamps, and citations.
- A Flask/FastAPI implementation can retain the same API routes and event schema while replacing the Node transport.

These are documented extension points, not integrations that have already been implemented.

## Metrics and evaluation limits

The Analytics page separates the user-supplied targets (F1 ≥92%, false-positive reduction 60–75%, MTTR improvement 33–68%, workload reduction ≥39%, narrative generation <3 seconds) from actual observed simulation results. Targets are not claimed to be achieved, and no research citation is fabricated for them.

Current results count only the simulation's generated data. Correct classifications compare reviewed, labeled synthetic alerts to their fixture truth; unlabeled manual portal records are excluded; the explicit Test Device sequence is labeled synthetic evidence. This is a demonstration consistency check, not an unbiased model evaluation. Production F1, workload reduction, and comparative MTTR are explicitly unevaluated. Confidence values are deterministic heuristics. MTTR is measured from alert creation to approval; seeded fixture age can affect it.

## Safety limitations

- No scanners, exploit payloads, packet interception, public targets, or operating-system firewall mutations.
- Only internal synthetic events and intentional portal actions are processed.
- Source restrictions and session denial apply only inside this application.
- All identities, credentials, documents, and policies are fictional demonstration content.
- The local operator restriction is not production authentication or authorization. LAN participants should be trusted lab users.
- PostgreSQL provides lab persistence, not a tamper-proof audit trail. High availability, tamper-resistant identity, real CTI, and calibrated model confidence are not implemented.
- The full SOC console is desktop-first. Tables and topology use contained horizontal scrolling on small screens; the employee portal is designed for phones.

## MITRE reference provenance

The local technique descriptions are short project-authored summaries. Technique IDs link to the primary MITRE ATT&CK entries:

- [T1110 — Brute Force](https://attack.mitre.org/techniques/T1110/)
- [T1078 — Valid Accounts](https://attack.mitre.org/techniques/T1078/)
- [T1046 — Network Service Discovery](https://attack.mitre.org/techniques/T1046/)
- [T1098 — Account Manipulation](https://attack.mitre.org/techniques/T1098/)
- [T1005 — Data from Local System](https://attack.mitre.org/techniques/T1005/)
- [T1213 — Data from Information Repositories](https://attack.mitre.org/techniques/T1213/)
- [T1041 — Exfiltration Over C2 Channel](https://attack.mitre.org/techniques/T1041/)

The exfiltration scenario only models transfer volume. Its T1041 mapping is explicitly provisional: the prototype does not establish a C2 channel.

## Future scope

Real model-backed structured analysis, versioned retrieval references, durable indexed event storage, realistic labeled evaluation corpora, provider latency/error handling, authenticated analyst identities, and multi-session lab isolation. Any real response integration would require a separate authorization and review design.
