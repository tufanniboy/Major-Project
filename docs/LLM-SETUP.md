# Show a real LLM to your teacher

The project now supports actual model requests through Gemini, OpenAI or Ollama, with automatic fallback. Detection and the existing rule assessment still work without a model. **A model must be configured before the Ask LLM button can generate an AI answer.** PostgreSQL stores results when configured; it does not supply a model.

## Automatic fallback setup

Edit the private `.env` in the project folder (do not paste real keys in chat or commit them):

```dotenv
LLM_PROVIDER=auto
LLM_PROVIDERS=gemini,openai,ollama
GEMINI_MODEL=gemini-3.7-flash
GEMINI_API_KEY=YOUR_NEW_GEMINI_KEY
OPENAI_MODEL=gpt-4.1-mini
OPENAI_API_KEY=YOUR_NEW_OPENAI_KEY
OLLAMA_MODEL=llama3.2:3b
OLLAMA_BASE_URL=http://127.0.0.1:11434
LLM_TIMEOUT_MS=30000
```

Choose model IDs available to your account. Settings are loaded on backend startup. Existing environment variables override `.env`. Finish the current session before restarting a memory-only lab; PostgreSQL retains lab state across restarts. For hosted deployments, enter the same values in the hosting dashboard. A hosted server cannot access your laptop’s localhost Ollama service.

The order is Gemini, then OpenAI, then local Ollama. HTTP 429 (quota/rate limit), 408, service errors, connection failures and timeouts try the next configured provider. Access or model configuration failures also try the next option and remain visible. Each provider gets at most one request per analysis. Retry-After is honored up to 24 hours; otherwise quota errors cool down for 60 seconds, service/connection errors for 15 seconds, and access/configuration errors for five minutes. Missing configurations are skipped. Cooldowns are local to this backend process and reset on restart. A timeout may still have consumed provider quota even if no answer arrived.

Refusals, truncated responses and unsupported evidence stop the request; the system does not ask another model to bypass those checks. A user cancellation or reset stops further fallback. If every provider is unavailable, the UI reports failure instead of inventing an answer. Fallback is availability handling, not unlimited API access or a way around account limits. The lab's one-active-analysis limit still applies so repeated clicks do not create duplicate billed work.

Local Ollama needs no API key and has no per-request cloud API charge; it needs an installed model, a running service and sufficient laptop resources. Install Ollama and run `ollama pull llama3.2:3b`, then keep Ollama running. The cloud providers have their own limits and billing; configuring a key does not guarantee free usage or available quota.

The review lists the configured order, attempts, the provider that actually answered and the returned model version. Keys stay in backend environment variables, are excluded from snapshots, and are omitted from both ZIP packages. Replace keys exposed in chat or screenshots through the provider dashboards.

## Option 1: Run a local model with Ollama

Install [Ollama for Windows](https://ollama.com/download/windows). Download a local model, for example:

```powershell
ollama pull llama3.2:3b
```

This model download is approximately 2 GB; speed and answer quality depend on your laptop. Keep Ollama running. In a PowerShell terminal opened in the project folder:

```powershell
$env:LLM_PROVIDER = 'ollama'
$env:LLM_MODEL = 'llama3.2:3b'
npm run start:lan
```

The backend defaults to `http://127.0.0.1:11434/api/chat`. The phone connects to the SOC backend, not directly to Ollama. No model API key is needed for this local configuration. A free hosted web service cannot reach Ollama on your home laptop through localhost; use a hosted model API for that deployment.

## Option 2: Use an OpenAI API model

Create an API key in your OpenAI API account and choose a model available to that account that supports the Responses API and structured output. In the backend terminal:

```powershell
$env:LLM_PROVIDER = 'openai'
$env:LLM_MODEL = 'YOUR_SUPPORTED_MODEL_ID'
$env:OPENAI_API_KEY = 'YOUR_PRIVATE_API_KEY'
npm run start:lan
```

Replace the placeholders. API usage is governed by the provider account's limits and billing. The key is used only by the Node backend, never sent to the browser or saved in lab snapshots. Avoid sharing screenshots containing it. For Render, set these variables in the web service's Environment settings and redeploy; keep the existing database and analyst-auth variables. No model requests run automatically on startup.

Environment variables apply to the process started in that terminal. Stop an older server before starting a replacement. A memory-only lab loses activity on restart; configure PostgreSQL first if you need to retain it. The backend also loads `.env` from the project folder automatically. Existing terminal or hosting variables take precedence. Use `npm run setup` to create a private local file from `.env.example`.

## Your presentation

1. Start the backend with your chosen model settings. Connect a phone as a Test Device.
2. Choose Suspicious login sequence on the phone and wait until its simulation finishes.
3. Open the matching investigation on the laptop. The existing Rule-based assessment shows the deterministic baseline.
4. Press **Ask LLM** in **Real LLM review**. Automatic mode may send the selected lab records to Gemini, OpenAI and the configured Ollama service in sequence. Cloud requests use the corresponding API account.
5. Wait for **LLM answer received**. Show the teacher the returned model name, assessment, cited event IDs, suggested next steps, limitations and measured response time. Compare the citations with the event timeline.
6. Review the advice. The existing Approve response button applies the predefined simulated source restriction; it does not execute the model's suggested commands or other recommendations.

Say: “The phone activity is a controlled simulation. Rules detect the alert. This separate explanation was generated by the configured LLM from the selected logs. A human decides whether to apply the lab response.”

## What is implemented

- `lib/llm-provider.js`: server-only Gemini GenerateContent, OpenAI Responses and Ollama chat adapters, bounded JSON responses, schema and citation validation, a configurable timeout per provider (30 seconds by default in automatic mode), and sanitized errors.
- `POST /api/llm/analyze`: analyst-only background requests. Model calls run outside the database state queue so phones and event updates continue.
- `js/llm-panel.js`: model setup/status, request control, answer and evidence display. All model text is escaped before rendering.
- Each alert's `llm` record retains the returned answer and provenance in PostgreSQL checkpoints when database storage is enabled.

The prompt includes only the alert's selected event fields and limited device context. It excludes passwords, portal tokens, the analyst API key, physical peer addresses, fixture ground truth and the deterministic classification. Up to 80 records are sent: all records when within the limit, otherwise the earliest 40 and latest 40, with the omitted count displayed. Names and log strings are treated as untrusted data in the prompt. Model outputs have no tool access and cannot trigger containment.

One model request runs at a time, with at least five seconds between starts. A completed answer is reused for unchanged evidence. New correlated evidence invalidates it; ask again once collection is complete. Reset discards in-flight results. A backend restart marks unfinished requests Interrupted; retries are manual. Unavailable providers trigger fallback in automatic mode. If every provider fails, an error and the provider attempts remain visible; simulated text is never presented as a model answer.

The model gives an advisory assessment, not a calibrated confidence score. Existing confidence metrics and analytics still describe the rule engine. If a suggestion differs from the rule assessment, review the cited logs; the model does not overwrite rule classifications or automatically suppress alerts.

## Troubleshooting

| Message | What to do |
|---|---|
| No model configured | Set provider/model/key as needed, restart the backend, and reload the console. |
| Model or endpoint not found | Check the model ID; download the Ollama model if needed. |
| Model access denied | Check the API key and account permissions. |
| Model quota or rate limit reached | Check provider usage/billing or wait before retrying. |
| No valid model answer | Check connectivity and structured-output support. A small local model may need a retry or a more capable replacement. |
| New evidence arrived | Wait for the scenario to finish and request a new answer. |

Implementation verified with automated provider-response fixtures and local HTTP integration tests. Those fixtures are not real LLM responses. A live model test still requires your configured provider/key or local model.

Sources: [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/generate-content/structured-output), [OpenAI rate limits](https://developers.openai.com/api/docs/guides/rate-limits), [Ollama local authentication](https://docs.ollama.com/api/authentication), [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [Ollama chat API](https://docs.ollama.com/api/chat), [Ollama quickstart](https://docs.ollama.com/quickstart), [Llama 3.2 3B model](https://ollama.com/library/llama3.2:3b).
