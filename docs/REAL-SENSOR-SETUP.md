# Real-time Suricata sensor setup

The project can receive real **Suricata EVE JSON alerts** from an isolated lab and show them in the event stream, alert queue, investigations, network view, analytics, and PostgreSQL database. No hardware sensor is required. Suricata is software and can run on the target VM, a gateway VM, or a monitoring VM that can see the lab traffic.

The browser phone connection and the Suricata connection serve different purposes:

- A phone or laptop that scans the dashboard QR opens the employee portal and intentionally sends application events.
- Suricata inspects network traffic on a selected interface and writes IDS alerts to `eve.json`.
- `scripts/suricata-forwarder.js` reads that file and sends alert records to the protected backend endpoint.
- The dashboard labels these records **Real IDS**. It classifies them as **Needs review**, because an IDS signature alone is not proof of compromise.
- Analyst containment still changes only the project’s simulated blocklist. It does not modify a real firewall or the Kali machine.

## Recommended one-laptop lab

Use a host-only virtual network so the exercise cannot reach unrelated systems:

1. Create a Kali VM at a private address such as `192.168.56.10`.
2. Create an intentionally vulnerable target VM or DVWA at `192.168.56.20`.
3. Install Suricata on the target VM. This is the simplest arrangement because the target can see traffic addressed to itself. A separate monitoring VM also works when its virtual adapter is allowed to see the relevant traffic.
4. Keep both VMs on the same host-only network. Do not bridge the vulnerable target to a public or campus network.
5. Run the SOC backend on the host laptop or another private lab machine.

If you use a dedicated sensor VM in VirtualBox, attach it to the same host-only network and enable promiscuous mode for that adapter. A normal switched virtual network may hide traffic sent between two other VMs. Installing Suricata on the target or gateway avoids this problem.

## 1. Prepare this backend

From the project folder on the SOC machine:

```powershell
npm run setup
npm ci
npm run start:lan
```

`npm run setup` creates a long random `SENSOR_INGEST_TOKEN` in `.env` when one is missing. Keep `.env` private. Use the same value on the Suricata machine. If the backend is on Windows, allow Node.js through Windows Firewall only for private networks when Windows asks.

Find the SOC machine’s private URL in the startup output, for example `http://192.168.56.1:8000`. The sensor URL is the origin only; the forwarder adds `/api/sensors/suricata` itself.

## 2. Install and configure Suricata

On the Ubuntu/Debian target or sensor VM:

```bash
sudo apt update
sudo apt install -y suricata
ip address
```

Install Node.js 22 or newer for the forwarder using the official Node.js instructions for your distribution, then verify it with `node --version`.

Identify the interface that has the `192.168.56.x` address, such as `eth0` or `enp0s3`. Edit `/etc/suricata/suricata.yaml` and set `HOME_NET` to your host-only subnet:

```yaml
HOME_NET: "[192.168.56.0/24]"
```

Make sure the `eve-log` output is enabled and includes the `alert` type. Test the configuration and start Suricata on the lab interface:

```bash
sudo suricata -T -c /etc/suricata/suricata.yaml
sudo systemctl enable --now suricata
sudo tail -f /var/log/suricata/eve.json
```

If the service listens on the wrong interface, set the interface in the distro’s Suricata service configuration or run Suricata with the correct interface according to your installed version. Confirm that new JSON lines appear before starting the forwarder.

## 3. Run the forwarder

Copy this project to the Suricata machine, install Node.js 22 or newer, then create a private `.env` containing:

```dotenv
SENSOR_URL=http://192.168.56.1:8000
SENSOR_INGEST_TOKEN=PASTE_THE_SAME_LONG_TOKEN_FROM_THE_BACKEND
SURICATA_EVE_PATH=/var/log/suricata/eve.json
```

The Suricata log is commonly readable only by root or its logging group. Give the forwarder account read permission through the appropriate Suricata group instead of making the file public. Then run:

```bash
npm ci
npm run sensor:suricata
```

Normal mode starts at the end of the existing file and follows new records. To import an existing test file once, use:

```bash
npm run sensor:suricata -- --file ./eve-sample.json --url http://192.168.56.1:8000 --once
```

The token is read only from the environment; do not put it on the command line. The collector accepts batches of up to 100 records, retries temporary failures, ignores non-alert EVE records, and does not print packet contents. Replayed alerts are deduplicated by the backend.

For a hosted HTTPS backend, set `SENSOR_URL` to the deployed site origin and set the same `SENSOR_INGEST_TOKEN` in the hosting dashboard and sensor `.env`. Never send the token over public plain HTTP.

## 4. Verify safely

First verify the pipeline with a harmless lab test signature rather than an exploit. Add a local Suricata rule such as:

```text
alert icmp any any -> $HOME_NET any (msg:"LAB ICMP test"; sid:1000001; rev:1;)
```

Ensure `local.rules` is included by Suricata, validate the configuration, restart Suricata, then ping the target’s private lab IP from Kali. Use only systems you own or are explicitly authorized to test.

Within a few seconds, the forwarder should report one accepted alert. In the dashboard:

1. Open **Event stream** and find the Suricata signature.
2. Open **Alert queue** and select the new alert.
3. Confirm **Data provenance** says it came from a real Suricata EVE sensor.
4. Review the source and target under **Devices & connection** → **Suricata-observed sources**.
5. If PostgreSQL is configured, restart the backend and confirm the event remains.

If nothing appears, check in this order:

- `eve.json` receives a new `event_type: "alert"` line.
- The forwarder can read the file.
- `SENSOR_URL` points to the SOC machine’s reachable private address, not `127.0.0.1` on another VM.
- Both sides use the same token and it has at least 32 characters.
- The alert’s source and destination are private IPv4 addresses. The backend intentionally rejects public-address alerts.
- The host firewall permits TCP port 8000 on the private lab network.

Run `npm run doctor` on the backend for a quick configuration check.
