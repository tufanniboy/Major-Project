# PostgreSQL setup

The backend remains Node.js. PostgreSQL stores the shared SOC lab so events, alerts, investigation evidence, decisions, blocklist entries, registered devices and scenario progress survive backend restarts. The frontend talks to Node over HTTP/SSE; database credentials never go into browser code.

## Hosted setup

The included `render.yaml` creates a Free web service and a Free PostgreSQL database in the same region. It sets `DATABASE_URL` from the database's internal connection string automatically. Follow [the hosting guide](FREE-HOSTING.md). Hosted command-line startup refuses to run without `DATABASE_URL`.

Render's free PostgreSQL database expires after 30 days. This setup is suitable for a short demonstration, not permanent free storage. See [Render's current limits](https://render.com/docs/free) before creating resources. You can use another PostgreSQL provider by setting its connection string as `DATABASE_URL` instead of the Blueprint database reference. Use one web instance per lab.

## Local setup

For the transferable team package, run `npm run setup` once and put your connection string in the generated `.env` file. The backend and `npm stop` load that file automatically, including when started from another working directory. Terminal/hosting environment variables take precedence. Keep the actual `.env` private; share only `.env.example`.

Create a PostgreSQL database and a dedicated login that owns it, using pgAdmin or your provider's database dashboard. The app creates its own table on first connection; it does not create the database or database user. Set the connection string in the same PowerShell terminal as the server:

```powershell
$env:DATABASE_URL = 'postgresql://YOUR_USER:YOUR_URL_ENCODED_PASSWORD@localhost:5432/soc_lab'
npm start
```

`npm start` enables phones on the same Wi-Fi; use `npm run start:local` for host-laptop-only access. Replace the placeholders, URL-encode reserved password characters, and keep the real connection string private. Remote connections must use the TLS settings supplied by the provider. The driver honors connection-string SSL settings; this project does not disable certificate validation.

At startup the terminal reports `Storage: PostgreSQL (persistent)`. `/api/health` and `/api/config` report `storage: "PostgreSQL"`. Without `DATABASE_URL`, local mode explicitly uses temporary memory storage. A configured database connection failure never falls back to memory.

An already running process does not pick up a newly set environment variable. Current memory-only activity is not imported automatically, and this change does not restart or erase that running session. Save any needed reports before intentionally stopping it. A new database starts with zero events and five baseline simulated assets. Existing saved activity takes precedence over `--seed` on subsequent starts.

## Storage and recovery

`lib/postgres-store.js` creates `soc_lab_snapshots` with these columns:

| Column | Meaning |
|---|---|
| `lab_id` | Shared lab identifier; the application uses `default` |
| `revision` | Database checkpoint number, checked before each update |
| `payload` | Versioned JSONB containing the engine state, ID counters and hashed participant sessions |
| `updated_at` | Last successful checkpoint time |

This is an atomic lab checkpoint, not separate relational tables for every event. Keeping related records together prevents a saved decision from losing its evidence or device session. It suits this small academic lab; an indexed event archive and multiple application workers would require a different storage design.

Every state-changing action is saved before its success response or SSE update. The simulation timer also checkpoints its progress. Writes and requests are serialized within the backend, and a stale writer cannot overwrite a newer checkpoint. After a write failure, unsaved state is rolled back, health checks return 503 and further lab changes pause. Check database availability and restart the backend to reload the authoritative checkpoint. A network failure can leave the outcome of an in-flight database commit uncertain; restart recovery reads what actually committed.

Participant token hashes are stored, not raw tokens. Existing portal tabs can reconnect after a backend restart and scenarios resume from their saved step. A reset invalidates those tokens persistently. Analyst sign-in cookies deliberately remain memory-only: analysts sign in again after a restart. Demo passwords and the real analyst password are not saved in the checkpoint.

**Reset environment permanently clears the saved lab's events, alerts, decisions, blocklist and participant registrations**, retaining the five baseline simulated assets. Restarting alone does not clear PostgreSQL. Normal retention still keeps recent events and all evidence referenced by retained investigations. Take database backups separately if you need long-term records; the app does not supply automatic backups.

## Verification

`npm test` runs the normal engine, HTTP and persistence-failure checks. To also run actual PostgreSQL restart tests, provide a disposable test database:

```powershell
$env:TEST_DATABASE_URL = 'postgresql://YOUR_TEST_USER:YOUR_URL_ENCODED_PASSWORD@localhost:5432/soc_lab_test'
npm test
```

The PostgreSQL tests create randomly named lab rows and remove only their own rows. They verify restart recovery, independent participant sessions, attack progression, saved containment, durable reset, token hashing, stale-writer rejection and refusal to overwrite an unsupported checkpoint. Without `TEST_DATABASE_URL`, these three integration tests are explicitly skipped.
