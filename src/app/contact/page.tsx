"use client";

import { useState } from "react";
import { MessageSquare, Phone, Send, CheckCircle2 } from "lucide-react";
import { STUDIO_PHONE, STUDIO_KAKAO_CHANNEL } from "@/lib/constants";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", phone: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "오류가 발생했습니다.");
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F3EB] py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#B98768]">Contact</p>
          <h1 className="mt-1 text-4xl font-extrabold text-[#3B342F]">문의하기</h1>
          <p className="mt-3 text-[#6f655d]">궁금한 점이 있으시면 아래 방법으로 문의해 주세요</p>
        </div>

        {/* 빠른 연락 */}
        <div className="mb-10 grid gap-4 sm:grid-cols-2">
          <a
            href={STUDIO_KAKAO_CHANNEL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 transition-all hover:border-yellow-500/50"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-400 text-[#3B342F] font-bold text-lg">
              K
            </div>
            <div>
              <p className="font-semibold text-[#3B342F]">카카오 채널</p>
              <p className="text-sm text-[#6f655d]">빠른 답변 가능 (평균 10분 내)</p>
            </div>
          </a>
          <a
            href={`tel:${STUDIO_PHONE}`}
            className="flex items-center gap-4 rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-5 transition-all hover:border-[#D8CCBC]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#B98768]/15">
              <Phone className="h-5 w-5 text-[#B98768]" />
            </div>
            <div>
              <p className="font-semibold text-[#3B342F]">{STUDIO_PHONE}</p>
              <p className="text-sm text-[#6f655d]">운영시간 10:00 – 22:00</p>
            </div>
          </a>
        </div>

        {/* 문의 폼 — 일시 비활성화 (필요 시 아래 블록 주석 해제) */}
        {/*
        {submitted ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 py-16 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-400" />
            <h2 className="text-xl font-bold text-[#3B342F]">문의가 접수되었습니다</h2>
            <p className="text-sm text-[#6f655d]">영업시간 내 빠르게 답변해 드리겠습니다.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-6">
            <div className="flex items-center gap-2 mb-5">
              <MessageSquare className="h-5 w-5 text-[#B98768]" />
              <h2 className="text-lg font-bold text-[#3B342F]">문의 양식</h2>
            </div>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-[#3B342F]">이름 <span className="text-red-400">*</span></span>
                  <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="홍길동" className="w-full rounded-xl border border-[#D8CCBC] bg-[#F7F3EB] px-4 py-3 text-[#3B342F] placeholder:text-[#b0a89e] focus:border-[#B98768] focus:outline-none" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-[#3B342F]">연락처 <span className="text-red-400">*</span></span>
                  <input type="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="01012345678" className="w-full rounded-xl border border-[#D8CCBC] bg-[#F7F3EB] px-4 py-3 text-[#3B342F] placeholder:text-[#b0a89e] focus:border-[#B98768] focus:outline-none" />
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[#3B342F]">문의 유형 <span className="text-red-400">*</span></span>
                <select required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full rounded-xl border border-[#D8CCBC] bg-[#F7F3EB] px-4 py-3 text-[#3B342F] focus:border-[#B98768] focus:outline-none">
                  <option value="">선택해주세요</option>
                  <option value="예약 문의">예약 문의</option>
                  <option value="환불/취소 문의">환불/취소 문의</option>
                  <option value="장비 문의">장비 문의</option>
                  <option value="기타">기타</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[#3B342F]">문의 내용 <span className="text-red-400">*</span></span>
                <textarea rows={5} required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="문의 내용을 자세히 입력해주세요."
                  className="w-full resize-none rounded-xl border border-[#D8CCBC] bg-[#F7F3EB] px-4 py-3 text-[#3B342F] placeholder:text-[#b0a89e] focus:border-[#B98768] focus:outline-none" />
              </label>
            </div>
            {error && (
              <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-400">{error}</p>
            )}
            <button type="submit" disabled={loading}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#B98768] py-4 text-sm font-bold text-[#F7F3EB] hover:bg-[#a9785c] transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? (
                <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {loading ? "전송 중..." : "문의 보내기"}
            </button>
          </form>
        )}
        */}

        <div className="rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-8 text-center">
          <MessageSquare className="mx-auto mb-3 h-8 w-8 text-[#B98768]" />
          <p className="text-sm text-[#6f655d]">
            문의는 카카오 채널 또는 전화로 부탁드립니다.
          </p>
        </div>
      </div>
    </div>
  );
}
