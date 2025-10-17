// AudioWorkletProcessor for a polyphonic quarter-tone synth (24-TET)
// No imports needed; loaded via audioWorklet.addModule('/worklets/quarter-tone.js')

class PolyVoice {
  constructor(sampleRate) {
    this.sampleRate = sampleRate;
    this.freq = 440;
    this.samples = 0;
    this.noteId = 0;
    this.state = 'idle';    // envelope state: idle, attack, decay, sustain, release
    this.envSamples = 0;     // samples in current envelope stage
    this.attackSamples = 0;
    this.decaySamples = 0;
    this.releaseSamples = 0;
    this.sustainLevel = 0;
    this.waveform = 'sine';
  }
  noteOn(freq, id, attackTime, decayTime, sustainLevel, releaseTime) {
    this.freq = freq;
    this.noteId = id;
    this.state = 'attack';
    this.envSamples = 0;
    this.samples = 0;
    this.attackSamples = Math.max(1, Math.floor(attackTime * this.sampleRate));
    this.decaySamples = Math.max(1, Math.floor(decayTime * this.sampleRate));
    this.releaseSamples = Math.max(1, Math.floor(releaseTime * this.sampleRate));
    this.sustainLevel = sustainLevel;
  }
  noteOff(id) {
    if (this.state !== 'idle' && this.noteId === id && this.state !== 'release') {
      this.state = 'release';
      this.envSamples = 0;
    }
  }
  process() {
    let envAmp = 0;
    switch (this.state) {
      case 'attack':
        envAmp = this.envSamples / this.attackSamples;
        if (this.envSamples++ >= this.attackSamples) {
          this.state = 'decay';
          this.envSamples = 0;
        }
        break;
      case 'decay':
        envAmp = 1 + (this.sustainLevel - 1) * (this.envSamples / this.decaySamples);
        if (this.envSamples++ >= this.decaySamples) {
          this.state = 'sustain';
          this.envSamples = 0;
        }
        break;
      case 'sustain':
        envAmp = this.sustainLevel;
        break;
      case 'release':
        envAmp = this.sustainLevel * (1 - this.envSamples / this.releaseSamples);
        if (this.envSamples++ >= this.releaseSamples) {
          this.state = 'idle';
        }
        break;
      default:
        return 0;
    }
    const t = (this.samples * this.freq) / this.sampleRate;
    const phase = t - Math.floor(t); // normalized phase [0,1)
    let sample;
    switch (this.waveform) {
      case 'square':
        sample = phase < 0.5 ? 1 : -1;
        break;
      case 'triangle':
        sample = 1 - 4 * Math.abs(phase - 0.5);
        break;
      case 'sawtooth':
        sample = 2 * phase - 1;
        break;
      default: // 'sine'
        sample = Math.sin(2 * Math.PI * phase);
    }
    this.samples++;
    return sample * envAmp;
  }
}

class QuarterToneProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{ name: "volume", defaultValue: 0.8, minValue: 0, maxValue: 1 }];
  }
  constructor() {
    super();
    this.voices = Array.from({ length: 16 }, () => new PolyVoice(sampleRate));

    this.port.onmessage = (e) => {
      const { type, data } = e.data;
      if (type === "noteOn") {
        const { freq, id, attack, decay, sustain, release } = data;
        const v = this._findFreeVoice();
        v.noteOn(freq, id, attack, decay, sustain, release);
      } else if (type === "noteOff") {
        const { id } = data;
        this.voices.forEach((v) => v.noteOff(id));
      } else if (type === "waveform") {
        this.voices.forEach((v) => { v.waveform = data; });
      }
    };
  }
  _findFreeVoice() {
    return this.voices.find((v) => v.state === 'idle') || this.voices[0];
  }
  process(inputs, outputs, parameters) {
    const output = outputs[0];
    if(output.length === 0) throw new Error("Output not having enough channels");
    const o0length = output[0].length;
    if(output.length > 1){
        for(let i = 1; i < output.length; i++){
            if(output[i].length!== o0length) throw new Error("All outputs must have the same length");
        }
    }
    const volume = parameters.volume;
    for (let i = 0; i < output[0].length; i++) {
      let s = 0;
      for (let v of this.voices) {
        s += v.process();
      }
      const v = volume.length > 1 ? volume[i] : volume[0];
      for (let ch = 0; ch < output.length; ch++) {
        const out = output[ch];
        out[i] = s * v * 0.25; // apply volume with headroom
      }
    }
    // volume parameter applied per-sample above

    return true;
  }
}

registerProcessor("quarter-tone", QuarterToneProcessor);
