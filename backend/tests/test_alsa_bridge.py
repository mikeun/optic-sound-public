import pytest
from unittest.mock import patch, MagicMock
from backend.alsa_bridge import ALSABridge

@pytest.fixture
def bridge():
    return ALSABridge()

def test_get_volume(bridge):
    mock_output = "[80%]"
    with patch('subprocess.run') as mock_run:
        mock_run.return_value = MagicMock(stdout=mock_output)
        vol = bridge.get_volume("master", "VIRTUAL_MASTER")
        assert vol == 80

def test_set_volume_master(bridge):
    with patch('subprocess.run') as mock_run:
        bridge.set_volume("master", "VIRTUAL_MASTER", 50)
        # Master should trigger AirPlay and Turntable
        mock_run.assert_any_call(["amixer", "-c", "0", "sset", "AirPlay", "50%", "unmute"], capture_output=True, text=True, check=True)
        mock_run.assert_any_call(["amixer", "-c", "0", "sset", "Turntable", "50%", "unmute"], capture_output=True, text=True, check=True)

def test_set_volume_source(bridge):
    with patch('subprocess.run') as mock_run:
        bridge.set_volume("turntable", "Turntable", 60)
        mock_run.assert_called_with(["amixer", "-c", "0", "sset", "Turntable", "60%", "unmute"], capture_output=True, text=True, check=True)

def test_get_mute(bridge):
    with patch('subprocess.run') as mock_run:
        mock_run.return_value = MagicMock(stdout="[off]")
        # Master mute is virtual
        assert bridge.get_mute("master", "VIRTUAL_MASTER") is False
        
        # Source mute is real
        assert bridge.get_mute("turntable", "Turntable") is True

def test_eq_band_mapping(bridge):
    with patch('subprocess.run') as mock_run:
        mock_run.return_value = MagicMock(stdout="[50%]")
        
        # Test get_eq_bands returns new API labels
        bands = bridge.get_eq_bands()
        assert "00. 32 Hz" in bands
        assert "01. 64 Hz" in bands
        assert bands["00. 32 Hz"] == 50
        
        # Test set_eq_band uses physical ALSA names
        bridge.set_eq_band(0, 75)
        # Should map index 0 (32 Hz) to physical "00. 31 Hz"
        mock_run.assert_called_with(["amixer", "-D", "equal", "sset", "00. 31 Hz", "75%"], capture_output=True, text=True, check=True)

def test_set_mute(bridge):
    with patch('subprocess.run') as mock_run:
        mock_run.return_value = MagicMock(stdout="[80%]")
        bridge.set_mute("turntable", "Turntable", True)
        # Capture current volume then sset 0%
        mock_run.assert_any_call(["amixer", "-c", "0", "sset", "Turntable", "0%"], capture_output=True, text=True, check=True)
