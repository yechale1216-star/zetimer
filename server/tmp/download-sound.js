const fs = require('fs');
const path = require('path');

const sampleRate = 8000;
const duration = 0.5; // seconds
const numSamples = sampleRate * duration;
const buffer = Buffer.alloc(44 + numSamples);

// Write RIFF header
buffer.write('RIFF', 0);
buffer.writeUInt32LE(36 + numSamples, 4);
buffer.write('WAVE', 8);

// Write fmt chunk
buffer.write('fmt ', 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20); // PCM
buffer.writeUInt16LE(1, 22); // Mono
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(sampleRate, 28); // Byte rate
buffer.writeUInt16LE(1, 32); // Block align
buffer.writeUInt16LE(8, 34); // Bits per sample

// Write data chunk
buffer.write('data', 36);
buffer.writeUInt32LE(numSamples, 40);

// Generate 800Hz beep sound with a smooth fade-out
for (let i = 0; i < numSamples; i++) {
  const t = i / sampleRate;
  const fade = Math.max(0, 1 - (t / duration));
  const val = Math.round(128 + 60 * Math.sin(2 * Math.PI * 800 * t) * fade);
  buffer.writeUInt8(val, 44 + i);
}

const dir1 = 'c:/yechale file/zetime/zetimer/public/sounds';
const dir2 = 'c:/yechale file/zetime/zetimer/android/app/src/main/res/raw';

if (!fs.existsSync(dir1)) fs.mkdirSync(dir1, { recursive: true });
if (!fs.existsSync(dir2)) fs.mkdirSync(dir2, { recursive: true });

fs.writeFileSync(path.join(dir1, 'notification.wav'), buffer);
fs.writeFileSync(path.join(dir2, 'notification.wav'), buffer);
console.log('Self-contained WAV audio file generated successfully!');
process.exit(0);
