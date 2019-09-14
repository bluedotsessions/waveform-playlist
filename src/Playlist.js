import _defaults from 'lodash.defaults';

import h from 'virtual-dom/h';
import diff from 'virtual-dom/diff';
import patch from 'virtual-dom/patch';
import InlineWorker from 'inline-worker';

import { pixelsToSeconds, samplesToSeconds, secondsToSamples } from './utils/conversions';
import LoaderFactory from './track/loader/LoaderFactory';
import ScrollHook from './render/ScrollHook';
import TimeScale from './TimeScale';
import Track from './Track';
import Clip from './Clip';
import Playout from './Playout';
import AnnotationList from './annotation/AnnotationList';

import RecorderWorkerFunction from './utils/recorderWorker';
import ExportWavWorkerFunction from './utils/exportWavWorker';

import stateClasses from './track/states';


export default class {
  constructor() {
    
    this.tracks = [];
    this.buffers= new Map;
    this.clips = [];
    this.soloedTracks = [];
    this.mutedTracks = [];
    this.playoutPromises = [];
    this.tracksids = 0;

    this.cursor = 0;
    this.playbackSeconds = 0;
    this.duration = 0;
    this.scrollLeft = 0;


    this.scrollTimer = undefined;
    this.showTimescale = false;
    this.scrolldragging = false;
    this.seekClicking = true;
    // whether a user is scrolling the waveform
    this.isScrolling = false;

    this.fadeType = 'logarithmic';
    this.masterGain = 1;
    this.annotations = [];
    this.durationFormat = 'hh:mm:ss.uuu';
    this.isAutomaticScroll = false;
    this.resetDrawTimer = undefined;
  }

  // TODO extract into a plugin
  initExporter() {
    this.exportWorker = new InlineWorker(ExportWavWorkerFunction);
  }

  // TODO extract into a plugin
  initRecorder(stream) {
    this.mediaRecorder = new window.MediaRecorder(stream);

    this.mediaRecorder.onstart = () => {
      const track = new Track(this.tracksids ++);
      track.setName('Recording');
      track.setEnabledStates();
      track.setEventEmitter(this.ee);

      this.recordingTrack = track;
      this.tracks.push(track);

      this.chunks = [];
      this.working = false;
    };

    this.mediaRecorder.ondataavailable = (e) => {
      this.chunks.push(e.data);

      // throttle peaks calculation
      if (!this.working) {
        const recording = new Blob(this.chunks, { type: 'audio/ogg; codecs=opus' });
        const loader = LoaderFactory.createLoader(recording, this.ac);
        loader.load().then((audioBuffer) => {
          // ask web worker for peaks.
          this.recorderWorker.postMessage({
            samples: audioBuffer.getChannelData(0),
            samplesPerPixel: this.samplesPerPixel,
          });
          this.recordingTrack.setCues(0, audioBuffer.duration);
          this.recordingTrack.setBuffer(audioBuffer);
          this.recordingTrack.setPlayout(new Playout(this.ac, audioBuffer));
          this.adjustDuration();
        });
        this.working = true;
      }
    };

    this.mediaRecorder.onstop = () => {
      this.chunks = [];
      this.working = false;
    };

    this.recorderWorker = new InlineWorker(RecorderWorkerFunction);
    // use a worker for calculating recording peaks.
    this.recorderWorker.onmessage = (e) => {
      this.recordingTrack.setPeaks(e.data);
      this.working = false;
      this.drawRequest();
    };
  }

  setShowTimeScale(show) {
    this.showTimescale = show;
  }

  setMono(mono) {
    this.mono = mono;
  }

  setExclSolo(exclSolo) {
    this.exclSolo = exclSolo;
  }

  setSeekStyle(style) {
    this.seekStyle = style;
  }

  getSeekStyle() {
    return this.seekStyle;
  }

  setSampleRate(sampleRate) {
    this.sampleRate = sampleRate;
  }

  setSamplesPerPixel(samplesPerPixel) {
    this.samplesPerPixel = samplesPerPixel;
  }

  setAudioContext(ac) {
    this.ac = ac;
  }

  setControlOptions(controlOptions) {
    this.controls = controlOptions;
  }

  setWaveHeight(height) {
    this.waveHeight = height;
  }

  setColors(colors) {
    this.colors = colors;
  }

  setAnnotations(config) {
    this.annotationList = new AnnotationList(
      this,
      config.annotations,
      config.controls,
      config.editable,
      config.linkEndpoints,
      config.isContinuousPlay,
    );
  }

  setEventEmitter(ee) {
    this.ee = ee;
  }

  getEventEmitter() {
    return this.ee;
  }

  setTracks(tracks){
    for ({name} of tracks){
      let newTrack = new Track(this.tracksids++);
      newTrack.setName(name);
      newTrack.quantize = this.quantize;
      newTrack.bpm = this._bpm;
      newTrack.setEventEmitter(this.ee);
      this.tracks.push(newTrack);
    }
  }
  set bpm(bpm){
    this._bpm = bpm;
    this.tracks.forEach(track=>{
      track.bpm = bpm;
      track.clips.forEach(clip=>{
        clip.bpm = bpm;
      })
    })
    this.ee.emit('interactive');
  }
  get bpm(){
    return this._bpm;
  }

  setUpEventEmitter() {
    const ee = this.ee;

    ee.on('showMenu',clip=>{

      clip.showMenu = true;
      if(this.openedMenuClip){
        this.openedMenuClip.showMenu = false;
      }
      this.openedMenuClip = clip;
    
      this.drawRequest();
    })
    ee.on('playlistmousedown',()=>{
      if(this.openedMenuClip){
        this.openedMenuClip.showMenu = false;
        delete this.openedMenuClip;
      }
    })

    ee.on ('interactive', (track) => {
      this.drawRequest();
    });

    ee.on('activeclip',(clip)=>{
      const segment = 60/clip.bpm;
      console.log(clip.name,clip.startTime/segment);
      this.stateObj.activeClip = clip;
    })

    ee.on('panknob',track=>{
    //   track.pan = track.pan;
      this.drawRequest();
    })

    ee.on('automaticscroll', (val) => {
      this.isAutomaticScroll = val;
    });

    ee.on('destroy',track=>{
      for (var a in this.tracks){
        if (this.tracks[a] == track){
          this.tracks[a].scheduleStop();
          this.tracks.splice(a,1);
          break;
        }
      }
      this.drawRequest();
    })

    ee.on('durationformat', (format) => {
      this.durationFormat = format;
      this.drawRequest();
    });

    ee.on('select', (start, end, track) => {
      if (this.isPlaying()) {
        this.lastSeeked = start;
        this.pausedAt = undefined;
        this.restartPlayFrom(start);
      } else {
        // reset if it was paused.
        this.seek(start, end, track);
        this.ee.emit('timeupdate', start);
        this.drawRequest();
      }
    });

    ee.on('startaudiorendering', (type) => {
      this.startOfflineRender(type);
    });

    ee.on('statechange', (state) => {
      this.setState(state);
      this.drawRequest();
    });

    ee.on('shift', (deltaTime, clip) => {
      clip.setStartTime(clip.getStartTime() + deltaTime);
      this.adjustDuration();
      this.drawRequest();
    });

    ee.on('record', () => {
      this.record();
    });

    ee.on('play', (start, end) => {
      this.play(start, end);
    });

    ee.on('pause', () => {
      this.pause();
    });

    ee.on('stop', () => {
      this.stop();
    });

    ee.on('rewind', () => {
      this.rewind();
    });

    ee.on('fastforward', () => {
      this.fastForward();
    });

    ee.on('clear', () => {
      this.clear().then(() => {
        this.drawRequest();
      });
    });

    ee.on('solo', (track) => {
      this.soloTrack(track);
      this.adjustTrackPlayout();
      this.drawRequest();
    });

    ee.on('mute', (track) => {
      this.muteTrack(track);
      this.adjustTrackPlayout();
      this.drawRequest();
    });

    ee.on('volumechange', (volume, track) => {
      track.setGainLevel(volume / 100);
    });

    ee.on('mastervolumechange', (volume) => {
      this.masterGain = volume / 100;
      this.tracks.forEach((track) => {
        track.setMasterGainLevel(this.masterGain);
      });
    });

    ee.on('fadein', (duration, clip) => {
      clip.setFadeIn(duration, this.fadeType);
      // this.drawRequest();
    });

    ee.on('fadeout', (duration, clip) => {
      clip.setFadeOut(duration, this.fadeType);
      // this.drawRequest();
    });

    ee.on('fadetype', (type) => {
      this.fadeType = type;
    });

    ee.on('newtrack', (file) => {
      this.load([{
        src: file,
        name: file.name,
      }]);
    });

    ee.on('trim', () => {
      const track = this.getActiveTrack();
      const timeSelection = this.getTimeSelection();

      track.trim(timeSelection.start, timeSelection.end);
      track.calculatePeaks(this.samplesPerPixel, this.sampleRate);

      this.setTimeSelection(0, 0);
      this.drawRequest();
    });

    ee.on('zoomin', () => {
      const zoomIndex = Math.max(0, this.zoomIndex - 1);
      const zoom = this.zoomLevels[zoomIndex];

      if (zoom !== this.samplesPerPixel) {
        this.setZoom(zoom);
        this.drawRequest();
      }
    });

    ee.on('zoomout', () => {
      const zoomIndex = Math.min(this.zoomLevels.length - 1, this.zoomIndex + 1);
      const zoom = this.zoomLevels[zoomIndex];

      if (zoom !== this.samplesPerPixel) {
        this.setZoom(zoom);
        this.drawRequest();
      }
    });

    ee.on('scroll', () => {
      this.isScrolling = true;
      this.drawRequest();
      clearTimeout(this.scrollTimer);
      this.scrollTimer = setTimeout(() => {
        this.isScrolling = false;
      }, 200);
    });
    ee.on('seek',where=>{
      this.seek(where);
      // console.log('yo',where);
      
    });
    ee.on('splitStart',clip=>{
      this.stateObj.action = "split";
    })
    ee.on('splitAt',({clip,at})=>{
      let info = clip.getTrackDetails();
      info.name = "Copy of " + info.name;
      info.start = clip.startTime + at;
      info.cuein = clip.cueIn+at;
      info.cueout = clip.cueOut;
      this.createClip(clip.buffer,info,false,clip.peaks);

      clip.endTime = clip.startTime + at;

      this.ee.emit('interactive');
    })
    ee.on('duplicate',clip=>{
      let info = clip.getTrackDetails();
      info.track=info.track.name;
      info.name = "Copy of " + info.name;
      info.start = clip.endTime;
      info.end = clip.endTime + clip.duration; 
      this.createClip(clip.buffer,info,false,clip.peaks);
      this.ee.emit('interactive');
    })
    ee.on('delete',clip=>{
      const t = clip.track.clips.indexOf(clip);
      clip.track.clips.splice(t,1);
      this.ee.emit('interactive');
    })
  }

  getTrackByName(name){
    for (var track of this.tracks)
      if (track.name == name)
        return track;
    return false;
  }

  createClip(audioBuffer,info,removeSilences=true,readypeaks){
    const name = info.name || 'Untitled';
    const start = info.start || 0;
    const states = info.states || {};
    const fadeIn = info.fadeIn;
    const fadeOut = info.fadeOut;
    const cueIn = info.cuein || 0;
    const cueOut = info.cueout || audioBuffer.duration;
    const gain = info.gain || 1;
    const trackname = info.track || `Clip ${name}`;
    // const muted = info.muted || false;
    // const soloed = info.soloed || false;
    // const selection = info.selected;
    const peaks = info.peaks || { type: 'WebAudio', mono: this.mono };
    const customClass = info.customClass || undefined;
    const waveOutlineColor = info.waveOutlineColor || undefined;

    // webaudio specific playout for now.
    const playout = new Playout(this.ac, audioBuffer);

    let track = this.getTrackByName(trackname);
    if (!track){
      track = new Track(this.tracksids++);
      track.analyzer = this.ac.createAnalyser();
      track.name = trackname;
      track.quantize = this.quantize;
      track.bpm = this.bpm;
      track.setEventEmitter(this.ee);

      this.tracks.push(track);
    }

    const clip = new Clip(audioBuffer);
    clip.src = info.src;
    clip.setName(name);
    clip.setEventEmitter(this.ee);
    clip.setEnabledStates(states);
    clip.setCues(cueIn, cueOut);
    clip.setCustomClass(customClass);
    clip.setWaveOutlineColor(waveOutlineColor);
    clip.setTrack(track);
    clip.setState(this.state);

    clip.bpm = this.bpm;
    clip.quantize = this.quantize;

    track.assign(clip);

    if (fadeIn !== undefined) {
      clip.setFadeIn(fadeIn.duration, fadeIn.shape);
    }
    else if (this.getState() == 'interactive'){
      clip.setFadeIn(0.01, "logarithmic");
    }

    if (fadeOut !== undefined) {
      clip.setFadeOut(fadeOut.duration, fadeOut.shape);
    }
    else if (this.getState() == 'interactive'){
      clip.setFadeOut(0.01, "logarithmic");
    }




    // clip.setState(this.getState());
    clip.setStartTime(start);
    clip.setPlayout(playout);

    clip.setGainLevel(gain);

    // extract peaks with AudioContext for now.
    if (readypeaks !== undefined)
      clip.peaks = readypeaks;
    else
      clip.calculatePeaks(this.samplesPerPixel, this.sampleRate);

    if(removeSilences){
      this.removeSilences(clip);
    }
    this.clips.push(clip);
    return clip;
  }

  removeSilences(clip){
    const track = clip.track;
    const bpm = track.bpm;
    const minimumSilence = 5*this.sampleRate;
    const buffer = clip.buffer;
    const samples = buffer.getChannelData(0);
    const startTime = clip.startTime;
    const cueIn = clip.cueIn;
    const cueOut = clip.cueOut;
    const cueInSamp = secondsToSamples(cueIn,this.sampleRate)
    const cueOutSamp = secondsToSamples(cueOut,this.sampleRate)
    const secsperbeat = 60/bpm;
    let startofSilence = NaN;
    let endofSilenece = NaN;
    const threshhold = 0.01;

    for (let a=cueInSamp;a<cueOutSamp;a++){
      if(!isNaN(startofSilence) && Math.abs(samples[a])>threshhold){
        if(a - startofSilence > minimumSilence){
          let qpoint = a;
          while(qpoint>0){
            const secs = samplesToSeconds(qpoint,this.sampleRate) + startTime - cueIn;
            const secsprev =  samplesToSeconds(qpoint-1,this.sampleRate) + startTime - cueIn;
            if (Math.floor(secs / secsperbeat) > Math.floor(secsprev / secsperbeat)){
              this.removeSamples(clip,startofSilence,qpoint);
              break;
            }
            qpoint --;
          }
        }
        startofSilence = NaN;
      }
      else if (isNaN(startofSilence) && Math.abs(samples[a])<=threshhold){
        if (!track.bpm){
          startofSilence = a;
        }
        else{
          const secs = samplesToSeconds(a,this.sampleRate) + startTime - cueIn;
          const secsprev =  samplesToSeconds(a-1,this.sampleRate) + startTime - cueIn;

          const beatNumber = secs / secsperbeat;
          if (Math.floor(secs / secsperbeat) > Math.floor(secsprev / secsperbeat)){
            startofSilence = a;
          }
        }
      }
    }
    if (!isNaN(startofSilence) && samples.length - startofSilence > minimumSilence){
      this.removeSamples(clip,startofSilence,samples.length);
    }
  }
  removeSamples(clip,start,end){
    const startSec = samplesToSeconds(start,this.sampleRate);
    const endSec = samplesToSeconds(end,this.sampleRate);
    const cueInSamp = samplesToSeconds(clip.cueIn,this.sampleRate);
    if (start == cueInSamp){
      clip.cueIn += endSec;
      clip.startTime += endSec; 
    }
    else if (end == clip.buffer.length){
      clip.cueOut = startSec;
    }
    else{
      
      let info = clip.getTrackDetails();
      
      info.cueout = startSec;
      console.log(
        clip.name,
        this.secondsToMinutes(info.start),
        this.secondsToMinutes(info.start+info.cueout-info.cuein),
      );
      if (info.cueout - info.cuein >= 0.2)
        this.createClip(clip.buffer,info,false,clip.peaks);
      
      clip.startTime += endSec - clip.cueIn;
      clip.cueIn = endSec;
    }
  }
  secondsToMinutes(sec){
    const min = sec/60|0;
    const secs = (sec - min*60)|0;
    return `${min}:${secs/10|0}${secs%10}`
  }

  async load(clipList) {
    const loadPromises = clipList.map((clipInfo) => {
      const p = this.buffers.get(clipInfo.src);
      if (p === undefined){
        const promise = LoaderFactory.createLoader(clipInfo.src, this.ac, this.ee).load();
        this.buffers.set(clipInfo.src,promise);
        return promise;
      }  
      else {
        return p;
      }
    });

    let audioBuffers = await Promise.all(loadPromises);
    console.log(audioBuffers);

    this.ee.emit('audiosourcesloaded');
    
    audioBuffers.forEach(
      (audioBuffer, index) => this.createClip(audioBuffer, clipList[index])
    )
    this.reasignClips();
    this.adjustDuration();
    this.draw(this.render());

    this.ee.emit('audiosourcesrendered');
  }

  reasignClips(){
    this.tracks.forEach(track=>track.unasignAll());
    for (var clip of this.clips)
      for (var track of this.tracks)
        if (clip.track.name == track.name)
          track.assign(clip);
  }
  /*
    track instance of Track.
  */
  setActiveTrack(track) {
    this.activeTrack = track;
  }

  getActiveTrack() {
    return this.activeTrack;
  }

  isSegmentSelection() {
    return this.timeSelection.start !== this.timeSelection.end;
  }

  /*
    start, end in seconds.
  */
  setTimeSelection(start = 0, end) {
    this.timeSelection = {
      start,
      end: (end === undefined) ? start : end,
    };

    this.cursor = start;
  }

  startOfflineRender(type) {
    if (this.isRendering) {
      return;
    }

    this.isRendering = true;
    this.offlineAudioContext = new OfflineAudioContext(2, 44100 * this.duration, 44100);

    const currentTime = this.offlineAudioContext.currentTime;

    this.tracks.forEach((track) => {
      track.clips.forEach(clip=>{
        clip.setOfflinePlayout(new Playout(this.offlineAudioContext, clip.buffer));
        clip.schedulePlay(currentTime, 0, 0, {
          shouldPlay: this.shouldTrackPlay(clip),
          masterGain: 1,
          isOffline: true,
        });
      })
    });

    /*
      TODO cleanup of different audio playouts handling.
    */
    this.offlineAudioContext.startRendering().then((audioBuffer) => {
      if (type === 'buffer') {
        this.ee.emit('audiorenderingfinished', type, audioBuffer);
        this.isRendering = false;
        return;
      }

      if (type === 'wav') {
        this.exportWorker.postMessage({
          command: 'init',
          config: {
            sampleRate: 44100,
          },
        });

        // callback for `exportWAV`
        this.exportWorker.onmessage = (e) => {
          this.ee.emit('audiorenderingfinished', type, e.data);
          this.isRendering = false;

          // clear out the buffer for next renderings.
          this.exportWorker.postMessage({
            command: 'clear',
          });
        };

        // send the channel data from our buffer to the worker
        this.exportWorker.postMessage({
          command: 'record',
          buffer: [
            audioBuffer.getChannelData(0),
            audioBuffer.getChannelData(1),
          ],
        });

        // ask the worker for a WAV
        this.exportWorker.postMessage({
          command: 'exportWAV',
          type: 'audio/wav',
        });
      }
    }).catch((e) => {
      throw e;
    });
  }

  getTimeSelection() {
    return this.timeSelection;
  }

  setState(state) {
    this.state = state;
    const StateClass = stateClasses[this.state];
    this.stateObj = new StateClass(this);
    this.stateObj.ee = this.ee;
    this.stateObj.setup(this.samplesPerPixel,this.sampleRate);
    this.tracks.forEach((track) => track.setState(state));
  }1

  getState() {
    return this.state;
  }

  setZoomIndex(index) {
    this.zoomIndex = index;
  }

  setZoomLevels(levels) {
    this.zoomLevels = levels;
  }

  setZoom(zoom) {
    this.samplesPerPixel = zoom;
    this.zoomIndex = this.zoomLevels.indexOf(zoom);
    this.stateObj.setup(this.samplesPerPixel,this.sampleRate);
    this.tracks.forEach(track => {
      track.clips.forEach((clip,index)=>{
        let a;
        for (a=0;a<index;a++){
          if(track.clips[a].buffer === clip.buffer){
            clip.setPeaks(track.clips[a].peaks);
            break;
          }
        }
        if (a==index)
          clip.calculatePeaks(zoom, this.sampleRate)
      });
    });
  }

  muteTrack(track) {
    const index = this.mutedTracks.indexOf(track);

    if (index > -1) {
      this.mutedTracks.splice(index, 1);
    } else {
      this.mutedTracks.push(track);
    }
  }

  soloTrack(track) {
    const index = this.soloedTracks.indexOf(track);

    if (index > -1) {
      this.soloedTracks.splice(index, 1);
    } else if (this.exclSolo) {
      this.soloedTracks = [track];
    } else {
      this.soloedTracks.push(track);
    }
  }

  adjustTrackPlayout() {
    this.tracks.forEach((track) => {
      track.setShouldPlay(this.shouldTrackPlay(track));
    });
  }

  adjustDuration() {
    this.duration = this.tracks.reduce(
      (duration, track) => Math.max(duration, track.getEndTime()),
      0,
    );
  }

  shouldTrackPlay(track) {
    let shouldPlay;
    // if there are solo tracks, only they should play.
    if (this.soloedTracks.length > 0) {
      shouldPlay = false;
      if (this.soloedTracks.indexOf(track) > -1) {
        shouldPlay = true;
      }
    } else {
      // play all tracks except any muted tracks.
      shouldPlay = true;
      if (this.mutedTracks.indexOf(track) > -1) {
        shouldPlay = false;
      }
    }

    return shouldPlay;
  }

  isPlaying() {
    return this.tracks.reduce(
      (isPlaying, track) => isPlaying || track.isPlaying(),
      false,
    );
  }

  /*
  *   returns the current point of time in the playlist in seconds.
  */
  getCurrentTime() {
    const cursorPos = this.lastSeeked || this.pausedAt || this.cursor;

    return cursorPos + this.getElapsedTime();
  }

  getElapsedTime() {
    return this.ac.currentTime - this.lastPlay;
  }

  setMasterGain(gain) {
    this.ee.emit('mastervolumechange', gain);
  }

  restartPlayFrom(start, end) {
    this.stopAnimation();

    this.tracks.forEach((editor) => {
      editor.scheduleStop();
    });

    return Promise.all(this.playoutPromises).then(this.play.bind(this, start, end));
  }

  play(startTime, endTime) {
    clearTimeout(this.resetDrawTimer);

    const currentTime = this.ac.currentTime;
    const selected = this.getTimeSelection();
    const playoutPromises = [];

    const start = startTime || this.pausedAt || this.cursor;
    let end = endTime;

    if (!end && selected.end !== selected.start && selected.end > start) {
      end = selected.end;
    }

    if (this.isPlaying()) {
      return this.restartPlayFrom(start, end);
    }

    /*
    this.tracks.forEach((track) => {
      track.clips.forEach(clip=>{
        clip.setOfflinePlayout(new Playout(this.offlineAudioContext, clip.buffer));
        clip.schedulePlay(currentTime, 0, 0, {
          shouldPlay: this.shouldTrackPlay(clip),
          masterGain: 1,
          isOffline: true,
        });
      })
    });
    */

    this.tracks.forEach((track) => {
      // track.setState('cursor');
      playoutPromises.push(track.schedulePlay(currentTime, start, end, {
        shouldPlay: this.shouldTrackPlay(track),
        masterGain: this.masterGain,
      }));
    });
    this.tracks.forEach(track=>track.play(this.ac.currentTime,start,end));

    this.lastPlay = this.ac.currentTime;
    // use these to track when the playlist has fully stopped.
    this.playoutPromises = playoutPromises;
    this.startAnimation(start);

    return Promise.all(this.playoutPromises);
  }

  pause() {
    if (!this.isPlaying()) {
      return Promise.all(this.playoutPromises);
    }

    this.pausedAt = this.getCurrentTime();
    return this.playbackReset();
  }

  stop() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }

    this.pausedAt = undefined;
    this.playbackSeconds = 0;
    return this.playbackReset();
  }

  playbackReset() {
    this.lastSeeked = undefined;
    this.stopAnimation();

    this.tracks.forEach((track) => {
      track.scheduleStop();
      // track.setState(this.getState());
    });

    this.drawRequest();
    return Promise.all(this.playoutPromises);
  }

  rewind() {
    return this.stop().then(() => {
      this.scrollLeft = 0;
      this.ee.emit('select', 0, 0);
    });
  }

  fastForward() {
    return this.stop().then(() => {
      if (this.viewDuration < this.duration) {
        this.scrollLeft = this.duration - this.viewDuration;
      } else {
        this.scrollLeft = 0;
      }

      this.ee.emit('select', this.duration, this.duration);
    });
  }

  clear() {
    return this.stop().then(() => {
      this.tracks = [];
      this.soloedTracks = [];
      this.mutedTracks = [];
      this.playoutPromises = [];

      this.cursor = 0;
      this.playbackSeconds = 0;
      this.duration = 0;
      this.scrollLeft = 0;

      this.seek(0, 0, undefined);
    });
  }

  record() {
    const playoutPromises = [];
    this.mediaRecorder.start(300);

    this.tracks.forEach((track) => {
      // track.setState('none');
      playoutPromises.push(track.schedulePlay(this.ac.currentTime, 0, undefined, {
        shouldPlay: this.shouldTrackPlay(track),
      }));
    });

    this.playoutPromises = playoutPromises;
  }

  startAnimation(startTime) {
    this.lastDraw = this.ac.currentTime;
    this.animationRequest = window.requestAnimationFrame(() => {
      this.updateEditor(startTime);
    });
  }

  stopAnimation() {
    window.cancelAnimationFrame(this.animationRequest);
    this.lastDraw = undefined;
  }

  seek(start, end, track) {
    if (this.isPlaying()) {
      this.lastSeeked = start;
      this.pausedAt = undefined;
      this.restartPlayFrom(start);
    } else {
      // reset if it was paused.
      this.setActiveTrack(track || this.tracks[0]);
      this.pausedAt = start;
      this.setTimeSelection(start, end);
      if (this.getSeekStyle() === 'fill') {
        this.playbackSeconds = start;
      }
    }
  }

  /*
  * Animation function for the playlist.
  * Keep under 16.7 milliseconds based on a typical screen refresh rate of 60fps.
  */
  updateEditor(cursor) {
    const currentTime = this.ac.currentTime;
    const selection = this.getTimeSelection();
    const cursorPos = cursor || this.cursor;
    const elapsed = currentTime - this.lastDraw;

    if (this.isPlaying()) {
      const playbackSeconds = cursorPos + elapsed;
      this.ee.emit('timeupdate', playbackSeconds);
      this.animationRequest = window.requestAnimationFrame(() => {
        this.updateEditor(playbackSeconds);
      });

      this.playbackSeconds = playbackSeconds;
      this.draw(this.render());
      this.tracks.forEach(tr=>tr.updatedBMeter());
      this.lastDraw = currentTime;
    } else {
      if ((cursorPos + elapsed) >=
        (this.isSegmentSelection() ? selection.end : this.duration)) {
        this.ee.emit('finished');
      }

      this.stopAnimation();

      this.resetDrawTimer = setTimeout(() => {
        this.pausedAt = undefined;
        this.lastSeeked = undefined;
        // this.setState(this.getState());

        this.playbackSeconds = 0;
        this.draw(this.render());
      }, 0);
    }
  }

  drawRequest() {
    window.requestAnimationFrame(() => {
      this.draw(this.render());
    });
  }

  draw(newTree) {
    const patches = diff(this.tree, newTree);
    this.rootNode = patch(this.rootNode, patches);
    this.tree = newTree;

    // use for fast forwarding.
    this.viewDuration = pixelsToSeconds(
      this.rootNode.clientWidth - this.controls.width,
      this.samplesPerPixel,
      this.sampleRate,
    );
  }

  getTrackRenderData(data = {}) {
    const defaults = {
      height: this.waveHeight,
      resolution: this.samplesPerPixel,
      sampleRate: this.sampleRate,
      controls: this.controls,
      isActive: false,
      timeSelection: this.getTimeSelection(),
      playlistLength: this.duration,
      playbackSeconds: this.playbackSeconds,
      colors: this.colors,
    };

    return _defaults(data, defaults);
  }

  isActiveTrack(track) {
    const activeTrack = this.getActiveTrack();

    if (this.isSegmentSelection()) {
      return activeTrack === track;
    }

    return true;
  }

  renderAnnotations() {
    return this.annotationList.render();
  }

  renderTimeScale() {
    const controlWidth = this.controls.show ? this.controls.width : 0;
    const timeScale = new TimeScale(this.ee,this.duration, this.scrollLeft,
      this.samplesPerPixel, this.sampleRate, controlWidth);

    return timeScale.render();
  }

  renderTrackSection() {
    const globalEndTime = this.tracks
      .map(tr=>tr.getEndTime())
      .reduce((a,b)=>Math.max(a,b),0);
    const trackElements = this.tracks.map(track =>
      track.render(this.getTrackRenderData({
        globalEndTime,
        isActive: this.isActiveTrack(track),
        shouldPlay: this.shouldTrackPlay(track),
        soloed: this.soloedTracks.indexOf(track) > -1,
        muted: this.mutedTracks.indexOf(track) > -1,
      })),
    );

    return h('div.playlist-tracks',
      {
        attributes: {
          style: 'overflow: auto;',
        },
        onscroll: (e) => {
          this.scrollLeft = pixelsToSeconds(
            e.target.scrollLeft,
            this.samplesPerPixel,
            this.sampleRate,
          );

          this.ee.emit('scroll', this.scrollLeft);
        },
        hook: new ScrollHook(this),
      },
      trackElements,
    );
  }

  render() {
    const containerChildren = [];

    if (this.showTimescale) {
      containerChildren.push(this.renderTimeScale());
    }

    containerChildren.push(this.renderTrackSection());

    if (this.annotationList.length) {
      containerChildren.push(this.renderAnnotations());
    }

    return h('div.playlist',
      {
        onselectstart:event=>event.preventDefault(),
        onmouseleave:event=>this.ee.emit("playlistmouseleave",event),
        onmousedown:event=>this.ee.emit("playlistmousedown",event),
        onmouseup:event=>this.ee.emit("playlistmouseup",event),
        onmousemove:event=>this.ee.emit("playlistmousemove",event),
        attributes: {
          style: 'overflow: hidden; position: relative;',
        },
      },
      containerChildren,
    );
  }

  getInfo() {
    const info = [];

    this.tracks.forEach((track) => {
      info.push(track.getTrackDetails());
    });

    return info;
  }
}
