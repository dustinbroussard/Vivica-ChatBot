// js/android-bridge.js
// Code Maniac - Android WebView Bridge for Vivica Chat App

/**
 * @fileoverview This file provides a basic bridge for JavaScript-to-Android communication
 * when the application is running inside an Android WebView.
 * It defines a global 'Android' object if available, allowing JavaScript to call
 * methods defined in the native Android code.
 *
 * IMPORTANT: For this to work, your Android WebView must expose a JavaScript interface.
 * Example in Kotlin:
 * webView.addJavascriptInterface(WebAppInterface(this), "Android")
 */

/**
 * @namespace Android
 * @description Global object exposed by Android WebView for JavaScript-to-Android communication.
 * This object will only exist if the WebView has explicitly added a JavaScript interface
 * named "Android".
 */
const Android = window.Android || {};

/**
 * Sends a log message to the native Android application.
 * Useful for debugging within the Android Studio Logcat.
 * @param {string} level - Log level (e.g., "INFO", "WARN", "ERROR").
 * @param {string} tag - A tag for filtering log messages.
 * @param {string} message - The message to log.
 */
export function sendToAndroidLog(level, tag, message) {
    if (Android.log) {
        Android.log(level, tag, message);
    } else {
        console.warn('Android bridge not available. Cannot send log to native:', message);
    }
}

/**
 * Example: Request a native feature (e.g., show a toast).
 * @param {string} message - The message for the native toast.
 */
export function showAndroidToast(message) {
    if (Android.showToast) {
        Android.showToast(message);
    } else {
        console.warn('Android bridge not available. Cannot show native toast:', message);
    }
}

/**
 * Example: Request a native action, like opening a URL in a native browser.
 * @param {string} url - The URL to open.
 */
export function openUrlInNativeBrowser(url) {
    if (Android.openUrl) {
        Android.openUrl(url);
    } else {
        console.warn('Android bridge not available. Cannot open URL natively:', url);
        window.open(url, '_blank'); // Fallback for web environment
    }
}

/**
 * Checks if the Android bridge is available.
 * @returns {boolean} True if the Android object is present, false otherwise.
 */
export function isAndroidBridgeAvailable() {
    return typeof window.Android !== 'undefined';
}

// You can add more functions here as needed for your Android integration.
// For example:
// export function getAndroidDeviceId() {
//     if (Android.getDeviceId) {
//         return Android.getDeviceId();
//     }
//     return null;
// }
