export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAllBannedRows, getAllRoleRows } from "@/lib/member-role-db";
import { requireAdminOrLegacy } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const auth = await requireAdminOrLegacy(req);
  if ("error" in auth) return auth.error;

  try {
    const keyword = (req.nextUrl.searchParams.get("search") ?? "").trim().toLowerCase();

    const users = await prisma.users.findMany({
      where: { email: { not: null } },
      select: { id: true, email: true, name: true, phone: true, role: true, updated_at: true },
      orderBy: { updated_at: "desc" },
      take: 500,
    });

    const emails = users.map((u) => u.email!).filter(Boolean);
    let reservations: { guestEmail: string | null; guestPhone: string; createdAt: Date }[] = [];
    try {
      if (emails.length) {
        reservations = await prisma.reservation.findMany({
          where: { guestEmail: { in: emails } },
          select: { guestEmail: true, guestPhone: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 2000,
        });
      }
    } catch {
      // reservations 테이블 스키마 불일치 시 전화번호 없이 진행
    }

    const phoneMap = new Map<string, string>();
    for (const res of reservations) {
      const email = (res.guestEmail ?? "").trim().toLowerCase();
      if (!email || phoneMap.has(email)) continue;
      phoneMap.set(email, res.guestPhone ?? "");
    }

    // legacy member_roles는 fallback용 (users.role 미반영된 경우 대비)
    const roleRows = await getAllRoleRows();
    const legacyRoleMap = new Map<string, "CM" | "MEMBER">();
    for (const row of roleRows) {
      legacyRoleMap.set(row.email.toLowerCase(), row.role === "CM" ? "CM" : "MEMBER");
    }

    const bannedRows = await getAllBannedRows();
    const bannedMap = new Map<string, string | null>();
    for (const row of bannedRows) {
      bannedMap.set(row.email.toLowerCase(), row.reason ?? null);
    }

    function normalizeRole(r: string | null | undefined): "MEMBER" | "CM" | "ADMIN" {
      if (r === "ADMIN") return "ADMIN";
      if (r === "CM") return "CM";
      return "MEMBER";
    }

    const userMembers = users.map((user) => {
        const email = (user.email ?? "").trim().toLowerCase();
        // users.role(권한의 진실)을 우선, 미설정 시 legacy member_roles에서 백필
        const role = user.role && user.role !== "MEMBER"
          ? normalizeRole(user.role)
          : legacyRoleMap.get(email) ?? "MEMBER";
        return {
          id: user.id,
          email,
          name: user.name?.trim() || "회원",
          phone: user.phone?.trim() || phoneMap.get(email) || "",
          role,
          isBanned: bannedMap.has(email),
          banReason: bannedMap.get(email) ?? null,
          lastSeenAt: user.updated_at.toISOString(),
        };
      });

    const mergedMap = new Map<string, (typeof userMembers)[number]>();
    for (const member of userMembers) {
      mergedMap.set(member.email, member);
    }
    for (const [email, reason] of bannedMap.entries()) {
      if (mergedMap.has(email)) continue;
      mergedMap.set(email, {
        id: "",  // 탈퇴 후 users 레코드 없는 케이스 — role 변경 UI 비활성화 신호
        email,
        name: "탈퇴회원",
        phone: "",
        role: legacyRoleMap.get(email) ?? "MEMBER",
        isBanned: true,
        banReason: reason ?? null,
        lastSeenAt: new Date().toISOString(),
      });
    }

    const members = Array.from(mergedMap.values()).filter((member) => {
        if (!keyword) return true;
        return (
          member.email.includes(keyword) ||
          member.phone.includes(keyword) ||
          member.name.toLowerCase().includes(keyword)
        );
      });

    return NextResponse.json({ members });
  } catch {
    return NextResponse.json({ members: [] });
  }
}
