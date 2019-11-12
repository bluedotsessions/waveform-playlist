# Waveform Playlist - Anton's Version

First of all, see the [the github pages website for the library](https://tolumbas.github.io/waveform-playlist).

I know that the structure and the API is intimidating, but most of it is inherited from the [parent repo]( https://github.com/naomiaro/waveform-playlist). **Go read it for basic usage!**
*Also if you want to change the core of the library, you'll need macOS / Linux OS and NPM.*

## How to use?

If you want to use it right now you'll need to add to the page the `wavefom-playlist.var.js`, the `emmiter.js`, the `controller.js` and the `main.css`. The following will explain what each file is for. 

#### Waveform-playlist.var.js

This file holds the `playlist` object. It's everything bellow the controls:
* It holds an array of `tracks` 
* It has an `EventEmitter`, that is used to comunicate with it's children and the contorlls. I'll list each event in the `emmiter.js` doc.
* It renders the tracks and the controls for the tracks. If you want to change them you'll have to change the `Track.js`

#### controller.js
This file initiates the `playlist` object. You'll have to call the `init` functinon and pass options to the playlist. The list of options is in [naomiaro's repo](https://github.com/naomiaro/waveform-playlist). I've added some fileds that need to be added as well:
* `bpm` - The BPM of the song
* `quantize` - The gap(messured in beats) used when transforming the clips *(currently I do not support the value 0)*
* `barLength` - The number of beats in a bar
* `barOffset` - The number of beats before the first beat.



#### emmiter.js
This is the link between the `playlist` object and the controls. This file is customizable, but you'll need to know how to use them:

*There are too many events to give usefull info to each of them, so post issue on the repo if you want me to explain something in more detail, or if you are not patient you can see what the code does in the `Playlist.js` file*

* `activeclip` - emitted when the mouse is over a clip, it returns the `clip` object. If the clip name `_none` it means that the mouse has left the clip and now it's inbetween the clips.

* `automaticscroll`
* `destroy` - emit to remove track, you'll need to pass the track object that is to be removed.
* `durationformat`
* `select`
* `startaudiorendering`
* `statechange`
* `shift`
* `record`
* `play`
* `pause`
* `stop`
* `rewind`
* `fastforward`
* `clear`
* `solo`
* `mute`
* `volumechange`
* `mastervolumechange`
* `fadein`
* `fadeout`
* `fadetype`
* `newtrack`
* `trim`
* `zoomin`
* `zoomout`
* `scroll`
* `seek`
* `splitStart`
* `splitAt`
* `duplicate`
* `delete`

#### main.css

So this file should be splitted probably, because currently it has neceserry for the library css and also styling css. It is customiziable, but be carefull, because it might break the library.

You might find that some of the styling is not in the css file, this is becase some of it is hard-coded into the library. I'll do my best to remove it from there and put it in this file.

### Where are the states?
I've removed them. There is only one state that is called `interactive`. And it does the mouse controls for the clips. (includes the menu). The file is located at `src/track/states/InteractiveState.js`
