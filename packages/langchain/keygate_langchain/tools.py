"""LangChain tool wrappers that automatically broker credentials through Keygate.

Usage:

    from langchain_core.tools import tool
    from keygate_langchain import KeygateToolkit, keygate_wrapped_tool

    # Option 1: Wrap an existing tool with Keygate credential injection
    @tool
    def search_repos(query: str, github_token: str) -> str:
        '''Search GitHub repositories.'''
        headers = {"Authorization": f"Bearer {github_token}"}
        resp = httpx.get(f"https://api.github.com/search/repositories?q={query}", headers=headers)
        return resp.text

    secured_tool = keygate_wrapped_tool(
        tool=search_repos,
        credential_provider=provider,
        connection_id="conn_github_abc",
        token_param="github_token",
    )

    # Option 2: Use the toolkit to get pre-built credential management tools
    toolkit = KeygateToolkit(provider=provider)
    tools = toolkit.get_tools()
    # Returns tools: list_connections, request_credential, revoke_credential
"""

from __future__ import annotations

import functools
from typing import Any, Callable

from langchain_core.tools import BaseTool, tool

from keygate_langchain.credentials import KeygateCredentialProvider


def keygate_wrapped_tool(
    tool_fn: Callable,
    credential_provider: KeygateCredentialProvider,
    connection_id: str,
    token_param: str = "api_token",
    resource: str = "data",
    actions: list[str] | None = None,
    ttl: int | None = None,
) -> Callable:
    """Wrap a LangChain tool to auto-inject Keygate credentials.

    The wrapped tool will:
    1. Request a scoped token from Keygate before each invocation
    2. Inject the token as the specified parameter
    3. Revoke the token after the call completes
    """

    @functools.wraps(tool_fn)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        with credential_provider.scoped(
            connection_id, resource, actions, ttl
        ) as token:
            kwargs[token_param] = token
            return tool_fn(*args, **kwargs)

    # Preserve tool metadata
    wrapper.__name__ = tool_fn.__name__
    if hasattr(tool_fn, "description"):
        wrapper.__doc__ = tool_fn.__doc__

    return wrapper


class KeygateToolkit:
    """Provides LangChain tools for managing Keygate credentials.

    Use this to give your agent the ability to list connections,
    request credentials, and revoke them — all through Keygate's
    scoped token system.
    """

    def __init__(self, provider: KeygateCredentialProvider):
        self.provider = provider

    def get_tools(self) -> list[BaseTool]:
        provider = self.provider

        @tool
        def list_connections() -> str:
            """List all available service connections in Keygate. Returns connection IDs, providers, and scopes."""
            connections = provider.list_connections()
            if not connections:
                return "No connections available."
            lines = []
            for c in connections:
                scopes = ", ".join(c.get("scopes", []))
                lines.append(
                    f"- {c['id']}: {c['provider']} ({c['status']}) — scopes: {scopes}"
                )
            return "\n".join(lines)

        @tool
        def request_credential(
            connection_id: str,
            resource: str = "data",
            actions: str = "read",
        ) -> str:
            """Request a scoped, time-limited credential from Keygate.

            Args:
                connection_id: The connection ID to request access for
                resource: The resource to access (e.g., 'repos', 'messages')
                actions: Comma-separated actions (read, write, delete, admin)

            Returns:
                The scoped access token. This token expires automatically.
            """
            action_list = [a.strip() for a in actions.split(",")]
            creds = provider.get_credentials(
                connection_id=connection_id,
                resource=resource,
                actions=action_list,
            )
            return (
                f"Token issued (ID: {creds.token_id}, expires: {creds.expires_at}). "
                f"Access token: {creds.token}"
            )

        @tool
        def revoke_credential(token_id: str) -> str:
            """Revoke a previously issued credential.

            Args:
                token_id: The token ID to revoke (from request_credential)
            """
            provider.client.revoke_token(token_id)
            return f"Token {token_id} has been revoked."

        return [list_connections, request_credential, revoke_credential]
