const player = document.getElementById('radioPlayer');
const playPauseBtn = document.getElementById('playPauseBtn');
const currentTimeElem = document.getElementById('currentTime');
const volumeControl = document.getElementById('volumeControl');
const volumeIcon = document.querySelector('#audioPlayer img');
const canvas = document.getElementById('visualizer');
const canvasCtx = canvas.getContext('2d');
let audioContext;
let analyser;
let dataArray;
let bufferLength;
let currentStationRequest = null;
const maxRetries = 5;
const retryDelay = 2000; // 2 seconds

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
    let currentTime = player.currentTime;
    if (document.getElementById('nowPlaying').textContent.includes('Radio Zu')) {
        currentTime = Math.max(0, currentTime - 34);
    }
    currentTimeElem.textContent = formatTime(currentTime);
});

player.addEventListener('error', (e) => {
    const error = player.error;
    if (error) {
        console.error('Audio element error:', error);
        alert('URL-ul stației nu poate fi accesat.');
        playPauseBtn.textContent = 'Redare';
    }
    console.log("Test1");
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

async function playStation(url, stationName, retries = 0) {
    const player = document.getElementById('radioPlayer');
    const currentTimeDisplay = document.getElementById('currentTime');
    document.getElementById('nowPlaying').textContent = `Se încarcă ${stationName}...`;

    if (currentStationRequest) {
        currentStationRequest.abort();
    }

    currentStationRequest = new AbortController();
    const { signal } = currentStationRequest;

    try {
        if (url.endsWith('.m3u') || url.endsWith('.pls') || url.endsWith('.m3u8')) {
            const response = await fetch(url, { signal });
            if (!response.ok) {
                throw new Error(`Eroare network: ${response.statusText}`);
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
                throw new Error('URL-ul stației nu poate fi accesat.');
                console.log("Test2");
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

        player.addEventListener('play', function () {
            currentTimeDisplay.textContent = formatTime(player.currentTime);
        });

    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Error accessing the station URL:', error);
            if (retries < maxRetries) {
                console.log(`Retrying... (${retries + 1}/${maxRetries})`);
                setTimeout(() => playStation(url, stationName, retries + 1), retryDelay);
            } else {
                alert('URL-ul stației nu poate fi accesat.');
                playPauseBtn.textContent = 'Redare';
                console.log("Test3");
            }
        }
    } finally {
        currentStationRequest = null;
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
        canvasCtx.fillStyle = '#FFD700';
        canvasCtx.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight / 2);
        x += barWidth + 1;
    }
}