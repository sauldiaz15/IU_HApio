/**
 * Hapio API Service
 */

const API_KEY = import.meta.env.VITE_HAPIO_API_KEY;
const BASE_URL = import.meta.env.VITE_HAPIO_BASE_URL;

/**
 * Creates a new location in Hapio.
 * 
 * @param {Object} locationData
 * @param {string} locationData.name - The name of the location.
 * @param {string} locationData.time_zone - IANA time zone string (e.g. "UTC").
 * @param {string} locationData.resource_selection_strategy - "randomize", "prioritize", or "equalize".
 * @returns {Promise<Object>} The created location object.
 */
export async function createLocation(locationData) {
  const response = await fetch(`${BASE_URL}/locations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'Accept': 'application/json',
    },
    body: JSON.stringify(locationData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Fetches the list of locations from Hapio.
 * 
 * @returns {Promise<Object>} Object containing data (array of locations), meta, and links.
 */
export async function getLocations() {
  const response = await fetch(`${BASE_URL}/locations`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Deletes a location from Hapio.
 * 
 * @param {string} id - The UUID of the location to delete.
 * @returns {Promise<void>}
 */
export async function deleteLocation(id) {
  const response = await fetch(`${BASE_URL}/locations/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
  }
}

/**
 * Updates a location in Hapio (e.g. enabling/disabling it).
 * 
 * @param {string} id - The UUID of the location.
 * @param {Object} data - The partial data to update (e.g. { enabled: true }).
 * @returns {Promise<Object>} The updated location object.
 */
export async function updateLocation(id, data) {
  const response = await fetch(`${BASE_URL}/locations/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'Accept': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}
