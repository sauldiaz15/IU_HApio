/**
 * Hapio API Service
 */

const API_KEY = import.meta.env.VITE_HAPIO_API_KEY;
const BASE_URL = import.meta.env.VITE_HAPIO_BASE_URL;

export type ResourceSelectionStrategy = 'randomize' | 'prioritize' | 'equalize';

export interface LocationData {
    name: string;
    time_zone: string;
    resource_selection_strategy: ResourceSelectionStrategy;
}

export interface Location extends LocationData {
    id: string;
    enabled: boolean;
    created_at: string;
    updated_at: string;
}

export interface HapioResponse<T> {
    data: T;
    meta?: any;
    links?: any;
}

/**
 * Creates a new location in Hapio.
 */
export async function createLocation(locationData: LocationData): Promise<Location> {
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
 */
export async function getLocations(): Promise<HapioResponse<Location[]>> {
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
 */
export async function deleteLocation(id: string): Promise<void> {
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
 * Updates a location in Hapio.
 */
export async function updateLocation(id: string, data: Partial<LocationData> & { enabled?: boolean }): Promise<Location> {
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
