import { buildQwertyKeyboard, keyToIndex, normalizeKey } from './keyboard.js';
import { QuarterToneSynth } from './synth.js';

const keyboardEl = document.getElementById('keyboard');
const scopeEl = document.getElementById('scope');

const synth = new QuarterToneSynth(scopeEl);

// Build QWERTY-shaped keyboard with semitone and quarter-tone metadata
buildQwertyKeyboard(
  keyboardEl,
  (note, pc) => {
    synth.noteOn(note.midi, note.qstep, pc);
    setActiveByKey(pc, true);
  },
  (note, pc) => {
    synth.noteOff(note.midi, note.qstep, pc);
    setActiveByKey(pc, false);
  },
);

// Controls (unchanged)
const el = {
  wave: document.getElementById('wave'),
  attack: document.getElementById('attack'),
  decay: document.getElementById('decay'),
  sustain: document.getElementById('sustain'),
  release: document.getElementById('release'),
  volume: document.getElementById('volume'),
  octave: document.getElementById('octave'),
  attackVal: document.getElementById('attackVal'),
  decayVal: document.getElementById('decayVal'),
  sustainVal: document.getElementById('sustainVal'),
  releaseVal: document.getElementById('releaseVal'),
  volumeVal: document.getElementById('volumeVal'),
  octaveVal: document.getElementById('octaveVal'),
};
function syncLabels(){
  el.attackVal.textContent = (+el.attack.value).toFixed(2);
  el.decayVal.textContent = (+el.decay.value).toFixed(2);
  el.sustainVal.textContent = (+el.sustain.value).toFixed(2);
  el.releaseVal.textContent = (+el.release.value).toFixed(2);
  el.volumeVal.textContent = (+el.volume.value).toFixed(2);
  el.octaveVal.textContent = el.octave.value;
}

// Hard-refresh: clear caches and reload page
const hardRefreshBtn = document.getElementById('hardRefresh');
if (hardRefreshBtn) {
  hardRefreshBtn.addEventListener('click', async () => {
    try { localStorage.clear(); sessionStorage.clear(); } catch {}
    if (window.caches) {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
    }
    if (navigator.serviceWorker) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(reg => reg.unregister()));
    }
    location.reload(true);
  });
}
syncLabels();
['input','change'].forEach(evt=>{
  el.wave.addEventListener(evt, ()=> synth.setWave(el.wave.value));
  el.attack.addEventListener(evt, ()=> { const a=+el.attack.value; el.attackVal.textContent=a.toFixed(2); synth.setADSR({ ...synth.adsr, a });});
  el.decay.addEventListener(evt, ()=> { const d=+el.decay.value; el.decayVal.textContent=d.toFixed(2); synth.setADSR({ ...synth.adsr, d });});
  el.sustain.addEventListener(evt, ()=> { const s=+el.sustain.value; el.sustainVal.textContent=s.toFixed(2); synth.setADSR({ ...synth.adsr, s });});
  el.release.addEventListener(evt, ()=> { const r=+el.release.value; el.releaseVal.textContent=r.toFixed(2); synth.setADSR({ ...synth.adsr, r });});
  el.volume.addEventListener(evt, ()=> { const v=+el.volume.value; el.volumeVal.textContent=v.toFixed(2); synth.setVolume(v); });
  el.octave.addEventListener(evt, ()=> { const n=+el.octave.value; el.octaveVal.textContent=n; synth.setOctave(n); });
});

// PC keyboard handling
const down = new Set();
window.addEventListener('keydown', async (e)=>{
  if (e.repeat) return;
  const key = normalizeKey(e.key);

  if (key === '['){
    el.octave.value = Math.max(+el.octave.min, +el.octave.value-1);
    el.octave.dispatchEvent(new Event('input'));
    return;
  }
  if (key === ']'){
    el.octave.value = Math.min(+el.octave.max, +el.octave.value+1);
    el.octave.dispatchEvent(new Event('input'));
    return;
  }

  if (!keyToIndex.has(key)) return;
  e.preventDefault();
  if (down.has(key)) return;
  down.add(key);

  await synth.ensureStarted();
  const note = keyToIndex.get(key);
  await synth.noteOn(note.midi, note.qstep, key);
  setActiveByKey(key, true);
});

window.addEventListener('keyup', (e)=>{
  const key = normalizeKey(e.key);
  if (!keyToIndex.has(key)) return;
  e.preventDefault();
  down.delete(key);
  const note = keyToIndex.get(key);
  synth.noteOff(note.midi, note.qstep, key);
  setActiveByKey(key, false);
});

// Release any stuck notes when pointer leaves window
document.body.addEventListener('pointerup', ()=> synth.releaseAll());

function setActiveByKey(pc, on){
  const elKey = keyboardEl.querySelector(`.key[data-key="${pc}"]`);
  if (!elKey) return;
  elKey.classList.toggle('active', on);
}
