# Host the frontend and backend together on Render Free

This package contains a Node.js web service and a PostgreSQL database. The web service serves the HTML/CSS/images, live SOC APIs and phone portal from the same HTTPS address. Both resources use Render's Free plan. The free PostgreSQL database expires after 30 days; this is a temporary demonstration setup.

## Deploy

1. Create a **private GitHub repository** and upload the contents of `soc-analyst-render.zip` to its root. `package.json`, `server.js` and `render.yaml` must be at the root, not inside another folder. The package intentionally excludes original project documents, logs, dependency folders, test session data and environment secrets.
2. Sign into [Render](https://dashboard.render.com/) with GitHub and authorize the chosen repository.
3. Choose **New → Blueprint**, select that repository, and review the configuration. It defines one Node web service and one PostgreSQL database, both on the **Free** plan. Do not upgrade either resource unless you intend to pay.
4. Enter a unique `SOC_ADMIN_PASSWORD` of at least 12 characters when prompted. This is the real analyst password, separate from the fictional employee demo accounts. Do not put it in source files or share it with phone participants.
5. Deploy. Render generates `LAB_JOIN_CODE`, supplies `RENDER_EXTERNAL_URL`, and links `DATABASE_URL` to the database's internal connection string automatically. The build command is `npm ci --omit=dev`; the start command is `npm run start:hosted`; the health-check path is `/api/health`. The backend creates its PostgreSQL table on first startup.
6. Open the HTTPS `onrender.com` address, sign in with the analyst password, and open **Devices & connection**. Share its invitation link or QR with participating phones and laptops. They can use different networks.

For Windows security monitoring, run the built-in PowerShell collector on the monitored Windows computer and point it to the hosted app. Follow [Windows log monitoring](WINDOWS-LOG-MONITORING.md). Render Free can sleep while idle, so collection may pause or experience delivery delays when the app is waking. The free Render database expires after 30 days and is demonstration storage only.

If creating resources manually, select **Free** explicitly for both resources in the same region. Add `SOC_HOSTED=true`, `SOC_ADMIN_PASSWORD`, a random `LAB_JOIN_CODE` of at least 24 characters, and the database's internal connection string as `DATABASE_URL` on the web service. For a custom domain, set `PUBLIC_URL` to that HTTPS origin (no path). Otherwise the application uses Render's automatic URL. A different PostgreSQL provider can supply `DATABASE_URL` too; use its required TLS settings.

## What is shared

Optional real LLM review can be enabled by setting `LLM_PROVIDER=openai`, `LLM_MODEL`, and `OPENAI_API_KEY` on the web service. Model usage has separate provider limits/billing and is not included in Render's free hosting. Without these settings, the console clearly shows No model configured. See [LLM setup](LLM-SETUP.md). A hosted server cannot use an Ollama process on your laptop through localhost.

There is one shared lab per deployment. All signed-in analysts see the same activity and can reset it. Each invited browser session has its own device ID and can run one of seven simulated attacks independently. A participant invitation does not grant access to the analyst APIs. Analyst sign-in uses an expiring HttpOnly session cookie; signing out closes that session's event streams. The app does not claim production multi-tenant authentication.

The first database starts empty, retaining the five built-in simulated assets. PostgreSQL preserves phone registrations, alerts, events, decisions and scenario progress across web-service restarts. Existing portal tabs retain their participant tokens. Analysts sign in again after a restart. An intentional lab reset clears saved activity and invalidates participant tokens. See [PostgreSQL setup and recovery](POSTGRESQL.md).

## Free-plan limits

Render currently documents 750 free instance hours per workspace per calendar month. A free web service sleeps after 15 minutes without inbound traffic and can take about a minute to wake. Bandwidth and build usage have separate limits. Monitor those limits; a free instance does not mean unlimited usage, and optional paid resources or overages can incur charges. Do not use artificial keep-alive requests to evade sleep.

Free PostgreSQL is limited to 1 GB, one free database per workspace, and expires after 30 days. It does not include backups. Export any required data before expiry or move to another database; continued free permanent storage is not promised by this configuration.

This app is intended for short academic demonstrations. End unused browser sessions to reduce streaming bandwidth. Deploy a single web instance for this shared lab. PostgreSQL checkpoint version checks prevent two instances from silently overwriting one another.

Sources checked 3 September 2026:

- [Render free services and limits](https://render.com/docs/free)
- [Blueprint specification](https://render.com/docs/blueprint-spec)
- [Render environment variables](https://render.com/docs/environment-variables)

## Local use

`npm start` starts an empty local lab when no database is configured. Set `DATABASE_URL` to retain activity in PostgreSQL. `npm start` and `npm run start:lan` enable phones on the same network. Use `npm run start:local` for host-laptop-only access. `npm run start:demo` explicitly loads sample evidence into a new lab; an existing database is restored instead. The current running local session is unaffected by creating this deployment package.

## Verify after deployment

- The root URL asks for analyst sign-in.
- The console starts with zero events and alerts.
- The invitation QR points to the HTTPS hosted portal, not a private laptop address.
- An invited Test Device can run a scenario and its matching alert appears in the console.
- Anonymous requests cannot read `/api/state` or operate `/api/action`.
- Signing out removes analyst access. Only lab events are simulated; no real attacks are generated.
- `/api/health` reports `storage: "PostgreSQL"`. Restart the web service and verify the saved lab returns.
