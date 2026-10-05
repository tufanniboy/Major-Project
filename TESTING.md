# Validation record

Validated locally on 3 September 2026.

## Automated checks

The full suite passes all 37 tests when `TEST_DATABASE_URL` is supplied. Without that variable, 34 tests run and three PostgreSQL integration tests are explicitly skipped. Coverage includes all nine scenarios, normal activity without high-level alerts, approved-maintenance suppression, evidence retention, source/account/target/time-window correlation, reanalysis when evidence changes, approval gating, rejection, escalation, duplicate-decision prevention, simulated blocking, registration validation, and complete reset.

The HTTP integration check registers a portal session, records six failed admin logins followed by success and administrative access, completes the correlated investigation, approves containment, and confirms subsequent portal requests return a simulated block. It also checks invalid tokens, token invalidation after reset, cross-origin rejection, static-file restrictions, app routes, accurate portal HTTP transport metadata, and local shutdown.

`npm run check` validates all 35 JavaScript files and three HTML entrypoints. The frontend remains vanilla HTML/CSS/JavaScript. The server uses `qrcode` for offline SVG generation and `pg` for PostgreSQL connections.

The LAN integration test additionally checks QR output and invalid-address handling, Test Device role enforcement, duplicate-run rejection, all nine generated records, heartbeat state, no implicit browser authentication, explicit approval, and isolation of the blocked source from an employee session.

## Browser checks

- Boot screen and command-center entry.
- Navigation through every SOC workspace.
- Gradual suspicious-login scenario, nine-event investigation, 94% heuristic confidence, and explicit approval.
- Device registration, shared inventory update, and LAN connection instructions.
- Traffic search, pause, resume, and clear-view behavior.
- Ctrl+K command palette, command search, and critical-alert filtering.
- Architecture-stage explanation dialog and separate target/actual analytics sections.
- Mobile portal registration, incorrect and valid demo login, Dashboard, Profile, Documents, Logout, and recovery after the analyst resets the lab.
- Twelve-step guided demonstration, Previous/Next controls, human-approval gate, successful approval, blocked follow-up traffic, and Finish.
- Presentation-mode toggle.
- Browser-native WebMCP tools: status read, workspace navigation, scenario start, and invalid-input rejection.
- Console error/warning checks: no entries in the final checked SOC and portal pages.
- Desktop layouts at 1366×768, 1600×900 and 1920×1080; tablet at 820×1180; mobile at 390×844. No page-level horizontal overflow in checked sizes; wide tables/topology retain their own scroll containers.

Browser testing caught and resolved nested SVG sizing, keyboard-focus preservation during telemetry updates, and guided-demo controls overlapping the approval area.

## Remaining environment-dependent validation

The portal-to-SOC workflow was verified over local HTTP and in separate browser tabs. A physical phone on the user's actual Wi-Fi/hotspot was not available for testing. LAN reachability depends on that network's client isolation and the laptop's private-network firewall settings. No operating-system firewall changes were made.

No real LLM, Elasticsearch, Kibana, vector database, or external CTI service is connected or claimed as tested. Synthetic correctness is not a representative model benchmark.

## September redesign verification

- Replaced the neon/dark interface with ivory, graphite, and olive across all workspaces. Simplified the overview and grouped navigation.
- Verified the connection QR renders the detected private URL and the portal opens through that LAN address on the host browser.
- Registered Test Device browser sessions, ran the device-side sequence, and verified the matching hostname, nine correlated events, physical address, and separate logical lab ID in the SOC.
- Confirmed a closed portal transitions to Offline after its heartbeat expires.
- Checked mobile layout at 390×844 with no page-level horizontal overflow.
- Verified the phone portal automatically shows Request blocked after approval in the laptop UI.
- Reviewed the redesigned overview, investigation, connection dialog, scenario library, and analytics. All nine scenario actions remain available.

## Multiple device attack selection

The HTTP integration suite starts all seven attack types concurrently from separate registered sessions. It verifies expected detections, source-isolated evidence, scenario metadata, completion/progress, unique modeled scan ports, modeled transfer volumes, invalid-selection rejection, no implicit login, and independent stopping/restarting. Containment denies new runs only for the affected session.

Browser checks verified the seven-option phone selector, changing attack descriptions, start/stop controls, disabled selection while running, progress restoration after reload, completion, and the SOC inventory’s per-device scenario status. The 390×844 portal had no page-level horizontal overflow or captured console errors.

## Hosted deployment preparation

The hosted tests verify empty startup, analyst-only state/stream/control/QR endpoints, no loopback bypass, secure HttpOnly cookies for HTTPS, invitation-gated registration, independent participant simulation, cross-origin rejection, inaccessible server/config files, reset token invalidation, logout revocation and SSE closure, password requirements, and sign-in rate limits. Tests run locally; a public Render deployment has not yet been verified.

Browser hosted-mode checks also verified successful analyst sign-in, an empty console, invitation QR/image loading, and sign-out returning to the sign-in screen. The deployment ZIP was inspected to confirm required files and absence of original documents, secrets, logs and runtime session files.

## LLM integration verification

The model integration adds eight automated tests for OpenAI request formatting, Ollama structured output, exclusion of fixture labels, invented-citation rejection, missing configuration, upstream refusal/failure handling, hosted authorization, concurrent-request limits, nonblocking HTTP behavior, saved model output, stale-result/reset handling, restart interruption and HTML escaping. Provider responses in these tests are fixtures, not real LLM-generated answers.

Browser verification checked the new Real LLM review panel and Setup & demo steps dialog, the honest No model configured status, and console errors (none observed). A live model test remains dependent on an API key or installed/running local model; neither was configured during implementation. The backend was started locally with zero events for the UI check.

## PostgreSQL verification

All 37 tests passed against a temporary local PostgreSQL 18.4 cluster using the real `pg` driver after the LLM changes. The cluster was stopped after verification and is not the application's configured database. No cloud database or public deployment was created.

PostgreSQL tests cover independent phone/laptop registration, hashed session tokens, checkpoint recovery across multiple backend restarts, resumed per-device attack progress, retained evidence and unique event IDs, persisted analyst approval and simulated containment, independent unblocked-device activity, durable reset and token invalidation. Additional cases reject stale concurrent writers and refuse unsupported saved data without overwriting it.

Failure tests verify rollback when a save fails, sanitized 503 responses, unhealthy status, rejected subsequent mutations, and closure of live streams so the browser can report disconnection. Snapshot tests cover preservation of counters/decisions and rejection of malformed data. See `docs/POSTGRESQL.md` for running the integration suite against your own disposable test database.

## Group transfer verification

The team ZIP was extracted into a different folder whose name contains spaces. Dependencies were installed afresh using the lockfile (43 packages, no reported audit vulnerabilities). From an unrelated working directory, setup created the copy's .env, repeated setup preserved edits, the setup checker ran, and the backend loaded the copy's configured port. The transferred frontend and employee portal loaded, an independent test phone registered and emitted an event, .env was inaccessible over HTTP, and the stop command used that copy's .env port. Only the disposable extracted test server was stopped.

The default test run passes 34 tests and explicitly skips three PostgreSQL tests without TEST_DATABASE_URL. Earlier LLM integration verification ran all 37 tests with PostgreSQL. No real LLM or group mate's physical laptop was available for this transfer check. Model downloads and database setup remain each recipient's responsibility, as explained in START-HERE.md. The team archive was checked for required launch/config/source files and absence of private environment files, dependency folders, database files, logs and original project documents.
