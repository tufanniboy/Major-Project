import { esc, icon } from './utils.js';

function providerList(setup) {
  if (!setup?.providers?.length) return '';
  return `<ol class="llm-providers" aria-label="Model fallback order">${setup.providers.map(p => `<li><b>${esc(p.provider)}</b> <span>${esc(p.model || 'Model not selected')}</span><small>${esc(p.status)}${p.retryAt ? ` · retry after ${esc(new Date(p.retryAt).toLocaleTimeString())}` : ''}</small></li>`).join('')}</ol>`;
}
function attemptList(review) {
  if (!review?.attempts?.length) return '';
  return `<details class="llm-attempts" ${review.status === 'Failed' ? 'open' : ''}><summary>${review.fallbackUsed ? 'Automatic fallback used' : 'Provider attempts'}</summary><ol>${review.attempts.map(a => `<li><b>${esc(a.provider)}</b> · ${esc(a.status)}${a.reason ? ` — ${esc(a.reason)}` : ''}</li>`).join('')}</ol></details>`;
}

export function llmPanel(alert, config) {
  const setup = config?.llm, review = alert?.llm, complete = review?.status === 'Complete' && review.answer;
  const running = review?.status === 'Running';
  const label = complete ? 'LLM answer received' : running ? 'Waiting for the model' : setup?.configured ? 'Model configured · ready to request' : 'No model configured';
  const canAsk = alert?.analysis && setup?.configured && config?.control && !running && !complete;
  return `<section class="panel llm-panel" aria-label="Real LLM review"><div class="panel-header"><div><p class="eyebrow">REAL LLM REVIEW</p><h2>${esc(label)}</h2></div><button class="text-button" data-action="llm-setup">Setup & demo steps</button></div><div class="panel-body">
    <p class="llm-model">${esc(complete || running ? `${review.provider} / ${review.model}` : setup?.configured ? `${setup.provider} / ${setup.model}` : 'Connect an online model or a local Ollama model.')}</p>
    ${providerList(setup)}${attemptList(review)}
    ${review?.error ? `<p class="section-note" role="status">${esc(review.error)}</p>` : ''}
    ${complete ? `<div class="llm-result"><p class="eyebrow">${esc(review.answer.assessment)}</p><p class="analysis-summary">${esc(review.answer.summary)}</p>
      <h3>Evidence cited by the model</h3><ul>${review.answer.evidence.map(e => `<li><b class="mono">${esc(e.eventId)}</b> — ${esc(e.explanation)}</li>`).join('')}</ul>
      <h3>Suggested next steps</h3><ol>${review.answer.recommendations.map(item => `<li>${esc(item)}</li>`).join('')}</ol>
      <h3>Uncertainty and limitations</h3><ul>${review.answer.limitations.map(item => `<li>${esc(item)}</li>`).join('')}</ul>
      <p><b>Suggested technique IDs:</b> ${esc(review.answer.techniques.join(', ') || 'None asserted')}</p>
      <p class="fine-print">Received ${esc(new Date(review.completedAt).toLocaleString())} · ${Number(review.durationSeconds).toFixed(1)} seconds · ${review.eventIds.length} evidence records sent${review.omittedEvidence ? ` · ${review.omittedEvidence} records omitted` : ''}.</p>
      <p class="section-note">Model-generated advice. Check the cited logs before deciding. No action was executed by the model.</p></div>` : `<p>${running ? 'The backend is waiting for an actual model response. Phone activity continues while you wait.' : setup?.configured ? `Ask the model to explain this investigation using its relevant logs. ${setup.provider === 'auto' ? 'Selected lab logs may be sent to each configured provider in the order shown. Cloud API usage may incur charges. A busy or unavailable provider is skipped automatically.' : setup.provider === 'openai' ? 'This sends the selected lab logs to OpenAI and uses your API account.' : setup.provider === 'gemini' ? 'This sends the selected lab logs to Google Gemini using your API account.' : 'This sends the selected lab logs to your configured Ollama service.'}` : 'The rule assessment below is simulated. A real model answer will appear here only after a successful model request.'}</p>
      ${!alert ? '<p class="muted">Run a scenario first, then open its investigation.</p>' : !alert.analysis ? '<p class="muted">Wait for the rule assessment to finish before requesting AI review.</p>' : ''}
      ${alert ? `<button class="button primary" data-action="ask-llm" data-id="${esc(alert.id)}" ${canAsk ? '' : 'disabled'}>${icon('ai')}${running ? 'Model is analyzing…' : review ? 'Retry LLM analysis' : 'Ask LLM'}</button>` : ''}`}
  </div></section>`;
}

export function llmSetupContent(config) {
  const model = config?.llm;
  return `<p><b>${model?.configured ? `${esc(model.provider)} / ${esc(model.model)} is configured.` : 'A real model is not configured yet.'}</b> ${esc(model?.message || 'Start the Node backend to connect a model.')}</p>
    ${providerList(model)}<ol class="recommendations"><li>Connect an online model using a private API key, or run an Ollama model on the backend laptop.</li><li>For fallback, set LLM_PROVIDER=auto and the GEMINI_MODEL, OPENAI_MODEL and OLLAMA_MODEL settings in the private .env file. Add cloud API keys there. Restart the backend to apply settings.</li><li>Run an attack simulation from your phone and open its investigation.</li><li>Wait for the activity to finish, then press Ask LLM. Show the teacher the model name, answer, cited event IDs and response time.</li><li>Review the suggested next steps. The existing approval buttons apply only the lab’s simulated source restriction.</li></ol>
    <p>Full instructions are saved in <b>docs/LLM-SETUP.md</b> inside your project folder. Keep API keys in the backend environment, never in browser code or screenshots.</p>
    <p class="fine-print">The connection is checked on each request. A configured model is not proof of a successful response. Errors stay visible; simulated text is never substituted as an LLM answer.</p>`;
}
