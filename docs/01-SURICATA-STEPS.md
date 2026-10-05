# Suricata demonstration: step-by-step checklist

Use this document for the classroom setup. Give `02-SURICATA-COMMANDS.md` to Antigravity when you want it to run the terminal commands.

This version uses the simplest reliable arrangement:

```text
Physical laptop browser
        |
VirtualBox host-only network
        |
        +-- Kali VM: sends authorized test traffic
        |
        +-- Ubuntu VM: target + Suricata + SOC backend + forwarder
```

The Ubuntu VM runs everything that receives and analyzes traffic. This avoids copying a secret between Windows and Ubuntu. The physical laptop only opens the dashboard in a browser.

## Before starting

You need:

- VirtualBox or another VM platform.
- One Kali VM.
- One Ubuntu 22.04 or 24.04 VM.
- The extracted project folder inside Ubuntu.
- Internet access temporarily for installing Node.js, Suricata and project packages.
- At least 8 GB RAM on the physical laptop; assign roughly 2 GB to Kali and 2–4 GB to Ubuntu when possible.

Only use VMs you own or are explicitly authorized to test. Do not bridge an intentionally vulnerable target to a college or public network.

## Step 1: create the private VM network

1. Shut down both VMs.
2. In VirtualBox, open each VM’s **Settings → Network**.
3. Set one adapter on each VM to **Host-only Adapter**.
4. Select the same host-only network for both VMs.
5. Start Ubuntu and Kali.
6. In both VMs, run `ip address`.
7. Write down:
   - Ubuntu’s host-only IP, for example `192.168.56.20`.
   - Kali’s host-only IP, for example `192.168.56.10`.
   - Ubuntu’s interface name, for example `enp0s3` or `eth0`.
   - The subnet in CIDR form, for example `192.168.56.0/24`.
8. From Kali, ping the Ubuntu IP. Stop if the IPs are not private or the machines are on an unrelated college network.

You must supply the real interface, subnet and Ubuntu IP to Antigravity. It must not guess them.

## Step 2: put the project in Ubuntu

Copy `soc-analyst-team.zip` into Ubuntu, extract it, and open a terminal in the extracted folder. Confirm that `package.json`, `server.js`, `1-SETUP.cmd`, `docs`, and `scripts` are visible.

Do not copy anybody else’s `.env`. Running project setup creates a new private sensor token for this installation.

## Step 3: give Antigravity the command runbook

Open Antigravity inside the extracted project folder and give it this instruction:

> Read `docs/01-SURICATA-STEPS.md` and `docs/02-SURICATA-COMMANDS.md`. Run the Ubuntu commands in order. Before changing Suricata configuration, ask me for the Ubuntu host-only interface, host-only subnet and Ubuntu host-only IP. Stop if the selected network is not private or host-only. Never print, paste into chat, or transmit `.env` or `SENSOR_INGEST_TOKEN`. Ask before commands that require sudo or download software. Do not run any attack against a public, college, or third-party address.

Antigravity should execute one numbered command section at a time and verify its expected result before continuing.

## Step 4: start the two project processes

After installation and validation, Ubuntu needs two terminals:

- **Terminal A:** `npm run start:lan` runs the SOC backend and website.
- **Terminal B:** `npm run sensor:suricata` follows Suricata’s EVE log and forwards alerts.

Keep both terminals open during the demonstration.

## Step 5: open the dashboard

On the physical laptop, open:

```text
http://UBUNTU_HOST_ONLY_IP:8000
```

For example, if Ubuntu is `192.168.56.20`, open `http://192.168.56.20:8000`.

The dashboard should show **Collector connected** and **Suricata ingestion ready**. The URL uses HTTP only because this is an isolated host-only lab carrying fictional demonstration data.

## Step 6: generate the safe detection test

From Kali, ping only the Ubuntu host-only IP. The included local rule identifies that traffic as `LAB ICMP test`. This confirms the complete real-time path without exploiting a vulnerability.

Within a few seconds, show these dashboard pages:

1. **Security overview:** the event and alert counters increase.
2. **Event stream:** the Suricata signature appears with Kali as the source.
3. **Alert queue:** a new alert is ready for review.
4. **Investigations:** provenance says **Real Suricata EVE alert** and classification says **Needs review**.
5. **Devices & connection:** Kali and Ubuntu appear under **Suricata-observed sources**.

The project receives Suricata alert metadata. It does not store packet payloads. An IDS match is evidence, not proof of compromise. Analyst containment remains simulated and does not change a real firewall.

## Step 7: stop after the demonstration

Press `Ctrl+C` in the forwarder terminal and the backend terminal. The Suricata service may remain installed. To stop its service until the next lab session, use the optional stop command in the command runbook.

## Troubleshooting order

1. Confirm Kali can ping Ubuntu’s host-only IP.
2. Confirm Suricata reports a running service.
3. Confirm an `alert` record appears in `/var/log/suricata/eve.json`.
4. Confirm the forwarder says it sent an alert.
5. Confirm the backend terminal has no authentication or database error.
6. Confirm the browser uses Ubuntu’s host-only IP, not Kali’s IP.
7. Run `npm run doctor` inside the Ubuntu project folder.

The commands follow the official [Suricata Ubuntu quickstart](https://docs.suricata.io/en/latest/quickstart.html) and the project’s protected EVE forwarder design.
