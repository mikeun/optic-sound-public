import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from backend.main import app
import os
from unittest.mock import patch

@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

@pytest.mark.asyncio
async def test_login_success(client):
    os.environ["ACCESS_PIN"] = "1234"
    response = await client.post("/api/login", json={"pin": "1234"})
    assert response.status_code == 200
    assert response.json() == {"status": "success"}
    assert "session" in response.cookies

@pytest.mark.asyncio
async def test_login_failure(client):
    response = await client.post("/api/login", json={"pin": "wrong"})
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_get_state_authorized(client):
    await client.post("/api/login", json={"pin": "1234"})
    response = await client.get("/api/state")
    assert response.status_code == 200
    data = response.json()
    assert "master_muted" in data
    assert "turntable_muted" in data
    assert "version" in data
    assert data["version"] == "3.3.1-stable"

@pytest.mark.asyncio
async def test_get_state_unauthorized(client):
    response = await client.get("/api/state")
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_set_mute(client):
    await client.post("/api/login", json={"pin": "1234"})
    response = await client.post("/api/mute/master", json={"mute": True})
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_airplay_volume(client):
    await client.post("/api/login", json={"pin": "1234"})
    response = await client.post("/api/volume/airplay", json={"value": 85})
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_airplay_mute(client):
    await client.post("/api/login", json={"pin": "1234"})
    response = await client.post("/api/mute/airplay", json={"mute": True})
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_turntable_volume(client):
    await client.post("/api/login", json={"pin": "1234"})
    response = await client.post("/api/volume/turntable", json={"value": 45})
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_turntable_mute(client):
    await client.post("/api/login", json={"pin": "1234"})
    response = await client.post("/api/mute/turntable", json={"mute": True})
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_eq_endpoint(client):
    await client.post("/api/login", json={"pin": "1234"})
    response = await client.post("/api/eq", json={"band_index": 0, "value": 75})
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_restart_system_authorized(client):
    await client.post("/api/login", json={"pin": "1234"})
    with patch('backend.alsa_bridge.ALSABridge.restart_audio_engine', return_value=True):
        response = await client.post("/api/system/restart")
        assert response.status_code == 200
        assert response.json() == {"status": "restarting"}
