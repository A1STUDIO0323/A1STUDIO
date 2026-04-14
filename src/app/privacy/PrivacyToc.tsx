"use client";

import { useEffect, useState } from "react";

interface TocItem {
  id: string;
  number: number;
  title: string;
}

const tocItems: TocItem[] = [
  { id: "article-1", number: 1, title: "수집하는 개인정보 항목" },
  { id: "article-2", number: 2, title: "개인정보 수집 방법" },
  { id: "article-3", number: 3, title: "개인정보 이용 목적" },
  { id: "article-4", number: 4, title: "개인정보 보유 및 이용기간" },
  { id: "article-5", number: 5, title: "개인정보 파기 절차 및 방법" },
  { id: "article-6", number: 6, title: "개인정보의 제3자 제공" },
  { id: "article-7", number: 7, title: "개인정보 처리위탁" },
  { id: "article-8", number: 8, title: "국외 이전" },
  { id: "article-9", number: 9, title: "정보주체의 권리와 행사 방법" },
  { id: "article-10", number: 10, title: "쿠키 및 세션 안내" },
  { id: "article-11", number: 11, title: "개인정보의 안전성 확보조치" },
  { id: "article-12", number: 12, title: "개인정보 보호책임자" },
  { id: "article-13", number: 13, title: "시행일" },
];

export default function PrivacyToc() {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-20% 0px -70% 0px",
        threshold: 0,
      }
    );

    tocItems.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <nav className="sticky top-8 hidden lg:block">
      <h3 className="text-sm font-bold uppercase tracking-wide text-[#9b9189] mb-4">
        목차
      </h3>
      <ul className="space-y-2">
        {tocItems.map((item) => {
          const isActive = activeId === item.id;
          return (
            <li key={item.id}>
              <button
                onClick={() => scrollToSection(item.id)}
                className={`
                  w-full text-left text-sm py-2 px-3 rounded-lg transition-all
                  ${
                    isActive
                      ? "bg-[#f5ede6] border-l-4 border-[#B98768] text-[#3B342F] font-semibold"
                      : "text-[#6f655d] hover:bg-[#EFE7DA] hover:text-[#3B342F]"
                  }
                `}
              >
                <span className="font-mono text-xs text-[#B98768] mr-2">
                  제{item.number}조
                </span>
                {item.title}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
