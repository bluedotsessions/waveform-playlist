import { pixelsToSeconds , secondsToPixels } from '../../utils/conversions';

export default class {
  constructor(ee) {
    this.ee = ee;
    /// 0 : not dragging; 
    /// 1 : dragging the end;
    /// -1 : dragging the begining
    this.draggingFrom = 0;

    /// Action means what the user is doing right now.
    this.action = null;
    this.bufferedMovement = 0;


    /// Each clip has it's own eventlistener
    /// Go to Clip.js/render() for more info.
    this._activeClip = {name:'_none',startTime:0}; 
    this.setupEventListeners();

    /// Go to mousemove()
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
    this.ee.on("playlistmouseleave",e=>{
      self.mouseleave.call(self,e);
    })
    this.ee.on("playlistmouseup",e=>{
      self.mouseup.call(self,e);
    })
    this.ee.on("playlistmousedown",e=>{
      self.mousedown.call(self,e);
    })
    this.ee.on("playlistmousemove",e=>{
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
    this.ee.emit('shift', deltaTime, this.activeClip);
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
    else if (e.target.className == "waveform")
      this.seekTo(e);
  }
  
  updateDraggingFadeHandle(mousepos){
    /// I didn't design the fades :(
    const fadeout= this.activeClip.fades[this.activeClip.fadeOut];
    const fadein= this.activeClip.fades[this.activeClip.fadeIn];
    if (this.hoveringover == "fadein")
      this.ee.emit('fadein', Math.min( Math.max(mousepos, 0),this.activeClip.duration - fadeout.getDuration() - 0.5) , this.activeClip);
    else
      this.ee.emit('fadeout', this.activeClip.duration - Math.min( Math.max(mousepos, fadein.getDuration() + 0.5),this.activeClip.duration),this.activeClip);
    this.ee.emit('interactive');  
    /// For more info go to the events at
    /// ./Playlist.js/setupEventEmmiter()/'fadein'
    /// ./Playlist.js/setupEventEmmiter()/'fadeout'

  }

  updateShifting(movementX){
    if (this.activeClip.quantize){
      /// Example:
      /// x beats per minute
      /// x beats per 60 seconds
      /// x/60 beats per 1 second
      /// 60/x seconds per beat
      const blocklength = (60 / this.activeClip.bpm)*this.activeClip.quantize; //in seconds
      this.bufferedMovement += movementX; //in seconds
      const snaps = Math.round(this.bufferedMovement/blocklength);
      if (snaps != 0){
        this.ee.emit("shift",snaps*blocklength,this.activeClip);
        this.bufferedMovement = this.bufferedMovement - snaps*blocklength;
      }
    }
    else{
      this.ee.emit("shift",movementX,this.activeClip);
    }
    /// more info at playlist.js / setupEventEmmiter() / ee.on('shift'
  }

  mousemove(e) {
    /// Uncomment this to see the actions:
    // console.log(this.action);
    const mousepos = this.getMousepos(e);
    const movementX = pixelsToSeconds(e.movementX, this.samplesPerPixel, this.sampleRate);
    
    /// Mouse is clicked down:
    if (this.action == "dragginghandle"){
      this.updateDraggingFadeHandle(mousepos);
    }
    else if (this.action == "resizingleft" || this.action == "resizingright"){
      this.updateResizing(e);
    }
    else if (this.action == "shifting"){
     this.updateShifting(movementX);
    }
    /// Mouse Hovering Over:
    /// Mouse has a tool:
    else if (this.action == "split"){
      document.body.style.cursor = "text";
    }
    else if (e.target.classList.contains('fadehandle')){
      this.action = "fadedraggable";
      this.hoveringover = e.target.classList.contains('fadein')?"fadein":"fadeout";
      document.body.style.cursor = "pointer";
    }
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
    /// Else action is null.
    else{
      this.action = null;
      document.body.style.cursor = "auto";
    }
  }


  seekTo(e) {
    e.preventDefault();
    // console.log("seek");
    const startTime = this.getMousepos(e);
    // const startTime = pixelsToSeconds(startX, this.samplesPerPixel, this.sampleRate);
    this.ee.emit('select', startTime, startTime, this.activeClip);
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

      /// guards that you don't resize it too small.
      if (activeClip.cueIn + mousepos <= 0)
        mousepos = -activeClip.cueIn;
      if (activeClip.cueIn + mousepos - activeClip.cueOut >= -4)
        mousepos = -4 + activeClip.cueOut - activeClip.cueIn;
      
      /// recalculating the new starts:
      const oldStartTime = activeClip.startTime;
      const oldCueIn = activeClip.cueIn;
      activeClip.startTime = oldStartTime + mousepos;
      activeClip.cueIn = oldCueIn + mousepos;

      ///recalculating the new fades
      const fadeout= activeClip.fades[activeClip.fadeOut];
      const fadein= activeClip.fades[activeClip.fadeIn];
      this.ee.emit('fadein',Math.min(
        fadein.getDuration(),
        this.activeClip.duration - fadeout.getDuration() - 0.5
      ),activeClip)
      this.ee.emit('fadeout',Math.min(
        fadeout.getDuration(),
        activeClip.duration - 0.5
      ),activeClip)

    }
    if (this.action == "resizingright"){
      if (this.oldCueOutForResising + mousepos > activeClip.buffer.duration)
        mousepos = activeClip.buffer.duration - this.oldCueOutForResising;
      if (this.oldCueOutForResising + mousepos - activeClip.cueIn < 4) 
        mousepos = 4 + activeClip.cueIn - this.oldCueOutForResising;
      
      activeClip.cueOut = this.oldCueOutForResising + mousepos;
      
      const fadeout= activeClip.fades[activeClip.fadeOut];
      const fadein= activeClip.fades[activeClip.fadeIn];
      this.ee.emit('fadeout',Math.min(
        fadeout.getDuration(),
        Math.max( activeClip.duration - fadein.getDuration() - 0.5,0.1)
      ),activeClip)
      this.ee.emit('fadein',Math.min(
        fadein.getDuration(),
        this.activeClip.duration - 0.5
      ),activeClip)

     
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
      this.ee.emit('restartplay');
      this.bufferedMovement = 0;
    }
    else if (this.action == "resizingleft" || this.action == "resizingright") {
      e.preventDefault();
      this.ee.emit('restartplay');
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
