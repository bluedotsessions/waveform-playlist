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
    'audio/Track 1 (Erast - BPM: 105, Key:Dm)/01_Erast_Recorder.mp3',
    'audio/Track 1 (Erast - BPM: 105, Key:Dm)/02_Erast_Acoustic Guitar.mp3',
    'audio/Track 1 (Erast - BPM: 105, Key:Dm)/03_Erast_Classical Guitar.mp3',
    'audio/Track 1 (Erast - BPM: 105, Key:Dm)/04_Erast_Harp.mp3',
    'audio/Track 1 (Erast - BPM: 105, Key:Dm)/06_Erast_Percussion.mp3',
    'audio/Track 1 (Erast - BPM: 105, Key:Dm)/07_Erast_Percussion.mp3',
    'audio/Track 1 (Erast - BPM: 105, Key:Dm)/08_Erast_Percussion.mp3',
    'audio/Track 1 (Erast - BPM: 105, Key:Dm)/09_Erast_Electric Bass.mp3',
    'audio/Track 1 (Erast - BPM: 105, Key:Dm)/10_Erast_Rhodia Syn.mp3',
];

let TEST_SET_2 =  [
    'audio/Track 2 (All American Canal - BPM:106 - Key:Dm)/01_All American Canal_Guitar.mp3',
    'audio/Track 2 (All American Canal - BPM:106 - Key:Dm)/02_All American Canal_Upright Piano.mp3',
    'audio/Track 2 (All American Canal - BPM:106 - Key:Dm)/03_All American Canal_Drum Kit.mp3',
    'audio/Track 2 (All American Canal - BPM:106 - Key:Dm)/04_All American Canal_Electric Bass.mp3',
    'audio/Track 2 (All American Canal - BPM:106 - Key:Dm)/05_All American Canal_Fjoria Synpad.mp3',
    'audio/Track 2 (All American Canal - BPM:106 - Key:Dm)/06_All American Canal_Fjoria Synpad.mp3',
];

let TEST_SET_3 =  [
    'audio/Track 3 (Pastel de Nata - BPM:82 - Key:Cm)/01_Pastel de Nata_Electric Guitar.mp3',
    'audio/Track 3 (Pastel de Nata - BPM:82 - Key:Cm)/02_Pastel de Nata_Piano.mp3',
    'audio/Track 3 (Pastel de Nata - BPM:82 - Key:Cm)/03_Pastel de Nata_Vibraphone.mp3',
    'audio/Track 3 (Pastel de Nata - BPM:82 - Key:Cm)/04_Pastel de Nata_Volda Drumsyn.mp3',
    'audio/Track 3 (Pastel de Nata - BPM:82 - Key:Cm)/05_Pastel de Nata_Volda Drumsyn.mp3',
    'audio/Track 3 (Pastel de Nata - BPM:82 - Key:Cm)/06_Pastel de Nata_Drum Kit.mp3',
    'audio/Track 3 (Pastel de Nata - BPM:82 - Key:Cm)/07_Pastel de Nata_Bass.mp3',
];

let TEST_SET_4 =  [
    'audio/Track 4 ( Lakkalia - BPM:90 - Key:C)/01_Lakkalia_Electric Guitar.mp3',
    'audio/Track 4 ( Lakkalia - BPM:90 - Key:C)/02_Lakkalia_Electric Guitar.mp3',
    'audio/Track 4 ( Lakkalia - BPM:90 - Key:C)/03_Lakkalia_Electric Guitar.mp3',
    'audio/Track 4 ( Lakkalia - BPM:90 - Key:C)/04_Lakkalia_Electric Guitar.mp3',
    'audio/Track 4 ( Lakkalia - BPM:90 - Key:C)/05_Lakkalia_Drum Kit.mp3',
    'audio/Track 4 ( Lakkalia - BPM:90 - Key:C)/06_Lakkalia_Bass.mp3',
];

let TEST_SET_5 =  [
    'audio/Track 4 ( Lakkalia - BPM:90 - Key:C)/01_Lakkalia_Electric Guitar.mp3',
    'audio/Track 4 ( Lakkalia - BPM:90 - Key:C)/02_Lakkalia_Electric Guitar.mp3',
];


function path_to_clip(path, index){
    return {
        "src": path,
        "name": "0" + index,
        "cuein": 0,
        "waveOutlineColor": '#c0dce0'
    }
}

let setlist_map = {
    "DEFAULT": DEFAULT_SET,
    "TEST1": TEST_SET_1.map(path_to_clip),
    "TEST2": TEST_SET_2.map(path_to_clip),
    "TEST3": TEST_SET_3.map(path_to_clip),
    "TEST4": TEST_SET_4.map(path_to_clip),
    "TEST5": TEST_SET_5.map(path_to_clip),

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