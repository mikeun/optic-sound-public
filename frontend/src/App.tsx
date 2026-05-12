import { useState, useEffect, useRef } from 'react';
import { api } from './services/api';

type Screen = 'AUTH' | 'MIXER' | 'EQ' | 'HEALTH';

// --- Reusable Slider Component: Pure UI with High-Speed Local Dragging ---
function VerticalSlider({ value, onChange, onInteraction, label, accentColor = "gold", muted = false, onMute, height = 288, slim = false }: any) {
  const [dragValue, setDragValue] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const displayValue = dragValue !== null ? dragValue : value;

  const triggerHaptic = () => {
    if (window.navigator.vibrate) window.navigator.vibrate(5);
  };

  const handleUpdate = (clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relativeY = clientY - rect.top;
    const percentage = 100 - Math.max(0, Math.min(100, (relativeY / rect.height) * 100));
    const val = Math.round(percentage);
    
    if (val !== dragValue) {
      setDragValue(val);
      triggerHaptic();
      onChange(val);
    }
  };

  return (
    <div className={`flex flex-col items-center select-none touch-none ${slim ? 'px-0' : ''}`}>
      <div 
        ref={containerRef}
        onTouchStart={(e) => {
          isDragging.current = true;
          if (onInteraction) onInteraction();
          handleUpdate(e.touches[0].clientY);
        }}
        onTouchMove={(e) => {
          if (isDragging.current) {
            if (e.cancelable) e.preventDefault();
            handleUpdate(e.touches[0].clientY);
          }
        }}
        onTouchEnd={() => {
          isDragging.current = false;
          setDragValue(null);
        }}
        onMouseDown={(e) => {
          isDragging.current = true;
          if (onInteraction) onInteraction();
          handleUpdate(e.clientY);
          const move = (me: MouseEvent) => isDragging.current && handleUpdate(me.clientY);
          const up = () => {
            isDragging.current = false;
            setDragValue(null);
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', up);
          };
          window.addEventListener('mousemove', move);
          window.addEventListener('mouseup', up);
        }}
        className={`flex items-center justify-center cursor-pointer ${slim ? 'p-4 -m-4' : 'p-8 -m-8'}`}
      >
        <div 
          className={`relative bg-black/5 dark:bg-black/40 rounded-[2rem] border border-black/10 dark:border-white/10 flex flex-col items-center justify-between transition-opacity ${muted ? 'opacity-30' : 'opacity-100'} ${slim ? 'w-8 p-1' : 'w-20 p-4'}`}
          style={{ height: `${height}px` }}
        >
          {/* Guide Line at 66% (Flat / 0dB) */}
          <div className={`absolute left-0 right-0 border-t ${accentColor === 'gold' ? 'border-gold/80 dark:border-gold/50' : 'border-blue-600 dark:border-blue-500/50'} z-0 pointer-events-none`} style={{ bottom: '66%' }} />
          
          <div className="w-1.5 h-full bg-black/10 dark:bg-white/5 rounded-full overflow-hidden relative pointer-events-none">
             <div className={`absolute bottom-0 w-full transition-all duration-75 ${accentColor === 'gold' ? 'bg-gold shadow-[0_0_20px_rgba(255,215,0,0.5)]' : 'bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)]'}`} style={{ height: `${displayValue}%` }} />
          </div>
          <div className={`absolute bg-white dark:bg-[#333] border border-black/20 dark:border-white/20 rounded-lg shadow-2xl flex items-center justify-center pointer-events-none z-20 ${slim ? 'w-6 h-8' : 'w-14 h-12'}`} style={{ bottom: `calc(${displayValue}% - ${slim ? '16px' : '24px'})`, transition: isDragging.current ? 'none' : 'bottom 0.1s ease-out' }}>
             <div className={`h-0.5 rounded-full ${slim ? 'w-4' : 'w-10'} ${accentColor === 'gold' ? 'bg-gold' : 'bg-blue-500'}`} />
          </div>
        </div>
      </div>
      
      <label className={`${slim ? 'text-[7px]' : 'text-[10px]'} font-black tracking-widest uppercase opacity-40 mt-6 mb-4 text-black dark:text-white`}>{label}</label>
      
      {!slim && (
        <button 
          onClick={(e) => { e.stopPropagation(); triggerHaptic(); onMute(); }}
          className={`w-16 h-16 rounded-2xl border transition-all flex flex-col items-center justify-center active:scale-90 ${muted ? 'bg-red-500 border-red-500 text-white shadow-lg' : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-black/30 dark:text-white/30 hover:bg-black/10 dark:hover:bg-white/10'}`}
        >
          <div className={`w-2 h-2 rounded-full mb-1 ${muted ? 'bg-white' : 'bg-black/20 dark:bg-white/20'}`} />
          <span className="text-[8px] font-black uppercase tracking-tighter">{muted ? 'Muted' : 'Mute'}</span>
        </button>
      )}
    </div>
  );
}

function App() {
  const [screen, setScreen] = useState<Screen>('AUTH');
  const [pin, setPin] = useState('');
  const [state, setState] = useState<any>(null);
  const [isRestarting, setIsRestarting] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('optic-theme') as 'light' | 'dark') || 'dark';
  });
  
  // Absolute source of truth for user interactions (Persists for 15s)
  const manualOverrides = useRef<Record<string, { val: any, time: number }>>({});
  const throttleTimers = useRef<Record<string, any>>({});

  const triggerHaptic = (ms = 10) => {
    if (window.navigator.vibrate) window.navigator.vibrate(ms);
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('optic-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    triggerHaptic(15);
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const lockControl = (key: string) => {
    // Only update timestamp to extend the lock
    if (manualOverrides.current[key]) {
      manualOverrides.current[key].time = Date.now();
    }
  };

  const applyOverride = (key: string, val: any) => {
    manualOverrides.current[key] = { val, time: Date.now() };
    setState((prev: any) => {
      if (!prev) return prev;
      const merged = { ...prev };
      if (key.startsWith('eq_')) {
        const bandName = key.replace('eq_', '');
        if (merged.equalizer) {
          merged.equalizer = { ...merged.equalizer, [bandName]: val };
        }
      } else {
        merged[key] = val;
      }
      return merged;
    });
  };

  const fetchState = async () => {
    try {
      const data = await api.getState();
      const now = Date.now();
      const OVERRIDE_WINDOW = 15000;
      
      setState((prev: any) => {
        if (!prev) return data;
        const merged = { ...data };
        
        Object.keys(manualOverrides.current).forEach(key => {
          const override = manualOverrides.current[key];
          if (now - override.time < OVERRIDE_WINDOW) {
            if (key.startsWith('eq_')) {
              const bandName = key.replace('eq_', '');
              if (merged.equalizer) {
                // Ensure we don't modify the data object directly to be safe, 
                // though it's fresh from API.
                merged.equalizer = { ...merged.equalizer, [bandName]: override.val };
              }
            } else {
              merged[key] = override.val;
            }
          }
        });
        
        return { ...prev, ...merged };
      });
    } catch (e) {
      setScreen('AUTH');
    }
  };

  useEffect(() => {
    if (screen !== 'AUTH') {
      if (!state) fetchState();
      const interval = setInterval(fetchState, 5000);
      return () => clearInterval(interval);
    }
  }, [screen]);

  const handleMute = async (type: 'master' | 'turntable' | 'airplay', currentMute: boolean) => {
    triggerHaptic(15);
    const targetMute = !currentMute;
    const key = `${type}_muted`;
    applyOverride(key, targetMute);

    try {
      await api.setMute(type, targetMute);
    } catch (e) {
      setTimeout(fetchState, 500);
    }
  };

  const throttledApiCall = (key: string, fn: () => Promise<any>) => {
    if (throttleTimers.current[key]) clearTimeout(throttleTimers.current[key]);
    throttleTimers.current[key] = setTimeout(fn, 80);
  };

  const handleVolume = (type: 'turntable' | 'airplay', val: number) => {
    const key = `${type}_gain`;
    applyOverride(key, val);
    throttledApiCall(key, () => api.setVolume(type, val));
  };

  const handleEQ = (bandIdx: number, val: number) => {
    if (!state?.equalizer) return;
    const bands = Object.keys(state.equalizer);
    const band = bands[bandIdx];
    const key = `eq_${band}`;
    applyOverride(key, val);
    throttledApiCall(key, () => api.setEQ(bandIdx, val));
  };

  const handleLogin = async () => {
    triggerHaptic(20);
    try {
      await api.login(pin);
      const data = await api.getState();
      setState(data);
      setScreen('MIXER');
    } catch (e) {
      alert('Invalid PIN');
      setPin('');
    }
  };

  const addDigit = (d: string) => {
    triggerHaptic(5);
    if (pin.length < 4) setPin(pin + d);
  };

  const resetEQ = async () => {
    if (!state?.equalizer) return;
    const bands = Object.keys(state.equalizer);
    for (let i = 0; i < bands.length; i++) {
      const band = bands[i];
      applyOverride(`eq_${band}`, 66);
      await api.setEQ(i, 66);
    }
    fetchState();
  };

  const handleRestart = async () => {
    if (confirm('Restart core audio services? Audio will drop for 5-10 seconds.')) {
      setIsRestarting(true);
      try {
        await api.restartSystem();
        alert('Restarting...');
      } catch (e) {
        alert('Failed to restart');
      } finally {
        setIsRestarting(false);
      }
    }
  };

  if (screen === 'AUTH') {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#f5f5f5] dark:bg-[#0a0a0a] text-black dark:text-white font-sans overflow-hidden touch-none transition-colors duration-500">
        <div className="w-full max-w-xs p-8 bg-white dark:bg-[#1a1a1a] rounded-[2.5rem] border border-black/5 dark:border-white/10 shadow-2xl">
          <div className="text-center mb-10">
            <h1 className="text-xs font-black tracking-[0.5em] text-gold uppercase opacity-50 mb-2">Optic Sound</h1>
            <h2 className="text-3xl font-light tracking-tighter text-black dark:text-white">The Vault</h2>
          </div>
          <div className="flex justify-center space-x-5 mb-14">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 ${pin.length > i ? 'bg-gold border-gold scale-125 shadow-[0_0_15px_rgba(255,215,0,0.6)]' : 'border-black/10 dark:border-white/10'}`} />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <button key={n} onClick={() => addDigit(n.toString())} className="w-full aspect-square rounded-full bg-black/5 dark:bg-white/5 active:bg-gold active:text-black text-2xl font-light transition-all flex items-center justify-center border border-black/5 dark:border-white/5 select-none touch-manipulation">
                {n}
              </button>
            ))}
            <button onClick={() => setPin('')} className="w-full aspect-square rounded-full text-[10px] font-black text-red-500/60 active:bg-red-500/20 transition-all uppercase tracking-widest select-none">CLR</button>
            <button onClick={() => addDigit('0')} className="w-full aspect-square rounded-full bg-black/5 dark:bg-white/5 active:bg-gold active:text-black text-2xl font-light transition-all flex items-center justify-center border border-black/5 dark:border-white/5 select-none">0</button>
            <button onClick={handleLogin} className="w-full aspect-square rounded-full bg-gold text-black text-[10px] font-black active:scale-95 transition-all uppercase tracking-widest shadow-[0_0_20px_rgba(255,215,0,0.3)] select-none">Open</button>
          </div>
          
          <div className="mt-8 flex justify-center">
             <button onClick={toggleTheme} className="p-3 bg-black/5 dark:bg-white/5 rounded-full border border-black/5 dark:border-white/5 transition-all">
                {theme === 'dark' ? '☀️' : '🌙'}
             </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#f5f5f5] dark:bg-[#0a0a0a] text-black dark:text-white flex flex-col font-sans overflow-hidden select-none touch-none transition-colors duration-500">
      <header className="px-6 py-5 flex justify-between items-center bg-white/80 dark:bg-[#121212]/80 backdrop-blur-xl border-b border-black/5 dark:border-white/5 z-50">
        <div className="flex items-center space-x-3">
          <div className={`w-2 h-2 rounded-full ${state?.services?.turntable_loop === 'active' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500 animate-pulse'}`} />
          <span className="text-[9px] font-black tracking-[0.2em] uppercase opacity-40">Node Status</span>
        </div>
        <nav className="flex p-1 bg-black/5 dark:bg-black/40 rounded-2xl border border-black/5 dark:border-white/5">
          <button onClick={() => { triggerHaptic(5); setScreen('MIXER'); }} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${screen === 'MIXER' ? 'bg-gold text-black shadow-lg shadow-gold/20' : 'text-black/30 dark:text-white/30'}`}>Mixer</button>
          <button onClick={() => { triggerHaptic(5); setScreen('EQ'); }} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${screen === 'EQ' ? 'bg-gold text-black shadow-lg shadow-gold/20' : 'text-black/30 dark:text-white/30'}`}>EQ</button>
          <button onClick={() => { triggerHaptic(5); setScreen('HEALTH'); }} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${screen === 'HEALTH' ? 'bg-gold text-black shadow-lg shadow-gold/20' : 'text-black/30 dark:text-white/30'}`}>Diag</button>
        </nav>
        <button onClick={toggleTheme} className="p-2 bg-black/5 dark:bg-white/5 rounded-full border border-black/5 dark:border-white/5 transition-all active:scale-90">
           {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </header>

      <main className="flex-1 p-6 flex flex-col justify-center max-w-5xl mx-auto w-full overflow-y-auto">
        {screen === 'MIXER' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="bg-white dark:bg-[#141414] p-12 rounded-[3.5rem] border border-black/5 dark:border-white/5 shadow-2xl flex justify-around items-end h-[520px] transition-colors duration-500">
              <VerticalSlider 
                label="Turntable" 
                value={state?.turntable_gain || 0} 
                muted={state?.turntable_muted}
                accentColor="gold"
                onChange={(val: number) => handleVolume('turntable', val)}
                onInteraction={() => lockControl('turntable_gain')}
                onMute={() => handleMute('turntable', !!state?.turntable_muted)}
              />
              <VerticalSlider 
                label="AirPlay" 
                value={state?.airplay_gain || 0} 
                muted={state?.airplay_muted}
                accentColor="blue"
                onChange={(val: number) => handleVolume('airplay', val)}
                onInteraction={() => lockControl('airplay_gain')}
                onMute={() => handleMute('airplay', !!state?.airplay_muted)}
              />
            </div>

            <div className="flex flex-col items-center justify-center">
              <button 
                onClick={() => handleMute('master', !!state?.master_muted)}
                className={`px-20 py-8 rounded-[2.5rem] border font-black uppercase text-[14px] tracking-[0.4em] transition-all active:scale-95 ${state?.master_muted ? 'bg-red-500 border-red-500 text-white shadow-[0_0_60px_rgba(239,68,68,0.4)]' : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-black/40 dark:text-white/40 hover:bg-black/10 dark:hover:bg-white/10'}`}
              >
                {state?.master_muted ? 'System Muted' : 'Mute System'}
              </button>
            </div>
          </div>
        )}

        {screen === 'EQ' && (
          <div className="bg-white dark:bg-[#141414] p-8 md:p-12 rounded-[3.5rem] border border-black/5 dark:border-white/5 shadow-2xl flex flex-col items-center h-[520px] transition-colors duration-500">
            <div className="w-full flex justify-between items-center mb-10">
               <div className="flex flex-col">
                  <h2 className="text-2xl md:text-3xl font-light tracking-tighter text-black dark:text-white">Precision EQ</h2>
                  <p className="text-[9px] font-black tracking-[0.3em] text-gold opacity-30 uppercase mt-1">10-Band LADSPA Array</p>
               </div>
               <button onClick={() => { triggerHaptic(10); resetEQ(); }} className="px-6 py-2.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-full text-[9px] font-black uppercase tracking-[0.2em] text-black/40 dark:text-white/40 hover:bg-black/10 dark:hover:bg-white/10 active:scale-95 transition-all">Reset Flat</button>
            </div>
            
            <div className="flex-1 w-full flex justify-around items-end pb-4 px-2">
              {Object.entries(state?.equalizer || {}).map(([band, val], idx) => {
                const parts = band.split(' ');
                const label = parts.length >= 3 ? `${parts[1]}${parts[2].toLowerCase().startsWith('k') ? 'k' : ''}` : parts[1];
                return (
                  <div key={band} className="flex flex-col items-center flex-1">
                    <VerticalSlider 
                      slim
                      height={300}
                      value={val as number}
                      accentColor="gold"
                      onChange={(newVal: number) => handleEQ(idx, newVal)}
                      onInteraction={() => lockControl(`eq_${band}`)}
                      onMute={() => {}} 
                    />
                    <div className="h-10 flex items-center justify-center mt-4">
                      <span className="text-[7px] md:text-[9px] text-black/40 dark:text-white/40 font-mono rotate-45 origin-center whitespace-nowrap uppercase font-bold tracking-tighter">{label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {screen === 'HEALTH' && (
          <div className="max-w-2xl mx-auto w-full space-y-8">
            <div className="bg-white dark:bg-[#141414] p-10 rounded-[3rem] border border-black/5 dark:border-white/5 shadow-2xl transition-colors duration-500">
              <h2 className="text-2xl font-light tracking-tighter mb-8 text-black dark:text-white">System Services</h2>
              <div className="space-y-4">
                {Object.entries(state?.services || {}).map(([name, status]) => (
                  <div key={name} className="flex justify-between items-center p-5 bg-black/5 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/5">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40 text-black dark:text-white">{name.replace('_', ' ')}</span>
                    <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${status === 'active' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                      {status as string}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-red-500/5 p-10 rounded-[3rem] border border-red-500/10 shadow-2xl flex flex-col items-center text-center transition-colors duration-500">
              <h3 className="text-lg font-light tracking-tight text-red-500/80 mb-2">Emergency Recovery</h3>
              <p className="text-[10px] uppercase tracking-widest opacity-30 mb-8 text-black dark:text-white">Restart audio hardware bridges</p>
              <button 
                onClick={handleRestart}
                disabled={isRestarting}
                className={`px-10 py-5 bg-red-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] shadow-[0_0_40px_rgba(239,68,68,0.2)] active:scale-95 transition-all ${isRestarting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-600'}`}
              >
                {isRestarting ? 'Restarting...' : 'Restart Audio Engine'}
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="p-10 text-center opacity-20 text-black dark:text-white">
         <p className="text-[9px] font-black tracking-[0.8em] uppercase">optic-sound.local node {state?.version}</p>      </footer>
    </div>
  );
}

export default App;
