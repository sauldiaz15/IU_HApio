/**
 * Hapio API Service
 */

const API_KEY = import.meta.env.VITE_HAPIO_API_KEY || '';
const BASE_URL = import.meta.env.DEV 
    ? (import.meta.env.VITE_HAPIO_BASE_URL || '/api') 
    : '/api';
const DEFAULT_TIMEOUT = 10000; // 10 seconds

export type ResourceSelectionStrategy = 'randomize' | 'prioritize' | 'equalize';

export interface LocationData {
    name: string;
    time_zone: string;
    resource_selection_strategy: ResourceSelectionStrategy;
    metadata?: Record<string, any>;
}

export interface Location extends LocationData {
    id: string;
    enabled: boolean;
    created_at: string;
    updated_at: string;
}

export interface ResourceData {
    name: string;
    max_simultaneous_bookings?: number | null;
    metadata?: any;
    protected_metadata?: any;
    enabled?: boolean;
}

export interface Resource extends ResourceData {
    id: string;
    created_at: string;
    updated_at: string;
}

export type ServiceType = 'fixed' | 'flexible' | 'day';

export interface ServiceData {
    name: string;
    type: ServiceType;
    duration?: string | null; // ISO 8601 duration
    price?: string | null;
    enabled?: boolean;
    metadata?: any;
    bookable_interval?: string | null;
    buffer_time_before?: string | null;
    buffer_time_after?: string | null;
    booking_window_start?: string | null;
    booking_window_end?: string | null;
    cancelation_threshold?: string | null;
    min_duration?: string | null;
    max_duration?: string | null;
    duration_step?: string | null;
    default_duration?: string | null;
    min_days?: number | null;
    max_days?: number | null;
    default_days?: number | null;
    start_time?: string | Record<string, string> | null;
    end_time?: string | Record<string, string> | null;
}

export interface Service extends ServiceData {
    id: string;
    created_at: string;
    updated_at: string;
}

export interface HapioResponse<T> {
    data: T;
    meta?: any;
    links?: any;
}

interface HapioErrorResponse {
    message?: string;
    messages?: Record<string, string>;
    errors?: Record<string, string[]>;
}

/**
 * Custom Error class for Hapio API errors
 */
export class HapioError extends Error {
    constructor(
        message: string,
        public status?: number,
        public details?: HapioErrorResponse
    ) {
        super(message);
        this.name = 'HapioError';
    }
}

export interface Project {
    id: string;
    name: string;
}

/**
 * Fetches the project information from Hapio.
 */
export async function getProject(): Promise<HapioResponse<Project>> {
    const response = await fetchWithTimeout(`${BASE_URL}/project`, {
        method: 'GET',
    });

    return await response.json();
}

export interface BookingData {
    resource_id: string;
    service_id: string;
    location_id: string;
    starts_at: string;
    ends_at: string;
    customer?: {
        name?: string;
        email?: string;
        phone?: string;
        reason?: string;
    };
    ignore_bookable_slots?: boolean;
}

export interface Booking extends BookingData {
    id: string;
    status: string;
    created_at?: string;
    updated_at?: string;
}

/**
 * Helper to normalize booking objects from Hapio API response (resolves customer details and status field)
 */
function normalizeBooking(b: any): any {
    if (!b) return b;
    if (b.metadata && b.metadata.customer) {
        b.customer = b.metadata.customer;
    }
    // Determinar status para la UI basándonos en las banderas de Hapio
    if (b.is_canceled) {
        b.status = 'cancelled';
    } else if (b.is_temporary) {
        b.status = 'temporary';
    } else {
        b.status = 'confirmed';
    }
    return b;
}

/**
 * Fetches the list of bookings from Hapio.
 */
export async function getBookings(params: Record<string, string> = {}): Promise<HapioResponse<Booking[]>> {
    const query = new URLSearchParams(params).toString();
    const url = `${BASE_URL}/bookings${query ? `?${query}` : ''}`;
    const response = await fetchWithTimeout(url, {
        method: 'GET',
    });

    const result = await response.json();

    if (result.data) {
        result.data.forEach((b: any) => normalizeBooking(b));
    }

    return result;
}

/**
 * Fetches a single booking by ID from Hapio.
 */
export async function getBooking(id: string): Promise<HapioResponse<Booking>> {
    const response = await fetchWithTimeout(`${BASE_URL}/bookings/${id}`, {
        method: 'GET',
    });

    const result = await response.json();
    const booking = result.data || result;

    return {
        data: normalizeBooking(booking)
    };
}

/**
 * Creates a new booking in Hapio.
 */
export async function createBooking(data: BookingData): Promise<Booking> {
    const payload: any = { ...data };

    // Hapio no admite `customer` en la raíz, debe guardarse en `metadata`
    if (payload.customer) {
        payload.metadata = { ...payload.metadata, customer: payload.customer };
        delete payload.customer;
    }

    const response = await fetchWithTimeout(`${BASE_URL}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const result = await response.json();
    return normalizeBooking(result.data || result);
}

/**
 * Updates an existing booking in Hapio (PATCH).
 */
export async function updateBooking(id: string, data: Partial<BookingData>): Promise<Booking> {
    const payload: any = { ...data };

    // Igual que en la creación, mover `customer` a `metadata`
    if (payload.customer) {
        payload.metadata = { ...payload.metadata, customer: payload.customer };
        delete payload.customer;
    }

    const response = await fetchWithTimeout(`${BASE_URL}/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const result = await response.json();
    return normalizeBooking(result.data || result);
}

/**
 * Cancels a booking in Hapio.
 */
export async function cancelBooking(id: string): Promise<void> {
    await fetchWithTimeout(`${BASE_URL}/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_canceled: true }),
    });
}

/**
 * Unified fetch wrapper with timeout and enhanced error handling
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

    try {
        const headers: Record<string, string> = {
            'Accept': 'application/json',
            ...options.headers,
        };

        // Solo enviamos Authorization si tenemos la clave localmente y no estamos usando el proxy
        if (API_KEY && !url.startsWith('/api')) {
            headers['Authorization'] = `Bearer ${API_KEY}`;
        }

        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers,
        });
        clearTimeout(id);

        if (!response.ok) {
            let errorData: HapioErrorResponse = {};
            try {
                errorData = await response.json();
            } catch (e) {
                // Not a JSON response
            }

            let errorMessage = errorData.message || `Error ${response.status}: ${response.statusText}`;

            // Handle validation errors (errors object)
            if (errorData.errors) {
                const firstError = Object.values(errorData.errors)[0];
                if (Array.isArray(firstError) && firstError.length > 0) {
                    errorMessage = firstError[0];
                }
            }

            // Handle batch messages (messages object)
            if (errorData.messages) {
                errorMessage = Object.values(errorData.messages)[0];
            }

            throw new HapioError(errorMessage, response.status, errorData);
        }

        return response;
    } catch (error: any) {
        clearTimeout(id);
        if (error.name === 'AbortError') {
            throw new HapioError('La solicitud ha tardado demasiado tiempo (Timeout). Por favor, intenta de nuevo.', 408);
        }
        if (error instanceof HapioError) {
            throw error;
        }
        // Generic network error
        throw new HapioError('No se pudo conectar con el servidor. Por favor, verifica tu conexión a internet.', 0);
    }
}

/**
 * Creates a new location in Hapio.
 */
export async function createLocation(locationData: LocationData): Promise<Location> {
    const response = await fetchWithTimeout(`${BASE_URL}/locations`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(locationData),
    });

    const result = await response.json();
    return result.data || result; // Handle both direct and wrapped response
}

/**
 * Fetches the list of locations from Hapio.
 */
export async function getLocations(): Promise<HapioResponse<Location[]>> {
    const response = await fetchWithTimeout(`${BASE_URL}/locations`, {
        method: 'GET',
    });

    return await response.json();
}

/**
 * Deletes a location from Hapio.
 */
export async function deleteLocation(id: string): Promise<void> {
    await fetchWithTimeout(`${BASE_URL}/locations/${id}`, {
        method: 'DELETE',
    });
}

/**
 * Updates a location in Hapio.
 */
export async function updateLocation(id: string, data: Partial<LocationData> & { enabled?: boolean }): Promise<Location> {
    const response = await fetchWithTimeout(`${BASE_URL}/locations/${id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    const result = await response.json();
    return result.data || result;
}

/**
 * Creates a new resource in Hapio.
 */
export async function createResource(resourceData: ResourceData): Promise<Resource> {
    const response = await fetchWithTimeout(`${BASE_URL}/resources`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(resourceData),
    });

    const result = await response.json();
    return result.data || result;
}

/**
 * Fetches the list of resources from Hapio.
 */
export async function getResources(): Promise<HapioResponse<Resource[]>> {
    const response = await fetchWithTimeout(`${BASE_URL}/resources`, {
        method: 'GET',
    });

    return await response.json();
}

/**
 * Fetches a single resource from Hapio by ID.
 */
export async function getResource(id: string): Promise<Resource> {
    const response = await fetchWithTimeout(`${BASE_URL}/resources/${id}`, {
        method: 'GET',
    });

    const result = await response.json();
    return result.data || result;
}

/**
 * Updates a resource in Hapio.
 */
export async function updateResource(id: string, data: Partial<ResourceData>): Promise<Resource> {
    const response = await fetchWithTimeout(`${BASE_URL}/resources/${id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    const result = await response.json();
    return result.data || result;
}

/**
 * Deletes a resource from Hapio.
 */
export async function deleteResource(id: string): Promise<void> {
    await fetchWithTimeout(`${BASE_URL}/resources/${id}`, {
        method: 'DELETE',
    });
}

/**
 * Creates a new service in Hapio.
 */
export async function createService(serviceData: ServiceData): Promise<Service> {
    const response = await fetchWithTimeout(`${BASE_URL}/services`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(serviceData),
    });

    const result = await response.json();
    return result.data || result;
}

/**
 * Fetches the list of services from Hapio.
 */
export async function getServices(): Promise<HapioResponse<Service[]>> {
    const response = await fetchWithTimeout(`${BASE_URL}/services`, {
        method: 'GET',
    });

    return await response.json();
}

/**
 * Updates a service in Hapio.
 */
export async function updateService(id: string, data: Partial<ServiceData>): Promise<Service> {
    const response = await fetchWithTimeout(`${BASE_URL}/services/${id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    const result = await response.json();
    return result.data || result;
}

export interface RecurringScheduleData {
    location_id: string;
    start_date: string;
    end_date?: string | null;
    interval?: number;
    /** Metadatos personalizados. Usamos metadata.services[] para restringir servicios por horario. */
    metadata?: {
        services?: string[];   // IDs de servicios disponibles en este horario
        [key: string]: any;
    };
}

export interface RecurringSchedule extends RecurringScheduleData {
    id: string;
    resource_id: string;
    created_at: string;
    updated_at: string;
}

export interface RecurringScheduleBlockData {
    weekday: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
    start_time: string;
    end_time: string;
}

export interface RecurringScheduleBlock extends RecurringScheduleBlockData {
    id: string;
    created_at: string;
    updated_at: string;
}

/**
 * Deletes a service from Hapio.
 */
export async function deleteService(id: string): Promise<void> {
    await fetchWithTimeout(`${BASE_URL}/services/${id}`, {
        method: 'DELETE',
    });
}

/**
 * Creates a new recurring schedule for a resource.
 */
export async function createRecurringSchedule(resourceId: string, data: RecurringScheduleData): Promise<RecurringSchedule> {
    const response = await fetchWithTimeout(`${BASE_URL}/resources/${resourceId}/recurring-schedules`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    const result = await response.json();
    return result.data || result;
}

/**
 * Creates a block for a recurring schedule.
 */
export async function createRecurringScheduleBlock(resourceId: string, scheduleId: string, data: RecurringScheduleBlockData): Promise<RecurringScheduleBlock> {
    const response = await fetchWithTimeout(`${BASE_URL}/resources/${resourceId}/recurring-schedules/${scheduleId}/schedule-blocks`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    const result = await response.json();
    return result.data || result;
}

/**
 * Fetches all blocks for a recurring schedule.
 */
export async function getRecurringScheduleBlocks(resourceId: string, scheduleId: string): Promise<HapioResponse<RecurringScheduleBlock[]>> {
    const response = await fetchWithTimeout(`${BASE_URL}/resources/${resourceId}/recurring-schedules/${scheduleId}/schedule-blocks`, {
        method: 'GET',
    });
    return await response.json();
}

/**
 * Deletes a block from a recurring schedule.
 */
export async function deleteRecurringScheduleBlock(resourceId: string, scheduleId: string, blockId: string): Promise<void> {
    await fetchWithTimeout(`${BASE_URL}/resources/${resourceId}/recurring-schedules/${scheduleId}/schedule-blocks/${blockId}`, {
        method: 'DELETE',
    });
}

/**
 * Updates a block in a recurring schedule.
 */
export async function updateRecurringScheduleBlock(
    resourceId: string,
    scheduleId: string,
    blockId: string,
    data: Partial<RecurringScheduleBlockData>
): Promise<RecurringScheduleBlock> {
    const response = await fetchWithTimeout(`${BASE_URL}/resources/${resourceId}/recurring-schedules/${scheduleId}/schedule-blocks/${blockId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    const result = await response.json();
    return result.data || result;
}

/**
 * Fetches the list of recurring schedules for a resource.
 */
export async function getRecurringSchedules(resourceId: string): Promise<HapioResponse<RecurringSchedule[]>> {
    const response = await fetchWithTimeout(`${BASE_URL}/resources/${resourceId}/recurring-schedules`, {
        method: 'GET',
    });

    return await response.json();
}

/**
 * Updates a recurring schedule (PATCH).
 */
export async function updateRecurringSchedule(
    resourceId: string,
    scheduleId: string,
    data: Partial<RecurringScheduleData>
): Promise<RecurringSchedule> {
    const response = await fetchWithTimeout(`${BASE_URL}/resources/${resourceId}/recurring-schedules/${scheduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    const result = await response.json();
    return result.data || result;
}

/**
 * Deletes a recurring schedule.
 */
export async function deleteRecurringSchedule(resourceId: string, scheduleId: string): Promise<void> {
    await fetchWithTimeout(`${BASE_URL}/resources/${resourceId}/recurring-schedules/${scheduleId}`, {
        method: 'DELETE',
    });
}

export interface ScheduleBlockData {
    location_id: string;
    starts_at: string;
    ends_at: string;
    is_available?: boolean;
}

export interface ScheduleBlock extends ScheduleBlockData {
    id: string;
    created_at: string;
    updated_at: string;
}

/**
 * Creates a new schedule block for a resource.
 */
export async function createScheduleBlock(resourceId: string, data: ScheduleBlockData): Promise<ScheduleBlock> {
    const response = await fetchWithTimeout(`${BASE_URL}/resources/${resourceId}/schedule-blocks`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    const result = await response.json();
    return result.data || result;
}

/**
 * Fetches the list of schedule blocks for a resource.
 */
export async function getScheduleBlocks(resourceId: string): Promise<HapioResponse<ScheduleBlock[]>> {
    const response = await fetchWithTimeout(`${BASE_URL}/resources/${resourceId}/schedule-blocks`, {
        method: 'GET',
    });

    return await response.json();
}

/**
 * Deletes a schedule block.
 */
export async function deleteScheduleBlock(resourceId: string, blockId: string): Promise<void> {
    await fetchWithTimeout(`${BASE_URL}/resources/${resourceId}/schedule-blocks/${blockId}`, {
        method: 'DELETE',
    });
}

export interface ResourceScheduleSpan {
    starts_at: string;
    ends_at: string;
}

/**
 * Fetches the computed schedule for a resource at a given location and time frame.
 */
export async function getResourceSchedule(resourceId: string, params: Record<string, string>): Promise<HapioResponse<ResourceScheduleSpan[]>> {
    const query = new URLSearchParams(params).toString();
    const url = `${BASE_URL}/resources/${resourceId}/schedule${query ? `?${query}` : ''}`;
    const response = await fetchWithTimeout(url, {
        method: 'GET',
    });

    return await response.json();
}

/**
 * Fetches the services associated with a resource.
 * Handles both {data:[]} wrapped and direct array responses from Hapio.
 */
export async function getResourceServices(resourceId: string): Promise<HapioResponse<Service[]>> {
    try {
        const response = await fetchWithTimeout(`${BASE_URL}/resources/${resourceId}/services`, {
            method: 'GET',
        });
        const result = await response.json();

        // Handle direct array response (no wrapper)
        if (Array.isArray(result)) {
            return { data: result };
        }
        // Handle {data: [...]} wrapper
        if (result && Array.isArray(result.data)) {
            return result;
        }
        // Unknown format — return empty
        console.warn('[getResourceServices] Unexpected response format:', result);
        return { data: [] };
    } catch (err: any) {
        // If endpoint doesn't exist (404/405), fall back to filtering all services
        console.warn('[getResourceServices] Endpoint failed, trying fallback:', err.message);
        const allResp = await fetchWithTimeout(`${BASE_URL}/services`, { method: 'GET' });
        const allResult = await allResp.json();
        const allServices: Service[] = Array.isArray(allResult)
            ? allResult
            : (allResult?.data ?? []);
        // Filter services that list this resource_id in any metadata field
        const linked = allServices.filter((s: any) =>
            s.resource_id === resourceId ||
            (Array.isArray(s.resource_ids) && s.resource_ids.includes(resourceId))
        );
        return { data: linked };
    }
}

/**
 * Associates a service with a resource.
 */
export async function associateResourceService(resourceId: string, serviceId: string): Promise<void> {
    await fetchWithTimeout(`${BASE_URL}/resources/${resourceId}/services/${serviceId}`, {
        method: 'PUT',
    });
}

/**
 * Removes (disassociates) a service from a resource.
 */
export async function removeResourceService(resourceId: string, serviceId: string): Promise<void> {
    await fetchWithTimeout(`${BASE_URL}/resources/${resourceId}/services/${serviceId}`, {
        method: 'DELETE',
    });
}

export interface BookableSlot {
    starts_at: string;
    ends_at: string;
    buffer_starts_at?: string;
    buffer_ends_at?: string;
    // ...other fields depend on service type
}

/**
 * Fetches available bookable slots for a service.
 */
export async function getBookableSlots(serviceId: string, params: Record<string, string>): Promise<HapioResponse<BookableSlot[]>> {
    const query = new URLSearchParams(params).toString();
    const url = `${BASE_URL}/services/${serviceId}/bookable-slots${query ? `?${query}` : ''}`;
    const response = await fetchWithTimeout(url, {
        method: 'GET',
    });

    return await response.json();
}
