import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileOnboardingClient from "@/app/onboarding/profile/ProfileOnboardingClient";

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
  if (!user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/onboarding/phone?next=${next}`)}`);
  }
  if (!user.phone_confirmed_at) {
    redirect(`/onboarding/phone?next=${encodeURIComponent(next)}`);
  }

  return <ProfileOnboardingClient />;
}
