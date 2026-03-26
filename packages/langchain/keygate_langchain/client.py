"""Keygate API client for Python."""

from __future__ import annotations

from typing import Any

import httpx


class KeygateError(Exception):
    def __init__(self, code: str, message: str, status: int = 400):
        self.code = code
        self.status = status
        super().__init__(message)


class KeygateClient:
    """Low-level client for the Keygate REST API."""

    def __init__(
        self,
        api_key: str,
        agent_id: str,
        base_url: str = "http://localhost:3100",
        timeout: float = 30.0,
    ):
        self.agent_id = agent_id
        self._http = httpx.Client(
            base_url=base_url,
            headers={
                "Authorization": f"ApiKey {api_key}",
                "Content-Type": "application/json",
                "X-Agent-Id": agent_id,
            },
            timeout=timeout,
        )

    def _request(self, method: str, path: str, **kwargs: Any) -> dict:
        resp = self._http.request(method, path, **kwargs)
        if resp.status_code == 401:
            raise KeygateError("AUTH_FAILED", "Authentication failed", 401)
        data = resp.json()
        if not resp.is_success:
            raise KeygateError(
                data.get("error", "REQUEST_FAILED"),
                data.get("message", f"HTTP {resp.status_code}"),
                resp.status_code,
            )
        return data

    def list_connections(self) -> list[dict]:
        data = self._request("GET", "/api/connections")
        return data.get("connections", [])

    def get_connection(self, connection_id: str) -> dict:
        return self._request("GET", f"/api/connections/{connection_id}")

    def request_token(
        self,
        connection_id: str,
        scopes: list[dict],
        ttl: int = 3600,
        max_usage: int | None = None,
    ) -> dict:
        body = {
            "connectionId": connection_id,
            "agentId": self.agent_id,
            "scopes": scopes,
            "ttl": ttl,
        }
        if max_usage is not None:
            body["maxUsage"] = max_usage
        return self._request("POST", "/api/tokens/issue", json=body)

    def resolve_token(self, reference: str) -> dict:
        return self._request("POST", "/api/tokens/resolve", json={"reference": reference})

    def get_token(
        self,
        connection_id: str,
        scopes: list[dict],
        ttl: int = 3600,
    ) -> dict:
        """Request and immediately resolve a token. Returns access_token + token_id."""
        handle = self.request_token(connection_id, scopes, ttl)
        resolved = self.resolve_token(handle["reference"])
        return {
            "access_token": resolved["accessToken"],
            "token_id": handle["tokenId"],
            "expires_at": handle["expiresAt"],
        }

    def revoke_token(self, token_id: str) -> None:
        self._request("DELETE", f"/api/tokens/{token_id}")

    def list_providers(self) -> list[dict]:
        data = self._request("GET", "/api/providers")
        return data.get("providers", [])

    def close(self) -> None:
        self._http.close()

    def __enter__(self) -> "KeygateClient":
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()
