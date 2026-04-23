import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BoardWriteForm from "@/components/board/BoardWriteForm";

export const metadata = {
  title: "글쓰기 | 자유게시판 | A1 STUDIO",
};

export default async function BoardWritePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/board/write");
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] py-20">
      <div className="mx-auto max-w-4xl px-4">
        <h1 className="mb-8 text-3xl font-bold text-[var(--color-text)]">글쓰기</h1>
        <BoardWriteForm />
      </div>
    </div>
  );
}
