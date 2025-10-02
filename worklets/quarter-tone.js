// AudioWorkletProcessor for a polyphonic quarter-tone synth (24-TET)
// No imports needed; loaded via audioWorklet.addModule('/worklets/quarter-tone.js')

class PolyVoice {
  constructor(sampleRate) {
    this.sampleRate = sampleRate;
    this.active = false;
    this.freq = 440;
    this.samples = 0;
    this.noteId = 0;
  }
  noteOn(freq, id) {
    this.freq = freq;
    this.noteId = id;
    this.active = true;
    this.samples = 0;
  }
  noteOff(id) {
    if (this.active && this.noteId === id) this.active = false;
  }
  process() {
    if (!this.active) return 0;
    const phase = (2 * Math.PI * this.freq * this.samples) / this.sampleRate;
    this.samples++;
    return Math.sin(phase);
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
        const { freq, id } = data;
        const v = this._findFreeVoice();
        v.noteOn(freq, id);
      } else if (type === "noteOff") {
        const { id } = data;
        this.voices.forEach((v) => v.noteOff(id));
      }
    };
  }
  _findFreeVoice() {
    return this.voices.find((v) => !v.active) || this.voices[0];
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
    for (let i = 0; i < output[0].length; i++) {
      let s = 0;
      for (let v of this.voices) {
        s += v.process();
      }
      // out[i] = s * (volume[Math.min(i, volume.length-1)] || volume[0]) * 0.25; // headroom
      for (let ch = 0; ch < output.length; ch++) {
        const out = output[ch];
        out[i] = s * 0.25; // headroom
      }
    }
    // const volume = parameters.volume.length>1 ? parameters.volume : [parameters.volume[0]];

    return true;
  }
}

registerProcessor("quarter-tone", QuarterToneProcessor);
