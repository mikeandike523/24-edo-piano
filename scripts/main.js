import { buildQwertyKeyboard, keyToIndex, normalizeKey } from './keyboard.js';
import { QuarterToneSynth } from './synth.js';

const keyboardEl = document.getElementById('keyboard');
const synth = new QuarterToneSynth();

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
  volume: document.getElementById('volume'),
  octave: document.getElementById('octave'),
  volumeVal: document.getElementById('volumeVal'),
  octaveVal: document.getElementById('octaveVal'),
};
function syncLabels(){
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
  el.volume.addEventListener(evt, ()=> { const v=+el.volume.value; el.volumeVal.textContent=v.toFixed(2); synth.setVolume(v); });
  el.octave.addEventListener(evt, ()=> { const n=+el.octave.value; el.octaveVal.textContent=n; synth.setOctave(n); });
});

// PC keyboard handling
const down = new Set();
const enableKeyboardCheckbox = document.getElementById('enableKeyboard');
window.addEventListener('keydown', async (e)=>{
  if (!enableKeyboardCheckbox || !enableKeyboardCheckbox.checked) return;
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
  if (!enableKeyboardCheckbox || !enableKeyboardCheckbox.checked) return;
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

if (enableKeyboardCheckbox) {
  enableKeyboardCheckbox.addEventListener('change', () => {
    if (!enableKeyboardCheckbox.checked) {
      synth.releaseAll();
      down.forEach(key => setActiveByKey(key, false));
      down.clear();
    }
  });
}

function setActiveByKey(pc, on){
  const elKey = keyboardEl.querySelector(`.key[data-key="${pc}"]`);
  if (!elKey) return;
  elKey.classList.toggle('active', on);
}

