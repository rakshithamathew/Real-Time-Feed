from unittest.mock import AsyncMock

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.exc import OperationalError

from app.database import get_session
from app.main import app


@pytest.fixture
def session() -> AsyncMock:
    mock = AsyncMock()
    app.dependency_overrides[get_session] = lambda: mock
    return mock


async def test_health_success(session: AsyncMock) -> None:
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/health")
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok"}
    session.execute.assert_awaited_once()


async def test_health_database_unavailable(session: AsyncMock) -> None:
    session.execute.side_effect = OperationalError("SELECT 1", {}, Exception("offline"))
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/health")
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 503
    assert response.json() == {"detail": "Database unavailable"}
