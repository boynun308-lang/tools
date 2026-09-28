// State variables
let state = {
    videoPath: null,
    audioPath: null,
    generatedAudioPath: null
};

// UI Elements
const els = {
    fileInput: document.getElementById('video-upload'),
    fileInfo: document.getElementById('file-info'),
    filenameDisplay: document.getElementById('filename-display'),
    statusAlert: document.getElementById('status-alert'),
    progressBar: document.getElementById('progress-bar')
};

// Utility to show messages
function showStatus(message, type = 'info') {
    els.statusAlert.classList.remove('hidden', 'bg-blue-100', 'text-blue-800', 'bg-red-100', 'text-red-800', 'bg-green-100', 'text-green-800');
    if (type === 'info') els.statusAlert.classList.add('bg-blue-100', 'text-blue-800');
    if (type === 'error') els.statusAlert.classList.add('bg-red-100', 'text-red-800');
    if (type === 'success') els.statusAlert.classList.add('bg-green-100', 'text-green-800');
    els.statusAlert.textContent = message;
    els.statusAlert.classList.remove('hidden');
}

function updateProgress(stepNumber) {
    const percentages = {1: '0%', 2: '25%', 3: '50%', 4: '75%', 5: '100%'};
    els.progressBar.style.width = percentages[stepNumber];
    
    document.querySelectorAll('.step-indicator').forEach((el, index) => {
        const step = index + 1;
        el.classList.remove('active', 'completed');
        if (step < stepNumber) el.classList.add('completed');
        else if (step === stepNumber) el.classList.add('active');
    });

    document.querySelectorAll('.workflow-card').forEach(el => el.classList.add('hidden'));
    document.getElementById(`step-${stepNumber}`).classList.remove('hidden');
}

// Step 1: File Selection
els.fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        const file = e.target.files[0];
        els.filenameDisplay.textContent = `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
        els.fileInfo.classList.remove('hidden');
    }
});

// Step 1: Upload Logic
document.getElementById('upload-btn').addEventListener('click', async () => {
    const file = els.fileInput.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    showStatus("Uploading video...", "info");
    document.getElementById('upload-btn').disabled = true;

    try {
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        
        if (res.ok) {
            state.videoPath = data.video_path;
            showStatus("Upload successful!", "success");
            setTimeout(() => {
                els.statusAlert.classList.add('hidden');
                updateProgress(2);
            }, 1000);
        } else throw new Error(data.detail);
    } catch (err) {
        showStatus(err.message, "error");
        document.getElementById('upload-btn').disabled = false;
    }
});

// Step 2: Transcribe
document.getElementById('transcribe-btn').addEventListener('click', async () => {
    showStatus("Extracting audio and transcribing (this may take a minute)...", "info");
    const btn = document.getElementById('transcribe-btn');
    btn.disabled = true;

    const formData = new FormData();
    formData.append("video_path", state.videoPath);

    try {
        const res = await fetch("/api/transcribe", { method: "POST", body: formData });
        const data = await res.json();
        
        if (res.ok) {
            document.getElementById('original-script').value = data.script;
            document.getElementById('transcription-result').classList.remove('hidden');
            btn.classList.add('hidden');
            els.statusAlert.classList.add('hidden');
        } else throw new Error(data.detail);
    } catch (err) {
        showStatus(err.message, "error");
        btn.disabled = false;
    }
});

document.getElementById('continue-step-3').addEventListener('click', () => updateProgress(3));

// Step 3: Translate
document.getElementById('translate-btn').addEventListener('click', async () => {
    showStatus("Translating script...", "info");
    const btn = document.getElementById('translate-btn');
    btn.disabled = true;

    const script = document.getElementById('original-script').value;
    const sourceLang = document.getElementById('source-lang').value;
    const targetLang = document.getElementById('target-lang').value;

    const formData = new FormData();
    formData.append("script", script);
    formData.append("source_lang", sourceLang);
    formData.append("target_lang", targetLang);

    try {
        const res = await fetch("/api/translate", { method: "POST", body: formData });
        const data = await res.json();
        
        if (res.ok) {
            document.getElementById('translated-script').value = data.translated_script;
            document.getElementById('translation-result').classList.remove('hidden');
            btn.classList.add('hidden');
            els.statusAlert.classList.add('hidden');
        } else throw new Error(data.detail);
    } catch (err) {
        showStatus(err.message, "error");
        btn.disabled = false;
    }
});

document.getElementById('continue-step-4').addEventListener('click', () => updateProgress(4));

// Step 4: Generate Voice
document.getElementById('generate-voice-btn').addEventListener('click', async () => {
    showStatus("Generating natural AI voice...", "info");
    const btn = document.getElementById('generate-voice-btn');
    btn.disabled = true;

    const translatedScript = document.getElementById('translated-script').value;
    const targetLang = document.getElementById('target-lang').value;
    const gender = document.getElementById('voice-gender').value;

    const formData = new FormData();
    formData.append("translated_script", translatedScript);
    formData.append("target_lang", targetLang);
    formData.append("voice_gender", gender);

    try {
        const res = await fetch("/api/generate-voice", { method: "POST", body: formData });
        const data = await res.json();
        
        if (res.ok) {
            state.generatedAudioPath = data.audio_path;
            const audioPlayer = document.getElementById('audio-preview');
            audioPlayer.src = data.audio_url;
            document.getElementById('voice-result').classList.remove('hidden');
            btn.classList.add('hidden');
            els.statusAlert.classList.add('hidden');
        } else throw new Error(data.detail);
    } catch (err) {
        showStatus(err.message, "error");
        btn.disabled = false;
    }
});

// Step 5: Create Video
document.getElementById('continue-step-5').addEventListener('click', async () => {
    updateProgress(5);
    showStatus("Merging translated audio with original video frames...", "info");
    
    const formData = new FormData();
    formData.append("video_path", state.videoPath);
    formData.append("audio_path", state.generatedAudioPath);

    try {
        const res = await fetch("/api/create-video", { method: "POST", body: formData });
        const data = await res.json();
        
        if (res.ok) {
            const videoPlayer = document.getElementById('final-video');
            videoPlayer.src = data.video_url;
            document.getElementById('download-video').href = data.video_url;
            
            showStatus("Video processing complete!", "success");
        } else throw new Error(data.detail);
    } catch (err) {
        showStatus(err.message, "error");
    }
});
