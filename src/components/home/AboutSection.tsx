import type { CSSProperties, ReactNode } from "react";

const careers = [
  { year: "2025", title: "슈가" },
  { year: "2024", title: "삼총사" },
  { year: "2024", title: "4월은 너의 거짓말" },
  { year: "2024", title: "블러디러브" },
  { year: "2023", title: "드라큘라" },
  { year: "2023", title: "할란카운티" },
  { year: "2022", title: "웃는 남자" },
  { year: "2021", title: "맨 오브 라만차" },
  { year: "2021", title: "다윈영의 악의기원" },
  { year: "2020", title: "드라큘라" },
  { year: "2019", title: "엘리자벳" },
  { year: "2019", title: "안나 카레니나" },
  { year: "2018", title: "존 도우" },
  { year: "2016", title: "맘마미아" },
  { year: "2013", title: "The Promise" },
  { year: "2011", title: "삼총사" },
];

const philosophy = [
  {
    num: "01",
    label: "현장의 감각을 그대로",
    desc: "단순 체험이 아닌, 실제 무대에서 필요한 기본기와 감각을 밀도 있게 전달하는 수업을 지향합니다.",
  },
  {
    num: "02",
    label: "누구나 부담 없이",
    desc: "처음 접하는 분도 자신 있게 시작할 수 있도록, 진입 장벽 없는 환경을 먼저 만듭니다.",
  },
  {
    num: "03",
    label: "한 번에도 분명한 성취",
    desc: "원데이 클래스 한 번 안에서도 배움과 성취감을 명확히 느낄 수 있도록 구성합니다.",
  },
];

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p
      className="mb-6 text-[11px] uppercase tracking-[4px] text-[#aaa]"
      style={{ fontFamily: "var(--font-cormorant), serif" }}
    >
      {children}
    </p>
  );
}

export default function AboutSection() {
  return (
    <section
      id="about"
      className="border-y border-[#D8CCBC] bg-[#F7F3EB] py-16"
      style={{ fontFamily: "var(--font-noto-serif-kr), serif" } as CSSProperties}
    >
      <div className="mx-auto max-w-3xl px-5">

        {/* ── 스튜디오 헤더 ── */}
        <div className="mb-10 flex flex-wrap items-end gap-8 border-b border-black/10 pb-8">
          {/* 왼쪽: 로고 텍스트 */}
          <div className="shrink-0">
            <p
              className="text-[52px] font-normal leading-none tracking-[-1px] text-[#1a1a1a]"
              style={{ fontFamily: "var(--font-cormorant), serif" }}
            >
              A<span style={{ fontFamily: "var(--font-geist), sans-serif" }}>1</span><span className="italic text-[#888]">STUDIO</span>
            </p>
            <p className="mt-1.5 text-[13px] uppercase tracking-[3px] text-[#aaa]">
              Dance · Music · Acting
            </p>
          </div>

          {/* 오른쪽: 소개문 */}
          <div className="min-w-[200px] flex-1 border-l border-black/10 pl-8 text-[15px] leading-[1.9] text-[#555]">
            A1STUDIO는{" "}
            <strong className="font-medium text-[#1a1a1a]">항상 가장 먼저 떠오르는 공간</strong>이
            되고자 하는 이름입니다.
            <br />
            이곳을 찾는 모든 이가 자신의 분야에서 앞서 나아가고 더 높이 성장하길 바라는 마음을
            이름에 담았습니다. 춤·음악·연기 등 다양한 표현 예술을 준비하고 완성해가는 사람들이{" "}
            <strong className="font-medium text-[#1a1a1a]">몰입하고 성장할 수 있는 공간</strong>을
            지향합니다.
          </div>
        </div>

        {/* ── 대표 소개 ── */}
        <div id="director" className="scroll-mt-20">
          <SectionLabel>대표 소개 · Director</SectionLabel>
        </div>

        <div className="mb-10 grid grid-cols-1 gap-8 sm:grid-cols-[200px_1fr]">
          {/* 사진 플레이스홀더 */}
          <div className="flex w-full max-w-[200px] flex-col items-center justify-center gap-2 self-start rounded-xl border border-dashed border-[#ccc] bg-[#f5f5f3] sm:max-w-none"
            style={{ aspectRatio: "3 / 4" }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="12" cy="10" r="3" />
              <path d="M6 21c0-3.314 2.686-6 6-6s6 2.686 6 6" />
            </svg>
            <span className="text-[11px] uppercase tracking-[2px] text-[#aaa]">대표 사진</span>
          </div>

          {/* 텍스트 영역 */}
          <div>
            <p
              className="text-[28px] font-normal italic text-[#1a1a1a]"
              style={{ fontFamily: "var(--font-cormorant), serif" }}
            >
              A1STUDIO 대표
            </p>
            <p className="mb-5 mt-1 text-[12px] uppercase tracking-[2px] text-[#aaa]">
              Musical Artist · Director
            </p>
            <p className="mb-6 text-[14px] leading-[1.85] text-[#555]">
              국내 주요 뮤지컬 무대에서 오랜 기간 활동하며 쌓아온 폭넓은 현장 경험을 바탕으로
              A1STUDIO를 이끌고 있습니다. 대형 라이선스 작품부터 창작 뮤지컬까지 다양한
              프로덕션에서 배우로 활동하며 무대가 요구하는 감각과 기본기를 직접 체득해왔습니다.
            </p>

            <SectionLabel>주요 출연작 · Selected Works</SectionLabel>

            {/* 출연작 목록: 1열, 최신순 */}
            <div className="grid grid-cols-1 gap-1.5">
              {careers.map((c, i) => (
                <div
                  key={i}
                  className="flex items-baseline gap-1.5 rounded-lg border border-black/10 px-2.5 py-1.5"
                >
                  <span className="shrink-0 text-[11px] tabular-nums text-[#aaa]">{c.year}</span>
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[12px] font-medium text-[#1a1a1a]">
                    {c.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 구분선 */}
        <div className="my-10 h-px bg-black/10" />

        {/* ── 클래스 철학 ── */}
        <SectionLabel>클래스 철학 · Our Philosophy</SectionLabel>

        {/* 철학 카드: 모바일 1열 → sm 이상 3열 */}
        <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {philosophy.map((p, i) => (
            <div key={i} className="rounded-xl border border-black/10 p-5">
              <p
                className="mb-2 text-[32px] italic leading-none text-[#ccc]"
                style={{ fontFamily: "var(--font-cormorant), serif" }}
              >
                {p.num}
              </p>
              <p className="mb-1.5 text-[13px] font-medium text-[#1a1a1a]">{p.label}</p>
              <p className="text-[12px] leading-[1.7] text-[#777]">{p.desc}</p>
            </div>
          ))}
        </div>

        {/* ── 마무리 인용 ── */}
        <div className="border-l-2 border-black/15 pl-8 text-[15px] leading-[2] text-[#555]">
          이곳을 찾는 모든 사람이 결국 자신만의 자리에서 가장 빛나는
          <br />
          <em className="italic text-[#1a1a1a]">&apos;A1&apos;이 될 수 있도록</em> — 그것이
          A1STUDIO가 만들어가는 방향입니다.
        </div>
      </div>
    </section>
  );
}
