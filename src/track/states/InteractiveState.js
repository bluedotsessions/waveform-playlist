import { pixelsToSeconds , secondsToPixels } from '../../utils/conversions';

export default class {
  constructor(clip) {
    this.clip = clip;
    // 0 : not dragging; 1 : dragging the end; -1 : dragging the begining
    this.draggingFrom = 0;
    this.action = null;
    this.bufferedMovement = 0;
    this._activeClip = {name:'_none',startTime:0}; 
    this.setupEventListeners();
  }

  set activeClip(clip){
    if (!this.action || this.action == 'none' || this.action.includes('able'))
      this._activeClip = clip;
  }
  get activeClip(){
    return this._activeClip;
  }

  setupEventListeners(){
    const self = this;
    this.clip.ee.on("playlistmouseleave",e=>{
      if (this.clip && this.clip.state != 'interactive')
        return;
      self.mouseleave.call(self,e);
    })
    this.clip.ee.on("playlistmouseup",e=>{
      if (this.clip && this.clip.state != 'interactive')
        return;
      self.mouseup.call(self,e);
    })
    this.clip.ee.on("playlistmousedown",e=>{
      if (this.clip && this.clip.state != 'interactive')
        return;
      self.mousedown.call(self,e);
    })
    this.clip.ee.on("playlistmousemove",e=>{
      if (this.clip && this.clip.state != 'interactive')
        return;
      self.mousemove.call(self,e);
    })
  }
  
  setup(samplesPerPixel, sampleRate) {
    this.samplesPerPixel = samplesPerPixel;
    this.sampleRate = sampleRate;
  }

  emitShift(x) {
    const deltaX = x - this.prevX;
    const deltaTime = pixelsToSeconds(deltaX, this.samplesPerPixel, this.sampleRate);
    this.prevX = x;
    this.clip.ee.emit('shift', deltaTime, this.clip);
  }

  mousedown(e) {
    if (this.action == "fadedraggable")
      this.action = "dragginghandle";
    else if (this.action == "resizeableleft"){
      this.startAt = this.getMousepos(e);
      this.action = "resizingleft";
    }
    else if (this.action == "resizeableright"){
      this.startAt = this.getMousepos(e);
      this.oldCueOutForResising = this.activeClip.cueOut;
      this.action = "resizingright";
    }
    else if (this.action == "shiftable")
      this.action = "shifting"
    else if (e.target.className == "waveform"){
      this.seekTo(e);
    }
    // else if (this.action == "scrolldraggable" && e.target.className == "waveform"){
      //this.action = "scrolldraggingcandidate";
      //this.clip.ee.emit("scrolldraggingstart");
    // }
    // console.log(this.clip);
  }
  
  mousemove(e) {
    // const mousepos = pixelsToSeconds(this.correctOffset(e), this.samplesPerPixel, this.sampleRate);
    // if (!mousepos)return;
    // console.log(this.action);
    const mousepos = this.getMousepos(e);
    const movementX = pixelsToSeconds(e.movementX, this.samplesPerPixel, this.sampleRate);
    if (this.action == "dragginghandle"){
      // console.log(mousepos,this.clip.getStartTime(),this.clip.startTime);
      // console.log(mousepos,this.activeClip.duration)
      const clampped = Math.min( Math.max(mousepos, 0),this.activeClip.duration);
        if (this.hoveringover == "fadein")
          this.ee.emit('fadein', clampped , this.activeClip);
        else
          this.ee.emit('fadeout', this.activeClip.duration - clampped,this.activeClip);
    }
    else if (this.action == "resizingleft" || this.action == "resizingright"){
      this.updateResizing(e);
    }
    else if (this.action == "shifting"){
      const blocklength = (60 / this.activeClip.bpm)*this.activeClip.quantize; //in seconds
      this.bufferedMovement += movementX; //in seconds
      const snaps = Math.round(this.bufferedMovement/blocklength);
      if (snaps != 0){
        this.ee.emit("shift",snaps*blocklength,this.activeClip);
        this.bufferedMovement = this.bufferedMovement - snaps*blocklength;
      }
    }
    else if (this.action == "split"){
      document.body.style.cursor = "text";
    }
    else if (e.target.classList.contains('fadehandle')){
      this.action = "fadedraggable";
      this.hoveringover = e.target.classList.contains('fadein')?"fadein":"fadeout";
      
      document.body.style.cursor = "pointer";
    }
    // else if (this.action == "scrolldragging" || this.action == "scrolldraggingcandidate"){
    //   this.ee.emit("scrolldragging",e.movementX);
    //   this.action = "scrolldragging";
    // }
    else if (e.target.className == "handleContainer right"){
      this.action = "resizeableright"
      document.body.style.cursor = "e-resize";
    }
    else if (e.target.className == "handleContainer left"){
      this.action = "resizeableleft"
      document.body.style.cursor = "w-resize";
    }
    else if (e.target.className == "clip"){
      this.action = "shiftable";
      document.body.style.cursor = "grab";

    }
    // else if (e.target.className == "waveform"){
    //   document.body.style.cursor = "auto";
    //   this.action = "scrolldraggable";
    // }
    else{
      this.action = null;
      document.body.style.cursor = "auto";
    }
    // console.log(this.action);
  }


  seekTo(e) {
    e.preventDefault();
    // console.log("seek");
    const startTime = this.getMousepos(e);
    // const startTime = pixelsToSeconds(startX, this.samplesPerPixel, this.sampleRate);
    this.clip.ee.emit('select', startTime, startTime, this.clip);
  }

  mouseleave = e => {
    this.mouseup(e);
    this.mousemove(e);
    document.body.style.cursor = "auto";
  };

  getMousepos(e){
    const waveform = document.body.querySelector(".waveform");
    if (!waveform)return null;
    const relative = e.pageX - waveform.getBoundingClientRect().left;
    const seconds = pixelsToSeconds(relative, this.samplesPerPixel, this.sampleRate);
    // console.log(relative, this.samplesPerPixel, this.sampleRate);
    return seconds - this.activeClip.startTime;
  } 

  updateResizing(e){
    let mousepos = this.getMousepos(e) - this.startAt ;
    // console.log("mousepos",mousepos,this.startAt);
    const activeClip = this.activeClip;
    if (activeClip.quantize){ 
      const blocklength = ( 60 / activeClip.bpm ) * activeClip.quantize;
      mousepos = Math.round( mousepos / blocklength ) * blocklength;
    }
    if (this.action == "resizingleft"){
      // console.log(activeClip.cueIn + mousepos);
      if (activeClip.cueIn + mousepos <= 0)
        mousepos = -activeClip.cueIn;
      if (activeClip.cueIn + mousepos - activeClip.cueOut >= -4)
        mousepos = -4 + activeClip.cueOut - activeClip.cueIn;
      const oldStartTime = activeClip.startTime;
      const oldCueIn = activeClip.cueIn;
      activeClip.startTime = oldStartTime + mousepos;
      activeClip.cueIn = oldCueIn + mousepos;
    }
    if (this.action == "resizingright"){
      if (this.oldCueOutForResising + mousepos > activeClip.buffer.duration)
        mousepos = activeClip.buffer.duration - this.oldCueOutForResising;
      if (this.oldCueOutForResising + mousepos - activeClip.cueIn < 4) 
        mousepos = 4 + activeClip.cueIn - this.oldCueOutForResising;
      
      activeClip.cueOut = this.oldCueOutForResising + mousepos;
      const fadeout= activeClip.fades[activeClip.fadeOut];
      const duration = fadeout.end - fadeout.start;
      activeClip.fades[activeClip.fadeOut].start = activeClip.endTime-duration;
      activeClip.fades[activeClip.fadeOut].end = activeClip.endTime;
    }
    
    activeClip.ee.emit("interactive",activeClip);

  }
  mouseup(e) {
    if (this.action == "split"){
      if (e.target.className == 'clip'){
        const time = this.getMousepos(e);
        this.ee.emit('splitAt',{clip:this.activeClip,at:time});
      }
 
      this.action = null; 
      
    }
    else if (this.action == "dragginghandle" || this.action == "shifting"){
      this.action = null;
      this.bufferedMovement = 0;
    }
    else if (this.action == "resizingleft" || this.action == "resizingright") {
      e.preventDefault();
      this.updateResizing(e);
      this.action = null;
      // console.log("dropped");
    }
  }

  static getClass() {
    return '.state-interactive';
  }

  static getEvents() {
    return [];
  }
}
