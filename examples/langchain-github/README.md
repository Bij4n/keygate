# Example: Secure GitHub Agent with Keygate + LangChain

A simple agent that searches GitHub repositories using scoped, auto-revoking credentials brokered through Keygate.

## What this demonstrates

Without Keygate, you'd give the agent your full GitHub personal access token — broad permissions, never expires, visible in the agent's context. If any tool in the chain is compromised, the attacker gets full access to your repos.

With Keygate, the agent gets a scoped, read-only token that expires in 1 hour and is automatically revoked after use. Every access is logged. If the agent behaves suspiciously, Keygate flags it.

## Prerequisites

- Python 3.10+
- A running Keygate instance (`npm run demo` in the root project)
- A Keygate API key

## Setup

```bash
# 1. Start Keygate (from the root project)
cd /path/to/keygate
npm run demo

# 2. Register and get an API key
curl -X POST http://localhost:3100/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"dev@example.com","password":"your-password"}'

# Save the token, then create an API key:
curl -X POST http://localhost:3100/api/auth/api-keys \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"name":"langchain-example"}'

# 3. Create a GitHub connection
curl -X POST http://localhost:3100/api/connections \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"provider":"github","scopes":["repo:read","read:user"]}'

# Note the connection ID from the response

# 4. Install Python dependencies
cd examples/langchain-github
pip install -r requirements.txt

# 5. Set environment variables
export KEYGATE_API_KEY="kg_key_..."
export KEYGATE_CONNECTION_ID="conn_..."
export OPENAI_API_KEY="sk-..."  # or use any LLM
```

## Run

```bash
python agent.py "Find popular Python repositories for web scraping"
```

## What happens

1. The agent receives your query
2. It calls `request_credential` through Keygate to get a scoped GitHub token
3. Keygate issues a read-only token that expires in 1 hour
4. The agent uses the token to search GitHub
5. The token is automatically revoked after use
6. Every step is logged in Keygate's audit trail

## Files

- `agent.py` — The LangChain agent with Keygate credential management
- `requirements.txt` — Python dependencies
