export type ReservationStatus = "HOLD" | "PAID" | "CANCELLED" | "EXPIRED" | "REFUNDED";
export type OneDayClassStatus = "OPEN" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
export type PaymentStatus = "PENDING" | "APPROVED" | "FAILED" | "CANCELLED" | "PARTIAL_REFUNDED" | "REFUNDED";
export type RefundStatus = "REQUESTED" | "APPROVED" | "REJECTED";

export interface Room {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  capacity: number;
  sizeM2: number;
  amenities: string[];
  images: string[];
  isActive: boolean;
}

export interface PricingRule {
  id: string;
  roomId: string;
  label: string;
  dayOfWeekMask: number;
  timeStart: string;
  timeEnd: string;
  pricePerHour: number;
  minHours: number;
  isPackage: boolean;
  packageName?: string | null;
  packageHours?: number | null;
  packagePrice?: number | null;
  isActive: boolean;
}

export interface Reservation {
  id: string;
  roomId: string;
  userId?: string | null;
  guestName: string;
  guestPhone: string;
  guestEmail?: string | null;
  date: string;
  startTime: string;
  endTime: string;
  headcount: number;
  status: ReservationStatus;
  totalAmount: number;
  memo?: string | null;
  authCode?: string | null;
  createdAt: Date;
}

export interface TimeSlot {
  time: string;
  available: boolean;
  price?: number;
}

export interface BookingFormData {
  roomId: string;
  date: string;
  startTime: string;
  endTime: string;
  headcount: number;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  memo?: string;
}

export interface PaymentRequest {
  orderId: string;
  orderName: string;
  amount: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  successUrl: string;
  failUrl: string;
}

export interface TossPaymentConfirmRequest {
  paymentKey: string;
  orderId: string;
  amount: number;
}

export interface ReviewData {
  id: string;
  rating: number;
  content: string;
  nickname?: string | null;
  createdAt: Date;
}

export interface NoticeData {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  createdAt: Date;
}
