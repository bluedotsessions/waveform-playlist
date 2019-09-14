/*
* virtual-dom hook for setting the volume input programmatically.
* ... AND dB METER
*/
export default class {
  constructor(track){
    this.track = track;
  }
  update(){
    const NLazar = this.track.analyzer; 
    if (!this.dataarray)
      this.dataarray = new Float32Array(NLazar.fftSize);
    NLazar.getFloatTimeDomainData(this.dataarray);
    // const step = canvas.width/NLazar.fftSize;
    
    let max=0;
    for (let a=0;a<NLazar.fftSize;a++){
      if(Math.abs(this.dataarray[a])>max){
        max = Math.abs(this.dataarray[a]);
      }
    }
    this.draw(max);
  }
  draw(max){
    /* dB Meter */
    const g = this.g;

    g.lineWidth=10;
    g.lineCap = "round";
    
    //background
    g.clearRect(0,0,this.canvas.width,this.canvas.height);

    g.strokeStyle = "darkgray";
    g.beginPath();
    g.moveTo(12,this.canvas.height/2);
    g.lineTo((this.canvas.width-12),this.canvas.height/2);
    g.stroke();

    //foreground
    if (max > 0){
      g.globalCompositeOperation = "source-atop";
      g.lineCap="butt";
      g.strokeStyle = "orange";
      g.beginPath();
      g.moveTo(7,this.canvas.height/2);
      g.lineTo(max*(this.canvas.width-7),this.canvas.height/2);
      g.stroke();
      g.globalCompositeOperation = "source-over";
    }
    
    /* VolumeSlider */
    g.fillStyle = "gray";
    g.beginPath();
    g.moveTo(this.track.gain*(this.canvas.width-14)+14,this.canvas.height/2);
    g.arc(this.track.gain*(this.canvas.width-14)+7,this.canvas.height/2,7,0,Math.PI*2);
    g.fill(); 


  }


  hook(canvas) {
    const g = canvas.getContext('2d');
    this.canvas = canvas;
    this.g = g;
    this.draw(0);
  }
}
