import { buildQwertyKeyboard, keyToIndex, normalizeKey, midiOfC4} from './keyboard.js';
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
  attack: document.getElementById('attack'),
  decay: document.getElementById('decay'),
  sustain: document.getElementById('sustain'),
  release: document.getElementById('release'),
  volumeVal: document.getElementById('volumeVal'),
  octaveVal: document.getElementById('octaveVal'),
  attackVal: document.getElementById('attackVal'),
  decayVal: document.getElementById('decayVal'),
  sustainVal: document.getElementById('sustainVal'),
  releaseVal: document.getElementById('releaseVal'),
};

// MIDI→octave mapping: for C-notes, octave = (MIDI/12) - 1.
// We start on C4 because midiOfC4 = 60 -> 60/12-1 = 4
const BASE_OCTAVE_C = (midiOfC4 / 12) - 1; // = 4 with A440 tuning

function syncLabels(){
  el.volumeVal.textContent = (+el.volume.value).toFixed(2);
  const shift = (+el.octave.value)|0;
  const currentOct = BASE_OCTAVE_C + shift;
  el.octaveVal.textContent = `C${currentOct}`;
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
// Initialize ADSR labels
el.attackVal.textContent = parseFloat(el.attack.value).toFixed(3);
el.decayVal.textContent = parseFloat(el.decay.value).toFixed(3);
el.sustainVal.textContent = parseFloat(el.sustain.value).toFixed(2);
el.releaseVal.textContent = parseFloat(el.release.value).toFixed(2);
['input','change'].forEach(evt=>{
  el.volume.addEventListener(evt, ()=> { const v=+el.volume.value; el.volumeVal.textContent=v.toFixed(2); synth.setVolume(v); });
  el.octave.addEventListener(evt, ()=> {
    const n = (+el.octave.value)|0;
    const currentOct = BASE_OCTAVE_C + n;
    el.octaveVal.textContent = `C${currentOct}`;
    synth.setOctave(n);
  });
  el.attack.addEventListener(evt, ()=> {
    const v = +el.attack.value;
    el.attackVal.textContent = v.toFixed(3);
    synth.setAttack(v);
  });
  el.decay.addEventListener(evt, ()=> {
    const v = +el.decay.value;
    el.decayVal.textContent = v.toFixed(3);
    synth.setDecay(v);
  });
  el.sustain.addEventListener(evt, ()=> {
    const v = +el.sustain.value;
    el.sustainVal.textContent = v.toFixed(2);
    synth.setSustain(v);
  });
  el.release.addEventListener(evt, ()=> {
    const v = +el.release.value;
    el.releaseVal.textContent = v.toFixed(2);
    synth.setRelease(v);
  });
});

// PC keyboard handling
const down = new Set();
const enableKeyboardCheckbox = document.getElementById('enableKeyboard');
const lockOctaveCheckbox = document.getElementById('lockOctave');

function applyOctaveLockUI(){
  const locked = !!(lockOctaveCheckbox && lockOctaveCheckbox.checked);
  if (el.octave) {
    el.octave.disabled = locked;
    el.octave.title = locked ? 'Octave is locked' : 'Drag to change octave';
  }
}
if (lockOctaveCheckbox){
  lockOctaveCheckbox.addEventListener('change', applyOctaveLockUI);
  // start locked by default (HTML has it checked)
  applyOctaveLockUI();
}

window.addEventListener('keydown', async (e)=>{
  if (!enableKeyboardCheckbox || !enableKeyboardCheckbox.checked) return;
  if (e.repeat) return;
  const key = normalizeKey(e.key);

  if (key === '['){
    if (lockOctaveCheckbox && lockOctaveCheckbox.checked) return; // locked: ignore
    el.octave.value = Math.max(+el.octave.min, +el.octave.value-1);
    el.octave.dispatchEvent(new Event('input'));
    return;
  }
  if (key === ']'){
     if (lockOctaveCheckbox && lockOctaveCheckbox.checked) return; // locked: ignore
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

// Initialize labels once more in case lock/disabled changed initial view
syncLabels();
