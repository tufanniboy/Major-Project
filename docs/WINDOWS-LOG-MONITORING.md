# Windows system log monitoring

This option sends selected Windows Security event records to the SOC. The collector runs on the Windows machine being monitored and posts to the authenticated Windows log endpoint. It records selected metadata only; process command lines and packet payloads are not collected.

## Configure Windows

Start the SOC server with `npm run start:lan`. Open **PowerShell as Administrator**, change to the project directory, and run `npm run setup:windows`. The helper enables the audit categories below and starts the collector in that elevated window:

```powershell
 auditpol /set /subcategory:"Logon" /success:enable /failure:enable
 auditpol /set /subcategory:"Process Creation" /success:enable
 auditpol /set /subcategory:"Account Management" /success:enable /failure:enable
 auditpol /set /subcategory:"Filtering Platform Packet Drop" /failure:enable
```

The helper requires the English audit subcategory names shown above. Windows may localize them; use `auditpol /list /subcategory:*` to find names on that installation if setup reports an unknown subcategory.

## Run the collector

1. Confirm `.env` contains the generated `SENSOR_INGEST_TOKEN`. Keep it private. The collector reads this token from `.env` and sends it as a bearer credential.
2. Open **Event stream** in the SOC dashboard. Windows logon, process, account-change, and blocked-packet records are marked **Windows Event Log** in provenance.
3. Stop the collector with `Ctrl+C` in its elevated PowerShell window.

The collector reads Security event IDs 4624 (successful logon), 4625 (failed logon), 4688 (process start), 4720/4722/4728/4732/4756 (account or group changes), and 5152 (a packet blocked by Windows Filtering Platform). Five failed logons from the same source/account in one minute use the existing authentication rule. Account changes are surfaced for analyst review. Twenty or more blocked ICMP packets from one source to the monitored host in one minute create a high-rate ICMP investigation.

## Limits

This is host telemetry, not complete attack detection. Event 5152 covers blocked packets; it does not mean Windows records every successful ping. The ICMP rule therefore detects a burst visible in blocked-packet auditing, not every ping flood. The collector does not yet ingest Sysmon, Windows Defender, allowed firewall traffic, PowerShell operational logs, or events from other machines. Add those sources and corresponding rules to broaden coverage. A Windows machine cannot report activity it did not observe or log.

The collector needs a private IPv4 address and the selected audit policies enabled. It polls the Security log every three seconds, batches at most 100 records per request, and the backend deduplicates records by machine, log, and record ID. An audit event is evidence for review, not proof that a compromise occurred.
