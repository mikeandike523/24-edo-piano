// Audio setup and note routing to the worklet

import { A4, A4_MIDI } from './keyboard.js';

const workletURL = '/worklets/quarter-tone.js';

export class QuarterToneSynth {
  constructor(){
    this.ctx = new (window.AudioContext || window.webkitAudioContext)({
        latencyHint: 'interactive'
    });
    this.started = false;
    this.synthNode = null;
    this.gain = null;
    this.analyser = null;

    this.octaveShift = 0;

    this.held = new Map(); // key -> noteId

    this._noteUid = 1;
  }

  async ensureStarted(){
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    if (this.started) return;
    await this.ctx.audioWorklet.addModule(workletURL);
    this.synthNode = new AudioWorkletNode(this.ctx, 'quarter-tone', {
      numberOfOutputs: 1,
      outputChannelCount: [2],
      parameterData: { volume: 0.8 }
    });
    this.gain = this.ctx.createGain();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;

    this.synthNode.connect(this.gain).connect(this.analyser).connect(this.ctx.destination);
    this.started = true;

    // push initial state
    this.setVolume(0.8);
  }

  setVolume(v){
    if (this.synthNode) this.synthNode.parameters.get('volume').setValueAtTime(v, this.ctx.currentTime);
  }
  setOctave(n){ this.octaveShift = n|0; }

  nextNoteId(){ return this._noteUid++; }

  // frequency from quarter-tone offset relative to C4

  /**
   * Compute frequency from midi note number and quarter-step offset.
   * Quarter-step offset is in quarter tones (e.g. 1 = +¼ tone, -1 = -¼ tone).
   */
  freqFromMidi(midiNote, qstep){
    const semitoneOffset = midiNote + qstep * 0.5;
    return A4 * Math.pow(2, (semitoneOffset - A4_MIDI) / 12);
  }

  /**
   * Trigger a note-on by midi note and optional quarter-step offset.
   * @param {number} midiNote - integer semitone (e.g. 60 for C4)
   * @param {number} qstep - quarter-step offset (0 = natural, ±1 = quarter-tone)
   * @param {string} keyName - key identifier for tracking note-off
   */
  async noteOn(midiNote, qstep, keyName){
    await this.ensureStarted();
    const id = this.nextNoteId();
    const transposed = midiNote + this.octaveShift * 12;
    const freq = this.freqFromMidi(transposed, qstep);
    this.held.set(keyName, id);
    this.synthNode.port.postMessage({type:'noteOn', data:{freq, id}});
  }

  /**
   * Trigger a note-off for the given key.
   * @param {string} keyName - key identifier to end the note
   */
  noteOff(_, __, keyName){
    const id = this.held.get(keyName);
    if (id){
      this.synthNode.port.postMessage({type:'noteOff', data:{id}});
      this.held.delete(keyName);
    }
  }

  releaseAll(){
    // Used when mouse is released outside keys etc.
    this.held.forEach((id)=> {
      this.synthNode?.port.postMessage({type:'noteOff', data:{id}});
    });
    this.held.clear();
  }

  /**
   * Trigger a test tone by frequency directly.
   * @param {number} freq - frequency in Hz
   * @param {string} keyName - key identifier for tracking note-off
   */
  async noteOnFreq(freq, keyName){
    await this.ensureStarted();
    const id = this.nextNoteId();
    this.held.set(keyName, id);
    this.synthNode.port.postMessage({type:'noteOn', data:{freq, id}});
  }

  /**
   * Trigger note-off for test tone.
   * @param {string} keyName - key identifier to end the note
   */
  noteOffFreq(keyName){
    const id = this.held.get(keyName);
    if (id){
      this.synthNode.port.postMessage({type:'noteOff', data:{id}});
      this.held.delete(keyName);
    }
  }

}
