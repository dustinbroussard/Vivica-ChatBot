// js/voice-mode.js
// Code Maniac - Voice Mode Integration Module for Vivica Chat App

/**
 * @fileoverview This module encapsulates all Speech Recognition and Text-to-Speech (TTS) logic.
 * It's designed to be imported and controlled by the main application (main.js)
 * to provide a seamless voice interaction mode.
 */

import { sendToAndroidLog, isAndroidBridgeAvailable } from './android-bridge.js';

const VOICE_MODE_DEBUG_TAG = 'VoiceMode';

// --- State Variables ---
let recognition; // SpeechRecognition instance
let synth;       // SpeechSynthesisUtterance instance
let currentSpeechUtterance = null; // To manage ongoing speech
let isListening = false; // Is the recognition active?
let isSpeaking = false; // Is the synthesis active?
let silenceTimer; // Timer to detect prolonged silence
const SILENCE_TIMEOUT = 3000; // 3 seconds of silence to stop recognition

// Audio visualization variables
let audioCtx = null;
let analyser = null;
let audioStream = null;
let volumeInterval = null;

// --- Configuration (can be passed from main.js or managed internally) ---
let vivicaVoiceModeConfig = {
    apiKey: '', // API key for backend (if TTS/STT is API-driven)
    model: 'gpt-4o', // Default model for voice interactions
    systemPrompt: 'You are Vivica, a helpful AI assistant.',
    conversationId: null, // Current conversation context from main app
    onSpeechResult: (transcript, isFinal) => {}, // Callback for speech results
    onSpeechStart: () => {}, // Callback when recognition starts
    onSpeechEnd: () => {}, // Callback when recognition ends
    onSpeechError: (error) => {}, // Callback for recognition errors
    onSpeakingStart: () => {}, // Callback when TTS starts
    onSpeakingEnd: () => {}, // Callback when TTS ends
    onSpeakingError: (error) => {}, // Callback for TTS errors
    onListenStateChange: (state) => {}, // Callback for listening state (e.g., "listening", "speaking", "idle")
    onVisualizerData: (data) => {} // Callback for visualizer data (e.g., audio levels)
    ,useGoogleTTS: false,
    googleApiKey: ''
};

/**
 * Updates the configuration for the voice mode module.
 * @param {object} newConfig - New configuration object.
 */
export function updateVoiceModeConfig(newConfig) {
    vivicaVoiceModeConfig = { ...vivicaVoiceModeConfig, ...newConfig };
    debugLog('Config updated:', vivicaVoiceModeConfig);
}

/**
 * Sets the current conversation ID for context.
 * @param {string | number | null} id - The ID of the current conversation.
 */
export function setCurrentConversationId(id) {
    vivicaVoiceModeConfig.conversationId = id;
    debugLog('Current conversation ID set to:', id);
}

/**
 * Debug logging function, uses Android bridge if available.
 * @param {...any} args - Arguments to log.
 */
function debugLog(...args) {
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
    if (isAndroidBridgeAvailable()) {
        sendToAndroidLog('INFO', VOICE_MODE_DEBUG_TAG, message);
    } else {
        console.log(`[${VOICE_MODE_DEBUG_TAG}]`, ...args);
    }
}

// --- Audio visualization helpers ---
async function startAudioVisualization() {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('getUserMedia not supported');
        }
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioCtx.createMediaStreamSource(audioStream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        const dataArray = new Uint8Array(analyser.fftSize);
        volumeInterval = setInterval(() => {
            analyser.getByteTimeDomainData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                const v = (dataArray[i] - 128) / 128;
                sum += v * v;
            }
            const rms = Math.sqrt(sum / dataArray.length);
            vivicaVoiceModeConfig.onVisualizerData(rms);
        }, 50);
    } catch (err) {
        console.error('Audio visualization error:', err);
        if (window.showToast) window.showToast('Audio error: ' + err.message, 'error');
    }
}

function stopAudioVisualization() {
    if (volumeInterval) {
        clearInterval(volumeInterval);
        volumeInterval = null;
    }
    if (audioStream) {
        audioStream.getTracks().forEach(t => t.stop());
        audioStream = null;
    }
    if (audioCtx) {
        audioCtx.close();
        audioCtx = null;
    }
    vivicaVoiceModeConfig.onVisualizerData(0);
}

// --- Speech Recognition (Web Speech API) ---

/**
 * Initializes the Speech Recognition API.
 */
function initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US'; // Or dynamically set based on user preference

        recognition.onstart = () => {
            debugLog('Speech recognition started.');
            isListening = true;
            vivicaVoiceModeConfig.onSpeechStart();
            vivicaVoiceModeConfig.onListenStateChange('listening');
            resetSilenceTimer();
        };

        recognition.onresult = (event) => {
            resetSilenceTimer(); // Reset on any speech input
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            if (finalTranscript) {
                debugLog('Final speech result:', finalTranscript);
                vivicaVoiceModeConfig.onSpeechResult(finalTranscript.trim(), true);
                // Optionally stop recognition after final result if not continuous input
                // stopListening();
            } else {
                debugLog('Interim speech result:', interimTranscript);
                vivicaVoiceModeConfig.onSpeechResult(interimTranscript.trim(), false);
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            isListening = false;
            clearSilenceTimer();
            vivicaVoiceModeConfig.onSpeechError(event.error);
            vivicaVoiceModeConfig.onListenStateChange('idle');
            // Attempt to restart if it's a common transient error
            if (event.error === 'network' || event.error === 'audio-capture') {
                debugLog('Attempting to restart recognition after error...');
                setTimeout(() => startListening(), 1000);
            }
            if (window.showToast) window.showToast('Voice error: ' + event.error, 'error');
        };

        recognition.onend = () => {
            debugLog('Speech recognition ended.');
            isListening = false;
            clearSilenceTimer();
            vivicaVoiceModeConfig.onSpeechEnd();
            vivicaVoiceModeConfig.onListenStateChange('idle');
            stopAudioVisualization();
        };

    } else {
        console.warn('Web Speech API (webkitSpeechRecognition) not supported in this browser.');
        if (window.showToast) window.showToast('Voice input not supported in this browser.', 'error');
    }
}

/**
 * Starts speech recognition.
 */
export function startListening() {
    if (recognition && !isListening) {
        try {
            recognition.start();
            debugLog('Listening started.');
            startAudioVisualization();
        } catch (e) {
            console.error('Failed to start recognition:', e);
            vivicaVoiceModeConfig.onSpeechError(e);
            vivicaVoiceModeConfig.onListenStateChange('idle');
            if (window.showToast) window.showToast('Voice error: ' + e.message, 'error');
        }
    } else if (!recognition) {
        initSpeechRecognition(); // Initialize if not already
        if (recognition) startListening(); // Try again after init
    }
}

/**
 * Stops speech recognition.
 */
export function stopListening() {
    if (recognition && isListening) {
        recognition.stop();
        debugLog('Listening stopped.');
        clearSilenceTimer();
        stopAudioVisualization();
    }
}

/**
 * Toggles speech recognition on/off.
 */
export function toggleListening() {
    if (isListening) {
        stopListening();
    } else {
        startListening();
    }
}

/**
 * Resets the silence detection timer.
 */
function resetSilenceTimer() {
    clearSilenceTimer();
    silenceTimer = setTimeout(() => {
        debugLog('Silence detected, stopping recognition.');
        stopListening();
    }, SILENCE_TIMEOUT);
}

/**
 * Clears the silence detection timer.
 */
function clearSilenceTimer() {
    if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
    }
}

// --- Text-to-Speech (Web Speech API) ---

/**
 * Initializes the Speech Synthesis API.
 */
function initSpeechSynthesis() {
    synth = window.speechSynthesis;
    // Preload voices
    synth.getVoices(); // Request voices as they might not be immediately available
    synth.onvoiceschanged = () => {
        debugLog('Speech Synthesis: Voices changed/loaded.');
    };
}

/**
 * Speaks the given text.
 * @param {string} text - The text to speak.
 * @returns {Promise<void>} A promise that resolves when speech ends or rejects on error.
 */
export function speak(text) {
    if (vivicaVoiceModeConfig.useGoogleTTS && vivicaVoiceModeConfig.googleApiKey) {
        return googleSpeak(text);
    }
    return new Promise((resolve, reject) => {
        if (!synth) {
            initSpeechSynthesis();
            if (!synth) {
                const errMsg = 'Speech Synthesis not available.';
                console.error(errMsg);
                vivicaVoiceModeConfig.onSpeakingError(new Error(errMsg));
                return reject(new Error(errMsg));
            }
        }

        if (currentSpeechUtterance && isSpeaking) {
            synth.cancel(); // Stop current speech if any
            debugLog('Cancelled previous speech.');
        }

        currentSpeechUtterance = new SpeechSynthesisUtterance(text);
        currentSpeechUtterance.lang = 'en-US'; // Or dynamically set
        // Find a good voice if possible (e.g., a Google US English voice)
        const voices = synth.getVoices();
        const preferredVoice = voices.find(voice =>
            voice.lang === 'en-US' && voice.name.includes('Google')
        ) || voices.find(voice => voice.lang === 'en-US'); // Fallback

        if (preferredVoice) {
            currentSpeechUtterance.voice = preferredVoice;
            debugLog('Using voice:', preferredVoice.name);
        } else {
            debugLog('No preferred voice found, using default.');
        }

        currentSpeechUtterance.onstart = () => {
            debugLog('Speech synthesis started.');
            isSpeaking = true;
            vivicaVoiceModeConfig.onSpeakingStart();
            vivicaVoiceModeConfig.onListenStateChange('speaking');
            stopListening(); // Stop listening while speaking
        };

        currentSpeechUtterance.onend = () => {
            debugLog('Speech synthesis ended.');
            isSpeaking = false;
            vivicaVoiceModeConfig.onSpeakingEnd();
            vivicaVoiceModeConfig.onListenStateChange('idle');
            resolve();
            // Optionally restart listening after speaking if desired
            // startListening();
        };

        currentSpeechUtterance.onerror = (event) => {
            console.error('Speech synthesis error:', event.error);
            isSpeaking = false;
            vivicaVoiceModeConfig.onSpeakingError(event.error);
            vivicaVoiceModeConfig.onListenStateChange('idle');
            if (window.showToast) window.showToast('Speech error: ' + event.error, 'error');
            reject(event.error);
        };

        synth.speak(currentSpeechUtterance);
    });
}

async function googleSpeak(text) {
    const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${vivicaVoiceModeConfig.googleApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            input: { text },
            voice: { languageCode: 'en-US', ssmlGender: 'FEMALE' },
            audioConfig: { audioEncoding: 'MP3' }
        })
    });
    const data = await response.json();
    if (data.audioContent) {
        return new Promise(resolve => {
            const audio = new Audio('data:audio/mp3;base64,' + data.audioContent);
            audio.onended = resolve;
            audio.onerror = resolve;
            audio.play();
        });
    }
    throw new Error('Google TTS failed');
}

/**
 * Stops any ongoing speech synthesis.
 */
export function stopSpeaking() {
    if (synth && isSpeaking) {
        synth.cancel();
        isSpeaking = false;
        debugLog('Speech synthesis cancelled.');
        vivicaVoiceModeConfig.onSpeakingEnd();
        vivicaVoiceModeConfig.onListenStateChange('idle');
    }
}

/**
 * Gets the current listening state.
 * @returns {boolean} True if listening is active, false otherwise.
 */
export function getIsListening() {
    return isListening;
}

/**
 * Gets the current speaking state.
 * @returns {boolean} True if speaking is active, false otherwise.
 */
export function getIsSpeaking() {
    return isSpeaking;
}

/**
 * Initializes the voice mode module.
 * Call this once when the application starts.
 * @param {object} initialConfig - Initial configuration for the voice mode.
 */
export function initVoiceMode(initialConfig = {}) {
    updateVoiceModeConfig(initialConfig);
    initSpeechRecognition();
    initSpeechSynthesis();
    debugLog('Voice mode module initialized.');
}
