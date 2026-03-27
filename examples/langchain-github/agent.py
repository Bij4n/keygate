"""
Secure GitHub search agent using Keygate + LangChain.

This agent searches GitHub repositories using scoped, auto-revoking
credentials brokered through Keygate — instead of a raw personal
access token.

Usage:
    python agent.py "Find popular Python web scraping libraries"
"""

import os
import sys
import httpx
from langchain_core.tools import tool
from langchain_core.messages import HumanMessage

# In a real project, you'd import from the installed package:
# from keygate_langchain import KeygateCredentialProvider, keygate_wrapped_tool
#
# For this example, we'll use the SDK directly since the package
# may not be installed yet.

KEYGATE_API_KEY = os.environ.get("KEYGATE_API_KEY", "")
KEYGATE_URL = os.environ.get("KEYGATE_URL", "http://localhost:3100")
CONNECTION_ID = os.environ.get("KEYGATE_CONNECTION_ID", "")


class SimpleKeygateClient:
    """Minimal Keygate client for the example."""

    def __init__(self, api_key: str, base_url: str = "http://localhost:3100"):
        self.client = httpx.Client(
            base_url=base_url,
            headers={
                "Authorization": f"ApiKey {api_key}",
                "Content-Type": "application/json",
            },
        )

    def get_token(self, connection_id: str, scopes: list[dict], ttl: int = 3600):
        # Issue a scoped token
        resp = self.client.post("/api/tokens/issue", json={
            "connectionId": connection_id,
            "agentId": "langchain-github-agent",
            "scopes": scopes,
            "ttl": ttl,
        })
        resp.raise_for_status()
        handle = resp.json()

        # Resolve to get the actual access token
        resp = self.client.post("/api/tokens/resolve", json={
            "reference": handle["reference"],
        })
        resp.raise_for_status()
        resolved = resp.json()

        return {
            "access_token": resolved["accessToken"],
            "token_id": handle["tokenId"],
            "expires_at": handle["expiresAt"],
        }

    def revoke_token(self, token_id: str):
        self.client.delete(f"/api/tokens/{token_id}")


# Initialize Keygate client
kg = SimpleKeygateClient(KEYGATE_API_KEY, KEYGATE_URL)


@tool
def search_github_repos(query: str) -> str:
    """Search GitHub repositories. Returns top 5 results with name, description, stars, and URL."""

    if not CONNECTION_ID:
        return "Error: KEYGATE_CONNECTION_ID not set. Create a GitHub connection first."

    # Request a scoped, read-only credential from Keygate
    print(f"  [Keygate] Requesting scoped GitHub token...")
    creds = kg.get_token(
        connection_id=CONNECTION_ID,
        scopes=[{"resource": "repos", "actions": ["read"]}],
        ttl=300,  # 5 minutes — just enough for this search
    )
    print(f"  [Keygate] Token issued: {creds['token_id'][:20]}... (expires: {creds['expires_at']})")

    try:
        # Use the scoped token to search GitHub
        resp = httpx.get(
            "https://api.github.com/search/repositories",
            params={"q": query, "sort": "stars", "per_page": 5},
            headers={
                "Authorization": f"Bearer {creds['access_token']}",
                "Accept": "application/vnd.github+json",
            },
        )

        if resp.status_code == 401:
            return "GitHub API returned 401. The demo server issues placeholder tokens — in production, connect a real GitHub OAuth token through Keygate."

        if not resp.is_success:
            return f"GitHub API error: {resp.status_code}"

        data = resp.json()
        results = []
        for repo in data.get("items", [])[:5]:
            results.append(
                f"- **{repo['full_name']}** ({repo['stargazers_count']} stars)\n"
                f"  {repo['description'] or 'No description'}\n"
                f"  {repo['html_url']}"
            )

        return f"Found {data.get('total_count', 0)} repositories:\n\n" + "\n\n".join(results)

    finally:
        # Always revoke the token after use
        print(f"  [Keygate] Revoking token {creds['token_id'][:20]}...")
        kg.revoke_token(creds["token_id"])
        print(f"  [Keygate] Token revoked. Access removed.")


def main():
    query = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "AI agent frameworks"

    print(f"\nSearching GitHub for: {query}\n")
    print("=" * 60)

    # In a full LangChain setup, you'd use this with an LLM:
    #
    #   from langchain_openai import ChatOpenAI
    #   from langchain.agents import create_react_agent
    #
    #   llm = ChatOpenAI(model="gpt-4")
    #   agent = create_react_agent(llm, [search_github_repos])
    #   result = agent.invoke({"messages": [HumanMessage(content=query)]})
    #
    # For this example, we call the tool directly to demonstrate
    # the Keygate credential flow:

    result = search_github_repos.invoke(query)
    print(f"\n{result}")
    print("\n" + "=" * 60)
    print("\nCheck the Keygate audit log to see the credential usage:")
    print(f"  {KEYGATE_URL}/preview.html (Audit Log page)")


if __name__ == "__main__":
    main()
