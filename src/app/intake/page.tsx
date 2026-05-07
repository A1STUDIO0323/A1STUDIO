"use client";

import { useMemo, useState } from "react";

const TIERS = [
  { value: "1", emoji: "🟢", title: "1단계 — 일반 소개 페이지", desc: "회사·매장 소개, 문의받기. 동네 가게/1인 사업자.", price: "30~200만 · 3~7일" },
  { value: "2", emoji: "🟡", title: "2단계 — 회원 + 게시판", desc: "가입/로그인/공지/후기. 학원·커뮤니티.", price: "100~600만 · 2~3주" },
  { value: "3", emoji: "🟠", title: "3단계 — 예약 시스템", desc: "캘린더 예약·알림. 공방·필라테스·룸 대여.", price: "400~800만 · 3~5주" },
  { value: "4", emoji: "🔴", title: "4단계 — 결제 시스템", desc: "카카오페이/토스페이먼츠/카드. 통신판매업 신고 필요.", price: "600~1,200만 · 4~7주" },
  { value: "5", emoji: "🟣", title: "5단계 — 풀 커스텀 플랫폼", desc: "정산·세금계산서·다중 PG. 프랜차이즈/마켓플레이스.", price: "800~2,000만+ · 6~12주" },
  { value: "unsure", emoji: "❓", title: "잘 모르겠음", desc: "상담 후 함께 결정", price: "" },
];

type FormState = {
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  contact_role: string;
  preferred_channel: string;
  business_name: string;
  business_number: string;
  representative: string;
  business_address: string;
  business_phone: string;
  business_email: string;
  ecommerce_license: string;
  industry: string;
  goals: string[];
  goal_summary: string;
  target_tier: string;
  brand_logo_status: string;
  brand_color_main: string;
  brand_color_sub: string;
  brand_color_avoid: string;
  tone_and_manner: string[];
  reference_sites: { url: string; note: string }[];
  menu_items: string[];
  menu_items_etc: string;
  intro_text: string;
  products: { name: string; description: string; price: string; note: string }[];
  photo_status: string;
  faqs: { q: string; a: string }[];
  business_hours: string;
  closed_days: string;
  location: string;
  parking: string;
  social_links: { kind: string; url: string }[];
  domain_status: string;
  domain_candidates: string[];
  member_required: string;
  signup_methods: string[];
  signup_fields: string[];
  member_tiers: string;
  booking_unit: string;
  booking_duration: string;
  booking_capacity: string;
  booking_targets: string;
  booking_window: string;
  booking_max_days: string;
  refund_policy: string;
  notification_prefs: string[];
  notification_prefs_etc: string;
  pg_ready: string[];
  payment_methods: string[];
  refund_terms: string;
  guest_checkout: string;
  admin_operators: string;
  admin_features: string[];
  desired_open_date: string;
  deadline: string;
  budget_range: string;
  payment_split: string;
  infra_payer: string;
  extra_requests: string;
  agreed: boolean;
};

const initialState: FormState = {
  contact_name: "",
  contact_phone: "",
  contact_email: "",
  contact_role: "",
  preferred_channel: "",
  business_name: "",
  business_number: "",
  representative: "",
  business_address: "",
  business_phone: "",
  business_email: "",
  ecommerce_license: "",
  industry: "",
  goals: [],
  goal_summary: "",
  target_tier: "",
  brand_logo_status: "",
  brand_color_main: "",
  brand_color_sub: "",
  brand_color_avoid: "",
  tone_and_manner: [],
  reference_sites: [{ url: "", note: "" }, { url: "", note: "" }, { url: "", note: "" }],
  menu_items: [],
  menu_items_etc: "",
  intro_text: "",
  products: [{ name: "", description: "", price: "", note: "" }],
  photo_status: "",
  faqs: [{ q: "", a: "" }],
  business_hours: "",
  closed_days: "",
  location: "",
  parking: "",
  social_links: [{ kind: "instagram", url: "" }],
  domain_status: "",
  domain_candidates: ["", "", ""],
  member_required: "",
  signup_methods: [],
  signup_fields: [],
  member_tiers: "",
  booking_unit: "",
  booking_duration: "",
  booking_capacity: "",
  booking_targets: "",
  booking_window: "",
  booking_max_days: "",
  refund_policy: "",
  notification_prefs: [],
  notification_prefs_etc: "",
  pg_ready: [],
  payment_methods: [],
  refund_terms: "",
  guest_checkout: "",
  admin_operators: "",
  admin_features: [],
  desired_open_date: "",
  deadline: "",
  budget_range: "",
  payment_split: "",
  infra_payer: "",
  extra_requests: "",
  agreed: false,
};

export default function IntakePage() {
  const [form, setForm] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ id: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const tierLevel = useMemo(() => {
    const n = parseInt(form.target_tier, 10);
    return Number.isNaN(n) ? 0 : n;
  }, [form.target_tier]);

  const showMember = tierLevel >= 2;
  const showBooking = tierLevel >= 3;
  const showPayment = tierLevel >= 4;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    // 입력하면 해당 필드 에러 즉시 제거
    setFieldErrors((prev) => {
      if (!prev[key as string]) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  }

  function toggleArr(key: keyof FormState, value: string) {
    setForm((prev) => {
      const cur = prev[key] as string[];
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
      return { ...prev, [key]: next };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const errs: Record<string, string> = {};

    if (!form.contact_name.trim()) errs.contact_name = "담당자 성함을 입력해주세요.";
    if (!form.contact_phone.trim()) {
      errs.contact_phone = "연락처를 입력해주세요.";
    } else if (!/^[0-9\-+\s()]{8,20}$/.test(form.contact_phone.trim())) {
      errs.contact_phone = "올바른 연락처 형식이 아닙니다. (예: 010-1234-5678)";
    }
    if (!form.contact_email.trim()) {
      errs.contact_email = "이메일을 입력해주세요.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email.trim())) {
      errs.contact_email = "올바른 이메일 형식이 아닙니다. (예: example@domain.com)";
    }
    if (!form.agreed) errs.agreed = "정보 사용 동의에 체크해주세요.";

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setError(`작성하지 않은 필수 항목이 ${Object.keys(errs).length}개 있습니다.`);
      // 첫 에러 필드로 스크롤
      const firstKey = Object.keys(errs)[0];
      setTimeout(() => {
        const el = document.querySelector(`[data-field="${firstKey}"]`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }, 50);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    try {
      const customMenu = form.menu_items_etc
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => `기타: ${s}`);
      const mergedMenuItems = [...form.menu_items, ...customMenu];

      const customNotify = form.notification_prefs_etc.trim();
      const mergedNotificationPrefs = customNotify
        ? [...form.notification_prefs, `기타: ${customNotify}`]
        : form.notification_prefs;

      const payload = {
        ...form,
        menu_items: mergedMenuItems,
        notification_prefs: mergedNotificationPrefs,
        reference_sites: form.reference_sites.filter((s) => s.url.trim()),
        products: form.products.filter((p) => p.name.trim() || p.price.trim()),
        faqs: form.faqs.filter((f) => f.q.trim() || f.a.trim()),
        social_links: form.social_links.filter((s) => s.url.trim()),
        domain_candidates: form.domain_candidates.filter((d) => d.trim()),
        target_tier: form.target_tier || null,
      };

      const res = await fetch("/api/intake/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        console.error("[intake:client] submit_failed", json);
        setError(json.error || "제출에 실패했습니다.");
        return;
      }
      setDone({ id: json.id });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("[intake:client] network_error", err);
      setError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-zinc-50 py-16 px-4">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-zinc-200 p-12 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-zinc-900 mb-3">의뢰서 접수 완료</h1>
          <p className="text-zinc-600 mb-2">소중한 의뢰 감사합니다.</p>
          <p className="text-zinc-600 mb-6">24시간 내에 1차 상담 일정을 안내드리겠습니다.</p>
          <p className="text-xs text-zinc-400">접수번호: {done.id}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 py-10 px-4">
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-violet-600 to-purple-700 text-white rounded-2xl p-8 shadow-md">
          <h1 className="text-3xl font-bold mb-2">홈페이지 제작 의뢰서</h1>
          <p className="text-violet-100 text-sm leading-relaxed">
            A1STUDIO에 의뢰주셔서 감사합니다.<br />
            아래 항목을 작성해 주시면 24시간 내 1차 상담 일정을 안내드립니다.<br />
            <span className="text-violet-200">모르는 항목은 비워두셔도 됩니다.</span>
          </p>
        </div>

        {/* 단계 안내 */}
        <Card title="📖 먼저 읽어주세요 — 단계 안내">
          <p className="text-sm text-zinc-600 mb-4">
            홈페이지는 필요한 기능에 따라 5개 단계로 나뉩니다. 본인 사업에 맞는 단계를 확인하신 후 아래에서 선택해주세요.
          </p>
          <div className="space-y-2">
            {TIERS.filter((t) => t.value !== "unsure").map((t) => (
              <div key={t.value} className="border border-zinc-200 rounded-lg p-3 text-sm">
                <div className="font-semibold text-zinc-800">
                  {t.emoji} {t.title}
                </div>
                <div className="text-zinc-600 mt-1">{t.desc}</div>
                {t.price && <div className="text-zinc-500 text-xs mt-1">💰 {t.price}</div>}
              </div>
            ))}
          </div>
        </Card>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">{error}</div>
        )}

        {/* 1. 담당자 */}
        <Card title="① 작성자 / 담당자" required>
          <Grid>
            <Field label="담당자 성함" required error={fieldErrors.contact_name} fieldKey="contact_name">
              <Input value={form.contact_name} onChange={(v) => update("contact_name", v)} />
            </Field>
            <Field label="직책">
              <Input value={form.contact_role} onChange={(v) => update("contact_role", v)} placeholder="대표 / 매니저 등" />
            </Field>
            <Field label="연락처 (휴대폰)" required error={fieldErrors.contact_phone} fieldKey="contact_phone">
              <Input value={form.contact_phone} onChange={(v) => update("contact_phone", v)} placeholder="010-0000-0000" />
            </Field>
            <Field label="이메일" required error={fieldErrors.contact_email} fieldKey="contact_email">
              <Input value={form.contact_email} onChange={(v) => update("contact_email", v)} placeholder="example@domain.com" type="email" />
            </Field>
          </Grid>
          <Field label="회신 선호 채널">
            <Radio
              name="preferred_channel"
              value={form.preferred_channel}
              onChange={(v) => update("preferred_channel", v)}
              options={["이메일", "카카오톡", "전화"]}
            />
          </Field>
        </Card>

        {/* 2. 사업자 */}
        <Card title="② 사업자 기본 정보">
          <Grid>
            <Field label="상호명 (정식)"><Input value={form.business_name} onChange={(v) => update("business_name", v)} /></Field>
            <Field label="사업자등록번호"><Input value={form.business_number} onChange={(v) => update("business_number", v)} /></Field>
            <Field label="대표자 성함"><Input value={form.representative} onChange={(v) => update("representative", v)} /></Field>
            <Field label="업종/업태"><Input value={form.industry} onChange={(v) => update("industry", v)} /></Field>
          </Grid>
          <Field label="사업장 주소"><Input value={form.business_address} onChange={(v) => update("business_address", v)} /></Field>
          <Grid>
            <Field label="대표 전화번호"><Input value={form.business_phone} onChange={(v) => update("business_phone", v)} /></Field>
            <Field label="대표 이메일"><Input value={form.business_email} onChange={(v) => update("business_email", v)} type="email" /></Field>
          </Grid>
          <Field label="통신판매업 신고번호 (있을 경우)">
            <Input value={form.ecommerce_license} onChange={(v) => update("ecommerce_license", v)} />
          </Field>
          <Note>📎 사업자등록증 사본은 1차 상담 시 이메일/카카오톡으로 보내주세요.</Note>
        </Card>

        {/* 3. 목적 */}
        <Card title="③ 홈페이지 목적">
          <Field label="원하시는 항목 모두 체크 (복수)">
            <Checkboxes
              values={form.goals}
              onToggle={(v) => toggleArr("goals", v)}
              options={[
                "회사·매장 소개 (브랜드 알리기)",
                "고객 문의 받기",
                "예약 받기 (방문/체험/수업)",
                "상품·서비스 판매 (결제)",
                "회원 관리",
                "정기 콘텐츠 발행 (블로그·공지)",
              ]}
            />
          </Field>
          <Field label="한 줄 요약 — 이 홈페이지로 무엇을 하고 싶으신가요?">
            <Textarea
              value={form.goal_summary}
              onChange={(v) => update("goal_summary", v)}
              placeholder='예: "동네 공방을 알리고, 원데이클래스 예약을 온라인으로 받고 싶어요."'
              rows={3}
            />
          </Field>
        </Card>

        {/* 4. 단계 */}
        <Card title="④ 구현 범위 선택">
          <div className="space-y-2">
            {TIERS.map((t) => (
              <label key={t.value} className={`block border rounded-lg p-3 cursor-pointer transition ${
                form.target_tier === t.value ? "border-violet-500 bg-violet-50" : "border-zinc-200 hover:bg-zinc-50"
              }`}>
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="target_tier"
                    value={t.value}
                    checked={form.target_tier === t.value}
                    onChange={(e) => update("target_tier", e.target.value)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-sm text-zinc-800">{t.emoji} {t.title}</div>
                    {t.desc && <div className="text-xs text-zinc-600 mt-1">{t.desc}</div>}
                    {t.price && <div className="text-xs text-zinc-500 mt-1">💰 {t.price}</div>}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </Card>

        {/* 5. 브랜드 */}
        <Card title="⑤ 브랜드 자산">
          <Field label="로고">
            <Radio
              name="brand_logo_status"
              value={form.brand_logo_status}
              onChange={(v) => update("brand_logo_status", v)}
              options={["로고 있음 (파일 별도 전달)", "로고 없음 — 제작 필요 (별도 비용)", "텍스트 로고로 충분"]}
            />
          </Field>
          <Grid>
            <Field label="대표 컬러">
              <Input value={form.brand_color_main} onChange={(v) => update("brand_color_main", v)} placeholder='#FF6600 또는 "주황색 계열"' />
            </Field>
            <Field label="보조 컬러 (선택)">
              <Input value={form.brand_color_sub} onChange={(v) => update("brand_color_sub", v)} />
            </Field>
          </Grid>
          <Field label="피하고 싶은 색상">
            <Input value={form.brand_color_avoid} onChange={(v) => update("brand_color_avoid", v)} />
          </Field>
          <Field label="분위기 (톤앤매너) — 복수 선택">
            <Checkboxes
              values={form.tone_and_manner}
              onToggle={(v) => toggleArr("tone_and_manner", v)}
              options={["모던 / 세련된", "따뜻한 / 감성적", "심플 / 미니멀", "럭셔리 / 고급스러운", "친근한 / 캐주얼", "전문적 / 신뢰감"]}
            />
          </Field>
          <Field label="참고 사이트 (2~3개)">
            <div className="space-y-2">
              {form.reference_sites.map((s, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    value={s.url}
                    onChange={(v) => {
                      const next = [...form.reference_sites];
                      next[i] = { ...next[i], url: v };
                      update("reference_sites", next);
                    }}
                    placeholder="https://..."
                  />
                  <Input
                    value={s.note}
                    onChange={(v) => {
                      const next = [...form.reference_sites];
                      next[i] = { ...next[i], note: v };
                      update("reference_sites", next);
                    }}
                    placeholder="좋은 점"
                  />
                </div>
              ))}
            </div>
          </Field>
        </Card>

        {/* 6. 메뉴 */}
        <Card title="⑥ 메뉴 구성">
          <Field label="원하시는 메뉴 (복수)">
            <Checkboxes
              values={form.menu_items}
              onToggle={(v) => toggleArr("menu_items", v)}
              options={[
                "홈", "회사 소개 / 브랜드 스토리", "서비스 / 상품 소개", "가격 / 요금 안내",
                "예약 / 신청", "갤러리 / 포트폴리오", "공지사항", "후기 / 리뷰",
                "자주 묻는 질문 (FAQ)", "오시는 길", "문의하기", "블로그",
              ]}
            />
          </Field>
          <Field label="기타 메뉴 (직접 입력 — 쉼표로 구분)">
            <Input
              value={form.menu_items_etc}
              onChange={(v) => update("menu_items_etc", v)}
              placeholder="예: 채용, 파트너 문의, 멤버십 안내"
            />
          </Field>
        </Card>

        {/* 7. 콘텐츠 */}
        <Card title="⑦ 콘텐츠 자료">
          <Field label="회사·매장 소개글 (200~500자)">
            <Textarea value={form.intro_text} onChange={(v) => update("intro_text", v)} rows={5} />
          </Field>

          <Field label="서비스/상품 정보">
            <div className="space-y-3">
              {form.products.map((p, i) => (
                <div key={i} className="border border-zinc-200 rounded-lg p-3 space-y-2">
                  <Grid>
                    <Input
                      value={p.name}
                      onChange={(v) => {
                        const next = [...form.products];
                        next[i] = { ...next[i], name: v };
                        update("products", next);
                      }}
                      placeholder="상품/서비스명"
                    />
                    <Input
                      value={p.price}
                      onChange={(v) => {
                        const next = [...form.products];
                        next[i] = { ...next[i], price: v };
                        update("products", next);
                      }}
                      placeholder="가격"
                    />
                  </Grid>
                  <Textarea
                    value={p.description}
                    onChange={(v) => {
                      const next = [...form.products];
                      next[i] = { ...next[i], description: v };
                      update("products", next);
                    }}
                    placeholder="설명 (50~150자)"
                    rows={2}
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => update("products", [...form.products, { name: "", description: "", price: "", note: "" }])}
                className="text-sm text-violet-600 hover:text-violet-700 font-medium"
              >
                + 상품 추가
              </button>
            </div>
          </Field>

          <Field label="사진/이미지">
            <Radio
              name="photo_status"
              value={form.photo_status}
              onChange={(v) => update("photo_status", v)}
              options={["고해상도 사진 5장 이상 제공 가능", "사진이 부족함 → 무료 스톡사진 활용 동의", "촬영이 필요함"]}
            />
          </Field>

          <Field label="FAQ (선택)">
            <div className="space-y-2">
              {form.faqs.map((f, i) => (
                <div key={i} className="space-y-1">
                  <Input
                    value={f.q}
                    onChange={(v) => {
                      const next = [...form.faqs];
                      next[i] = { ...next[i], q: v };
                      update("faqs", next);
                    }}
                    placeholder="Q. 질문"
                  />
                  <Textarea
                    value={f.a}
                    onChange={(v) => {
                      const next = [...form.faqs];
                      next[i] = { ...next[i], a: v };
                      update("faqs", next);
                    }}
                    placeholder="A. 답변"
                    rows={2}
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => update("faqs", [...form.faqs, { q: "", a: "" }])}
                className="text-sm text-violet-600 hover:text-violet-700 font-medium"
              >
                + FAQ 추가
              </button>
            </div>
          </Field>
        </Card>

        {/* 8. 운영 */}
        <Card title="⑧ 운영 정보">
          <Grid>
            <Field label="영업시간">
              <Input value={form.business_hours} onChange={(v) => update("business_hours", v)} placeholder="평일 10:00~21:00 / 주말 11:00~18:00" />
            </Field>
            <Field label="휴무일">
              <Input value={form.closed_days} onChange={(v) => update("closed_days", v)} placeholder="매주 월요일, 공휴일" />
            </Field>
          </Grid>
          <Field label="위치 (지도 표시용 주소)">
            <Input value={form.location} onChange={(v) => update("location", v)} />
          </Field>
          <Field label="주차">
            <Radio
              name="parking"
              value={form.parking}
              onChange={(v) => update("parking", v)}
              options={["가능", "불가", "인근 유료주차장"]}
            />
          </Field>
          <Field label="SNS / 외부 링크">
            <div className="space-y-2">
              {form.social_links.map((s, i) => (
                <div key={i} className="grid grid-cols-3 gap-2">
                  <Select
                    value={s.kind}
                    onChange={(v) => {
                      const next = [...form.social_links];
                      next[i] = { ...next[i], kind: v };
                      update("social_links", next);
                    }}
                    options={[
                      { value: "instagram", label: "인스타그램" },
                      { value: "facebook", label: "페이스북" },
                      { value: "youtube", label: "유튜브" },
                      { value: "blog", label: "네이버 블로그" },
                      { value: "kakao", label: "카카오톡 채널" },
                      { value: "naver_place", label: "네이버 플레이스" },
                      { value: "etc", label: "기타" },
                    ]}
                  />
                  <div className="col-span-2">
                    <Input
                      value={s.url}
                      onChange={(v) => {
                        const next = [...form.social_links];
                        next[i] = { ...next[i], url: v };
                        update("social_links", next);
                      }}
                      placeholder="@아이디 또는 URL"
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => update("social_links", [...form.social_links, { kind: "instagram", url: "" }])}
                className="text-sm text-violet-600 hover:text-violet-700 font-medium"
              >
                + 링크 추가
              </button>
            </div>
          </Field>
        </Card>

        {/* 9. 도메인 */}
        <Card title="⑨ 도메인 / 호스팅">
          <Field label="도메인 보유 여부">
            <Radio
              name="domain_status"
              value={form.domain_status}
              onChange={(v) => update("domain_status", v)}
              options={["이미 도메인 보유", "도메인 신규 구매 필요", "잘 모르겠음 (상담 시 안내)"]}
            />
          </Field>
          {form.domain_status === "도메인 신규 구매 필요" && (
            <Field label="원하는 주소 후보 3개">
              <div className="space-y-2">
                {form.domain_candidates.map((d, i) => (
                  <Input
                    key={i}
                    value={d}
                    onChange={(v) => {
                      const next = [...form.domain_candidates];
                      next[i] = v;
                      update("domain_candidates", next);
                    }}
                    placeholder={`후보 ${i + 1}`}
                  />
                ))}
              </div>
            </Field>
          )}
        </Card>

        {/* 10. 회원 (2단계+) */}
        {showMember && (
          <Card title="⑩ 회원 시스템 (2단계 이상)">
            <Field label="회원가입">
              <Radio
                name="member_required"
                value={form.member_required}
                onChange={(v) => update("member_required", v)}
                options={["회원가입 필요", "비회원도 이용 가능"]}
              />
            </Field>
            <Field label="가입 방식 (복수)">
              <Checkboxes
                values={form.signup_methods}
                onToggle={(v) => toggleArr("signup_methods", v)}
                options={["이메일 가입", "카카오 로그인", "네이버 로그인", "휴대폰 본인인증"]}
              />
            </Field>
            <Field label="가입 시 받을 정보 (복수)">
              <Checkboxes
                values={form.signup_fields}
                onToggle={(v) => toggleArr("signup_fields", v)}
                options={["이메일", "이름", "휴대폰 번호", "생년월일", "성별", "주소"]}
              />
            </Field>
            <Field label="회원 등급">
              <Input value={form.member_tiers} onChange={(v) => update("member_tiers", v)} placeholder="예: 일반회원 / VIP / 정회원" />
            </Field>
          </Card>
        )}

        {/* 11. 예약 (3단계+) */}
        {showBooking && (
          <Card title="⑪ 예약 시스템 (3단계 이상)">
            <Grid>
              <Field label="예약 단위">
                <Radio
                  name="booking_unit"
                  value={form.booking_unit}
                  onChange={(v) => update("booking_unit", v)}
                  options={["시간 단위", "일 단위", "회차 단위"]}
                />
              </Field>
              <Field label="1회 운영 시간">
                <Input value={form.booking_duration} onChange={(v) => update("booking_duration", v)} placeholder="60분 / 90분" />
              </Field>
              <Field label="동시 예약 가능 인원">
                <Input value={form.booking_capacity} onChange={(v) => update("booking_capacity", v)} />
              </Field>
              <Field label="예약 시작 시점">
                <Radio
                  name="booking_window"
                  value={form.booking_window}
                  onChange={(v) => update("booking_window", v)}
                  options={["당일부터", "익일부터"]}
                />
              </Field>
            </Grid>
            <Field label="예약 받는 항목 종류">
              <Input value={form.booking_targets} onChange={(v) => update("booking_targets", v)} placeholder="원데이클래스, 룸 대여, 상담 등" />
            </Field>
            <Field label="최대 예약 가능일">
              <Input value={form.booking_max_days} onChange={(v) => update("booking_max_days", v)} placeholder="30일 후까지" />
            </Field>
            <Field label="취소·환불 정책">
              <Textarea
                value={form.refund_policy}
                onChange={(v) => update("refund_policy", v)}
                rows={4}
                placeholder="예: 7일 전까지 100%, 3일 전까지 50%, 당일 0%"
              />
            </Field>
            <Field label="알림 (복수)">
              <Checkboxes
                values={form.notification_prefs}
                onToggle={(v) => toggleArr("notification_prefs", v)}
                options={[
                  "예약 시 고객에게 이메일",
                  "예약 시 고객에게 SMS (별도 비용)",
                  "예약 시 고객에게 카카오 알림톡 (별도 비용)",
                  "예약 시 운영자에게 알림",
                  "예약 1시간 전 자동 리마인드",
                ]}
              />
            </Field>
            <Field label="기타 알림 요청 (직접 입력)">
              <Input
                value={form.notification_prefs_etc}
                onChange={(v) => update("notification_prefs_etc", v)}
                placeholder="예: 노쇼 1회 시 자동 블랙리스트 알림"
              />
            </Field>
          </Card>
        )}

        {/* 12. 결제 (4단계+) */}
        {showPayment && (
          <Card title="⑫ 결제 시스템 (4단계 이상)">
            <Field label="사업자 사전 준비 (복수)">
              <Checkboxes
                values={form.pg_ready}
                onToggle={(v) => toggleArr("pg_ready", v)}
                options={["통신판매업 신고 완료", "법인/사업자 명의 계좌 보유", "PG사 가입 완료"]}
              />
            </Field>
            <Field label="원하는 결제 수단 (복수)">
              <Checkboxes
                values={form.payment_methods}
                onToggle={(v) => toggleArr("payment_methods", v)}
                options={["신용카드", "카카오페이", "네이버페이", "토스페이", "계좌이체", "무통장입금", "정기결제 (구독)"]}
              />
            </Field>
            <Field label="환불·교환 규정 (전자상거래법상 의무)">
              <Textarea value={form.refund_terms} onChange={(v) => update("refund_terms", v)} rows={4} />
            </Field>
            <Field label="비회원 결제">
              <Radio
                name="guest_checkout"
                value={form.guest_checkout}
                onChange={(v) => update("guest_checkout", v)}
                options={["허용", "회원만 결제 가능"]}
              />
            </Field>
          </Card>
        )}

        {/* 13. 관리자 */}
        {showMember && (
          <Card title="⑬ 관리자 페이지">
            <Field label="운영자 정보 (관리자 권한 받을 분)">
              <Textarea
                value={form.admin_operators}
                onChange={(v) => update("admin_operators", v)}
                rows={3}
                placeholder="이름 / 이메일 / 권한 (전체관리자/매니저)&#10;예) 김대표 / kim@example.com / 전체관리자"
              />
            </Field>
            <Field label="원하는 관리자 기능 (복수)">
              <Checkboxes
                values={form.admin_features}
                onToggle={(v) => toggleArr("admin_features", v)}
                options={[
                  "회원 목록 조회/관리",
                  "게시판 글 관리",
                  "예약 캘린더 보기",
                  "예약 수동 등록/취소",
                  "매출 통계",
                  "엑셀(CSV) 다운로드",
                  "일괄 알림 발송",
                ]}
              />
            </Field>
          </Card>
        )}

        {/* 14. 일정/예산 */}
        <Card title="⑭ 일정 / 예산">
          <Grid>
            <Field label="희망 오픈일">
              <Input value={form.desired_open_date} onChange={(v) => update("desired_open_date", v)} placeholder="YYYY-MM-DD 또는 '한 달 내'" />
            </Field>
            <Field label="마감 기한">
              <Input value={form.deadline} onChange={(v) => update("deadline", v)} placeholder="없음 / 있음 (사유)" />
            </Field>
          </Grid>
          <Field label="예상 예산 범위">
            <Radio
              name="budget_range"
              value={form.budget_range}
              onChange={(v) => update("budget_range", v)}
              options={["100만원대", "300만원대", "500만원대", "1,000만원+", "미정"]}
            />
          </Field>
          <Field label="분할 결제 희망">
            <Radio
              name="payment_split"
              value={form.payment_split}
              onChange={(v) => update("payment_split", v)}
              options={["일시불", "계약금/잔금 50:50", "30/40/30"]}
            />
          </Field>
        </Card>

        {/* 15. 인프라 */}
        <Card title="⑮ 인프라 비용 (월 운영비)">
          <p className="text-sm text-zinc-600 mb-3">
            홈페이지 운영을 위해 매월 발생하는 비용 (호스팅·DB·도메인)을 누가 부담할지 선택해 주세요.
          </p>
          <Radio
            name="infra_payer"
            value={form.infra_payer}
            onChange={(v) => update("infra_payer", v)}
            options={[
              "고객 명의로 직접 가입·결제 (추천: 약 3~10만원/월)",
              "제작자가 통합 운영 (월 유지보수료 포함)",
              "상담 후 결정",
            ]}
          />
        </Card>

        {/* 16. 추가 요청 */}
        <Card title="⑯ 추가 요청 사항">
          <Textarea
            value={form.extra_requests}
            onChange={(v) => update("extra_requests", v)}
            rows={5}
            placeholder="위에 없는 기능·요구사항·궁금한 점 자유롭게 적어주세요."
          />
        </Card>

        {/* 동의 */}
        <Card title="동의 사항">
          <div data-field="agreed" className={fieldErrors.agreed ? "ring-2 ring-red-300 rounded-lg p-2 -m-2" : ""}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.agreed}
                onChange={(e) => update("agreed", e.target.checked)}
                className="mt-1 w-4 h-4"
              />
              <span className="text-sm text-zinc-700 leading-relaxed">
                <span className="text-red-500 mr-0.5">*</span>
                작성한 정보는 홈페이지 제작 목적 외 사용되지 않음에 동의합니다. 정식 계약은 별도 계약서를 통해 진행됨을 이해합니다.
              </span>
            </label>
            {fieldErrors.agreed && (
              <p className="mt-2 text-xs text-red-600 flex items-center gap-1 pl-7">
                <span>⚠</span>
                {fieldErrors.agreed}
              </p>
            )}
          </div>
        </Card>

        {/* Submit */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6">
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition"
          >
            {submitting ? "제출 중..." : "의뢰서 제출하기"}
          </button>
          <p className="text-xs text-zinc-500 text-center mt-3">제출 후 24시간 내 1차 상담 일정 안내드립니다.</p>
        </div>
      </form>
    </div>
  );
}

/* ─── UI 헬퍼 컴포넌트 ─── */

function Card({ title, required, children }: { title: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6">
      <h2 className="font-bold text-lg text-zinc-900 mb-4">
        {title}
        {required && <span className="text-red-500 text-sm ml-1">*</span>}
      </h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  fieldKey,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  fieldKey?: string;
  children: React.ReactNode;
}) {
  return (
    <div data-field={fieldKey}>
      <label className="block text-sm font-medium text-zinc-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className={error ? "ring-2 ring-red-300 rounded-lg" : ""}>{children}</div>
      {error && (
        <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
          <span>⚠</span>
          {error}
        </p>
      )}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-zinc-500 bg-zinc-50 rounded-lg px-3 py-2">{children}</p>;
}

function Input({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 4 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-y"
    />
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function Radio({ name, value, onChange, options }: { name: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <label key={o} className={`px-3 py-2 border rounded-lg text-sm cursor-pointer transition ${
          value === o ? "border-violet-500 bg-violet-50 text-violet-700" : "border-zinc-300 hover:bg-zinc-50"
        }`}>
          <input type="radio" name={name} value={o} checked={value === o} onChange={(e) => onChange(e.target.value)} className="hidden" />
          {o}
        </label>
      ))}
    </div>
  );
}

function Checkboxes({ values, onToggle, options }: { values: string[]; onToggle: (v: string) => void; options: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = values.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => onToggle(o)}
            className={`px-3 py-2 border rounded-lg text-sm transition ${
              on ? "border-violet-500 bg-violet-50 text-violet-700 font-medium" : "border-zinc-300 hover:bg-zinc-50"
            }`}
          >
            {on ? "✓ " : ""}{o}
          </button>
        );
      })}
    </div>
  );
}
