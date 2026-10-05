# Group project: start here

To connect an isolated Kali/target lab through Suricata, follow [docs/REAL-SENSOR-SETUP.md](docs/REAL-SENSOR-SETUP.md). No hardware sensor is required.

For a classmate or Antigravity, use the shorter [step checklist](docs/01-SURICATA-STEPS.md) together with the [command runbook](docs/02-SURICATA-COMMANDS.md).

This ZIP contains the website, Node.js backend, phone portal, PostgreSQL integration and optional real LLM integration. Extract it to any normal folder on another laptop. It does not need the original owner's folder path.

## First setup on Windows

1. **Extract the ZIP completely.** Do not run files inside the ZIP preview.
2. Install **Node.js 22 or newer** from [nodejs.org](https://nodejs.org/). Reopen your terminal after installation if Node is not found.
3. Double-click **1-SETUP.cmd**. Internet is needed to install the project dependencies. It creates your own `.env` file if one does not already exist.
4. Double-click **2-START-LAB.cmd**. Keep its terminal window open while using the project.
5. Open **http://localhost:8000** on that laptop. If you change PORT in `.env`, use the new port instead.

Run **3-CHECK-SETUP.cmd** if something does not work. Stop with Ctrl+C in the server window. Start it again with 2-START-LAB.cmd when needed.

The default is a local simulation with zero events and five baseline assets. **A real LLM and PostgreSQL are supported but not bundled or activated by default.** No API keys, downloaded models, saved activity or database files are included.

## Connect phones and other laptops

Connect the host laptop and participants to the same private Wi-Fi or hotspot. The start file enables LAN access automatically. On the host dashboard, open **Devices & connection** and share the generated portal link or QR. Do not reuse an old screenshot of the original owner's QR: the new laptop has a different network address.

If Windows asks about Node.js network access, allow the private network used for your lab. Guest Wi-Fi may isolate devices; try a private hotspot. On each phone, register a different name as a **Test Device**, choose an attack and start the simulation. Events appear on the host laptop. Each phone can choose a different scenario. For ordinary activity, register an Employee Device and use the fictional account `employee01` / `employee123`.

**For one shared demonstration, run one backend on one host laptop and connect all participants to it.** If every group mate starts their own copy, each gets a separate lab. Sending this ZIP does not create an online website or synchronize separate copies.

## Enable a real LLM

Edit `.env` in the extracted folder using a text editor. Keep the filename exactly `.env`, not `.env.txt`. Show file extensions in Explorer if necessary. Restart the backend and reload the browser after changes.

### Automatic fallback: Gemini → OpenAI → Ollama

Set `LLM_PROVIDER=auto` in `.env`. Fill in your own `GEMINI_API_KEY` and `OPENAI_API_KEY`; keep `GEMINI_MODEL` and `OPENAI_MODEL` set to supported model IDs. Install the local model as described below and set `OLLAMA_MODEL=llama3.2:3b` to enable it as the third option. `LLM_PROVIDERS=gemini,openai,ollama` controls the order. Each provider is tried once per analysis, and busy providers temporarily cool down before another attempt. The review shows which model answered and why fallback happened. API quotas still apply; no answer is guaranteed if every provider is unavailable.

The ZIP never contains the sender’s keys. Each group mate must supply their own `.env`. Full configuration and free-local-model instructions: [LLM setup](docs/LLM-SETUP.md).

### Local Ollama model

Install [Ollama](https://ollama.com/download/windows) on the host laptop, keep it running, and download a model:

```powershell
ollama pull llama3.2:3b
```

Set these lines in `.env`:

```dotenv
LLM_PROVIDER=ollama
LLM_MODEL=llama3.2:3b
OLLAMA_BASE_URL=http://127.0.0.1:11434
```

The model download is separate and uses additional disk space. Performance depends on the laptop. Phones do not need Ollama. The setup checker can check service reachability and whether the model is installed.

### Online OpenAI model

Use your own API key and an available model supporting the Responses API and structured output:

```dotenv
LLM_PROVIDER=openai
LLM_MODEL=YOUR_SUPPORTED_MODEL_ID
OPENAI_API_KEY=YOUR_PRIVATE_API_KEY
```

Online inference uses that account's quota/billing and sends selected lab logs to the provider. Keep your actual `.env` private. The ZIP includes only an empty example. [Full model instructions](docs/LLM-SETUP.md).

## Save data in PostgreSQL

Create a PostgreSQL database and user locally or with your own provider. Put its connection string in `.env`:

```dotenv
DATABASE_URL=postgresql://YOUR_USER:YOUR_URL_ENCODED_PASSWORD@localhost:5432/soc_lab
```

The backend creates its table automatically and restores saved activity. A configured database must be reachable; connection failures do not silently fall back. Without DATABASE_URL, activity stays in memory and is lost when the backend stops. [Full PostgreSQL instructions](docs/POSTGRESQL.md).

Use a separate database for each independently running backend. Do not point several copies at the same lab database. To share a lab, share access to one running backend instead.

## Teacher demonstration

1. Show a registered phone's selected attack simulation.
2. Open the resulting investigation on the host laptop.
3. Explain that rules detect the pattern and produce the baseline assessment.
4. After the scenario finishes, press **Ask LLM** if a model is configured.
5. Show **LLM answer received**, the returned model name, cited event IDs and response time. Check its explanation against the timeline.
6. Review the advice and manually approve or reject the predefined simulated restriction.

Do not describe simulated records as an actual network attack, or a rule assessment as a real LLM answer. Suricata records are real IDS signature alerts from your authorized lab, but a signature match is still not proof of compromise. The model does not operate the phone or block a device automatically.

## Terminal setup on Windows, macOS or Linux

From the extracted project folder:

```sh
npm run setup
npm ci
npm run doctor
npm run start:lan
```

`npm start` and `npm run start:lan` both enable phone connections. Use `npm run start:local` for host-laptop-only access. `npm stop` reads the configured port from `.env`. Windows users can use Command Prompt if PowerShell blocks `npm.ps1`, or use the included `.cmd` files; no execution-policy change is needed.

## Common issues

| Problem | Fix |
|---|---|
| Node or npm not recognized | Install Node.js, then reopen the terminal. |
| Cannot find a package | Run 1-SETUP.cmd or npm ci with internet access. |
| Port already in use | Use the existing server window or choose another PORT in .env. Do not launch duplicate copies. |
| Phone QR does not open | Use LAN mode, the new host's QR, and the same private network. |
| Ask LLM is disabled | Configure a model, restart/reload, and wait for the rule assessment. |
| PostgreSQL startup failed | Check DATABASE_URL and database availability. A database server is not included. |
| Settings seem ignored | Check the filename is .env and restart. Existing terminal/hosting variables take precedence. |

`README.md` describes the architecture, `docs/FREE-HOSTING.md` covers online deployment, and `TESTING.md` records verification. `npm test` runs tests; PostgreSQL tests additionally require TEST_DATABASE_URL pointing to a disposable database.

## Share an updated copy

On Windows, run from the project folder:

```powershell
powershell -NoProfile -File scripts/package-team.ps1
```

Send `deployment/soc-analyst-team.zip`. The packager includes application source, images, instructions, launchers and `.env.example`. It excludes actual `.env` files, node_modules, test runtime folders, logs, databases, old archives and the original report/presentation files. Share your report or slides separately after reviewing their contents.
