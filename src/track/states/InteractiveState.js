import { pixelsToSeconds } from '../../utils/conversions';

export default class {
  constructor(clip) {
    this.clip = clip;
    // 0 : not dragging; 1 : dragging the end; -1 : dragging the begining
    this.draggingFrom = 0;
    this.action = null;
    this.activeClip = undefined; 
    this.setupEventListeners();
  }
  
  setupEventListeners(){
    this.clip.ee.on("playlistmouseleave",this.mouseleave.bind(this));
    this.clip.ee.on("playlistmouseup",this.mouseup.bind(this));
    this.clip.ee.on("playlistmousedown",this.mousedown.bind(this));
    this.clip.ee.on("playlistmousemove",this.mousemove.bind(this));
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
    else if (this.action == "resizeableleft")
      this.action = "resizingleft";
    else if (this.action == "resizeableright")
      this.action = "resizingright";
    else if (this.action == "shiftable")
      this.action = "shifting"
    else if (this.action == "scrolldraggable" && e.target.className == "waveform"){
      this.action = "scrolldraggingcandidate";
      this.clip.ee.emit("scrolldraggingstart");
    }
    // console.log(this.clip);
  }
  
  mousemove(e) {
    // const mousepos = pixelsToSeconds(this.correctOffset(e), this.samplesPerPixel, this.sampleRate);
    // if (!mousepos)return;
    const mousepos = this.getMousepos(e);
    const movementX = pixelsToSeconds(e.movementX, this.samplesPerPixel, this.sampleRate);
    // console.log(this.action);
    if (this.action == "dragginghandle"){
      // console.log(mousepos,this.clip.getStartTime(),this.clip.startTime);
      // console.log(mousepos,this.activeClip.duration)
      if (mousepos >= 0 && mousepos <= this.activeClip.duration) {
        if (this.hoveringover == "fadein")
          this.activeClip.ee.emit('fadein', mousepos , this.activeClip);
        else
          this.activeClip.ee.emit('fadeout', this.activeClip.duration - mousepos, this.activeClip);
      }
      else{
        this.action = null;
      }
    }
    else if (this.action == "resizingleft" || this.action == "resizingright"){
      this.updateResizing(e);
    }
    else if (this.action == "shifting"){
      this.activeClip.ee.emit("shift",movementX,this.activeClip)
    }
    else if (e.target.classList.contains('fadehandle')){
      this.action = "fadedraggable";
      this.hoveringover = e.target.classList.contains('fadein')?"fadein":"fadeout";
      
      document.body.style.cursor = "pointer";
    }
    else if (this.action == "scrolldragging" || this.action == "scrolldraggingcandidate"){
      this.activeClip.ee.emit("scrolldragging",e.movementX);
      this.action = "scrolldragging";
    }
    else if (e.target.className == "clip" && e.layerX > e.target.offsetWidth-10){
      this.action = "resizeableright"
      document.body.style.cursor = "e-resize";
    }
    else if (e.target.className == "clip" && e.layerX < 10){
      this.action = "resizeableleft"
      document.body.style.cursor = "w-resize";
    }
    else if (e.target.className == "clip"){
      this.action = "shiftable";
      console.log("hello")
      document.body.style.cursor = "grab";

    }
    else if (e.target.className == "waveform"){
      document.body.style.cursor = "auto";
      this.action = "scrolldraggable";
    }
    else{
      this.action = null;
      document.body.style.cursor = "auto";
    }
    // console.log(this.action);
  }


  seekTo(e) {
    e.preventDefault();
    // console.log("seek");
    const startX = e.offsetX;
    const startTime = pixelsToSeconds(startX, this.samplesPerPixel, this.sampleRate);
    this.clip.ee.emit('select', startTime, startTime, this.clip);
  }

  mouseleave = e => {
    this.mouseup(e);
    this.mousemove(e);
    document.body.style.cursor = "auto";
  };

  getMousepos(e){
    if(!this.activeClip)return null;
    const waveform = document.body.querySelector(".waveform");
    if (!waveform)return null;
    const relative = e.pageX - waveform.getBoundingClientRect().left;
    const seconds = pixelsToSeconds(relative, this.samplesPerPixel, this.sampleRate);
    // console.log(relative, this.samplesPerPixel, this.sampleRate);
    return seconds - this.activeClip.startTime;
  } 

  updateResizing(e){
    let mousepos = this.getMousepos(e);
    const activeClip = this.activeClip;
    if (activeClip.quantize){ 
      const blocklength = ( 60 / activeClip.bpm ) * activeClip.quantize;
      mousepos = Math.round ( mousepos / blocklength)*blocklength;
    }
    if (this.action == "resizingleft"){
      if (activeClip.cueIn + mousepos < 0)return;
      const oldStartTime = activeClip.startTime;
      const oldCueIn = activeClip.cueIn;
      activeClip.startTime = oldStartTime + mousepos;
      activeClip.cueIn = oldCueIn + mousepos;
    }
    if (this.action == "resizingright"){
      if (activeClip.cueOut + mousepos - activeClip.duration > activeClip.buffer.duration)
        return;
      activeClip.cueOut = activeClip.cueOut + mousepos - activeClip.duration;
      const fadeout= activeClip.fades[activeClip.fadeOut];
      const duration = fadeout.end - fadeout.start;
      activeClip.fades[activeClip.fadeOut].start = activeClip.endTime-duration;
      activeClip.fades[activeClip.fadeOut].end = activeClip.endTime;
    }
    
    activeClip.ee.emit("interactive",activeClip);

  }
  mouseup(e) {
    if (this.action == "dragginghandle" || this.action == "shifting"){
      this.action = null;
    }
    else if (this.action == "scrolldraggingcandidate"){
      // this.seekTo(e);
      this.clip.ee.emit("scrolldraggingend",e);
      this.action = null;
    }
    else if (this.action == "scrolldragging"){
      this.action = null;
      this.clip.ee.emit("scrolldraggingend",e);
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
