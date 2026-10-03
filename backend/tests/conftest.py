import httpx
import pytest

from app.core.rate_limit import login_rate_limit, public_lookup_rate_limit, public_order_rate_limit


@pytest.fixture(autouse=True)
def block_external_http(monkeypatch):
    """Unit tests must never reach real services (e.g. Mercado Pago)."""

    def refuse(*args, **kwargs):
        raise AssertionError("Chamada HTTP externa em teste; use monkeypatch.")

    monkeypatch.setattr(httpx, "request", refuse)


@pytest.fixture(autouse=True)
def reset_rate_limits():
    for limiter in (login_rate_limit, public_order_rate_limit, public_lookup_rate_limit):
        limiter.reset()
    yield
