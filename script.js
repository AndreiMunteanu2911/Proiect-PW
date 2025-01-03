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

    const canvas = document.getElementById('visualizer');
    const canvasCtx = canvas.getContext('2d');


    canvasCtx.fillStyle = 'rgb(0, 0, 0)';
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
};

playPauseBtn.addEventListener('click', async () => {
    if (player.paused) {
        await player.play();
        playPauseBtn.textContent = 'Pauză';
    } else {
        player.pause();
        playPauseBtn.textContent = 'Redare';
    }
});

player.addEventListener('timeupdate', () => {
    currentTimeElem.textContent = formatTime(player.currentTime);
});

player.addEventListener('loadedmetadata', () => {
    durationElem.textContent = formatTime(player.duration);
});

player.addEventListener('error', () => {
    alert('URL-ul stației nu poate fi accesat.');
    playPauseBtn.textContent = 'Redare';
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
    const player = document.getElementById('radioPlayer');
    const currentTimeDisplay = document.getElementById('currentTime');
    document.getElementById('nowPlaying').textContent = `Se încarcă ${stationName}...`;
    try {
        if (url.endsWith('.m3u') || url.endsWith('.pls') || url.endsWith('.m3u8')) {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            const text = await response.text();
            let streamUrl;

            if (url.endsWith('.m3u') || url.endsWith('.m3u8')) {
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
                if (url.endsWith('.m3u8')) {
                    if (Hls.isSupported()) {
                        const hls = new Hls();
                        hls.loadSource(streamUrl);
                        hls.attachMedia(player);
                        hls.on(Hls.Events.MANIFEST_PARSED, function () {
                            player.play();
                        });
                    } else if (player.canPlayType('application/vnd.apple.mpegurl')) {
                        player.src = streamUrl;
                        player.addEventListener('loadedmetadata', function () {
                            player.play();
                        });
                    }
                } else {
                    player.src = streamUrl;
                    await player.play();
                }
            } else {
                console.error('Stream URL could not be found in the playlist.');
                alert('URL-ul stației nu poate fi accesat.');
                return;
            }
        } else {
            player.src = url;
            await player.play();
        }

        player.crossOrigin = "anonymous";
        playPauseBtn.textContent = 'Pauză';
        document.getElementById('nowPlaying').textContent = `Se redă: ${stationName}`;
        if (!audioContext) {
            audioContext = new AudioContext();
            initializeVisualizer();
        } else if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        // Reset the timer when playback starts
        player.addEventListener('play', function () {
            currentTimeDisplay.textContent = '0:00';
        });

    } catch (error) {
        console.error('Error accessing the station URL:', error);
        alert('URL-ul stației nu poate fi accesat.');
        playPauseBtn.textContent = 'Redare';
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