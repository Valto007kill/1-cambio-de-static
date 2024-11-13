// Variables globales para almacenar los componentes del grabador de audio y la grabación.
let mediaRecorder;  // Objeto MediaRecorder que manejará el inicio y fin de la grabación.
let audioContext;   // Contexto de audio que permitirá el procesamiento del sonido.
let audioInput;     // Fuente de audio proveniente del micrófono.
let recorder;       // Procesador de audio para capturar el audio en chunks (trozos).
let recordedChunks = [];  // Almacena los fragmentos de audio grabados.
let startTime;      // Momento de inicio de la grabación.
let recordingInterval;  // Intervalo para actualizar el tiempo de grabación.

const startBtn = document.getElementById('startBtn');  // Botón de inicio de grabación.
const stopBtn = document.getElementById('stopBtn');    // Botón de detención de grabación.
const audioPlayback = document.getElementById('audioPlayback');  // Elemento de reproducción de audio.
const downloadLink = document.getElementById('downloadLink');    // Enlace para descargar la grabación.
const recordingTime = document.getElementById('recordingTime');  // Muestra el tiempo de grabación en pantalla.

// Evento para iniciar la grabación al hacer clic en el botón de inicio.
startBtn.addEventListener('click', async () => {
    try {
        // Solicita acceso al micrófono del usuario y crea un flujo de audio.
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Configura el contexto de audio para procesar la entrada del micrófono.
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioInput = audioContext.createMediaStreamSource(stream);

        // Crea un procesador de audio para capturar fragmentos de audio durante la grabación.
        recorder = audioContext.createScriptProcessor(4096, 1, 1);
        recorder.onaudioprocess = (e) => {
            if (mediaRecorder && mediaRecorder.state === "recording") {
                // Agrega los datos de audio grabados a recordedChunks.
                recordedChunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
            }
        };

        // Conecta el flujo de audio al procesador y envía el sonido a los altavoces.
        audioInput.connect(recorder);
        recorder.connect(audioContext.destination);

        // Configura el objeto MediaRecorder para gestionar la grabación de audio.
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.onstart = () => {
            recordedChunks = [];  // Reinicia los fragmentos grabados.
            startTime = Date.now();  // Registra el tiempo de inicio.
            recordingInterval = setInterval(updateRecordingTime, 1000);  // Actualiza el tiempo de grabación cada segundo.
        };
        mediaRecorder.onstop = async () => {
            // Finaliza la actualización del tiempo de grabación y convierte los fragmentos a MP3.
            clearInterval(recordingInterval);
            const mp3Blob = await convertToMP3(recordedChunks);
            const url = URL.createObjectURL(mp3Blob);
            audioPlayback.src = url;  // Establece la URL para la reproducción.
            downloadLink.href = url;  // Establece la URL para descargar.
            recordedChunks = [];  // Limpia los fragmentos grabados.
        };

        // Inicia la grabación y actualiza el estado de los botones.
        mediaRecorder.start();
        startBtn.disabled = true;
        stopBtn.disabled = false;
    } catch (err) {
        console.error('Error accessing audio devices:', err);  // Muestra un error si no se puede acceder al micrófono.
    }
});

// Evento para detener la grabación al hacer clic en el botón de detener.
stopBtn.addEventListener('click', () => {
    mediaRecorder.stop();  // Detiene la grabación.
    startBtn.disabled = false;  // Habilita el botón de inicio.
    stopBtn.disabled = true;    // Deshabilita el botón de detener.
});

// Función para actualizar el tiempo de grabación en pantalla.
function updateRecordingTime() {
    const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsedTime / 60).toString().padStart(2, '0');
    const seconds = (elapsedTime % 60).toString().padStart(2, '0');
    recordingTime.textContent = `${minutes}:${seconds}`;  // Muestra el tiempo transcurrido.
}

// Función para convertir los fragmentos de audio grabados en un archivo MP3.
async function convertToMP3(chunks) {
    const sampleRate = audioContext.sampleRate;  // Obtiene la frecuencia de muestreo.
    const samples = flattenArray(chunks);  // Convierte los fragmentos a un solo array.
    const buffer = new Int16Array(samples.length);  // Prepara el buffer para la conversión a MP3.
    
    // Convierte cada muestra a un valor entero.
    for (let i = 0; i < samples.length; i++) {
        buffer[i] = samples[i] * 32767.5;
    }
    
    // Codifica los datos de audio en formato MP3.
    const mp3encoder = new lamejs.Mp3Encoder(1, sampleRate, 128);
    const mp3Data = [];
    let mp3Buffer = mp3encoder.encodeBuffer(buffer);
    if (mp3Buffer.length > 0) {
        mp3Data.push(mp3Buffer);  // Agrega los datos codificados a mp3Data.
    }
    mp3Buffer = mp3encoder.flush();  // Finaliza la codificación.
    if (mp3Buffer.length > 0) {
        mp3Data.push(mp3Buffer);
    }
    return new Blob(mp3Data, { type: 'audio/mp3' });  // Devuelve el archivo MP3 como un Blob.
}

// Función para aplanar un array de arrays en un solo array de datos.
function flattenArray(channelBuffer) {
    let result = new Float32Array(channelBuffer.reduce((acc, arr) => acc + arr.length, 0));
    let offset = 0;
    for (let i = 0; i < channelBuffer.length; i++) {
        result.set(channelBuffer[i], offset);  // Copia cada fragmento en el resultado final.
        offset += channelBuffer[i].length;  // Actualiza el offset.
    }
    return result;
}