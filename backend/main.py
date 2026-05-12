from fastapi import FastAPI, Depends, HTTPException, Response, Cookie
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Dict, Optional
import os
from dotenv import load_dotenv

from .alsa_bridge import ALSABridge

load_dotenv()

app = FastAPI(title="Optic Sound Control API")
bridge = ALSABridge()

# CORS configuration for local network access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to your local network IPs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Models ---
class LoginRequest(BaseModel):
    pin: str

class VolumeUpdate(BaseModel):
    value: int

class MuteUpdate(BaseModel):
    mute: bool

class EQUpdate(BaseModel):
    band_index: int
    value: int

# --- Auth Dependency ---
async def get_current_user(session: Optional[str] = Cookie(None)):
    if not session or session != "authenticated":
        raise HTTPException(status_code=401, detail="Unauthorized")
    return session

# --- Routes ---

@app.post("/api/login")
async def login(request: LoginRequest, response: Response):
    if request.pin == os.getenv("ACCESS_PIN", "1234"):
        response.set_cookie(
            key="session", 
            value="authenticated", 
            httponly=True, 
            samesite="strict"
        )
        return {"status": "success"}
    raise HTTPException(status_code=401, detail="Invalid PIN")

@app.get("/api/state", dependencies=[Depends(get_current_user)])
async def get_state():
    return bridge.get_system_state()

@app.post("/api/volume/master", dependencies=[Depends(get_current_user)])
async def set_master_volume(update: VolumeUpdate):
    bridge.set_volume("master", bridge.CONTROLS["master"], update.value)
    return {"status": "updated"}

@app.post("/api/mute/master", dependencies=[Depends(get_current_user)])
async def set_master_mute(update: MuteUpdate):
    bridge.set_mute("master", bridge.CONTROLS["master"], update.mute)
    return {"status": "updated"}

@app.post("/api/volume/turntable", dependencies=[Depends(get_current_user)])
async def set_tt_volume(update: VolumeUpdate):
    bridge.set_volume("turntable", bridge.CONTROLS["turntable"], update.value)
    return {"status": "updated"}

@app.post("/api/mute/turntable", dependencies=[Depends(get_current_user)])
async def set_tt_mute(update: MuteUpdate):
    bridge.set_mute("turntable", bridge.CONTROLS["turntable"], update.mute)
    return {"status": "updated"}

@app.post("/api/volume/airplay", dependencies=[Depends(get_current_user)])
async def set_ap_volume(update: VolumeUpdate):
    bridge.set_volume("airplay", bridge.CONTROLS["airplay"], update.value)
    return {"status": "updated"}

@app.post("/api/mute/airplay", dependencies=[Depends(get_current_user)])
async def set_ap_mute(update: MuteUpdate):
    bridge.set_mute("airplay", bridge.CONTROLS["airplay"], update.mute)
    return {"status": "updated"}

@app.post("/api/eq", dependencies=[Depends(get_current_user)])
async def set_eq(update: EQUpdate):
    bridge.set_eq_band(update.band_index, update.value)
    return {"status": "updated"}

@app.post("/api/system/restart", dependencies=[Depends(get_current_user)])
async def restart_system():
    if bridge.restart_audio_engine():
        return {"status": "restarting"}
    raise HTTPException(status_code=500, detail="Failed to restart services")

# --- Static File Serving ---
if os.path.exists("static"):
    app.mount("/", StaticFiles(directory="static", html=True), name="static")
