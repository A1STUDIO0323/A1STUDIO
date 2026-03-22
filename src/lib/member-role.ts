"use client";

import { useEffect, useState } from "react";

export type MemberRole = "CM" | "MEMBER";
export type MemberDirectoryItem = {
  email: string;
  name: string;
  phone: string;
  lastSeenAt: string;
};

export type MemberDirectoryWithRole = MemberDirectoryItem & {
  role: MemberRole;
  isBanned?: boolean;
  banReason?: string | null;
};

const MEMBER_ROLE_KEY = "a1studio_member_roles";
const MEMBER_ROLE_EVENT = "a1studio:member-role-updated";
const MEMBER_DIRECTORY_KEY = "a1studio_member_directory";
const MEMBER_DIRECTORY_EVENT = "a1studio:member-directory-updated";
const MEMBER_BANNED_KEY = "a1studio_member_banned";
const MEMBER_BANNED_EVENT = "a1studio:member-banned-updated";
const MEMBER_DELETED_KEY = "a1studio_member_deleted";
const MEMBER_DELETED_EVENT = "a1studio:member-deleted-updated";

type MemberDirectoryMap = Record<string, MemberDirectoryItem>;
type MemberRoleMap = Record<string, MemberRole>;
type BannedMap = Record<string, { reason: string; updatedAt: string }>;
type DeletedMap = Record<string, { deletedAt: string }>;

function normalizeEmail(email?: string | null) {
  return (email ?? "").trim().toLowerCase();
}

function readMemberDirectoryMap(): MemberDirectoryMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(MEMBER_DIRECTORY_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as MemberDirectoryMap;
  } catch {
    return {};
  }
}

function readRoleMap(): MemberRoleMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(MEMBER_ROLE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as MemberRoleMap;
  } catch {
    return {};
  }
}

function writeRoleMap(roleMap: MemberRoleMap) {
  if (typeof window === "undefined") return;
  localStorage.setItem(MEMBER_ROLE_KEY, JSON.stringify(roleMap));
  window.dispatchEvent(new Event(MEMBER_ROLE_EVENT));
}

function readBannedMap(): BannedMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(MEMBER_BANNED_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as BannedMap;
  } catch {
    return {};
  }
}

function writeBannedMap(bannedMap: BannedMap) {
  if (typeof window === "undefined") return;
  localStorage.setItem(MEMBER_BANNED_KEY, JSON.stringify(bannedMap));
  window.dispatchEvent(new Event(MEMBER_BANNED_EVENT));
}

function readDeletedMap(): DeletedMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(MEMBER_DELETED_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as DeletedMap;
  } catch {
    return {};
  }
}

function writeDeletedMap(deletedMap: DeletedMap) {
  if (typeof window === "undefined") return;
  localStorage.setItem(MEMBER_DELETED_KEY, JSON.stringify(deletedMap));
  window.dispatchEvent(new Event(MEMBER_DELETED_EVENT));
}

function writeMemberDirectoryMap(directoryMap: MemberDirectoryMap) {
  if (typeof window === "undefined") return;
  localStorage.setItem(MEMBER_DIRECTORY_KEY, JSON.stringify(directoryMap));
  window.dispatchEvent(new Event(MEMBER_DIRECTORY_EVENT));
}

export function getMemberRoleByEmail(email?: string | null): MemberRole {
  const normalized = normalizeEmail(email);
  if (!normalized) return "MEMBER";
  const roleMap = readRoleMap();
  return roleMap[normalized] ?? "MEMBER";
}

export async function setMemberRoleByEmail(email: string, role: MemberRole) {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  const applyLocalRole = () => {
    const roleMap = readRoleMap();
    if (role === "MEMBER") {
      delete roleMap[normalized];
    } else {
      roleMap[normalized] = role;
    }
    writeRoleMap(roleMap);
  };

  try {
    const res = await fetch("/api/member-roles/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalized, role }),
    });
    if (!res.ok) {
      // DB 연결 실패(예: P1001) 등 서버 오류 시 로컬 상태를 우선 반영합니다.
      applyLocalRole();
      return true;
    }
    // 서버 성공 시에도 로컬 캐시를 동기화해 즉시 반영/오프라인 내성을 확보합니다.
    applyLocalRole();
    return true;
  } catch {
    applyLocalRole();
    return true;
  }
}

export function getAllMemberRoles(): Array<{ email: string; role: MemberRole }> {
  const roleMap = readRoleMap();
  return Object.entries(roleMap).map(([email, role]) => ({ email, role }));
}

export function registerMemberProfile(data: { email?: string | null; name?: string | null; phone?: string | null }) {
  const normalized = normalizeEmail(data.email);
  if (!normalized || typeof window === "undefined") return;

  const directoryMap = readMemberDirectoryMap();
  const current = directoryMap[normalized];
  directoryMap[normalized] = {
    email: normalized,
    name: data.name?.trim() || current?.name || "회원",
    phone: data.phone?.trim() || current?.phone || "",
    lastSeenAt: new Date().toISOString(),
  };
  writeMemberDirectoryMap(directoryMap);
  // 재가입/재로그인 시 로컬 삭제 표시를 해제합니다.
  const deletedMap = readDeletedMap();
  if (deletedMap[normalized]) {
    delete deletedMap[normalized];
    writeDeletedMap(deletedMap);
  }
}

export function setMemberPhoneByEmail(email: string, phone: string) {
  const normalized = normalizeEmail(email);
  if (!normalized || typeof window === "undefined") return;

  const directoryMap = readMemberDirectoryMap();
  const current = directoryMap[normalized];
  directoryMap[normalized] = {
    email: normalized,
    name: current?.name || "회원",
    phone: phone.trim(),
    lastSeenAt: new Date().toISOString(),
  };
  writeMemberDirectoryMap(directoryMap);
}

export function deleteMemberProfileByEmail(email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized || typeof window === "undefined") return;
  const directoryMap = readMemberDirectoryMap();
  delete directoryMap[normalized];
  writeMemberDirectoryMap(directoryMap);
}

export function markMemberDeletedLocal(email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) return;
  const deletedMap = readDeletedMap();
  deletedMap[normalized] = { deletedAt: new Date().toISOString() };
  writeDeletedMap(deletedMap);
}

export function clearMemberDeletedLocal(email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) return;
  const deletedMap = readDeletedMap();
  delete deletedMap[normalized];
  writeDeletedMap(deletedMap);
}

export function setMemberBannedLocal(email: string, reason = "관리자 재가입금지 처리") {
  const normalized = normalizeEmail(email);
  if (!normalized) return;
  const bannedMap = readBannedMap();
  bannedMap[normalized] = { reason, updatedAt: new Date().toISOString() };
  writeBannedMap(bannedMap);
}

export function clearMemberBannedLocal(email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) return;
  const bannedMap = readBannedMap();
  delete bannedMap[normalized];
  writeBannedMap(bannedMap);
}

export function clearMemberRoleLocal(email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) return;
  const roleMap = readRoleMap();
  delete roleMap[normalized];
  writeRoleMap(roleMap);
}

export function getAllMembersWithRole(): Array<MemberDirectoryItem & { role: MemberRole }> {
  const roleMap = readRoleMap();
  const bannedMap = readBannedMap();
  const deletedMap = readDeletedMap();
  const directoryMap = readMemberDirectoryMap();
  const members = Object.values(directoryMap)
    .filter((member) => !deletedMap[member.email])
    .map((member) => ({
      ...member,
      role: roleMap[member.email] ?? "MEMBER",
      isBanned: Boolean(bannedMap[member.email]),
      banReason: bannedMap[member.email]?.reason ?? null,
    }));

  members.sort((a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime());
  return members;
}

export function getMemberProfileByEmail(email?: string | null): MemberDirectoryItem | null {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const directoryMap = readMemberDirectoryMap();
  return directoryMap[normalized] ?? null;
}

export function useMemberRole(email?: string | null) {
  const [role, setRole] = useState<MemberRole>("MEMBER");
  const normalizedEmail = normalizeEmail(email);

  useEffect(() => {
    let mounted = true;
    const loadRole = async () => {
      if (!normalizedEmail) {
        if (mounted) setRole("MEMBER");
        return;
      }
      const localRole = getMemberRoleByEmail(normalizedEmail);
      if (mounted) {
        setRole(localRole);
      }
      try {
        const res = await fetch(`/api/member-roles/role?email=${encodeURIComponent(normalizedEmail)}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          if (mounted) setRole(localRole);
          return;
        }
        const data = (await res.json()) as { role?: MemberRole };
        if (mounted) {
          // 서버 응답이 MEMBER여도, 방금 관리자 화면에서 반영된 로컬 CM 상태를 우선합니다.
          setRole(data.role === "CM" || localRole === "CM" ? "CM" : "MEMBER");
        }
      } catch {
        if (mounted) setRole(localRole);
      }
    };

    void loadRole();

    const onRoleUpdated = () => {
      void loadRole();
    };
    window.addEventListener(MEMBER_ROLE_EVENT, onRoleUpdated);
    return () => {
      mounted = false;
      window.removeEventListener(MEMBER_ROLE_EVENT, onRoleUpdated);
    };
  }, [normalizedEmail]);

  return {
    role,
    isCM: role === "CM",
    isMember: role === "MEMBER",
  };
}

export function useMemberDirectory() {
  const [members, setMembers] = useState<MemberDirectoryWithRole[]>([]);

  useEffect(() => {
    let mounted = true;
    const loadMembers = async () => {
      const localMembers = getAllMembersWithRole();
      try {
        const res = await fetch("/api/admin/members", { cache: "no-store" });
        const data = (await res.json()) as { members?: MemberDirectoryWithRole[] };
        if (mounted) {
          const dbMembers = data.members ?? [];
          if (!res.ok || dbMembers.length === 0) {
            setMembers(localMembers);
            return;
          }
          const deletedMap = readDeletedMap();

          const merged = new Map<string, MemberDirectoryItem & { role: MemberRole }>();
          for (const member of localMembers) {
            merged.set(member.email, member);
          }
          for (const member of dbMembers) {
            if (deletedMap[member.email]) continue;
            merged.set(member.email, member);
          }
          setMembers(Array.from(merged.values()));
        }
      } catch {
        if (mounted) {
          setMembers(localMembers);
        }
      }
    };

    void loadMembers();

    const onUpdated = () => {
      void loadMembers();
    };
    window.addEventListener(MEMBER_ROLE_EVENT, onUpdated);
    window.addEventListener(MEMBER_DIRECTORY_EVENT, onUpdated);
    window.addEventListener(MEMBER_BANNED_EVENT, onUpdated);
    window.addEventListener(MEMBER_DELETED_EVENT, onUpdated);
    return () => {
      mounted = false;
      window.removeEventListener(MEMBER_ROLE_EVENT, onUpdated);
      window.removeEventListener(MEMBER_DIRECTORY_EVENT, onUpdated);
      window.removeEventListener(MEMBER_BANNED_EVENT, onUpdated);
      window.removeEventListener(MEMBER_DELETED_EVENT, onUpdated);
    };
  }, []);

  return { members };
}
