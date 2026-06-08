export function noteToFreq(note: string): number {
    if (!note || typeof note !== 'string') return 0;
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octaveMatch = note.match(/\d+$/);
    if (!octaveMatch) return 0;
    const octave = parseInt(octaveMatch[0], 10);
    const keyNumber = notes.indexOf(note.replace(/\d+$/, '').toUpperCase());
    if (keyNumber === -1) return 0;
    return 440 * Math.pow(2, (keyNumber - 9) / 12 + (octave - 4));
}

export function getSlices(buffer: AudioBuffer, threshold: number = 0.1): number[] {
    const data = buffer.getChannelData(0);
    const slices: number[] = [0];
    const sampleRate = buffer.sampleRate;
    const windowSize = Math.floor(sampleRate * 0.05); // 50ms window

    for (let i = windowSize; i < data.length; i += windowSize) {
        let max = 0;
        for (let j = 0; j < windowSize && i + j < data.length; j++) {
            if (Math.abs(data[i + j]) > max) max = Math.abs(data[i + j]);
        }
        if (max > threshold) {
            const time = i / sampleRate;
            if (time - slices[slices.length - 1] > 0.2) { // minimum 200ms between slices
                slices.push(time);
            }
        }
    }
    return slices;
}

export function drawWaveform(canvas: HTMLCanvasElement, buffer: AudioBuffer, slices: number[], colors: any = {}) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    const amp = height / 2;

    ctx.fillStyle = colors.wave || '#f59e0b';
    for (let i = 0; i < width; i++) {
        let min = 1.0;
        let max = -1.0;
        for (let j = 0; j < step; j++) {
            const datum = data[(i * step) + j];
            if (datum < min) min = datum;
            if (datum > max) max = datum;
        }
        ctx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
    }

    ctx.strokeStyle = colors.slice || '#ef4444';
    ctx.lineWidth = 1;
    slices.forEach((time, index) => {
        const x = (time / buffer.duration) * width;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();

        ctx.fillStyle = colors.text || '#ffffff';
        ctx.font = "10px monospace";
        ctx.fillText(index.toString(), x + 2, 10);
    });
}
