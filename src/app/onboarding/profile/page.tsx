export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMemberProfileByEmail } from "@/lib/member-profile-db";
import ProfileOnboardingClient from "@/app/onboarding/profile/ProfileOnboardingClient";
import { sanitizePostAuthRedirect } from "@/lib/safe-redirect";

const PHONE_OTP_ENABLED = process.env.NEXT_PUBLIC_PHONE_OTP_ENABLED === "true";

export default async function ProfileOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const resolvedSearchParams = await searchParams;
  const next = sanitizePostAuthRedirect(resolvedSearchParams.next);
  const onboardingEntryPath = PHONE_OTP_ENABLED ? "/onboarding/phone" : "/onboarding/profile";

  if (!user) {
    redirect(
      `/login?callbackUrl=${encodeURIComponent(`${onboardingEntryPath}?next=${encodeURIComponent(next)}`)}`
    );
  }
  if (PHONE_OTP_ENABLED && !user.phone_confirmed_at) {
    redirect(`/onboarding/phone?next=${encodeURIComponent(next)}`);
  }

  try {
    const profile = await getMemberProfileByEmail(user.email!);
    if (profile.isComplete) {
      redirect(next);
    }
  } catch {
    // DB 오류 시 폼을 그대로 표시
  }

  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#F7F3EB]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#B98768] border-t-transparent" />
      </div>
    }>
      <ProfileOnboardingClient />
    </Suspense>
  );
}
