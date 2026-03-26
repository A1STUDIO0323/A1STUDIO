export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAllBannedRows, getAllRoleRows } from "@/lib/member-role-db";

export async function GET(req: NextRequest) {
  try {
    const keyword = (req.nextUrl.searchParams.get("search") ?? "").trim().toLowerCase();

    const users = await prisma.user.findMany({
      where: { email: { not: null } },
      select: { email: true, name: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 500,
    });

    const emails = users.map((u) => u.email!).filter(Boolean);
    const reservations = emails.length
      ? await prisma.reservation.findMany({
          where: { guestEmail: { in: emails } },
          select: { guestEmail: true, guestPhone: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 2000,
        })
      : [];

    const phoneMap = new Map<string, string>();
    for (const res of reservations) {
      const email = (res.guestEmail ?? "").trim().toLowerCase();
      if (!email || phoneMap.has(email)) continue;
      phoneMap.set(email, res.guestPhone ?? "");
    }

    const roleRows = await getAllRoleRows();
    const roleMap = new Map<string, "CM" | "MEMBER">();
    for (const row of roleRows) {
      roleMap.set(row.email.toLowerCase(), row.role === "CM" ? "CM" : "MEMBER");
    }

    const bannedRows = await getAllBannedRows();
    const bannedMap = new Map<string, string | null>();
    for (const row of bannedRows) {
      bannedMap.set(row.email.toLowerCase(), row.reason ?? null);
    }

    const userMembers = users.map((user) => {
        const email = (user.email ?? "").trim().toLowerCase();
        return {
          email,
          name: user.name?.trim() || "?åÏõê",
          phone: phoneMap.get(email) ?? "",
          role: roleMap.get(email) ?? "MEMBER",
          isBanned: bannedMap.has(email),
          banReason: bannedMap.get(email) ?? null,
          lastSeenAt: user.updatedAt.toISOString(),
        };
      });

    const mergedMap = new Map<string, (typeof userMembers)[number]>();
    for (const member of userMembers) {
      mergedMap.set(member.email, member);
    }
    for (const [email, reason] of bannedMap.entries()) {
      if (mergedMap.has(email)) continue;
      mergedMap.set(email, {
        email,
        name: "?àÌá¥?åÏõê",
        phone: "",
        role: roleMap.get(email) ?? "MEMBER",
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
