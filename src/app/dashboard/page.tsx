import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-2xl font-bold">대시보드</h1>
      <p className="mt-3 text-sm text-[#6f655d]">로그인된 사용자: {user.email}</p>
    </div>
  );
}
