// QWERTY-shaped UI mapping of semitones and quarter-tones (C4 on 'Z')
// Vertical meaning per column (bottom→top):
//   natural → natural+qt (↑) → sharp → sharp+qt (♯↑)
// For E and B columns, there is no sharp/sharp+qt (they are the semitone boundaries).

export const A4 = 440;
export const A4_MIDI = 69;
export const midiOfC4 = 60;

const NAT12 = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

// Base columns we draw across the screen (starting at C4 on 'Z'):
// semitone offsets from C: C(0), D(2), E(4), F(5), G(7), A(9), B(11), C5(12), D5(14), E5(16)
const COLUMN_SEMITONES = [0,2,4,5,7,9,11,12,14,16];

// FULL QWERTY rows shown on screen (10 columns per row to align with columns)
const ROW_BOTTOM_FULL = ['Z','X','C','V','B','N','M',',','.','/'];              // naturals
const ROW_ALEFT_FULL  = ['A','S','D','F','G','H','J','K','L',';'];              // natural + qt column
const ROW_QLEFT_FULL  = ['Q','W','E','R','T','Y','U','I','O','P'];              // sharps column
const ROW_NUM_FULL    = ['1','2','3','4','5','6','7','8','9','0'];              // sharp + qt column

// Which of those FULL-row keys actually play notes (same mapping as before)
const ROW_ALEFT_ACTIVE = ['S','D','F','G','H','J','K','L',';'];                  // A-row active
const ROW_QLEFT_ACTIVE = ['W','E',/*gap*/, 'T','Y','U',/*gap*/, 'O','P',/*gap*/]; // Q-row active
const ROW_NUM_ACTIVE   = ['2','3',/*gap*/, '5','6','7',/*gap*/, '9','0',/*gap*/]; // number-row active
// Expose key->qIndex mapping (filled at build time)
export const keyToIndex = new Map();

export function normalizeKey(k){ return k.length===1 ? k.toUpperCase() : k; }

function name12(semi){ return NAT12[((semi%12)+12)%12]; }
function labelNatural(semi){ return name12(semi).replace('#',''); } // show natural letter only
function labelSharp(semi){ return name12(semi).replace('#','♯'); }  // pretty sharp

/**
 * Build the QWERTY-shaped keyboard with semitone and quarter-tone mapping.
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

  const rowBottom = makeRow('bottom'); // naturals
  const rowAleft  = makeRow('aleft');  // natural + qt
  const rowQleft  = makeRow('qleft');  // sharps
  const rowNum    = makeRow('num');    // sharp + qt

  keyToIndex.clear();

  for (let col = 0; col < COLUMN_SEMITONES.length; col++){
    const semi = COLUMN_SEMITONES[col];

    // Bottom row: natural (all 10 are active)
    addActiveKey(
      rowBottom,
      ROW_BOTTOM_FULL[col],
      'natural',
      midiOfC4 + semi, 0,
      labelNatural(semi)
    );

    // A-row: show full keys; only some are active
    {
      const pcKey = ROW_ALEFT_FULL[col];
      if (ROW_ALEFT_ACTIVE.includes(pcKey)){
        addActiveKey(
          rowAleft, pcKey, 'halfsharp',
          midiOfC4 + semi, 1,
          labelNatural(semi) + '↑'
        );
      } else {
        addInactiveKey(rowAleft, pcKey);
      }
    }

    // Q-row: show full keys; only some are active (skip E/B sharps)
    {
      const pcKey = ROW_QLEFT_FULL[col];
      if (ROW_QLEFT_ACTIVE.includes(pcKey)){
        addActiveKey(
          rowQleft, pcKey, 'sharp',
          midiOfC4 + semi + 1, 0,
          labelSharp(semi + 1)
        );
      } else {
        addInactiveKey(rowQleft, pcKey);
      }
    }

    // Number row: show full keys; only some are active
    {
      const pcKey = ROW_NUM_FULL[col];
      if (ROW_NUM_ACTIVE.includes(pcKey)){
        addActiveKey(
          rowNum, pcKey, 'halfsharp',
          midiOfC4 + semi + 1, 1,
          labelSharp(semi + 1) + '↑'
        );
      } else {
        addInactiveKey(rowNum, pcKey);
      }
    }
  }

  function addActiveKey(row, pcKey, kind, midi, qstep, label){
    const div = document.createElement('div');
    div.className = 'key';
    div.dataset.kind = kind;
    div.dataset.midi = String(midi);
    div.dataset.qstep = String(qstep);
    div.dataset.key = pcKey;
    div.innerHTML = `
      <div class="label">${label}</div>
      <div class="sub">${pcKey}</div>
    `;
    div.addEventListener('pointerdown', (e)=>{ e.preventDefault(); onPointer('down', div); });
    window.addEventListener('pointerup', ()=> onPointer('up', div));
    row.appendChild(div);

    keyToIndex.set(pcKey, { midi, qstep });
  }

  function addInactiveKey(row, pcKey){
    const div = document.createElement('div');
    div.className = 'key';
    div.dataset.kind = 'inactive';
    div.dataset.key = pcKey;
    div.innerHTML = `
      <div class="label">${pcKey}</div>
      <div class="sub">—</div>
    `;
    row.appendChild(div);
    // IMPORTANT: not in keyToIndex, so PC typing won’t trigger anything
  }

  // Fixed: call handlers with midi/qstep (qindex never existed)
  function onPointer(dir, el){
    const pc = el.dataset.key;
    const note = { midi: +el.dataset.midi, qstep: +el.dataset.qstep };
    if (dir==='down'){
      el.classList.add('active');
      onDown(note, pc);
    } else {
      el.classList.remove('active');
      onUp(note, pc);
    }
  }
}