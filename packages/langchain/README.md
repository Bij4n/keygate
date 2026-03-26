# keygate-langchain

Keygate credential broker integration for LangChain.

## Installation

```bash
pip install keygate-langchain
```

## Quick Start

```python
from keygate_langchain import KeygateCredentialProvider

provider = KeygateCredentialProvider(
    api_key="kg_key_...",
    agent_id="my-agent",
    base_url="http://localhost:3100",
)

# Get a scoped token with auto-revoke
with provider.scoped("conn_github_abc", actions=["read"]) as token:
    response = httpx.get(
        "https://api.github.com/user/repos",
        headers={"Authorization": f"Bearer {token}"},
    )
```

## Wrap Existing Tools

```python
from langchain_core.tools import tool
from keygate_langchain import keygate_wrapped_tool

@tool
def search_repos(query: str, github_token: str = "") -> str:
    """Search GitHub repos."""
    resp = httpx.get(
        f"https://api.github.com/search/repositories?q={query}",
        headers={"Authorization": f"Bearer {github_token}"},
    )
    return resp.text

# Wrap it — Keygate injects a scoped token automatically
secured = keygate_wrapped_tool(
    tool_fn=search_repos,
    credential_provider=provider,
    connection_id="conn_github_abc",
    token_param="github_token",
)
```

## Toolkit (Give Agents Credential Management)

```python
from keygate_langchain import KeygateToolkit

toolkit = KeygateToolkit(provider=provider)
tools = toolkit.get_tools()
# tools: [list_connections, request_credential, revoke_credential]

# Add to your agent
agent = create_react_agent(llm, tools)
```

## License

MIT
