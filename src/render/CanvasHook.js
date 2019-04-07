/*
* virtual-dom hook for drawing to the canvas element.
*/
class CanvasHook {
  constructor(peaks, offset, bits, color, cueoffset) {
    this.cueoffset = cueoffset;
    this.peaks = peaks;
    // http://stackoverflow.com/questions/6081483/maximum-size-of-a-canvas-element
    this.offset = offset;
    this.color = color;
    this.bits = bits;
    this.bufferedwaveform = undefined;
    this.bwc = undefined; // BufferedWaveformContext
  }

  static drawFrame(cc, h2, x, minPeak, maxPeak) {
    const min = Math.abs(minPeak * h2);
    const max = Math.abs(maxPeak * h2);

    // draw max
    cc.fillRect(x, 0, 1, h2 - max);
    // draw min
    cc.fillRect(x, h2 + min, 1, h2 - min);
  }

  drawCanvas (cc, len, h2){
    const maxValue = 2 ** (this.bits - 1);

    cc.clearRect(0, 0, len, h2*2);
    cc.fillStyle = this.color;

    for (let i = 0; i < len; i += 1) {
      const minPeak = this.peaks[(i + this.offset) * 2] / maxValue;
      const maxPeak = this.peaks[((i + this.offset) * 2) + 1] / maxValue;
      CanvasHook.drawFrame(cc, h2, i, minPeak, maxPeak);
    }
  }

  hook(canvas, prop, prev) {
    // canvas is up to date

    const len = canvas.width;
    const cc = canvas.getContext('2d');
    const h2 = canvas.height / 2;

    if (this.bufferedwaveform && this.cueoffset == prev.cueoffset){
      cc.drawImage(this.bufferedwaveform,-this.cueoffset,0);
    }
    else{
      this.bufferedwaveform = document.createElement('canvas');
      this.bwc = this.bufferedwaveform.getContext('2d');

      this.drawCanvas(this.bwc,len,h2);
      cc.clearRect(0,0,canvas.width,canvas.height);
      cc.drawImage(this.bufferedwaveform,-this.cueoffset,0);
      // console.log("cueOffset",this.cueoffset);
    }
    
  }
}

export default CanvasHook;
