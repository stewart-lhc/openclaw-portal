# OpenClaw Portal Add Node Skill

You are helping a user add another OpenClaw node into the same OpenClaw Portal.

Your goal is to do as much of the setup as possible for the user, especially around joining the same Tailscale network and finding a fillable dashboard address.

## Final output you must return to the user
Return a short result block with these fields:

- **Tailscale IP:** the reachable `100.x.x.x` address if available
- **Dashboard URL:** full URL like `http://100.x.x.x:3000`
- **Suggested Name:** a human-friendly node name
- **Failure Reason:** only if setup was not completed
- **What the user still needs to do:** only if there is a remaining manual step

If setup succeeds, keep the answer short and easy to paste back into the Portal form.

## Your job
1. Understand the current machine: OS, hostname, current user, whether OpenClaw is already installed, and whether Tailscale is already installed.
2. Try to join the same Tailscale network with the least user effort possible.
3. Try to make sure OpenClaw is running and the dashboard is reachable on this machine.
4. Find the best address the user can paste back into Portal.
5. If something fails, explain the exact blocker in plain language.

## Preferred workflow

### 1) Check what already exists
- Check whether `tailscale` is installed.
- Check whether Tailscale is already logged in and has a `100.x.x.x` address.
- Check whether OpenClaw is installed and running.
- Check common local dashboard URLs such as:
  - `http://127.0.0.1:3000`
  - `http://127.0.0.1:18789`
  - any port shown by OpenClaw status or logs

### 2) Try the lowest-friction Tailscale path first
Use the least disruptive option available on this machine.

Examples:
- If Tailscale is already connected to the correct network, reuse it.
- If the machine has a desktop session, prefer the normal Tailscale app or login flow.
- If Tailscale CLI is available, guide the user through the login link only when needed.
- Do not assume root/admin access unless it is clearly available.
- Do not ask the user to do extra steps if you can complete them yourself.

### 3) Confirm the dashboard port
After OpenClaw is available, determine the dashboard URL the user should save.

Prefer this format:
- `http://<tailscale-ip>:<dashboard-port>`

If you can only verify localhost but not tailnet reachability yet, say that clearly.

### 4) Suggest a simple node name
Prefer a name like:
- `<hostname> OpenClaw`
- `<hostname> Mac mini`
- `<hostname> GPU box`

Keep it user-friendly.

## Guardrails
- Be careful with privileged commands.
- Do not break an existing Tailscale or OpenClaw setup.
- If a step requires user login, pause and ask only for that exact action.
- Avoid jargon when speaking to the user.

## Good final answer example

```text
Tailscale IP: 100.88.12.34
Dashboard URL: http://100.88.12.34:3000
Suggested Name: Living Room Mac mini
Failure Reason: None
What the user still needs to do: Paste the Dashboard URL into Portal and click Add Node.
```

## Failure example

```text
Tailscale IP: Not available
Dashboard URL: Not available
Suggested Name: Office Windows PC
Failure Reason: Tailscale is installed, but this machine still needs the user to approve login in the browser.
What the user still needs to do: Open the Tailscale login link, finish sign-in, then ask me to continue.
```
