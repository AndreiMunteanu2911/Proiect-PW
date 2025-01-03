const player = document.getElementById('radioPlayer');
const playPauseBtn = document.getElementById('playPauseBtn');
const currentTimeElem = document.getElementById('currentTime');
const durationElem = document.getElementById('duration');
const volumeControl = document.getElementById('volumeControl');
const volumeIcon = document.querySelector('#audioPlayer img');
const canvas = document.getElementById('visualizer');
const canvasCtx = canvas.getContext('2d');
let audioContext;
let analyser;
let dataArray;
let bufferLength;

window.onload = function() {
    // Get the canvas context
    const canvas = document.getElementById('visualizer');
    const canvasCtx = canvas.getContext('2d');

    // Fill the canvas with black
    canvasCtx.fillStyle = 'rgb(0, 0, 0)';
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
};

playPauseBtn.addEventListener('click', async () => {
    if (player.paused) {
        await player.play();
        playPauseBtn.textContent = 'Pause';
    } else {
        player.pause();
        playPauseBtn.textContent = 'Play';
    }
});

player.addEventListener('timeupdate', () => {
    currentTimeElem.textContent = formatTime(player.currentTime);
});

player.addEventListener('loadedmetadata', () => {
    durationElem.textContent = formatTime(player.duration);
});

player.addEventListener('error', () => {
    alert('Error loading the audio stream. Please try another station.');
    playPauseBtn.textContent = 'Play';
});

volumeControl.addEventListener('input', () => {
    player.volume = volumeControl.value;
    updateVolumeIcon();
});

volumeIcon.addEventListener('click', () => {
    if (player.volume > 0) {
        player.volume = 0;
        volumeControl.value = 0;
    } else {
        player.volume = 1;
        volumeControl.value = 1;
    }
    updateVolumeIcon();
});

function updateVolumeIcon() {
    if (player.volume > 0) {
        volumeIcon.src = 'on.png';
    } else {
        volumeIcon.src = 'off.png';
    }
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

async function playStation(url, stationName) {
    document.getElementById('nowPlaying').textContent = `Loading ${stationName}...`;
    if (url.endsWith('.m3u') || url.endsWith('.pls')) {
        const response = await fetch(url);
        const text = await response.text();
        let streamUrl;

        if (url.endsWith('.m3u')) {
            streamUrl = text.split('\n').find(line => line && !line.startsWith('#'));
        } else if (url.endsWith('.pls')) {
            const lines = text.split('\n');
            for (let line of lines) {
                if (line.toLowerCase().startsWith('file1=')) {
                    streamUrl = line.split('=')[1].trim();
                    break;
                }
            }
        }

        if (streamUrl) {
            player.src = streamUrl;
        } else {
            console.error('Stream URL not found in playlist');
            alert('Stream URL not found. Please try another station.');
            return;
        }
    } else {
        player.src = url;
    }

    player.crossOrigin = "anonymous"; // Set crossOrigin attribute

    await player.play();
    playPauseBtn.textContent = 'Pause';
    document.getElementById('nowPlaying').textContent = `Now Playing: ${stationName}`;
    if (!audioContext) {
        audioContext = new AudioContext();
        console.log('AudioContext created');
        initializeVisualizer();
    } else if (audioContext.state === 'suspended') {
        await audioContext.resume();
        console.log('AudioContext resumed');
    }
}

function initializeVisualizer() {
    analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaElementSource(player);
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    analyser.fftSize = 128;
    bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    // Fill the canvas with black when initializing the visualizer
    canvasCtx.fillStyle = 'rgb(0, 0, 0)';
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    drawVisualizer();
}

function drawVisualizer() {
    requestAnimationFrame(drawVisualizer);
    analyser.getByteFrequencyData(dataArray);
    canvasCtx.fillStyle = 'rgb(0, 0, 0)';
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / bufferLength) * 2.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i];
        canvasCtx.fillStyle = '#FFD700'; // Set the bar color to the same as the footer and header
        canvasCtx.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight / 2);
        x += barWidth + 1;
    }
}