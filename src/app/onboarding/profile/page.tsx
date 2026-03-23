import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileOnboardingClient from "@/app/onboarding/profile/ProfileOnboardingClient";

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
  const next = resolvedSearchParams.next ?? "/";
  const onboardingEntryPath = PHONE_OTP_ENABLED ? "/onboarding/phone" : "/onboarding/profile";
  if (!user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`${onboardingEntryPath}?next=${next}`)}`);
  }
  if (PHONE_OTP_ENABLED && !user.phone_confirmed_at) {
    redirect(`/onboarding/phone?next=${encodeURIComponent(next)}`);
  }

  return <ProfileOnboardingClient />;
}
