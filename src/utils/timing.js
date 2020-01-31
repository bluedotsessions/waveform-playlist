export function bpm_to_spb(bpm) { //seconds per beat
    return 60 / bpm;
}
export function bpm_to_mspb(bpm) { //ms per beat
    return 1000 * bpm_to_spb(bpm);
}