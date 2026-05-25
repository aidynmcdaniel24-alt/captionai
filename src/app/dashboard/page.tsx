import { auth } from "@clerk/nextjs/server";
import { DashboardPageClient } from "@/components/dashboard/DashboardPageClient";
import { ensureWelcomeEmail } from "@/lib/welcome-email";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (userId) {
    // Fire-and-forget: don't block the dashboard render on SMTP.
    void ensureWelcomeEmail(userId);
  }
  return <DashboardPageClient />;
}
