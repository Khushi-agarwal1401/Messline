import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found | Messline",
};

export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24 text-center">
      <p className="text-6xl font-bold text-neutral-200">404</p>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm leading-6 text-neutral-700">
        The page you are looking for does not exist.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
      >
        Back to home
      </Link>
    </main>
  );
}
