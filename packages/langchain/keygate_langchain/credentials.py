"""Credential provider that brokers scoped tokens through Keygate.

Usage with any LangChain tool that needs API credentials:

    from keygate_langchain import KeygateCredentialProvider

    provider = KeygateCredentialProvider(
        api_key="kg_key_...",
        agent_id="my-agent",
    )

    # Get a scoped GitHub token
    creds = provider.get_credentials("conn_github_abc", actions=["read"])
    # creds.token  -> short-lived access token
    # creds.revoke() -> immediately invalidate

    # Or use as a context manager for auto-revoke
    with provider.scoped("conn_github_abc", actions=["read"]) as token:
        response = httpx.get(
            "https://api.github.com/user/repos",
            headers={"Authorization": f"Bearer {token}"},
        )
"""

from __future__ import annotations

from contextlib import contextmanager
from dataclasses import dataclass
from typing import Generator

from keygate_langchain.client import KeygateClient


@dataclass
class ScopedCredential:
    """A scoped, time-limited credential from Keygate."""

    token: str
    token_id: str
    expires_at: str
    connection_id: str
    _client: KeygateClient

    def revoke(self) -> None:
        """Immediately revoke this credential."""
        self._client.revoke_token(self.token_id)

    def __str__(self) -> str:
        return self.token


class KeygateCredentialProvider:
    """Provides scoped, auto-revoking credentials for LangChain tools."""

    def __init__(
        self,
        api_key: str,
        agent_id: str,
        base_url: str = "http://localhost:3100",
        default_ttl: int = 3600,
    ):
        self.client = KeygateClient(
            api_key=api_key,
            agent_id=agent_id,
            base_url=base_url,
        )
        self.default_ttl = default_ttl

    def get_credentials(
        self,
        connection_id: str,
        resource: str = "data",
        actions: list[str] | None = None,
        ttl: int | None = None,
    ) -> ScopedCredential:
        """Get a scoped credential for a connection."""
        scopes = [{"resource": resource, "actions": actions or ["read"]}]
        result = self.client.get_token(
            connection_id=connection_id,
            scopes=scopes,
            ttl=ttl or self.default_ttl,
        )
        return ScopedCredential(
            token=result["access_token"],
            token_id=result["token_id"],
            expires_at=result["expires_at"],
            connection_id=connection_id,
            _client=self.client,
        )

    @contextmanager
    def scoped(
        self,
        connection_id: str,
        resource: str = "data",
        actions: list[str] | None = None,
        ttl: int | None = None,
    ) -> Generator[str, None, None]:
        """Context manager that provides a scoped token and auto-revokes it."""
        creds = self.get_credentials(connection_id, resource, actions, ttl)
        try:
            yield creds.token
        finally:
            try:
                creds.revoke()
            except Exception:
                pass

    def list_connections(self) -> list[dict]:
        """List all available connections."""
        return self.client.list_connections()

    def close(self) -> None:
        self.client.close()
