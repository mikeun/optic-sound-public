const API_BASE = '/api';

export const api = {
  async login(pin: string) {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    if (!res.ok) throw new Error('Invalid PIN');
    return res.json();
  },

  async getState() {
    const res = await fetch(`${API_BASE}/state`);
    if (res.status === 401) throw new Error('Unauthorized');
    return res.json();
  },

  async setVolume(type: 'master' | 'turntable' | 'airplay', value: number) {
    return fetch(`${API_BASE}/volume/${type}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    });
  },

  async setMute(type: 'master' | 'turntable' | 'airplay', mute: boolean) {
    return fetch(`${API_BASE}/mute/${type}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mute }),
    });
  },

  async setEQ(band_index: number, value: number) {
    return fetch(`${API_BASE}/eq`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ band_index, value }),
    });
  },

  async restartSystem() {
    return fetch(`${API_BASE}/system/restart`, { method: 'POST' });
  }
};
