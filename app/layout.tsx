import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "./actions";
import "./globals.css";

export const metadata: Metadata = {
  title: "Messline",
  description: "Mess food booking. Plates go down when someone books.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <header className="border-b border-neutral-200 bg-white">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
            <Link href="/" className="font-semibold">
              Messline
            </Link>
            <div className="flex items-center gap-3 text-sm">
              {user ? (
                <>
                  <span>
                    Signed in as {user.name} ({user.role.toLowerCase()})
                  </span>
                  {user.role === "STUDENT" && (
                    <>
                      <Link href="/bookings" className="underline">
                        My bookings
                      </Link>
                      <Link href="/complaints" className="underline">
                        Complaints
                      </Link>
                    </>
                  )}
                  {user.role === "KITCHEN" && (
                    <>
                      <Link href="/kitchen" className="underline">
                        Kitchen
                      </Link>
                      <Link href="/kitchen/bookings" className="underline">
                        Bookings
                      </Link>
                    </>
                  )}
                  {user.role === "SECRETARY" && (
                    <Link href="/secretary/complaints" className="underline">
                      Complaints
                    </Link>
                  )}
                  <form action={signOut}>
                    <button type="submit" className="underline">
                      Sign out
                    </button>
                  </form>
                </>
              ) : (
                <Link href="/login" className="underline">
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </header>
        <div className="flex-1">{children}</div>
        <footer className="mt-auto border-t border-neutral-200 py-4 text-xs text-neutral-500">
          <div className="mx-auto flex max-w-3xl items-center gap-4 px-6">
            <a
              href="https://github.com/sanjana2505006/Messline"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              GitHub
            </a>
            <a
              href="https://github.com/sanjana2505006/Messline/blob/main/docs/rules.md"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              Rules
            </a>
            <a
              href="https://github.com/sanjana2505006/Messline/blob/main/CONTRIBUTING.md"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              Contributing
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
