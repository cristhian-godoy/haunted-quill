// --- Configuration & Presets ---
const presets = {
    zen:       { grace: 15.0, speed: 8.0 },
    forgiving: { grace: 10.0, speed: 5.0 },
    normal:    { grace:  5.0, speed: 2.0 },
    brutal:    { grace:  2.0, speed: 0.8 }
};

// --- DOM Elements ---
const editor = document.getElementById('editor');
const editorContainer = document.getElementById('editorContainer');
const presetSelect = document.getElementById('preset');
const graceInput = document.getElementById('gracePeriod');
const speedInput = document.getElementById('deleteSpeed');
const statusText = document.getElementById('status');
const panicBtn = document.getElementById('panicBtn');
const archiveList = document.getElementById('archiveList');

// --- State Variables ---
let idleTimer = null;
let deleteTimer = null;
let currentDeleteSpeed = 0;
let isDeleting = false;
let archives = []; // Array to store historical backups

try {
    const stored = localStorage.getItem('hauntedArchives');
    if (stored) {
        archives = JSON.parse(stored);
    }
} catch (e) {
    console.warn("Failed to load archives from local storage.", e);
}

// --- Audio Context (Offline Synth) ---
let audioCtx;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSpookySound(intensityFactor) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.type = 'sine'; 

    const baseFreq = 300;
    const startFreq = baseFreq + (intensityFactor * 400); 
    
    osc.frequency.setValueAtTime(startFreq, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.3);

    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
}

// --- UI & Preset Logic ---
function applyPreset(presetName) {
    if (presets[presetName]) {
        graceInput.value = presets[presetName].grace;
        speedInput.value = presets[presetName].speed;
    }
}

presetSelect.addEventListener('change', (e) => applyPreset(e.target.value));

[graceInput, speedInput].forEach(input => {
    input.addEventListener('input', () => { presetSelect.value = 'custom'; });
});

applyPreset('forgiving');

// --- Archive System ---
function takeSnapshot() {
    const text = editor.value.trim();
    if (!text) return;
    
    // Don't save identical consecutive snapshots
    if (archives.length > 0 && archives[0].text === text) return;

    const time = new Date().toLocaleTimeString();
    let snippet = text.replace(/\s+/g, ' ').substring(0, 45);
    if (text.length > 45) snippet += "...";

    archives.unshift({ time, text, snippet });
    
    // Keep maximum of 20 recent archives
    if (archives.length > 20) archives.pop();
    
    try {
        localStorage.setItem('hauntedArchives', JSON.stringify(archives));
    } catch (e) {
        console.warn("Failed to save archive to local storage. Quota may be exceeded.", e);
    }
    
    panicBtn.disabled = false;
    renderArchives();
}

function renderArchives() {
    archiveList.innerHTML = '';
    archives.forEach((arc, index) => {
        const div = document.createElement('div');
        div.className = 'archive-item';
        div.innerHTML = `
            <span style="color: #888;">[${arc.time}]</span>
            <span class="archive-text">"${arc.snippet}"</span>
            <button class="restore-btn" onclick="restoreArchive(${index})">Restore</button>
        `;
        archiveList.appendChild(div);
    });
}

// Exposed to global scope for the inline onclick handler
window.restoreArchive = function(index) {
    editor.value = archives[index].text;
    clearTimeout(idleTimer);
    clearTimeout(deleteTimer);
    isDeleting = false;
    statusText.textContent = `Status: Restored safely from ${archives[index].time}`;
    statusText.className = "";
};

// --- Visual Effects ---
function spawnVisualEffect() {
    const fx = document.createElement('div');
    fx.className = 'ghost-fx';
    fx.innerText = Math.random() < 0.05 ? '🩻' : '👻';

    const rect = editor.getBoundingClientRect();
    const x = Math.random() * (rect.width - 50);
    const y = Math.random() * (rect.height - 50);

    fx.style.left = `${x}px`;
    fx.style.top = `${y}px`;

    editorContainer.appendChild(fx);
    setTimeout(() => { fx.remove(); }, 2000);
}

// --- Core Application Logic ---
function triggerDeletionTick() {
    const text = editor.value;
    
    // REGEX UPDATE: Matches a word PLUS its trailing whitespace to keep formatting clean
    const wordRegex = /\S+\s*/g;
    let match;
    const matches = [];

    while ((match = wordRegex.exec(text)) !== null) {
        matches.push({ index: match.index, length: match[0].length });
    }

    if (matches.length > 0) {
        const randomMatch = matches[Math.floor(Math.random() * matches.length)];
        const newText = text.substring(0, randomMatch.index) + text.substring(randomMatch.index + randomMatch.length);
        
        editor.value = newText;
        statusText.textContent = "Status: The ghosts are eating your words!!";
        statusText.className = "danger";

        spawnVisualEffect();
        
        const startingSpeed = parseFloat(speedInput.value) * 1000;
        const intensity = Math.max(0, 1 - (currentDeleteSpeed / startingSpeed));
        playSpookySound(intensity);

        // SPEED UPDATE: Accelerate deletion speed by 5% (multiplier 0.95) for a slightly gentler curve
        currentDeleteSpeed = Math.max(50, currentDeleteSpeed * 0.95);

        deleteTimer = setTimeout(triggerDeletionTick, currentDeleteSpeed);
    } else {
        statusText.textContent = "Status: They ate everything...";
        statusText.className = "";
        isDeleting = false;
    }
}

function startHaunting() {
    if (editor.value.trim().length === 0) return;
    
    // Save the exact state right before the destruction starts
    takeSnapshot();
    
    isDeleting = true;
    currentDeleteSpeed = parseFloat(speedInput.value) * 1000;
    triggerDeletionTick();
}

function resetTimers() {
    clearTimeout(idleTimer);
    clearTimeout(deleteTimer);
    isDeleting = false;
    
    const gracePeriodMs = parseFloat(graceInput.value) * 1000;
    
    if (editor.value.trim().length > 0) {
        idleTimer = setTimeout(startHaunting, gracePeriodMs);
    }
}

// --- Event Listeners ---
editor.addEventListener('input', () => {
    initAudio(); 
    statusText.textContent = "Status: Writing safely...";
    statusText.className = "";
    resetTimers();
});

editor.addEventListener('focus', initAudio);

panicBtn.addEventListener('click', () => {
    if (archives.length > 0) {
        window.restoreArchive(0); // Restores the most recent snapshot
    }
});

// --- Initialization ---
if (archives.length > 0) {
    panicBtn.disabled = false;
    renderArchives();
}