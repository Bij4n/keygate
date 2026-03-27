# Launch Post Drafts

## Show HN (Hacker News)

### Title (max 80 chars)

```
Show HN: Keygate – Open-source credential governance for AI agents
```

### Post text

```
Hi HN,

We built Keygate because we kept seeing the same problem: developers give AI
agents their personal API tokens — full scope, never expire, visible in the
context window. One prompt injection or compromised MCP tool and the attacker
has everything.

The existing tools in this space (Nango, Composio, Arcade) solve
authentication — helping agents get connected to services. But nobody governs
what happens after. There's no scoping, no anomaly detection, no audit trail,
and no way to know if an agent is behaving suspiciously.

Keygate is a credential broker that sits between your agents and the services
they access. Instead of handing agents raw tokens, Keygate issues scoped,
short-lived credentials with opaque references — the agent never sees the
actual token.

What it does:

- Scoped tokens with configurable TTL (default 1hr, max 24hr)
- Opaque references — agents get a ref_xxx that resolves at execution time
- Real-time anomaly detection (velocity spikes, off-hours access, scope escalation)
- Agent trust scoring (0-100) with auto-suspend on anomalies
- Policy engine with deny/require-approval rules
- Human-in-the-loop approvals for high-risk operations
- MCP server with 6 tools for any MCP-compatible agent
- Full audit trail exportable to Datadog/Splunk/Elastic
- MCP Server Registry with trust scores for tool vetting

Stack: TypeScript monorepo, Express API, AES-256-GCM encryption,
SDKs for TypeScript + Python/LangChain.

Try the demo (no signup): [DASHBOARD_URL]/preview.html
Landing page: [LANDING_URL]
GitHub: https://github.com/Bij4n/keygate

Would love feedback on whether this matches what you're running into
with agent credentials, and what features would make you adopt it.
```

---

## Reddit: r/langchain

### Title

```
We built an open-source credential broker for LangChain agents — scoped tokens, anomaly detection, and auto-revoke instead of raw API keys
```

### Body

```
The problem: every LangChain tool that needs API access gets your raw token
via environment variables. Full scope, never expires, shared across all tools.
If you're running CrewAI crews or LangGraph agents with 10+ tools, that's 10+
services where a compromised tool means game over.

We built Keygate to fix this. It's an open-source credential broker that:

1. Issues scoped, short-lived tokens per tool (read-only Gmail for 1 hour,
   not permanent full access)
2. Uses opaque references — your agent never sees the real token, so prompt
   injection can't exfiltrate it
3. Detects anomalies in real time (velocity spikes, off-hours access,
   bulk data pulls)
4. Auto-revokes tokens after use

We have a Python SDK with LangChain support:

```python
from keygate_langchain import KeygateCredentialProvider

provider = KeygateCredentialProvider(
    api_key="kg_key_...",
    agent_id="my-agent",
)

# Auto-revokes when done
with provider.scoped("conn_github", actions=["read"]) as token:
    response = httpx.get(
        "https://api.github.com/user/repos",
        headers={"Authorization": f"Bearer {token}"},
    )
```

Or wrap any existing tool:

```python
secured_tool = keygate_wrapped_tool(
    tool_fn=my_github_tool,
    credential_provider=provider,
    connection_id="conn_github",
    token_param="github_token",
)
```

GitHub: https://github.com/Bij4n/keygate
Demo: [DASHBOARD_URL]/preview.html

What credential management pain points are you running into with
your agents? We're shaping the roadmap based on real feedback.
```

---

## Reddit: r/LocalLLaMA

### Title

```
PSA: Your AI agent's API tokens are probably a security nightmare. We built an open-source fix.
```

### Body

```
If you're running local agents with tool access (LangChain, CrewAI, AutoGen,
MCP), chances are you're passing raw API keys through environment variables.
That means:

- Every tool in your agent's toolkit has access to every credential
- Tokens never expire
- If a malicious MCP server is in the mix, it can read your env vars
- No audit trail of what the agent did with your credentials

This isn't theoretical — Invariant Labs demonstrated MCP tool poisoning
attacks where a malicious server exfiltrates credentials through hidden
tool descriptions. HN called it "curl | bash for AI agents."

We built Keygate (MIT, open source) to sit between your agents and their
credentials:

- Scoped, expiring tokens instead of permanent full-access keys
- Agents get opaque references, never raw tokens
- Anomaly detection flags suspicious patterns
- MCP Server Registry with trust scores for third-party tools
- Works with any framework — TypeScript SDK, Python SDK, or MCP server

No cloud dependency — runs entirely self-hosted. Try the demo without
signing up: [DASHBOARD_URL]/preview.html

GitHub: https://github.com/Bij4n/keygate
```

---

## Twitter/X Thread

```
Thread:

1/ We built @keyabordd — an open-source credential broker for AI agents.

The problem: you give your agent a GitHub token. It's full-scope,
never expires, and visible to every tool in the chain.

One compromised MCP server = full account takeover.

2/ Existing solutions (Nango, Composio, Arcade) solve authentication.

They help agents GET credentials.

Nobody governs what happens AFTER.

That's the gap we're filling.

3/ Keygate sits between your agents and services:

Agent → Keygate → Gmail, GitHub, Slack

Instead of raw tokens, agents get opaque references that resolve
at execution time. Scoped. Short-lived. Logged. Revocable.

4/ What makes it different:

• Real-time anomaly detection
• Agent trust scoring (0-100)
• Policy engine with human-in-the-loop
• MCP Server Registry with trust scores
• SIEM export (Datadog, Splunk, Elastic)
• 119 tests passing

5/ Open source. MIT licensed. Self-hostable.

TypeScript + Python/LangChain SDKs.
MCP server for any compatible agent.

Try the demo (no signup): [URL]
GitHub: github.com/Bij4n/keygate

Feedback welcome — what would make you adopt this?
```

---

## Notes for posting

- **Best time to post on HN:** Tuesday–Thursday, 8–10am ET
- **Best time for Reddit:** Tuesday–Thursday, morning ET
- **Respond to every comment** in the first 2 hours
- **Don't post to all platforms simultaneously** — stagger by 1–2 days
- **Suggested order:** HN first (highest signal), then r/langchain (most targeted), then Twitter (broadest reach)
- Replace [DASHBOARD_URL] and [LANDING_URL] with actual deployed URLs before posting
