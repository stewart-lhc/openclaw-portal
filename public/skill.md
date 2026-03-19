# OpenClaw Node Join Skill

Use this skill when a user wants **this machine** to join the same Tailscale network as their other OpenClaw nodes and return a value they can paste into OpenClaw Portal.

Your job is **not** to explain concepts. Your job is to **run the smallest reliable sequence of checks and commands**, minimize user involvement, and return a strict result block.

---

## Non-negotiable success criteria

You are only done when you can return at least one of these:

1. `Dashboard URL: http://100.x.y.z:<port>`
2. `Tailscale IP: 100.x.y.z` + the exact blocker for dashboard detection
3. A single exact human action that is blocking completion

Do **not** return vague advice.
Do **not** return theory.
Do **not** ask multiple questions at once.

---

## Required final output format

Always end with this exact block shape:

```text
Status: success | partial | failed
Node Name: <suggested node name>
Tailscale IP: <100.x.y.z | unavailable>
Dashboard URL: <http://100.x.y.z:port | unavailable>
OpenClaw Status: running | installed-not-running | not-installed | unknown
Blocker: <none or one exact blocker>
User Action: <none or one exact action>
```

If successful, keep it short.
If blocked, give only **one** next action.

---

## Execution policy

1. Prefer detection over asking.
2. Prefer reuse over reinstall.
3. Prefer exact commands over descriptive prose.
4. If a command can be run safely, run it.
5. If root/admin/browser login is required, stop and request exactly that step.
6. Never pretend success.

---

## Step 1 — Detect OS and privilege level

Run these first:

### Linux / macOS
```bash
uname -a
whoami
hostname
command -v sudo || true
```

### Windows (PowerShell)
```powershell
$env:COMPUTERNAME
whoami
```

Set:
- `HOSTNAME`
- `CURRENT_USER`
- `HAS_SUDO` or admin ability

Suggested node name default:
```text
<HOSTNAME> OpenClaw
```

---

## Step 2 — Detect Tailscale

### Linux / macOS
```bash
command -v tailscale || true
tailscale status 2>/dev/null || true
tailscale ip -4 2>/dev/null || true
```

### Windows (PowerShell)
```powershell
Get-Command tailscale -ErrorAction SilentlyContinue
& tailscale status 2>$null
& tailscale ip -4 2>$null
```

Decision:
- If you already have a `100.x.y.z` IP, continue to Step 4.
- If `tailscale` is missing, go to Step 3.
- If installed but not logged in, go to Step 3B.

---

## Step 3 — Install or connect Tailscale

### Step 3A — Install Tailscale if missing

#### Ubuntu / Debian Linux
If sudo is available:
```bash
curl -fsSL https://tailscale.com/install.sh | sh
```

If sudo is not available, stop with:
```text
Blocker: Tailscale is not installed and this machine does not have sudo/admin access.
User Action: Install Tailscale on this machine, then ask me to continue.
```

#### macOS
Do not attempt silent GUI install unless clearly available.
Use:
```bash
brew install --cask tailscale || true
```
If not possible:
```text
Blocker: Tailscale is not installed on this Mac.
User Action: Install Tailscale from https://tailscale.com/download/mac and open it once, then ask me to continue.
```

#### Windows
Prefer Winget if available:
```powershell
winget install Tailscale.Tailscale -h
```
If not possible:
```text
Blocker: Tailscale is not installed on this Windows machine.
User Action: Install Tailscale from https://tailscale.com/download/windows and open it once, then ask me to continue.
```

---

### Step 3B — Log in / join the correct tailnet

Try the standard CLI first:

#### Linux / macOS
```bash
sudo tailscale up || tailscale up
```

#### Windows
```powershell
tailscale up
```

If this prints a login URL, do **not** explain Tailscale.
Return only:
```text
Blocker: This machine still needs Tailscale login approval.
User Action: Open the Tailscale login link shown by the machine, finish sign-in, then ask me to continue.
```

After login, verify:
```bash
tailscale ip -4
```

If there is still no `100.x.y.z`, return:
```text
Blocker: Tailscale is installed but this machine is not yet connected to the expected network.
User Action: Finish Tailscale sign-in on this machine, then ask me to continue.
```

---

## Step 4 — Detect OpenClaw

Run these checks.

### Linux / macOS
```bash
command -v openclaw || true
openclaw gateway status 2>/dev/null || true
openclaw status 2>/dev/null || true
curl -I -s http://127.0.0.1:3000 | head -5 || true
curl -I -s http://127.0.0.1:18789 | head -5 || true
```

### Windows (PowerShell)
```powershell
Get-Command openclaw -ErrorAction SilentlyContinue
openclaw gateway status 2>$null
try { iwr http://127.0.0.1:3000 -Method Head } catch {}
try { iwr http://127.0.0.1:18789 -Method Head } catch {}
```

Decide:
- If `openclaw` is missing → `not-installed`
- If installed but service is down → `installed-not-running`
- If localhost responds on 3000 or 18789 → use that port

Preferred port order:
1. `3000`
2. `18789`
3. any explicit port reported by `openclaw gateway status`

---

## Step 5 — Start OpenClaw if installed but not running

If `openclaw` exists and service is not running:

```bash
openclaw gateway start
```

Then re-check:
```bash
openclaw gateway status
curl -I -s http://127.0.0.1:3000 | head -5 || true
curl -I -s http://127.0.0.1:18789 | head -5 || true
```

If start fails:
```text
Blocker: OpenClaw is installed but the gateway is not running.
User Action: Run `openclaw gateway start` on this machine, then ask me to continue.
```

---

## Step 6 — Construct the value to return

If you have:
- `TAILSCALE_IP=100.x.y.z`
- `PORT=3000` or `18789`

Then return:
```text
Dashboard URL: http://<TAILSCALE_IP>:<PORT>
```

Do not return localhost unless explicitly asked.
Do not return 192.168.x.x unless Tailscale is unavailable and user asked for LAN fallback.

---

## Step 7 — Failure classification

Use exactly one blocker.

### Possible blockers
- `Tailscale is not installed and no admin access is available.`
- `Tailscale login approval is still required.`
- `OpenClaw is not installed on this machine.`
- `OpenClaw is installed but the gateway is not running.`
- `Tailscale is connected, but no OpenClaw dashboard port could be verified.`

Return only the smallest next user action.

---

## Strict response templates

### Success
```text
Status: success
Node Name: <HOSTNAME> OpenClaw
Tailscale IP: <100.x.y.z>
Dashboard URL: http://<100.x.y.z>:<port>
OpenClaw Status: running
Blocker: none
User Action: none
```

### Partial
```text
Status: partial
Node Name: <HOSTNAME> OpenClaw
Tailscale IP: <100.x.y.z>
Dashboard URL: unavailable
OpenClaw Status: installed-not-running
Blocker: OpenClaw is installed but the gateway is not running.
User Action: Run `openclaw gateway start` on this machine, then ask me to continue.
```

### Failed
```text
Status: failed
Node Name: <HOSTNAME> OpenClaw
Tailscale IP: unavailable
Dashboard URL: unavailable
OpenClaw Status: unknown
Blocker: Tailscale login approval is still required.
User Action: Open the Tailscale login link shown on this machine, finish sign-in, then ask me to continue.
```

---

## What not to do

- Do not explain what Tailscale is unless the user explicitly asks.
- Do not dump raw logs unless needed for a blocker.
- Do not say “read the docs”.
- Do not make the user infer the IP from your output.
- Do not say “it should work”. Verify it.
