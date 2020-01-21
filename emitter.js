/// These are the controlls for the playlist

const $ = s=>document.querySelector(s);
const $$ = s=>document.querySelectorAll(s);
const emit = (...args)=>playlist.ee.emit(...args);

$("#play-button").onclick = e=>emit("play",0);
$("#prev-button").onclick = e=>emit("rewind");
$("#render").onclick = e=>emit('startaudiorendering', 'wav');
$("#save").onclick = e=>emit("save",e);
$("#reset").onclick = e=>emit("reset",e);

function displayDownloadLink(link){
    l = $("#download-link");
    if (l.href){
        window.URL.revokeObjectURL(l.href);
    }
    l.download = playlist.name;
    l.href = link;
    l.innerHTML = "download ready";

}

playlist.ee.on('audiorenderingfinished', function (type, data) {
    if (type == 'wav'){
        downloadUrl = window.URL.createObjectURL(data);
        displayDownloadLink(downloadUrl);
    }
});
playlist.ee.on('name-change',str=>{
    $("#name").innerHTML = str;
})
playlist.ee.on('bpm-change',bpm=>{
    $("#bpm").innerHTML = bpm;
})
emit('name-change',playlist.name);//initial setting
emit('bpm-change',playlist.bpm);//initial setting

$("#dropzone").addEventListener("dragover", function(e) { 
    e.stopPropagation();
    e.preventDefault();
});
$("#dropzone").addEventListener("drop", function(e) { 
    e.stopPropagation();
    e.preventDefault();
    for (var f of e.dataTransfer.files) {
      playlist.ee.emit("newtrack", f);
    }
  });
  
$("#zoomin").addEventListener("click",e=>{
    playlist.ee.emit("zoomin");
})

$("#zoomout").addEventListener("click",e=>{
    playlist.ee.emit("zoomout");
})

$("#snap").addEventListener("click",e=>{
    const el = $("#snapmenu");
    if(el.style.display =="none"){
        el.style.display = "block";
    }
    else{
        el.style.display = "none";
    }
})

$$("#snapmenu > div").forEach(n => 
    n.addEventListener("click",e=>{
        const input = e.target.innerHTML;
        const quantize = {"none":0,"beat":1,"bar":playlist.barLength}[input];
        playlist.quantize = quantize;
        $("#snap").innerHTML = input + " &#9662;";
        $("#snapmenu").style.display = "none";
    })
)

