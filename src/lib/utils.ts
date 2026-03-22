import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("ko-KR").format(amount) + "원";
}

export function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${y}년 ${m}월 ${d}일`;
}

export function formatPhone(phone: string): string {
  return phone.replace(/(\d{3})(\d{3,4})(\d{4})/, "$1-$2-$3");
}

export function generateAuthCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generateOrderId(reservationId: string): string {
  return `ORDER-${reservationId}-${Date.now()}`;
}

export function getDayOfWeekMask(date: Date): number {
  const day = date.getDay(); // 0=Sun ... 6=Sat
  return 1 << day;
}

export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

export function calcDurationHours(start: string, end: string): number {
  return (parseTimeToMinutes(end) - parseTimeToMinutes(start)) / 60;
}
