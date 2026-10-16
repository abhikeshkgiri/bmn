/**
 * Google Maps API loader utility
 * Loads the Google Maps API script only once and manages script state
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
// Google Maps API types are complex and not fully covered by DefinitelyTyped
// This is properly isolated and only used within map-related components

interface GoogleMapsAPI {
  Map: any;
  Marker: any;
  InfoWindow: any;
  LatLngBounds: any;
  SymbolPath: any;
}

let mapsScriptPromise: Promise<void> | null = null;

export async function loadGoogleMaps(): Promise<void> {
  // Return existing promise if already loading or loaded
  if (mapsScriptPromise) {
    return mapsScriptPromise;
  }

  mapsScriptPromise = new Promise<void>((resolve, reject) => {
    // Check if Google Maps is already loaded
    if (typeof window !== 'undefined' && (window as { google?: { maps?: unknown } }).google?.maps) {
      resolve();
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      reject(new Error('Google Maps API key is not configured. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local'));
      return;
    }

    // Check if script already exists
    const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`);
    if (existingScript) {
      // Wait for existing script to load
      if (typeof window !== 'undefined' && (window as { google?: { maps?: unknown } }).google?.maps) {
        resolve();
      } else {
        const checkInterval = setInterval(() => {
          if (typeof window !== 'undefined' && (window as { google?: { maps?: unknown } }).google?.maps) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      }
      return;
    }

    // Create and load script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      resolve();
    };

    script.onerror = () => {
      mapsScriptPromise = null;
      reject(new Error('Failed to load Google Maps API'));
    };

    document.head.appendChild(script);
  });

  return mapsScriptPromise;
}

/**
 * Get Google Maps instance (assumes script is already loaded)
 */
export function getGoogleMaps(): GoogleMapsAPI | null {
  if (typeof window !== 'undefined' && (window as any).google?.maps) {
    return (window as any).google.maps;
  }
  return null;
}
