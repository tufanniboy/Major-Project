# Teacher Demonstration Script

## One sentence project introduction

Say:

> Our project is an LLM Powered SOC Analyst for controlled cybersecurity education. It collects security events, correlates related evidence, creates explainable alerts, optionally asks an AI model for a second opinion, and keeps the final response under human control.

## Important scope statement

Say this near the beginning:

> The project has three evidence sources. Built in scenarios generate synthetic events. Connected phones and laptops send intentional real HTTP activity through the portal. An optional Suricata sensor can send real IDS alert metadata from an authorized private lab. We do not claim that every attack can be detected, and an IDS alert is evidence that still requires analyst verification.

Do not claim that the software attacks devices, reads all phone activity, automatically blocks a real network, or proves that a computer is compromised.

## Before the teacher arrives

1. Connect the demonstration laptop and phone to the same Wi-Fi network.
2. Open `http://localhost:8000/` on the laptop.
3. Confirm that the header shows Collector connected.
4. Keep the phone ready to scan the QR code.
5. Use a clean lab session so the demonstration starts at zero events.
6. If demonstrating a real LLM review, confirm internet access. The system tries Gemini, OpenAI, and Ollama in the configured fallback order.
7. Demonstrate Suricata only if the authorized isolated Kali and Ubuntu lab has already been prepared.

## Recommended 12 to 15 minute demonstration

### 1. Landing screen and project purpose

Show the opening screen and click **Enter command center**.

Say:

> This is a controlled academic SOC environment. It demonstrates the complete alert workflow from collection to investigation and analyst approved response. The rule analysis and simulation labels make the project boundary visible.

### 2. Overview

Show **Overview**.

Point to:

- Events collected.
- Alerts awaiting review.
- Live device sessions.
- Sources contained.
- Network at a glance.
- Recent activity.
- Device connection card.
- Suricata sensor status.

Say:

> This screen gives the analyst one operational summary. Events arrive from simulations, connected browser sessions, and optionally Suricata. Related events are grouped into alerts so the analyst investigates evidence rather than isolated log lines.

Explain the counters:

- **Events collected** is the number of normalized records in the current lab.
- **Awaiting review** is the number of alerts that still need a human decision.
- **Live device sessions** counts connected portal sessions. The other displayed machines are simulated lab assets.
- **Sources contained** counts application level restrictions approved by the analyst.

### 3. Connect a real phone or laptop

Click **Show connection QR** or open **Devices and connection**. Scan the QR with the phone. If scanning is inconvenient, type the displayed portal address into the phone browser.

On the phone:

1. Enter a device name.
2. Select the device type.
3. Register the device.
4. Choose an activity or suspicious sequence.
5. Start it.

Say:

> The QR code contains a local portal URL. The phone must be on the same Wi-Fi as the server laptop. Registration creates a browser session and a logical lab IP address. It does not change the phone's real network IP. The selected activity sends intentional HTTP event records to our backend.

Point out that multiple phones and laptops can register separately. Each gets its own device identity, token, logical IP, events, and alert history.

### 4. Network

Open **Network** while the phone activity is running.

Say:

> The topology shows how device activity moves through lab services, collection, analysis, and policy. Green represents normal activity, amber represents suspicious activity, and red represents a source stopped by the simulated application policy.

Explain that this is a logical visualization of the project data. It is not a packet capture map of every device on the college network.

### 5. Event stream

Open **Event stream**.

Show the event fields: time, source, destination, protocol, action, bytes, scenario or sensor source, and evidence identifiers.

Say:

> Every source is converted into one normalized event schema. Normalization lets the same correlation and investigation pipeline handle simulation records, portal activity, and Suricata metadata. The evidence ID and provenance allow an alert to be traced back to its source events.

### 6. Scenarios

Open **Scenarios** and choose **Suspicious login sequence** for the clearest demonstration. Let the events arrive gradually.

Say:

> The scenario does not perform a real attack. It generates a controlled sequence representing failed logins followed by suspicious access. Gradual delivery lets us show the difference between a single harmless record and a correlated pattern.

Other available patterns demonstrate failed login bursts, port scanning behavior, restricted API access, privilege changes, unusual file access, data exfiltration indicators, normal activity, and mixed traffic.

### 7. Alert queue

Open **Alert queue** after the scenario creates an alert.

Point to:

- Severity.
- Rule title.
- Source and destination.
- Current state.
- Evidence count.
- Possible MITRE ATT&CK mapping.

Say:

> A rule evaluates related evidence within a 60 second window. When its conditions match, the backend creates one evidence linked alert. Severity helps prioritize work, while the state shows whether it is waiting, under investigation, or resolved.

### 8. Investigations

Open the generated alert in **Investigations**.

Explain each section:

- **Timeline** shows the order of events.
- **Provenance** shows whether evidence came from a scenario, portal, or Suricata.
- **Rule assessment** explains why the alert fired.
- **Context** summarizes source, target, account, history, and indicators.
- **Baseline analysis** is deterministic and always available.
- **MITRE ATT&CK mapping** shows possible technique behavior and is not proof of attribution.
- **Recommended response** suggests the next analyst action.

Say:

> The baseline analysis is explainable because it uses the alert's bounded evidence and known rule context. It does not invent hidden evidence.

### 9. Optional AI review

Click the LLM review control only when internet access is available.

Say:

> The AI review is a separate, optional second opinion. In automatic mode the backend tries Gemini, OpenAI, and Ollama in order when providers are available. Only normalized alert evidence is supplied. The answer must follow a validated structure, cite the supplied evidence IDs, and cannot execute any response.

If the model request fails, say:

> The deterministic baseline remains available even when an external model is unavailable. This shows graceful fallback rather than making the entire investigation depend on one cloud provider.

### 10. MITRE ATT&CK

Open **MITRE ATT&CK**.

Say:

> MITRE ATT&CK provides standard technique vocabulary. Our project maps observed behavior to possible techniques to help the analyst investigate. A mapping does not identify the attacker and does not prove compromise.

### 11. Response and response log

Return to the investigation and demonstrate the available analyst decision. Approve a response only for the controlled lab alert, then open **Response log**.

Say:

> The analyst remains responsible for the decision. Approval records an audit entry and adds the source to the project's simulated blocklist. It does not change Windows Firewall, the college router, or the phone operating system. The action can be reviewed and reversed inside the lab.

### 12. Devices and connection

Open **Devices and connection**.

Say:

> This page manages registered portal sessions and lab assets. A device can be removed from the project list, but the software cannot delete or control the physical phone or laptop.

### 13. Analytics

Open **Analytics**.

Say:

> Analytics summarizes the evidence already collected in this lab, such as event volume, severity distribution, scenario behavior, and response timing. These are demonstration measurements. Targets such as accuracy, F1 score, false positive reduction, or workload improvement must not be presented as achieved without a representative labelled evaluation.

### 14. Architecture

Open **Architecture**.

Explain the pipeline in this order:

> Sources send events to the Node backend. The collector validates them. Normalization creates one schema. JavaScript correlation rules group related evidence and create alerts. The investigation layer adds context, deterministic analysis, optional LLM review, and possible MITRE ATT&CK mappings. The analyst makes the final response decision. PostgreSQL can preserve a shared checkpoint when configured, and server sent events update connected dashboards live.

Mention the current demonstration state accurately:

- Storage currently shows **Memory**, so restarting the server clears the active session.
- PostgreSQL persistence is supported when `DATABASE_URL` is configured.
- The website and API are served by the same Node service.

### 15. Optional Suricata explanation

Point to the Suricata status on Overview or Architecture.

Say:

> Suricata is a network intrusion detection engine. In our optional private lab, Kali produces authorized test traffic toward an Ubuntu target. Suricata observes the target network interface and writes EVE JSON alerts. Our authenticated forwarder sends bounded alert metadata to the Node collector, where it appears as real IDS evidence requiring review.

Use this flow when explaining:

`Kali VM -> Ubuntu target with Suricata -> EVE JSON -> authenticated forwarder -> Node collector -> dashboard`

Do not run real tests on the college network without written authorization and isolation.

### 16. About this project

Open **About this project** last.

Say:

> The contribution is the integration of normalized evidence, rule correlation, explainable investigation, optional multi-provider AI review, device participation, human approval, persistence support, and optional real IDS ingestion in one teachable workflow.

## Questions the teacher may ask

### Is this a real SOC product

> It is a functional academic prototype. The event pipeline, portal requests, backend APIs, correlation, investigation, optional LLM calls, PostgreSQL adapter, and Suricata ingestion are implemented. Built in attack scenarios and response enforcement are controlled simulations.

### Does it detect all real attacks

> No security product can guarantee that. The current system detects the implemented rule patterns and can display Suricata signature alerts. Broader coverage requires more sensor placement, rules, endpoint telemetry, threat intelligence, tuning, labelled evaluation, and production monitoring.

### Why use an LLM

> The LLM converts bounded evidence into a readable second opinion and suggested investigation steps. Deterministic rules create the alerts. The model does not replace detection and cannot take action.

### What happens during high traffic or a provider limit

> Automatic mode tries the configured providers in order and applies timeout and cooldown behavior. If no real provider answers, the deterministic baseline remains usable.

### Why PostgreSQL

> PostgreSQL provides durable shared checkpoint storage for hosted or multi-user use. Memory mode is simpler for a classroom demonstration but does not survive a restart.

### Why does the connected phone receive another IP

> The displayed address is a logical IP used inside the lab data model. The Wi-Fi router assigns the phone's real network IP. The project does not control DHCP.

### Can it block or delete the connected device

> It can restrict the registered session inside the simulated application and can remove its registration. It cannot delete, damage, or remotely control the physical device.

### What was tested

> The recorded automated run contained 51 tests: 48 passed and 3 PostgreSQL runtime tests were skipped because PostgreSQL was not configured for that run. Coverage includes rules, scenarios, portal sessions, LLM adapters, persistence behavior, security checks, topology, and Suricata normalization and ingestion.

## Strong closing statement

Say:

> This project demonstrates an explainable and auditable SOC workflow. It keeps evidence provenance visible, separates deterministic detection from optional AI advice, supports real browser activity and optional IDS metadata, and keeps the final response with the human analyst.

