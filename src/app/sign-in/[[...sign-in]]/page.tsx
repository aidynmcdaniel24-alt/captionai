import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 px-6">
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" fallbackRedirectUrl="/dashboard" />
      <p className="text-center text-sm text-zinc-300">
        Forgot password? Click the <span className="font-medium text-white">Forgot password?</span> link inside the sign-in form.
      </p>
      <Link className="text-sm text-purple-300 hover:text-purple-200" href="/sign-in">
        Open sign-in form
      </Link>
    </main>
  );
}
