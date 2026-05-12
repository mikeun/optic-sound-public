import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from './App';
import { api } from './services/api';

vi.mock('./services/api', () => ({
  api: {
    login: vi.fn(),
    getState: vi.fn(),
    setVolume: vi.fn(),
    setMute: vi.fn(),
    setEQ: vi.fn(),
    restartSystem: vi.fn(),
  },
}));

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login and unlocks', async () => {
    vi.mocked(api.login).mockResolvedValue({ status: 'success' });
    vi.mocked(api.getState).mockResolvedValue({
      master_volume: 50,
      master_muted: false,
      turntable_gain: 70,
      turntable_muted: false,
      equalizer: {},
      services: { turntable_loop: 'active' },
    });

    render(<App />);
    fireEvent.click(screen.getByText('1'));
    fireEvent.click(screen.getByText('2'));
    fireEvent.click(screen.getByText('3'));
    fireEvent.click(screen.getByText('4'));
    fireEvent.click(screen.getByText('Open'));

    await waitFor(() => {
      expect(screen.getByText('Mixer')).toBeInTheDocument();
    });
  });

  it('handles mute click', async () => {
    vi.mocked(api.login).mockResolvedValue({ status: 'success' });
    vi.mocked(api.getState).mockResolvedValue({
      master_volume: 50,
      master_muted: false,
      turntable_gain: 70,
      turntable_muted: false,
      equalizer: {},
      services: { turntable_loop: 'active' },
    });

    render(<App />);
    fireEvent.click(screen.getByText('1'));
    fireEvent.click(screen.getByText('Open'));

    await waitFor(() => screen.getByText('Mute System'));
    
    fireEvent.click(screen.getByText('Mute System'));
    expect(api.setMute).toHaveBeenCalledWith('master', true);
  });

  it('switches to EQ screen', async () => {
    vi.mocked(api.login).mockResolvedValue({ status: 'success' });
    vi.mocked(api.getState).mockResolvedValue({
      master_volume: 50,
      master_muted: false,
      turntable_gain: 70,
      turntable_muted: false,
      equalizer: { '00. 32 Hz': 50 },
      services: { turntable_loop: 'active' },
    });

    render(<App />);
    fireEvent.click(screen.getByText('1'));
    fireEvent.click(screen.getByText('Open'));

    await waitFor(() => screen.getByText('EQ'));
    fireEvent.click(screen.getByText('EQ'));

    expect(screen.getByText('Precision EQ')).toBeInTheDocument();
  });

  it('switches to Diag screen and restarts', async () => {
    vi.mocked(api.login).mockResolvedValue({ status: 'success' });
    vi.mocked(api.getState).mockResolvedValue({
      master_volume: 50,
      master_muted: false,
      turntable_gain: 70,
      turntable_muted: false,
      equalizer: {},
      services: { turntable_loop: 'active', airplay: 'active' },
    });

    render(<App />);
    fireEvent.click(screen.getByText('1'));
    fireEvent.click(screen.getByText('Open'));

    await waitFor(() => screen.getByText('Diag'));
    fireEvent.click(screen.getByText('Diag'));

    expect(screen.getByText('System Services')).toBeInTheDocument();
    expect(screen.getByText('turntable loop')).toBeInTheDocument();

    // Mock confirm
    window.confirm = vi.fn().mockReturnValue(true);
    // Mock alert
    window.alert = vi.fn();

    fireEvent.click(screen.getByText('Restart Audio Engine'));
    expect(api.restartSystem).toHaveBeenCalled();
  });
});
