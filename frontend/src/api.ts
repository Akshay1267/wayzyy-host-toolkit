import type {
  Property,
  Booking,
  PricingResult,
  Comparable,
  ListingResult,
  ImageAssessment,
  BotResponse,
  DashboardStats,
  HealthResponse
} from './types';

const API_BASE = 'http://localhost:5000/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const json = await response.json();
  if (!response.ok || json.success === false) {
    throw new Error(json.error || `HTTP error ${response.status}`);
  }
  return json.data as T;
}

export const api = {
  // Health
  checkHealth: async (): Promise<HealthResponse> => {
    try {
      const res = await fetch(`${API_BASE}/health`);
      return await res.json();
    } catch {
      return { status: 'offline', llmConfigured: false, llmWorking: false };
    }
  },

  // Properties
  getProperties: () => request<Property[]>('/properties'),
  getProperty: (id: number) => request<Property>(`/properties/${id}`),
  createProperty: (data: Partial<Property>) => request<{ id: number; message: string }>('/properties', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  deleteProperty: (id: number) => request<{ message: string }>(`/properties/${id}`, {
    method: 'DELETE'
  }),

  // Bookings & Stats
  getBookings: (params?: { property_id?: number; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.property_id) query.set('property_id', String(params.property_id));
    if (params?.status) query.set('status', params.status);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<Booking[]>(`/bookings${qs}`);
  },
  getDashboardStats: () => request<DashboardStats>('/bookings/stats'),
  createBooking: (data: Partial<Booking>) => request<{ id: number; total_amount: number; message: string }>('/bookings', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateBookingStatus: (id: number, status: string) => request<{ message: string }>(`/bookings/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status })
  }),
  deleteBooking: (id: number) => request<{ message: string }>(`/bookings/${id}`, {
    method: 'DELETE'
  }),

  // Pricing Engine
  calculatePricing: (data: {
    propertyId?: number;
    baseRate?: number;
    propertyType?: string;
    location?: string;
    bedrooms?: number;
    amenities?: string[];
    checkIn?: string;
  }) => request<PricingResult>('/pricing/calculate', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  savePricingLog: (data: {
    property_id: number;
    suggested_low: number;
    suggested_mid: number;
    suggested_high: number;
    factors: unknown[];
    explanation: string;
    date_range_start?: string;
    date_range_end?: string;
  }) => request<{ id: number; message: string }>('/pricing/save-log', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getComps: (params?: { type?: string; location?: string }) => {
    const query = new URLSearchParams();
    if (params?.type) query.set('type', params.type);
    if (params?.location) query.set('location', params.location);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<Comparable[]>(`/pricing/comps${qs}`);
  },

  // Listing AI
  generateListing: (data: {
    propertyId?: number;
    name?: string;
    propertyType?: string;
    location?: string;
    bedrooms?: number;
    bathrooms?: number;
    maxGuests?: number;
    amenities?: string[];
    description?: string;
  }) => request<ListingResult>('/listing/generate', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  assessImage: (imageUrl?: string) => request<ImageAssessment>('/listing/assess-image', {
    method: 'POST',
    body: JSON.stringify({ imageUrl })
  }),

  // WhatsApp Bot Concierge
  sendBotMessage: (message: string, conversationId: string = 'default') => request<BotResponse>('/bot/chat', {
    method: 'POST',
    body: JSON.stringify({ message, conversationId })
  }),
  resetBot: (conversationId: string = 'default') => request<{ message: string }>('/bot/reset', {
    method: 'POST',
    body: JSON.stringify({ conversationId })
  })
};
