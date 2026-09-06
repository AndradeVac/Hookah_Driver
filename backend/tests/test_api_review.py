import asyncio

import httpx

from app.main import app


def request(path: str, method: str = "GET", **kwargs):
    async def run():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://testserver",
        ) as client:
            return await client.request(method, path, **kwargs)

    return asyncio.run(run())


def test_openapi_exposes_expected_api_contract():
    schema = app.openapi()
    paths = schema["paths"]

    assert "/auth/login" in paths
    assert "/auth/me" in paths
    assert "/users" in paths
    assert "/orders" in paths
    assert "OAuth2PasswordBearer" in schema["components"]["securitySchemes"]
    assert "application/x-www-form-urlencoded" in paths["/auth/login"]["post"]["requestBody"]["content"]


def test_protected_endpoints_reject_missing_token():
    for path in ("/auth/me", "/users"):
        response = request(path)
        assert response.status_code == 401
        assert response.json()["detail"] == "Not authenticated"


def test_root_health_endpoint():
    response = request("/")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
