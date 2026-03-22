// DB 없이 localStorage 기반으로 데이터를 관리합니다.
// DB가 연결되면 API 기반으로 교체하면 됩니다.

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function getStore<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]") as T[];
  } catch {
    return [];
  }
}

function setStore<T>(key: string, data: T[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

// ─── 공지사항 ──────────────────────────────────────────────────
export type LocalNotice = {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
};

const NOTICES_KEY = "a1studio_notices";

export const noticeStore = {
  getAll(): LocalNotice[] {
    const items = getStore<LocalNotice>(NOTICES_KEY);
    return [...items].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  },
  create(data: Omit<LocalNotice, "id" | "createdAt">): LocalNotice {
    const notice: LocalNotice = { ...data, id: genId(), createdAt: new Date().toISOString() };
    const items = getStore<LocalNotice>(NOTICES_KEY);
    setStore(NOTICES_KEY, [notice, ...items]);
    return notice;
  },
  togglePin(id: string) {
    const items = getStore<LocalNotice>(NOTICES_KEY);
    setStore(NOTICES_KEY, items.map((n) => n.id === id ? { ...n, isPinned: !n.isPinned } : n));
  },
  delete(id: string) {
    const items = getStore<LocalNotice>(NOTICES_KEY);
    setStore(NOTICES_KEY, items.filter((n) => n.id !== id));
  },
};

// ─── 이벤트 ────────────────────────────────────────────────────
export type LocalEvent = {
  id: string;
  title: string;
  content: string;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
};

const EVENTS_KEY = "a1studio_events";

export const eventStore = {
  getAll(): LocalEvent[] {
    return getStore<LocalEvent>(EVENTS_KEY);
  },
  create(data: Omit<LocalEvent, "id" | "createdAt">): LocalEvent {
    const event: LocalEvent = { ...data, id: genId(), createdAt: new Date().toISOString() };
    const items = getStore<LocalEvent>(EVENTS_KEY);
    setStore(EVENTS_KEY, [event, ...items]);
    return event;
  },
  delete(id: string) {
    const items = getStore<LocalEvent>(EVENTS_KEY);
    setStore(EVENTS_KEY, items.filter((e) => e.id !== id));
  },
};

// ─── 원데이클래스 공고 ──────────────────────────────────────────
export type LocalOneDayClass = {
  id: string;
  title: string;
  cmName: string;        // 클래스마스터(CM) 이름
  cmProfile: string;     // CM 소개
  cmImage: string;       // CM 사진 (base64 data URL or empty)
  genre: string;         // 장르 (자유 입력)
  description: string;
  dateStart: string;     // 모집 시작일 YYYY-MM-DD
  dateEnd: string;       // 모집 종료일 YYYY-MM-DD
  durationMinutes: number;
  minHeadcount: number;
  maxHeadcount: number;
  pricePerPerson: number;
  status: "OPEN" | "CONFIRMED" | "CANCELLED";
  createdAt: string;
  applications: LocalApplication[];
};

export type LocalApplication = {
  id: string;
  guestName: string;
  guestGender: "M" | "F" | "";  // 성별
  guestBirthDate: string;        // 생년월일 YYYY-MM-DD
  guestPhone: string;
  guestEmail: string;
  selectedDate: string;          // 신청 날짜 (dateStart~dateEnd 내)
  headcount: number;
  message: string;
  createdAt: string;
};

const CLASSES_KEY = "a1studio_one_day_classes";

export const oneDayClassStore = {
  getAll(): LocalOneDayClass[] {
    return getStore<LocalOneDayClass>(CLASSES_KEY);
  },
  create(data: Omit<LocalOneDayClass, "id" | "createdAt" | "status" | "applications">): LocalOneDayClass {
    const cls: LocalOneDayClass = {
      ...data,
      id: genId(),
      status: "OPEN",
      applications: [],
      createdAt: new Date().toISOString(),
    };
    const items = getStore<LocalOneDayClass>(CLASSES_KEY);
    setStore(CLASSES_KEY, [cls, ...items]);
    return cls;
  },
  apply(classId: string, app: Omit<LocalApplication, "id" | "createdAt">): { success: boolean; error?: string } {
    const items = getStore<LocalOneDayClass>(CLASSES_KEY);
    const cls = items.find((c) => c.id === classId);
    if (!cls) return { success: false, error: "클래스를 찾을 수 없습니다." };
    if (cls.status === "CANCELLED") return { success: false, error: "취소된 클래스입니다." };
    if (cls.applications.length >= cls.maxHeadcount) return { success: false, error: "정원이 초과되었습니다." };
    const dup = cls.applications.find((a) => a.guestPhone === app.guestPhone);
    if (dup) return { success: false, error: "이미 신청하셨습니다." };

    const newApp: LocalApplication = { ...app, id: genId(), createdAt: new Date().toISOString() };
    cls.applications.push(newApp);
    if (cls.applications.length >= cls.minHeadcount) {
      cls.status = "CONFIRMED";
    }
    setStore(CLASSES_KEY, items);
    return { success: true };
  },
  delete(id: string) {
    const items = getStore<LocalOneDayClass>(CLASSES_KEY);
    setStore(CLASSES_KEY, items.filter((c) => c.id !== id));
  },
};

// ─── 클래스 요청 ────────────────────────────────────────────────
export type LocalClassRequest = {
  id: string;
  userName: string;
  userEmail: string;
  genre: string;
  preferredTime: string;        // 원하는 시간대 (예: "14:00~16:00")
  preferredDays: string[];      // 원하는 요일 배열 (예: ["월", "수", "금"])
  preferredDates: string;       // 원하는 날짜 (자유 입력)
  message: string;
  createdAt: string;
};

const REQUESTS_KEY = "a1studio_class_requests";

export const classRequestStore = {
  getAll(): LocalClassRequest[] {
    return getStore<LocalClassRequest>(REQUESTS_KEY);
  },
  create(data: Omit<LocalClassRequest, "id" | "createdAt">): LocalClassRequest {
    const req: LocalClassRequest = { ...data, id: genId(), createdAt: new Date().toISOString() };
    const items = getStore<LocalClassRequest>(REQUESTS_KEY);
    setStore(REQUESTS_KEY, [req, ...items]);
    return req;
  },
  delete(id: string) {
    const items = getStore<LocalClassRequest>(REQUESTS_KEY);
    setStore(REQUESTS_KEY, items.filter((r) => r.id !== id));
  },
};
