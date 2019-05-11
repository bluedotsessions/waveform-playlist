import _assign from 'lodash.assign';
import _forOwn from 'lodash.forown';

import uuid from 'uuid';
import h from 'virtual-dom/h';

import extractPeaks from 'webaudio-peaks';
import { FADEIN, FADEOUT } from 'fade-maker';

import { secondsToPixels, secondsToSamples } from './utils/conversions';
import stateClasses from './track/states';

import CanvasHook from './render/CanvasHook';
import FadeCanvasHook from './render/FadeCanvasHook';

const MAX_CANVAS_WIDTH = 1000;

export default class {

  constructor(buffer) {
    this.name = 'Untitled'; // Track
    this.customClass = undefined; //Track
    this.waveOutlineColor = undefined; //Track
    this.gain = 1; //Track
    this.pan = 0; // Track

    this.ee = undefined;

    this.buffer = buffer;

    this.track = undefined;
    
    this.peakData = { 
      type: 'WebAudio',
      mono: false,
    }; // Clip
    this.fades = {}; // Clip
    this.cueIn = 0; // Clip
    this.cueOut = 0; //Clip
    this.startTime = 0; // Clip
    this.images = []; // Clip

    console.log(this);
  }

  setTrack(track){
    this.track = track;
  }

  get duration(){
    return this.cueOut - this.cueIn;
  }
  
  get endTime(){
    return this.startTime + this.duration;
  }

  setEventEmitter(ee) {
    this.ee = ee;
  }

  setName(name) {
    this.name = name;
  }

  setCustomClass(className) {
    this.customClass = className;
  }

  setWaveOutlineColor(color) {
    this.waveOutlineColor = color;
  }

  setCues(cueIn, cueOut) {
    if (cueOut < cueIn) {
      throw new Error('cue out cannot be less than cue in');
    }

    this.cueIn = cueIn;
    this.cueOut = cueOut;
  }

  /*
  *   start, end in seconds relative to the entire playlist.
  */
  trim(start, end) {
    const trackStart = this.getStartTime();
    const trackEnd = this.endTime;
    const offset = this.cueIn - trackStart;

    if ((trackStart <= start && trackEnd >= start) ||
      (trackStart <= end && trackEnd >= end)) {
      const cueIn = (start < trackStart) ? trackStart : start;
      const cueOut = (end > trackEnd) ? trackEnd : end;

      this.setCues(cueIn + offset, cueOut + offset);
      if (start > trackStart) {
        this.setStartTime(start);
      }
    }
  }

  setStartTime(start) {
    this.startTime = start;
  }

  setPlayout(playout) {
    this.playout = playout;
  }

  setOfflinePlayout(playout) {
    this.offlinePlayout = playout;
  }

  setEnabledStates(enabledStates = {}) {
    const defaultStatesEnabled = {
      cursor: true,
      fadein: true,
      fadeout: true,
      select: true,
      shift: true,
      interactive: true
    };

    this.enabledStates = _assign({}, defaultStatesEnabled, enabledStates);
  }

  setFadeIn(duration, shape = 'logarithmic') {
    if (duration > this.duration) {
      throw new Error('Invalid Fade In');
    }
    // console.log("fade in:",duration);

    const fade = {
      shape,
      start: 0,
      end: duration,
    };

    if (this.fadeIn) {
      this.removeFade(this.fadeIn);
      this.fadeIn = undefined;
    }

    this.fadeIn = this.saveFade(FADEIN, fade.shape, fade.start, fade.end);
  }

  setFadeOut(duration, shape = 'logarithmic') {
    if (duration > this.duration) {
      throw new Error('Invalid Fade Out');
    }

    const fade = {
      shape,
      start: this.duration - duration,
      end: this.duration,
    };

    if (this.fadeOut) {
      this.removeFade(this.fadeOut);
      this.fadeOut = undefined;
    }

    this.fadeOut = this.saveFade(FADEOUT, fade.shape, fade.start, fade.end);
  }

  saveFade(type, shape, start, end) {
    const id = uuid.v4();

    this.fades[id] = {
      type,
      shape,
      start,
      end,
    };

    return id;
  }

  removeFade(id) {
    delete this.fades[id];
  }

  setBuffer(buffer) {
    this.buffer = buffer;
  }

  setPeakData(data) {
    this.peakData = data;
  }

  calculatePeaks(samplesPerPixel, sampleRate) {
    const cueIn = secondsToSamples(this.cueIn, sampleRate);
    const cueOut = secondsToSamples(this.cueOut, sampleRate);
    this.setPeaks(extractPeaks(this.buffer, samplesPerPixel, this.peakData.mono));
    console.log(this.peaks);
  }

  setPeaks(peaks) {
    this.peaks = peaks;
  }

  setState(state) {
    this.state = state;

    if (this.state && this.enabledStates[this.state]) {
      const StateClass = stateClasses[this.state];
      this.stateObj = new StateClass(this);
    } else {
      this.stateObj = undefined;
    }
  }

  getStartTime() {
    return this.startTime;
  }

  isPlaying() {
    return this.playout.isPlaying();
  }

  setShouldPlay(bool) {
    this.playout.setShouldPlay(bool);
  }

  setGainLevel(level) {
    this.gain = level;
    this.playout.setVolumeGainLevel(level);
  }

  setMasterGainLevel(level) {
    this.playout.setMasterGainLevel(level);
  }

  setPan(value){
    if (value){
      this.playout.setPan(value);
    }
    else{
      this.playout.setPan(this.pan);
    }
  }

  /*
    startTime, endTime in seconds (float).
    segment is for a highlighted section in the UI.

    returns a Promise that will resolve when the AudioBufferSource
    is either stopped or plays out naturally.
  */
  schedulePlay(now, startTime, endTime, config) {
    let start;
    let duration;
    let when = now;
    let segment = (endTime) ? (endTime - startTime) : undefined;

    const defaultOptions = {
      shouldPlay: true,
      masterGain: 1,
      isOffline: false,
    };

    const options = _assign({}, defaultOptions, config);
    const playoutSystem = options.isOffline ? this.offlinePlayout : this.playout;

    // 1) track has no content to play.
    // 2) track does not play in this selection.
    if ((this.endTime <= startTime) || (segment && (startTime + segment) < this.startTime)) {
      // return a resolved promise since this track is technically "stopped".
      return Promise.resolve();
    }

    // track should have something to play if it gets here.

    // the track starts in the future or on the cursor position
    if (this.startTime >= startTime) {
      start = 0;
      // schedule additional delay for this audio node.
      when += (this.startTime - startTime);

      if (endTime) {
        segment -= (this.startTime - startTime);
        duration = Math.min(segment, this.duration);
      } else {
        duration = this.duration;
      }
    } else {
      start = startTime - this.startTime;

      if (endTime) {
        duration = Math.min(segment, this.duration - start);
      } else {
        duration = this.duration - start;
      }
    }

    start += this.cueIn;
    const relPos = startTime - this.startTime;
    const sourcePromise = playoutSystem.setUpSource();

    // param relPos: cursor position in seconds relative to this track.
    // can be negative if the cursor is placed before the start of this track etc.
    _forOwn(this.fades, (fade) => {
      let fadeStart;
      let fadeDuration;

      // only apply fade if it's ahead of the cursor.
      if (relPos < fade.end) {
        if (relPos <= fade.start) {
          fadeStart = now + (fade.start - relPos);
          fadeDuration = fade.end - fade.start;
        } else if (relPos > fade.start && relPos < fade.end) {
          fadeStart = now - (relPos - fade.start);
          fadeDuration = fade.end - fade.start;
        }

        switch (fade.type) {
          case FADEIN: {
            playoutSystem.applyFadeIn(fadeStart, fadeDuration, fade.shape);
            break;
          }
          case FADEOUT: {
            playoutSystem.applyFadeOut(fadeStart, fadeDuration, fade.shape);
            break;
          }
          default: {
            throw new Error('Invalid fade type saved on track.');
          }
        }
      }
    });

    playoutSystem.setVolumeGainLevel(this.gain);
    playoutSystem.setShouldPlay(options.shouldPlay);
    playoutSystem.setMasterGainLevel(options.masterGain);
    playoutSystem.setPan(this.pan);
    console.log(when,start,duration);
    playoutSystem.play(when, start, duration);


    return sourcePromise;
  }

  scheduleStop(when = 0) {
    this.playout.stop(when);
  }

  renderOverlay(data) {
    const channelPixels = secondsToPixels(this.duration, data.resolution, data.sampleRate);
    const config = {
      attributes: {
        style: `position: absolute; top: 0; right: 0; bottom: 0; left: -15px; width: ${channelPixels+30}px; z-index: 8;`,
      },
    };

    let overlayClass = '';

    if (this.stateObj) {
      this.stateObj.setup(data.resolution, data.sampleRate);
      const StateClass = stateClasses[this.state];
      const events = StateClass.getEvents();

      events.forEach((event) => {
        config[`on${event}`] = this.stateObj[event].bind(this.stateObj);
      });

      overlayClass = StateClass.getClass();
    }
    // use this overlay for track event cursor position calculations.
    return h(`div.playlist-overlay${overlayClass}`, config);
  }

  renderFadeOut(data){
    const fadeOut = this.fades[this.fadeOut];
    const fadeWidth = secondsToPixels(
      fadeOut.end - fadeOut.start,
      data.resolution,
      data.sampleRate,
    );
    return h('div.wp-fade.wp-fadeout',
      {
        attributes: {
          style: `position: absolute; height: ${data.height}px; width: ${fadeWidth}px; top: 0; right: 0; z-index: 10;pointer-events:none;`,
        },
      },
      [
        h('div.fadeout.fadehandle',{
          attributes: {
            style: `position: absolute; 
                    height: 10px; 
                    width: 10px; 
                    z-index: 10; 
                    top:0; 
                    left: -5px; 
                    background-color: black;
                    border-radius: 10px;
                    pointer-events:initial;
                    `
          }
        }),
        h('canvas', {
          attributes: {
            width: fadeWidth,
            height: data.height,
            style: 
                `pointer-events: none;`
              ,
          },
          hook: new FadeCanvasHook(
            fadeOut.type,
            fadeOut.shape,
            fadeOut.end - fadeOut.start,
            data.resolution,
          ),
        }),
      ]
    );
  }

  renderFadeIn(data){
    const fadeIn = this.fades[this.fadeIn];
    const fadeWidth = secondsToPixels(
      fadeIn.end - fadeIn.start,
      data.resolution,
      data.sampleRate,
    );

    return h('div.wp-fade.wp-fadein',
      {
        attributes: {
          style: `position: absolute; height: ${data.height}px; width: ${fadeWidth}px; top: 0; left: 0; z-index: 10;pointer-events:none;`,
        },
      }, 
      [
        h('div.fadein.fadehandle',{
          attributes: {
            style: `position: absolute; 
                    height: 10px; 
                    width: 10px; 
                    z-index: 10; 
                    top:0; 
                    right: -5px; 
                    background-color: black;
                    border-radius: 10px;
                    pointer-events:initial;
                    `
          }
        }),
        h('canvas',
          {
            attributes: {
              width: fadeWidth,
              height: data.height,
              style: 
                `pointer-events: none;`
              ,
            },
            hook: new FadeCanvasHook(
              fadeIn.type,
              fadeIn.shape,
              fadeIn.end - fadeIn.start,
              data.resolution,
            ),
          },
        ),
      ]
    );
  }

  renderWaveform(data){
    const convert = w => secondsToPixels(w, data.resolution, data.sampleRate);

    const width = this.peaks.length;
    const peaks = this.peaks.data[0];

    let offset = 0;
    let totalWidth = width;
    let waveformChildren = [];

    let i = 0;
    while (totalWidth > 0) {
      const currentWidth = Math.min(totalWidth, MAX_CANVAS_WIDTH);
      const canvasColor = this.waveOutlineColor
        ? this.waveOutlineColor
        : data.colors.waveOutlineColor;

      const canvashook = new CanvasHook(
        peaks, 
        offset, 
        this.peaks.bits, 
        canvasColor,
        this.cueIn,
        data.resolution,
        data.sampleRate,
        this.images[i]
      );
      if (!this.images[i]){
        this.images[i] = canvashook.setupImage(
          currentWidth,
          data.height
        )
      }
      
      waveformChildren.push(h('canvas', {
        attributes: {
          width: convert(this.duration),
          height: data.height,
          style: `
            float: left;
            position: relative;
            margin: 0;
            padding: 0;
            z-index: 3;
            pointer-events: none;
          `,
        },
        hook: canvashook,
      }));

      totalWidth -= currentWidth;
      offset += MAX_CANVAS_WIDTH;
      i++;
    }
    
    return h('div.clipwaveform',{
      attributes:{
        style:`background: gray;height: ${data.height}px;pointer-events: none;`,
        
      }
    },waveformChildren);
  }


  render(data) {

    const convert = w => secondsToPixels(w, data.resolution, data.sampleRate);

    let clipChildren = [];

    clipChildren.push(this.renderWaveform(data));

    if (this.fadeIn)
      clipChildren.push(this.renderFadeIn(data));

    if (this.fadeOut) 
      clipChildren.push(this.renderFadeOut(data));
    
    // clipChildren.push(this.renderOverlay(data));

    return h('div.clip',
      {
        onmouseover: ()=>this.ee.emit("activeclip",this),
        attributes: {
          style: `left:${convert(this.startTime)}px;height: ${data.height}px; position: absolute;z-index:1`,
        },
      },
      clipChildren,
    );
  }

  getTrackDetails() {
    const info = {
      src: this.src,
      start: this.startTime,
      end: this.endTime,
      name: this.name,
      customClass: this.customClass,
      cuein: this.cueIn,
      cueout: this.cueOut,
    };

    if (this.fadeIn) {
      const fadeIn = this.fades[this.fadeIn];

      info.fadeIn = {
        shape: fadeIn.shape,
        duration: fadeIn.end - fadeIn.start,
      };
    }

    if (this.fadeOut) {
      const fadeOut = this.fades[this.fadeOut];

      info.fadeOut = {
        shape: fadeOut.shape,
        duration: fadeOut.end - fadeOut.start,
      };
    }

    return info;
  }
}
