import Storage from './storage-wrapper.js';

// Map of Open-Meteo weather codes to descriptions
export function weatherCodeToText(code) {
  const map = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Drizzle',
    55: 'Dense drizzle',
    56: 'Freezing drizzle',
    57: 'Freezing dense drizzle',
    61: 'Slight rain',
    63: 'Rain',
    65: 'Heavy rain',
    66: 'Freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow',
    73: 'Snow',
    75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Slight showers',
    81: 'Showers',
    82: 'Violent showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with hail',
    99: 'Violent thunderstorm'
  };
  return map[code] || 'Unknown';
}

export async function fetchWeatherOpenMeteo(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=fahrenheit`;
  try {
    const resp = await fetch(url);
    const data = await resp.json();
    const current = data.current_weather;
    const temp = Math.round(current.temperature) + '°F';
    const condText = weatherCodeToText(current.weathercode);
    return `${condText}, ${temp}`;
  } catch {
    return 'Weather unavailable.';
  }
}

export async function renderWeatherWidget() {
  const el = document.getElementById('weather-widget');
  if (!el) {
    console.debug('Weather widget element not found - skipping');
    return;
  }
  el.innerHTML = `<span style="color:var(--text-muted);">Detecting weather…</span>`;
  const fallback = { lat: 30.2366, lon: -92.8204, name: 'Welsh, LA' };
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const weather = await fetchWeatherOpenMeteo(pos.coords.latitude, pos.coords.longitude);
        el.innerHTML = `<span style="font-size:1.2em;">🌤️</span> <strong>Your location:</strong> ${weather}`;
      },
      async () => {
        const weather = await fetchWeatherOpenMeteo(fallback.lat, fallback.lon);
        el.innerHTML = `<span style="font-size:1.2em;">🌤️</span> <strong>${fallback.name}:</strong> ${weather}`;
      },
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 180000 }
    );
  } else {
    const weather = await fetchWeatherOpenMeteo(fallback.lat, fallback.lon);
    el.innerHTML = `<span style="font-size:1.2em;">🌤️</span> <strong>${fallback.name}:</strong> ${weather}`;
  }
}

let rssIndex = 0;
let rssHeadlines = [];

export async function fetchRSSSummariesWithLinks(urls) {
  const parser = new DOMParser();
  const headlines = [];
  for (const url of urls) {
    try {
      const resp = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
      const data = await resp.json();
      const doc = parser.parseFromString(data.contents, 'text/xml');
      const item = doc.querySelector('item');
      if (item) {
        headlines.push({
          title: item.querySelector('title').textContent.trim(),
          link: item.querySelector('link').textContent.trim()
        });
      }
    } catch {
      // ignore failures for individual feeds
    }
  }
  return headlines;
}

export async function fetchRSSSummaries(urls) {
  const items = await fetchRSSSummariesWithLinks(urls);
  return items.map(i => i.title).join('; ');
}

export async function renderRSSWidget() {
  const el = document.getElementById('rss-widget');
  if (!el) {
    console.debug('RSS widget element not found - skipping');
    return;
  }
  const settings = await Storage.SettingsStorage.getSettings();
  if (!settings?.rssFeeds) {
    el.innerHTML = '';
    return;
  }
  const feeds = settings.rssFeeds.split(',').map(s => s.trim()).filter(Boolean);
  if (!feeds.length) return;
  rssHeadlines = await fetchRSSSummariesWithLinks(feeds);
  if (!rssHeadlines.length) {
    el.innerHTML = '<em>No news headlines.</em>';
    return;
  }
  function showHeadline(idx) {
    const h = rssHeadlines[idx];
    el.innerHTML = `<a href="${h.link}" target="_blank" style="text-decoration:none;color:inherit;font-weight:bold;">${h.title}</a>`;
  }
  showHeadline(rssIndex);
  setInterval(() => {
    rssIndex = (rssIndex + 1) % rssHeadlines.length;
    el.style.opacity = 0;
    setTimeout(() => {
      showHeadline(rssIndex);
      el.style.opacity = 1;
    }, 350);
  }, 5000);
}

