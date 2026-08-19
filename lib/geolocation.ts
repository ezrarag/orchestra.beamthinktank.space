export interface GeoCoords {
  latitude: number
  longitude: number
  accuracy?: number
  cityState?: string
  error?: string
}

/**
 * Reverse geocode latitude and longitude to a human-readable city, state/country string.
 */
export async function reverseGeocodeCoords(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
      { cache: 'no-store' }
    )
    if (res.ok) {
      const data = await res.json()
      const city = data.city || data.locality || data.principalSubdivision || ''
      const state = data.principalSubdivisionCode || data.countryCode || ''
      if (city && state) {
        return `${city}, ${state}`
      } else if (city) {
        return city
      }
    }
  } catch {
    // Silent fallback
  }

  // Coordinate fallback if reverse geocoding API is unreachable
  return `Lat ${lat.toFixed(3)}, Lng ${lng.toFixed(3)}`
}

/**
 * Capture browser native geolocation using navigator.geolocation.getCurrentPosition
 */
export function getBrowserCoordinates(): Promise<GeoCoords> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      resolve({
        latitude: 0,
        longitude: 0,
        error: 'Geolocation is not supported by your browser.'
      })
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        const accuracy = Math.round(pos.coords.accuracy)
        const cityState = await reverseGeocodeCoords(lat, lng)

        resolve({
          latitude: lat,
          longitude: lng,
          accuracy,
          cityState
        })
      },
      (err) => {
        let msg = 'Geolocation permission denied or unavailable.'
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location permission denied by user.'
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'Location position unavailable.'
        } else if (err.code === err.TIMEOUT) {
          msg = 'Location request timed out.'
        }
        resolve({
          latitude: 0,
          longitude: 0,
          error: msg
        })
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    )
  })
}
