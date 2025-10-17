// Piano-like QWERTY mapping for 12-TET + quarter-tones (C4 on 'Z')
// Whites: Z X C V B N M , (C D E F G A B C)
// Blacks: W E   T Y U    (C# D#   F# G# A#)
// Quarter-tones (half-sharp ↑): S D   F G H  and  2 3   5 6 7

export const A4 = 440;
export const A4_MIDI = 69;
export const midiOfC4 = 60;

const NAT12 = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

export function normalizeKey(k){ 
  return k.length===1 ? k.toUpperCase() : k; 
}
function name12(semi){ 
  return NAT12[((semi%12)+12)%12]; 
}
function labelNatural(semi){ 
  return name12(semi).replace('#',''); 
} 
function labelSharp(semi){ 
  return name12(semi).replace('#','♯'); 
}

// Expose key->note mapping for runtime keyboard input
export const keyToIndex = new Map();

/** 
 * Helper to build bindings from a compact pattern.
 * pattern = [ [pc, semiOffset, qstep, kindFunc], ... ]
 */
function makeBindings(pattern) {
  return pattern.map(([pc, semi, qstep, kind]) => {
    const labelBase = kind === 'sharp' ? labelSharp(semi) : labelNatural(semi);
    const label = qstep ? labelBase + '↑' : labelBase;
    return { pc, semi, qstep, kind, label };
  });
}

/** 
 * Define your key layout compactly.
 * Each array maps one keyboard row.
 */
const ROWS = {
  bottom: [
    ['Z', 0], ['X', 2], ['C', 4], ['V', 5], ['B', 7],
    ['N', 9], ['M', 11], [',', 12], ['.', 14], ['/', 16],
  ],
  qrow: [
    ['W', 1], ['E', 3], ['T', 6], ['Y', 8], ['U', 10],
    ['O', 13], ['P', 15],
  ],
  arow: [
    ['S', 0], ['D', 2], ['F', 4], ['G', 5], ['H', 7],
    ['J', 9], ['K', 11], ['L', 12], [';', 14], ["'", 16],
  ],
  num: [
    ['3', 1], ['4', 3], ['6', 6], ['7', 8], ['8', 10],
    ['0', 13], ['-', 15],
  ]
};

// Generate all bindings dynamically
const BINDINGS = [
  // natural whites
  ...makeBindings(ROWS.bottom.map(([pc, semi]) => [pc, semi, 0, 'natural'])),

  // sharps (black keys)
  ...makeBindings(ROWS.qrow.map(([pc, semi]) => [pc, semi, 0, 'sharp'])),

  // halfsharps for naturals
  ...makeBindings(ROWS.arow.map(([pc, semi]) => [pc, semi, 1, 'halfsharp'])),

  // halfsharps for sharps
  ...makeBindings(ROWS.num.map(([pc, semi]) => [pc, semi, 1, 'halfsharp'])),
];

// optional: populate keyToIndex
for (const b of BINDINGS) keyToIndex.set(normalizeKey(b.pc), b);

export { BINDINGS };

// Screen rows for the *visual* keyboard
export const ROW_NUM_FULL    = ['1','2','3','4','5','6','7','8','9','0','-'];
export const ROW_QLEFT_FULL  = ['Q','W','E','R','T','Y','U','I','O','P'];
export const ROW_ALEFT_FULL  = ['A','S','D','F','G','H','J','K','L',';',"'"];
export const ROW_BOTTOM_FULL = ['Z','X','C','V','B','N','M',',','.','/'];
/**
 * Build the piano-like QWERTY keyboard per the mapping above.
 * @param {HTMLElement} container
 * @param {(note:{midi:number,qstep:number}, pcKey:string)=>void} onDown
 * @param {(note:{midi:number,qstep:number}, pcKey:string)=>void} onUp
 */
export function buildQwertyKeyboard(container, onDown, onUp){
  container.innerHTML = '';
  container.classList.add('keyboard');

  const makeRow = (className) => {
    const row = document.createElement('div');
    row.className = `kb-row ${className}`;
    container.appendChild(row);
    return row;
  };

  // Append rows in visual order: top -> bottom
  const rowNum    = makeRow('num');    // number row (top)
  const rowQleft  = makeRow('qleft');  // QWERTY row
  const rowAleft  = makeRow('aleft');  // ASDF row
  const rowBottom = makeRow('bottom'); // ZXCV row (bottom)

  keyToIndex.clear();

  // Helper to drop a key (active or inactive)
  const addActiveKey = (row, binding) => {
    const div = document.createElement('div');
    div.className = 'key';
    div.dataset.kind  = binding.kind;
    div.dataset.midi  = String(midiOfC4 + binding.semi);
    div.dataset.qstep = String(binding.qstep);
    div.dataset.key   = binding.pc;
    div.innerHTML = `
      <div class="label">${binding.label}</div>
      <div class="sub">${binding.pc}</div>
    `;
    div.addEventListener('pointerdown', (e)=>{ e.preventDefault(); onPointer('down', div); });
    window.addEventListener('pointerup', ()=> onPointer('up', div));
    row.appendChild(div);
    keyToIndex.set(binding.pc, { midi: midiOfC4 + binding.semi, qstep: binding.qstep });
  };

  const addInactiveKey = (row, pcKey) => {
    const div = document.createElement('div');
    div.className = 'key';
    div.dataset.kind = 'inactive';
    div.dataset.key = pcKey;
    div.innerHTML = `
      <div class="label">${pcKey}</div>
      <div class="sub">—</div>
    `;
    row.appendChild(div);
    // Not added to keyToIndex => no synth trigger
  };

  // Utility: get binding for a pc key
  const byPC = new Map(BINDINGS.map(b => [b.pc, b]));

  // Render rows left→right
  for (let i=0; i<ROW_BOTTOM_FULL.length; i++){
    const pc = ROW_BOTTOM_FULL[i];
    const b = byPC.get(pc);
    if (b) addActiveKey(rowBottom, b); else addInactiveKey(rowBottom, pc);
  }
  for (let i=0; i<ROW_ALEFT_FULL.length; i++){
    const pc = ROW_ALEFT_FULL[i];
    const b = byPC.get(pc);
    if (b) addActiveKey(rowAleft, b); else addInactiveKey(rowAleft, pc);
  }
  for (let i=0; i<ROW_QLEFT_FULL.length; i++){
    const pc = ROW_QLEFT_FULL[i];
    const b = byPC.get(pc);
    if (b) addActiveKey(rowQleft, b); else addInactiveKey(rowQleft, pc);
  }
  for (let i=0; i<ROW_NUM_FULL.length; i++){
    const pc = ROW_NUM_FULL[i];
    const b = byPC.get(pc);
    if (b) addActiveKey(rowNum, b); else addInactiveKey(rowNum, pc);
  }

  function onPointer(dir, el){
    const pc = el.dataset.key;
    const midi  = +el.dataset.midi;
    const qstep = +el.dataset.qstep;
    if (dir==='down'){
      if (!isNaN(midi)) { // ignore inactive
        el.classList.add('active');
        onDown({midi,qstep}, pc);
      }
    } else {
      el.classList.remove('active');
      if (!isNaN(midi)) onUp({midi,qstep}, pc);
    }
  }
}
