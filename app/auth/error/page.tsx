import Link from "next/link";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function AuthErrorPage({ searchParams }: Props) {
  const { error } = await searchParams;
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="soul-card p-8 max-w-md rounded-2xl text-center">
        <h1 className="text-xl font-semibold text-soul-primary-text mb-2">
          Sign-in issue
        </h1>
        <p className="text-soul-primary-text/80 mb-4">
          {error === "Configuration"
            ? "Server auth is misconfigured. Please try again later."
            : "Something went wrong. Please try again."}
        </p>
        <Link
          href="/auth/signin"
          className="soul-btn-primary inline-block px-6 py-3 rounded-2xl font-medium"
        >
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
