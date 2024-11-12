// recorder
let mediaRecorder;
let audioContext;
let audioInput;
let recorder;
let recordedChunks = [];
let startTime;
let recordingInterval;

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const audioPlayback = document.getElementById('audioPlayback');
const downloadLink = document.getElementById('downloadLink');
const recordingTime = document.getElementById('recordingTime');

startBtn.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioInput = audioContext.createMediaStreamSource(stream);

        recorder = audioContext.createScriptProcessor(4096, 1, 1);
        recorder.onaudioprocess = (e) => {
            if (mediaRecorder && mediaRecorder.state === "recording") {
                recordedChunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
            }
        };

        audioInput.connect(recorder);
        recorder.connect(audioContext.destination);

        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.onstart = () => {
            recordedChunks = [];
            startTime = Date.now();
            recordingInterval = setInterval(updateRecordingTime, 1000);
        };
        mediaRecorder.onstop = async () => {
            clearInterval(recordingInterval);
            const mp3Blob = await convertToMP3(recordedChunks);
            const url = URL.createObjectURL(mp3Blob);
            audioPlayback.src = url;
            downloadLink.href = url;
            recordedChunks = [];
        };

        mediaRecorder.start();
        startBtn.disabled = true;
        stopBtn.disabled = false;
    } catch (err) {
        console.error('Error accessing audio devices:', err);
    }
});

stopBtn.addEventListener('click', () => {
    mediaRecorder.stop();
    startBtn.disabled = false;
    stopBtn.disabled = true;
});

function updateRecordingTime() {
    const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsedTime / 60).toString().padStart(2, '0');
    const seconds = (elapsedTime % 60).toString().padStart(2, '0');
    recordingTime.textContent = `${minutes}:${seconds}`;
}

async function convertToMP3(chunks) {
    const sampleRate = audioContext.sampleRate;
    const samples = flattenArray(chunks);
    const buffer = new Int16Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
        buffer[i] = samples[i] * 32767.5;
    }
    const mp3encoder = new lamejs.Mp3Encoder(1, sampleRate, 128);
    const mp3Data = [];
    let mp3Buffer = mp3encoder.encodeBuffer(buffer);
    if (mp3Buffer.length > 0) {
        mp3Data.push(mp3Buffer);
    }
    mp3Buffer = mp3encoder.flush();
    if (mp3Buffer.length > 0) {
        mp3Data.push(mp3Buffer);
    }
    return new Blob(mp3Data, { type: 'audio/mp3' });
}

function flattenArray(channelBuffer) {
    let result = new Float32Array(channelBuffer.reduce((acc, arr) => acc + arr.length, 0));
    let offset = 0;
    for (let i = 0; i < channelBuffer.length; i++) {
        result.set(channelBuffer[i], offset);
        offset += channelBuffer[i].length;
    }
    return result;
}