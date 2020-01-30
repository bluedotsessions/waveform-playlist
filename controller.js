///This is the loading of a STEM file.

let playlist = WaveformPlaylist.init({
  samplesPerPixel: 3000,
  waveHeight: 100,
  container: document.getElementById("playlist"),
  state: 'interactive',
  bpm:90,
  quantize:1,
  barLength:4,
  barOffset:1,
  name: "Um Pepino",
  colors: {
    waveOutlineColor: '#E0EFF1',
    timeColor: 'grey',
    fadeColor: 'black'
  },
  timescale: true,
  controls: {
    show: true, //whether or not to include the track controls
    width: 200 //width of controls in pixels
  },
  seekStyle : 'line',
  zoomLevels: [500, 1000, 3000, 5000]
});


let DEFAULT_SET = [

    {
        "src": "audio/01_Um Pepino_Electric Guitar.mp3 ",
        "name": "01",
        "cuein": 0,
        "waveOutlineColor": '#c0dce0'
    },

    {
        "src": "audio/02_Um Pepino_Vibraphone.mp3 ",
        "name": "02",
        "cuein": 0,
        "waveOutlineColor": '#c0dce0'
    },
    {
        "src": "audio/03_Um Pepino_Volda Drumsyn.mp3 ",
        "name": "03",
        "cuein": 0,
        "waveOutlineColor": '#c0dce0'
    },
    {
        "src": "audio/04_Um Pepino_Volda Drumsyn.mp3 ",
        "name": "04",
        "cuein": 0,
        "waveOutlineColor": '#c0dce0'
    },
    {
        "src": "audio/05_Um Pepino_Drum Kit.mp3 ",
        "name": "05",
        "cuein": 0,
        "waveOutlineColor": '#c0dce0'
    },
    {
        "src": "audio/06_Um Pepino_Rhodia Synpad.mp3 ",
        "name": "06",
        "cuein": 0,
        "waveOutlineColor": '#c0dce0'
    },
    {
        "src": "audio/07_Um Pepino_Fjoria Syn.mp3 ",
        "name": "07",
        "cuein": 0,
        "waveOutlineColor": '#c0dce0'
    },
    {
        "src": "audio/08_Um Pepino_SFX.mp3 ",
        "name": "08",
        "cuein": 0,
        "waveOutlineColor": '#c0dce0'
    },
    {
        "src": "audio/09_Um Pepino_SFX 2.mp3",
        "name": "09",
        "cuein": 0,
        "waveOutlineColor": '#c0dce0'
    },
];

let TEST_SET_1 =  [
    {
        "src": "audio/sonnet.mp3 ",
        "name": "01",
        "cuein": 0,
        "waveOutlineColor": '#c0dce0'
    },
    {
        "src": "audio/09_Um Pepino_SFX 2.mp3",
        "name": "09",
        "cuein": 0,
        "waveOutlineColor": '#c0dce0'
    },
];

let TEST_SET_2 =  [
    {
        "src": "audio/06_Um Pepino_Rhodia Synpad.mp3 ",
        "name": "06",
        "cuein": 0,
        "waveOutlineColor": '#c0dce0'
    },
    {
        "src": "audio/07_Um Pepino_Fjoria Syn.mp3 ",
        "name": "07",
        "cuein": 0,
        "waveOutlineColor": '#c0dce0'
    },
    {
        "src": "audio/09_Um Pepino_SFX 2.mp3",
        "name": "09",
        "cuein": 0,
        "waveOutlineColor": '#c0dce0'
    },
];

let TEST_SET_3 =  [
    {
        "src": "audio/PianoSynth30.mp3 ",
        "name": "01",
        "cuein": 0,
        "waveOutlineColor": '#c0dce0'
    },
    {
        "src": "audio/BassDrums30.mp3",
        "name": "02",
        "cuein": 0,
        "waveOutlineColor": '#c0dce0'
    },
];

let TEST_SET_4 =  [
    {
        "src": "audio/Vocals30.mp3 ",
        "name": "01",
        "cuein": 0,
        "waveOutlineColor": '#c0dce0'
    },
    {
        "src": "audio/05_Um Pepino_Drum Kit.mp3 ",
        "name": "05",
        "cuein": 0,
        "waveOutlineColor": '#c0dce0'
    },
];

let TEST_SET_5 =  [
    {
        "src": "audio/Guitar30.mp3 ",
        "name": "01",
        "cuein": 0,
        "waveOutlineColor": '#c0dce0'
    },
    {
        "src": "audio/01_Um Pepino_Electric Guitar.mp3 ",
        "name": "02",
        "cuein": 0,
        "waveOutlineColor": '#c0dce0'
    },
];


let setlist_map = {
  "DEFAULT": DEFAULT_SET,
  "TEST1": TEST_SET_1,
  "TEST2": TEST_SET_2,
  "TEST3": TEST_SET_3,
  "TEST4": TEST_SET_4,
  "TEST5": TEST_SET_5,

};

let test_setlist_key = "TEST_SETLIST";
let setlist_key = window.localStorage.getItem(test_setlist_key) || "DEFAULT";

let dropdown = document.getElementById("set-tester-dropdown");
dropdown.value = setlist_key;

dropdown.addEventListener("change", () => {
  //store selected setlist in local storage, reload
  window.localStorage.setItem(test_setlist_key, dropdown.value);
  location.reload();
});


let setlist = setlist_map[setlist_key] || DEFAULT_SET;

playlist.load(setlist).then(function() {
  //can do stuff with the playlist.

  //initialize the WAV exporter.
  playlist.initExporter();
}); 