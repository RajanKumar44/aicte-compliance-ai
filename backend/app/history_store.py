"""Supabase Auth and PostgREST access for institution-scoped validation history.

The backend never uses a Supabase service-role key. It validates each bearer token
with the Auth server and forwards that same user token to PostgREST, where database
grants and row-level security policies are enforced.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any
from uuid import UUID

import httpx
from fastapi import HTTPException


@dataclass(frozen=True)
class SupabaseSettings:
    url: str
    publishable_key: str

    @property
    def anon_key(self) -> str:
        return self.publishable_key

    @classmethod
    def from_environment(cls) -> SupabaseSettings | None:
        url = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
        key = os.getenv("SUPABASE_PUBLISHABLE_KEY", "").strip()
        if not url or not key:
            return None
        if not url.startswith(("https://", "http://localhost", "http://127.0.0.1")):
            raise RuntimeError("SUPABASE_URL must use HTTPS outside local development")
        return cls(url=url, publishable_key=key)


def bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Sign in to access validation history.")
    scheme, separator, token = authorization.partition(" ")
    if not separator or scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(status_code=401, detail="A valid bearer token is required.")
    return token.strip()


def require_settings() -> SupabaseSettings:
    try:
        settings = SupabaseSettings.from_environment()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail="History storage is not configured securely.") from exc
    if settings is None:
        raise HTTPException(status_code=503, detail="History storage is not configured.")
    return settings


def _headers(settings: SupabaseSettings, token: str, prefer: str | None = None) -> dict[str, str]:
    headers = {
        "apikey": settings.publishable_key,
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    return headers


async def verify_user(
    client: httpx.AsyncClient, settings: SupabaseSettings, token: str
) -> UUID:
    try:
        response = await client.get(
            f"{settings.url}/auth/v1/user",
            headers=_headers(settings, token),
        )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail="Authentication service is unavailable.") from exc
    if response.status_code in (401, 403):
        raise HTTPException(status_code=401, detail="Your session is invalid or expired. Sign in again.")
    if response.status_code != 200:
        raise HTTPException(status_code=503, detail="Authentication service could not verify this session.")
    try:
        return UUID(response.json()["id"])
    except (ValueError, KeyError, TypeError) as exc:
        raise HTTPException(status_code=503, detail="Authentication service returned an invalid user.") from exc


async def rest_request(
    client: httpx.AsyncClient,
    settings: SupabaseSettings,
    token: str,
    method: str,
    path: str,
    *,
    params: dict[str, str] | None = None,
    body: dict[str, Any] | None = None,
    prefer: str | None = None,
) -> httpx.Response:
    try:
        response = await client.request(
            method,
            f"{settings.url}/rest/v1/{path}",
            params=params,
            json=body,
            headers=_headers(settings, token, prefer),
        )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail="History storage is unavailable.") from exc
    if response.status_code == 401:
        raise HTTPException(status_code=401, detail="Your session is invalid or expired. Sign in again.")
    if response.status_code >= 500:
        raise HTTPException(status_code=503, detail="History storage could not complete the request.")
    return response


def response_rows(response: httpx.Response) -> list[dict[str, Any]]:
    if response.status_code == 403:
        raise HTTPException(status_code=403, detail="This account is not authorized for that history action.")
    if response.status_code == 404:
        raise HTTPException(status_code=404, detail="The requested history resource was not found.")
    if response.status_code >= 400:
        raise HTTPException(status_code=503, detail="History storage rejected the request.")
    try:
        value = response.json()
    except ValueError as exc:
        raise HTTPException(status_code=503, detail="History storage returned an invalid response.") from exc
    if not isinstance(value, list) or any(not isinstance(row, dict) for row in value):
        raise HTTPException(status_code=503, detail="History storage returned an invalid response.")
    return value
