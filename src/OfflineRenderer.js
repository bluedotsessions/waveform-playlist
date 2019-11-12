import Playout from './Playout'
export function startOfflineRender(playlist,type) {
    if (playlist.isRendering) {
      return;
    }

    playlist.isRendering = true;
    playlist.offlineAudioContext = new OfflineAudioContext(2, 44100 * playlist.duration, 44100);

    const currentTime = playlist.offlineAudioContext.currentTime;

    const compressor = playlist.offlineAudioContext.createDynamicsCompressor();

    playlist.tracks.forEach((track) => {
      track.clips.forEach(clip=>{
        clip.setOfflinePlayout(new Playout(playlist.offlineAudioContext, clip.buffer));
        clip.schedulePlay(currentTime, 0, 0, {
          shouldPlay: playlist.shouldTrackPlay(clip),
          masterGain: 1,
          compressor,
          isOffline: true,
        });
      })
    });
    playlist.tracks.forEach(track=>track.play(currentTime, 0, 0));

    playlist.offlineAudioContext.startRendering().then((audioBuffer) => {
      if (type === 'buffer') {
        playlist.ee.emit('audiorenderingfinished', type, audioBuffer);
        playlist.isRendering = false;
        return;
      }

      if (type === 'wav') {
        playlist.exportWorker.postMessage({
          command: 'init',
          config: {
            sampleRate: 44100,
          },
        });

        // callback for `exportWAV`
        playlist.exportWorker.onmessage = (e) => {
          playlist.ee.emit('audiorenderingfinished', type, e.data);
          playlist.isRendering = false;

          // clear out the buffer for next renderings.
          playlist.exportWorker.postMessage({
            command: 'clear',
          });
        };

        // send the channel data from our buffer to the worker
        playlist.exportWorker.postMessage({
          command: 'record',
          buffer: [
            audioBuffer.getChannelData(0),
            audioBuffer.getChannelData(1),
          ],
        });

        // ask the worker for a WAV
        playlist.exportWorker.postMessage({
          command: 'exportWAV',
          type: 'audio/wav',
        });
      }
    }).catch((e) => {
      throw e;
    });
  }