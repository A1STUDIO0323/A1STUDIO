"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  clearMemberBannedLocal,
  clearMemberDeletedLocal,
  clearMemberRoleLocal,
  deleteMemberProfileByEmail,
  markMemberDeletedLocal,
  setMemberBannedLocal,
  setMemberRoleByEmail,
  useMemberDirectory,
} from "@/lib/member-role";
import { useAdmin } from "@/lib/admin-context";

export default function AdminMembersPage() {
  const { isAdmin, adminLogin, adminLogout } = useAdmin();
  const { members } = useMemberDirectory();
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [memberMessage, setMemberMessage] = useState("");
  const [adminActionPassword, setAdminActionPassword] = useState("");
  const refreshMembers = () => {
    window.dispatchEvent(new Event("a1studio:member-role-updated"));
  };

  const filteredMembers = members.filter((member) => {
    if (!memberSearch.trim()) return true;
    const keyword = memberSearch.trim().toLowerCase();
    return (
      member.email.toLowerCase().includes(keyword) ||
      member.phone.toLowerCase().includes(keyword) ||
      member.name.toLowerCase().includes(keyword)
    );
  });

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F3EB] px-4">
        <div className="w-full max-w-sm rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-8 text-center">
          <Lock className="mx-auto mb-4 h-10 w-10 text-[#B98768]" />
          <h1 className="text-xl font-bold text-[#3B342F]">관리자 로그인</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setLoginError("");
            }}
            onKeyDown={async (e) => {
              if (e.key === "Enter") {
                const result = await adminLogin(password);
                if (result.ok) {
                  setPassword("");
                  setLoginError("");
                } else {
                  setLoginError(result.error);
                }
              }
            }}
            placeholder="관리자 비밀번호 입력"
            className="mt-5 w-full rounded-xl border border-[#D8CCBC] bg-[#F7F3EB] px-4 py-3 text-[#3B342F] placeholder:text-[#b0a89e] focus:border-[#B98768] focus:outline-none"
          />
          {loginError && <p className="mt-2 text-xs text-red-400">{loginError}</p>}
          <button
            onClick={async () => {
              const result = await adminLogin(password);
              if (result.ok) {
                setPassword("");
                setLoginError("");
              } else {
                setLoginError(result.error);
              }
            }}
            className="mt-3 w-full rounded-xl bg-[#B98768] py-3 text-sm font-bold text-[#F7F3EB] hover:bg-[#a9785c] transition-all"
          >
            로그인
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F3EB]">
      <div className="border-b border-[#D8CCBC] bg-[#EFE7DA] px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-[#3B342F]">회원관리</h1>
            <Link
              href="/admin"
              className="rounded-lg border border-[#D8CCBC] px-2.5 py-1 text-xs text-[#6f655d] hover:text-[#B98768]"
            >
              관리자 홈
            </Link>
          </div>
          <button onClick={adminLogout} className="text-sm text-[#6f655d] hover:text-[#B98768] transition-colors">
            로그아웃
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-5">
          <p className="text-xs font-bold tracking-widest text-[#B98768] uppercase">Member Role</p>
          <h2 className="mt-1 text-lg font-bold text-[#3B342F]">회원등급 관리 (CM 승격)</h2>
          <p className="mt-1 text-xs text-[#9b9189]">
            관리자모드 전용 메뉴입니다. 이메일/전화번호로 검색해 회원등급 변경, 탈퇴처리, 재가입금지를 관리하세요.
          </p>

          <div className="mt-4">
            <input
              type="text"
              value={memberSearch}
              onChange={(e) => {
                setMemberSearch(e.target.value);
                setMemberMessage("");
              }}
              placeholder="이메일 또는 전화번호 검색"
              className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2 text-sm text-[#3B342F] focus:border-[#B98768] focus:outline-none"
            />
          </div>
          <div className="mt-2">
            <input
              type="password"
              value={adminActionPassword}
              onChange={(e) => setAdminActionPassword(e.target.value)}
              placeholder="관리자 비밀번호 (탈퇴/재가입금지 처리용)"
              className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2 text-sm text-[#3B342F] focus:border-[#B98768] focus:outline-none"
            />
          </div>

          {memberMessage && <p className="mt-2 text-xs text-[#6f655d]">{memberMessage}</p>}

          <div className="mt-4 rounded-xl border border-[#D8CCBC] bg-[#F7F3EB]">
            <div className="flex items-center justify-between border-b border-[#D8CCBC] px-3 py-2">
              <p className="text-xs font-semibold text-[#6f655d]">가입 회원 목록</p>
              <p className="text-xs text-[#9b9189]">{filteredMembers.length}명</p>
            </div>
            {filteredMembers.length === 0 ? (
              <p className="px-3 py-3 text-xs text-[#9b9189]">
                검색 결과가 없습니다.
              </p>
            ) : (
              <div className="max-h-[520px] overflow-y-auto">
                {filteredMembers.map((member) => (
                  <div key={member.email} className="flex items-center gap-2 border-b border-[#D8CCBC]/60 px-3 py-2 last:border-b-0">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#3B342F]">{member.email}</p>
                      <p className="text-xs text-[#9b9189]">
                        {member.phone || "전화번호 없음"} · {member.name}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
                        member.role === "CM"
                          ? "border-[#B98768]/40 bg-[#B98768]/10 text-[#B98768]"
                          : "border-[#D8CCBC] bg-[#F7F3EB] text-[#6f655d]"
                      )}
                    >
                      {member.role === "CM" ? "CM" : "일반회원"}
                    </span>
                    {member.isBanned ? (
                      <span className="rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-500">
                        재가입금지
                      </span>
                    ) : null}
                    <button
                      onClick={async () => {
                        const ok = await setMemberRoleByEmail(member.email, "CM");
                        setMemberMessage(ok ? `${member.email} 계정을 CM으로 승격했습니다.` : "회원등급 변경에 실패했습니다.");
                      }}
                      className="rounded-lg bg-[#B98768] px-2.5 py-1.5 text-[11px] font-bold text-[#F7F3EB] hover:bg-[#a9785c]"
                    >
                      CM
                    </button>
                    <button
                      onClick={async () => {
                        const ok = await setMemberRoleByEmail(member.email, "MEMBER");
                        setMemberMessage(ok ? `${member.email} 계정을 일반회원으로 변경했습니다.` : "회원등급 변경에 실패했습니다.");
                      }}
                      className="rounded-lg border border-[#D8CCBC] px-2.5 py-1.5 text-[11px] font-semibold text-[#6f655d] hover:text-[#B98768]"
                    >
                      일반
                    </button>
                    <button
                      onClick={async () => {
                        if (!adminActionPassword) {
                          setMemberMessage("탈퇴/재가입금지 처리 전 관리자 비밀번호를 입력해주세요.");
                          return;
                        }
                        const res = await fetch("/api/admin/members/actions", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            adminPassword: adminActionPassword,
                            email: member.email,
                            action: "WITHDRAW",
                          }),
                        });
                        const data = (await res.json()) as { success?: boolean; error?: string };
                        if (!res.ok || !data.success) {
                          deleteMemberProfileByEmail(member.email);
                          clearMemberRoleLocal(member.email);
                          clearMemberBannedLocal(member.email);
                          markMemberDeletedLocal(member.email);
                          setMemberMessage(`DB 연결 실패로 ${member.email} 계정을 로컬 탈퇴 처리했습니다.`);
                        } else {
                          deleteMemberProfileByEmail(member.email);
                          clearMemberRoleLocal(member.email);
                          clearMemberBannedLocal(member.email);
                          markMemberDeletedLocal(member.email);
                          setMemberMessage(`${member.email} 계정을 탈퇴 처리했습니다.`);
                        }
                        refreshMembers();
                      }}
                      className="rounded-lg border border-red-300 px-2.5 py-1.5 text-[11px] font-semibold text-red-500 hover:bg-red-50"
                    >
                      탈퇴
                    </button>
                    {member.isBanned ? (
                      <button
                        onClick={async () => {
                          if (!adminActionPassword) {
                            setMemberMessage("재가입금지 해제 전 관리자 비밀번호를 입력해주세요.");
                            return;
                          }
                          const res = await fetch("/api/admin/members/actions", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              adminPassword: adminActionPassword,
                              email: member.email,
                              action: "UNBAN",
                            }),
                          });
                          const data = (await res.json()) as { success?: boolean; error?: string };
                          if (!res.ok || !data.success) {
                            clearMemberBannedLocal(member.email);
                            clearMemberDeletedLocal(member.email);
                            setMemberMessage(`DB 연결 실패로 ${member.email} 계정의 로컬 재가입금지를 해제했습니다.`);
                          } else {
                            clearMemberDeletedLocal(member.email);
                            setMemberMessage(`${member.email} 계정의 재가입금지를 해제했습니다.`);
                          }
                          refreshMembers();
                        }}
                        className="rounded-lg border border-[#D8CCBC] px-2.5 py-1.5 text-[11px] font-semibold text-[#6f655d] hover:text-[#B98768]"
                      >
                        금지해제
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          if (!adminActionPassword) {
                            setMemberMessage("재가입금지 처리 전 관리자 비밀번호를 입력해주세요.");
                            return;
                          }
                          const res = await fetch("/api/admin/members/actions", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              adminPassword: adminActionPassword,
                              email: member.email,
                              action: "BAN",
                              reason: "관리자 재가입금지 처리",
                            }),
                          });
                          const data = (await res.json()) as { success?: boolean; error?: string };
                          if (!res.ok || !data.success) {
                            setMemberBannedLocal(member.email, "관리자 재가입금지 처리");
                            setMemberMessage(`DB 연결 실패로 ${member.email} 계정을 로컬 재가입금지 처리했습니다.`);
                          } else {
                            setMemberMessage(`${member.email} 계정을 재가입금지 처리했습니다.`);
                          }
                          refreshMembers();
                        }}
                        className="rounded-lg border border-amber-300 px-2.5 py-1.5 text-[11px] font-semibold text-amber-600 hover:bg-amber-50"
                      >
                        재가입금지
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 rounded-lg border border-[#B98768]/30 bg-[#B98768]/10 px-3 py-2 text-xs text-[#6f655d]">
            <span className="inline-flex items-center gap-1 font-semibold text-[#B98768]">
              <ShieldCheck className="h-3.5 w-3.5" />
              안내
            </span>
            <span className="ml-2">탈퇴 처리 후 재가입금지를 설정하면 동일 이메일로 재가입이 차단됩니다.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
