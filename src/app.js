/// Welcome new developer to the awfully structured code,
/// but I'm here to the rescue and I'll show you around
/// I'll try to show you what is where and how to change it.
///
/// This library was origianlly written by Naomi
/// And then I got it to fix some things 
/// and at some point
/// my fixes became more than the original code
/// So most of the code is jumbled together quick fixes.
///
/// So, good luck!

import _assign from 'lodash.assign'
/// Firstly
/// It is mandatory to learn the virtual-dom library.
/// It is like react, but worse.
import createElement from 'virtual-dom/create-element';
import EventEmitter from 'event-emitter';
/// The ./Playlist.js is the next file you should go, after this one.
import Playlist from './Playlist';

/// This function is giving defaults for the library.
/// Also the audioContext is created here.
/// If you add new methods to the library API,
/// you will have to change this function.
export function init(options = {}, ee = EventEmitter()) {
  if (options.container === undefined) {
    throw new Error('DOM element container must be given.');
  }

  window.OfflineAudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  window.AudioContext = window.AudioContext || window.webkitAudioContext;

  const audioContext = new window.AudioContext();

  const defaults = {
    ac: audioContext,
    tracks: [],
    sampleRate: audioContext.sampleRate,
    samplesPerPixel: 4096,
    mono: true,
    fadeType: 'logarithmic',
    exclSolo: false,
    timescale: false,
    controls: {
      show: false,
      width: 150,
    },
    colors: {
      waveOutlineColor: 'white',
      timeColor: 'grey',
      fadeColor: 'black',
    },
    name: "untitled",
    seekStyle: 'line',
    waveHeight: 128,
    bpm:0,
    barLength:4,
    barOffset:0,
    quantize:1,
    /// Originally there were many states.
    /// They behaved like photoshop tools for the track
    /// Galen decided that was unnecesery
    /// So now there is only one state - interactive.
    /// The whole user interaction with the clips is written there
    /// file path: ./track/states/InteractiveState.js
    state: 'interactive',
    zoomLevels: [512, 1024, 2048, 4096],
    annotationList: {
      annotations: [],
      controls: [],
      editable: false,
      linkEndpoints: false,
      isContinuousPlay: false,
    },
    isAutomaticScroll: false,
  };

  const config = _assign(defaults, options);
  const zoomIndex = config.zoomLevels.indexOf(config.samplesPerPixel);

  if (zoomIndex === -1) {
    throw new Error('initial samplesPerPixel must be included in array zoomLevels');
  }

  const playlist = new Playlist(ee);
  /// Why use constructors, then?!?! >:(

  playlist.sampleRate = config.sampleRate;
  playlist.samplesPerPixel = config.samplesPerPixel;
  /// ac = audioContext
  playlist.ac = config.ac;

  /// comunication between the tracks, clips, the user and the playlist
  /// is handled through events.
  /// so go to that function if you want to create new API
  playlist.setUpEventEmitter();
  
  playlist.setTimeSelection(0, 0);
  playlist.setupState();
  playlist.controls = config.controls;
  playlist.zoomLevels = config.zoomLevels;
  playlist.seekStyle = config.seekStyle;
  playlist.annotationList = config.annotationList;

  playlist.bpm = config.bpm;   //GH  Galen
  playlist.quantize = config.quantize;  //GH Galen
  playlist.barLength = config.barLength;
  playlist.barOffset = config.barOffset;
  playlist.name = config.name;
  playlist.setTracks(config.tracks);

  /// playlist.render() is the most important
  /// function in the playlist.js file
  const tree = playlist.render();
  const rootNode = createElement(tree);

  config.container.appendChild(rootNode);
  playlist.tree = tree;
  playlist.rootNode = rootNode;

  return playlist;
}

export default function (options = {}, ee = EventEmitter()) {
  return init(options, ee);
}
