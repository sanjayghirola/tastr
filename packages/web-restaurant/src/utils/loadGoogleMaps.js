// Shared Google Maps script loader — prevents duplicate loading and race conditions
let loadPromise = null;

export default function loadGoogleMaps(libraries = 'places,geometry') {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve) => {
    // Already loaded
    if (window.google?.maps) return resolve(true);

    const key = import.meta.env.VITE_GOOGLE_MAPS_KEY;
    if (!key) {
      console.warn('VITE_GOOGLE_MAPS_KEY is not set');
      return resolve(false);
    }

    // Check if script tag already exists (injected by another component)
    const existing = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existing) {
      if (window.google?.maps) return resolve(true);
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=${libraries}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      loadPromise = null;
      resolve(false);
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
