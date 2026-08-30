export interface Property {
  id: number;
  host_id: number;
  name: string;
  property_type: string;
  location: string;
  location_tier: 'premium' | 'mid' | 'budget';
  bedrooms: number;
  bathrooms: number;
  max_guests: number;
  base_rate: number;
  amenities: string[];
  description: string;
  image_urls: string[];
  listing_score: number;
  total_bookings?: number;
  total_revenue?: number;
  created_at: string;
}

export interface Booking {
  id: number;
  property_id: number;
  property_name?: string;
  location?: string;
  property_type?: string;
  guest_name: string;
  guest_phone?: string;
  check_in: string;
  check_out: string;
  guests: number;
  total_amount: number;
  nightly_rate: number;
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled';
  source: 'whatsapp' | 'direct' | 'platform';
  notes?: string;
  created_at: string;
}

export interface PricingFactor {
  factor: string;
  impact: string;
  direction: 'up' | 'down' | 'neutral' | 'base';
  value: number;
}

export interface Comparable {
  name: string;
  type: string;
  location: string;
  bedrooms: number;
  rate: number;
  amenities: string[];
  rating: number;
  occupancy: number;
}

export interface PricingResult {
  baseRate: number;
  low: number;
  mid: number;
  high: number;
  factors: PricingFactor[];
  comparables: Comparable[];
  season: string;
  tier: string;
  explanation: string;
}

export interface ListingResult {
  titles: string[];
  description: string;
  tags: string[];
  highlights: string[];
}

export interface ImageAssessment {
  score: number;
  lighting: number;
  composition: number;
  cleanliness: number;
  feedback: string;
  tips: string[];
}

export interface BotContext {
  property: string | null;
  checkIn: string | null;
  checkOut: string | null;
  guests: number | null;
  status: string;
  location?: string | null;
}

export interface BotResponse {
  reply: string;
  intent: string;
  extractedData: BotContext;
  suggestedActions: string[];
  bookingStatus: string;
  conversationId: string;
}

export interface DashboardStats {
  totalRevenue: number;
  totalBookings: number;
  avgNightlyRate: number;
  occupancyRate: number;
  statusCounts: { status: string; count: number }[];
  sourceCounts: { source: string; count: number; revenue: number }[];
  propertyBreakdown: {
    id: number;
    name: string;
    location: string;
    booking_count: number;
    revenue: number;
  }[];
}

export interface HealthResponse {
  status: string;
  service?: string;
  time?: string;
  llmConfigured?: boolean;
  llmWorking?: boolean;
  llmError?: string | null;
}
