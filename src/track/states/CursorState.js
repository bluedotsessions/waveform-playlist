import { pixelsToSeconds } from '../../utils/conversions';

export default class {
  constructor(track) {
    this.track = track;
    this.setupEventListeners();
  }
  setupEventListeners(){
    this.track.ee.on("playlistmousedown",e=>this.click.call(this,e))
  }

  setup(samplesPerPixel, sampleRate) {
    this.samplesPerPixel = samplesPerPixel;
    this.sampleRate = sampleRate;
  }

  click(e) {
    e.preventDefault();
    console.log('cursor here');

    const startX = e.offsetX;
    const startTime = pixelsToSeconds(startX, this.samplesPerPixel, this.sampleRate);

    this.track.ee.emit('select', startTime, startTime, this.track);
  }

  static getClass() {
    return '.state-cursor';
  }
}
