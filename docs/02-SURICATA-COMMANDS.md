# Suricata demonstration: command runbook

This runbook is for Antigravity or a person working in the **Ubuntu VM**. Run sections in order. Do not paste all sections into one terminal at once.

The only Kali command is in section 9. Every destination must be an owned, isolated, private host-only VM address.

## Values Antigravity must request

Before configuration, obtain these three values from the user:

```text
LAB_INTERFACE     Example: enp0s3
LAB_CIDR          Example: 192.168.56.0/24
UBUNTU_LAB_IP     Example: 192.168.56.20
```

Never guess them. Reject public addresses and stop if the selected adapter is bridged to a college or public network.

## 1. Ubuntu preflight

Run inside Ubuntu:

```bash
cat /etc/os-release
ip -brief address
ip route
pwd
test -f package.json && test -f server.js && echo "Project folder found"
```

Expected: Ubuntu, a private host-only IPv4 address, and `Project folder found`.

## 2. Set the confirmed lab values

Replace only the three example values, then run:

```bash
export LAB_INTERFACE='enp0s3'
export LAB_CIDR='192.168.56.0/24'
export UBUNTU_LAB_IP='192.168.56.20'
printf 'Interface: %s\nSubnet: %s\nUbuntu: %s\n' "$LAB_INTERFACE" "$LAB_CIDR" "$UBUNTU_LAB_IP"
```

Validate that the address is assigned to the selected interface:

```bash
ip -4 address show dev "$LAB_INTERFACE"
ip -4 address show dev "$LAB_INTERFACE" | grep -F "$UBUNTU_LAB_IP"
```

Do not continue when the second command finds nothing.

## 3. Install Node.js 22

These commands download the NodeSource setup script as a file so it can be inspected before sudo executes it:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/nodesource_setup_22.sh
test -s /tmp/nodesource_setup_22.sh
less /tmp/nodesource_setup_22.sh
```

After review, exit `less` with `q`, approve the sudo step, then run:

```bash
sudo -E bash /tmp/nodesource_setup_22.sh
sudo apt-get install -y nodejs
node --version
npm --version
node -e "if(Number(process.versions.node.split('.')[0])<22) process.exit(1); console.log('Node.js version accepted')"
```

Expected: Node.js 22 or newer and `Node.js version accepted`.

## 4. Install Suricata and its rules

Use the official OISF stable Ubuntu repository:

```bash
sudo apt-get install -y software-properties-common jq acl
sudo add-apt-repository -y ppa:oisf/suricata-stable
sudo apt-get update
sudo apt-get install -y suricata
sudo suricata-update
sudo suricata --build-info
```

Expected: Suricata build information without an error.

## 5. Configure the private lab interface and subnet

Back up the configuration:

```bash
sudo test -e /etc/suricata/suricata.yaml.before-soc-lab || sudo cp -a /etc/suricata/suricata.yaml /etc/suricata/suricata.yaml.before-soc-lab
```

Run this command block exactly after setting `LAB_INTERFACE` and `LAB_CIDR` in section 2:

```bash
sudo -E python3 - "$LAB_INTERFACE" "$LAB_CIDR" <<'PY'
from pathlib import Path
import ipaddress, re, sys

interface, cidr = sys.argv[1:]
if not re.fullmatch(r'[A-Za-z0-9_.:-]{1,32}', interface):
    raise SystemExit('Invalid interface name')
network = ipaddress.ip_network(cidr, strict=False)
if not network.is_private or network.version != 4:
    raise SystemExit('LAB_CIDR must be a private IPv4 network')

path = Path('/etc/suricata/suricata.yaml')
text = path.read_text()
text, home_count = re.subn(
    r'(?m)^(\s*)HOME_NET:\s*.*$',
    lambda match: f'{match.group(1)}HOME_NET: "[{network.with_prefixlen}]"',
    text,
    count=1,
)
start = text.find('\naf-packet:')
if start < 0:
    raise SystemExit('af-packet section not found')
section_body = start + len('\naf-packet:')
end_match = re.search(r'(?m)^\S[^\n]*:\s*$', text[section_body:])
end = section_body + end_match.start() if end_match else len(text)
block = text[start:end]
block, interface_count = re.subn(
    r'(?m)^(\s*-\s*interface:)\s*\S+\s*$',
    lambda match: f'{match.group(1)} {interface}',
    block,
    count=1,
)
if home_count != 1 or interface_count != 1:
    raise SystemExit('Could not update HOME_NET and af-packet interface exactly once')
path.write_text(text[:start] + block + text[end:])
print(f'Configured HOME_NET={network.with_prefixlen}, interface={interface}')
PY
```

Display only the relevant non-secret settings:

```bash
grep -n -m1 'HOME_NET:' /etc/suricata/suricata.yaml
sed -n '/^af-packet:/,/^[^[:space:]]/p' /etc/suricata/suricata.yaml | head -n 12
```

## 6. Add the harmless pipeline test rule

The ET Open rules file is created by `suricata-update`. Add the project’s unique local test rule only when it is absent:

```bash
grep -q 'sid:1000001;' /var/lib/suricata/rules/suricata.rules || printf '%s\n' 'alert icmp any any -> $HOME_NET any (msg:"LAB ICMP test"; sid:1000001; rev:1;)' | sudo tee -a /var/lib/suricata/rules/suricata.rules >/dev/null
sudo suricata -T -c /etc/suricata/suricata.yaml
sudo systemctl enable --now suricata
sudo systemctl restart suricata
sudo systemctl --no-pager --full status suricata
```

Expected: the configuration test succeeds and the service is `active (running)`. If `suricata-update` is run again later, repeat this section because that command can replace `suricata.rules`.

## 7. Configure the SOC project and EVE access

Run from the extracted project folder:

```bash
npm run setup
npm ci
sed -i 's|^SENSOR_URL=.*|SENSOR_URL=http://127.0.0.1:8000|' .env
sed -i 's|^SURICATA_EVE_PATH=.*|SURICATA_EVE_PATH=/var/log/suricata/eve.json|' .env
npm run doctor
```

Do not display `.env` or the sensor token. Grant the current Ubuntu user read access to the current EVE file:

```bash
sudo test -f /var/log/suricata/eve.json
sudo setfacl -m "u:$USER:r" /var/log/suricata/eve.json
test -r /var/log/suricata/eve.json && echo "EVE log readable"
```

Expected: `EVE log readable`. Log rotation may create a new file; rerun the `setfacl` command if access later fails.

## 8. Start the SOC backend and forwarder

Open **Ubuntu Terminal A** in the project folder:

```bash
npm run start:lan
```

Keep it running. It should show the dashboard address and `Suricata ingestion: enabled`.

Open **Ubuntu Terminal B** in the same folder:

```bash
npm run sensor:suricata
```

Keep it running. It should say that it is watching `/var/log/suricata/eve.json` and sending to the local collector.

Optional read-only checks from a third Ubuntu terminal:

```bash
curl -fsS http://127.0.0.1:8000/api/health | jq
sudo tail -n 20 /var/log/suricata/suricata.log
sudo tail -n 20 /var/log/suricata/eve.json | jq -c 'select(.event_type=="alert")'
```

## 9. Run the safe test from Kali

On **Kali**, replace the example with the confirmed Ubuntu host-only IP:

```bash
export UBUNTU_LAB_IP='192.168.56.20'
ping -c 4 "$UBUNTU_LAB_IP"
```

This is the only traffic-generation command in this runbook. Do not substitute an address outside the owned host-only lab.

## 10. Verify the dashboard

On the physical laptop, open:

```text
http://UBUNTU_LAB_IP:8000
```

Look for `LAB ICMP test`, `Real IDS Evidence`, and `Needs review`. In Ubuntu Terminal B, expect a line reporting that one alert was forwarded.

## 11. Stop the demonstration

Press `Ctrl+C` in Terminal B and Terminal A. Optionally stop Suricata:

```bash
sudo systemctl stop suricata
```

Start it again for a later demonstration with:

```bash
sudo systemctl start suricata
```

## Restore the original Suricata configuration

Only use this if the lab configuration must be removed:

```bash
sudo cp -a /etc/suricata/suricata.yaml.before-soc-lab /etc/suricata/suricata.yaml
sudo systemctl restart suricata
```

References: [Suricata quickstart](https://docs.suricata.io/en/latest/quickstart.html), [Suricata Ubuntu installation](https://docs.suricata.io/en/suricata-8.0.3/install/ubuntu.html), and [NodeSource Node.js 22 distributions](https://github.com/nodesource/distributions/blob/master/DEV_README.md).
