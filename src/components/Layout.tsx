import Link from "next/link";
import { useRouter } from "next/router";
import { UserButton } from "@clerk/nextjs";
import { usePreferences } from "@/context/PreferencesContext";

type Props = { children: React.ReactNode };

export default function Layout({ children }: Props) {
  const { theme, toggleTheme } = usePreferences();
  const router = useRouter();

  const isActive = (href: string) => router.pathname === href;

  const linkClass = (href: string) =>
    `px-3 py-2 rounded-md text-sm font-medium transition ${
      isActive(href)
        ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
        : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
    }`;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <header className="border-b bg-white dark:bg-gray-900 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-bold">Budget Planner</span>

            <nav className="hidden sm:flex items-center gap-2">
              <Link className={linkClass("/")} href="/">
                Dashboard
              </Link>
              <Link className={linkClass("/transactions")} href="/transactions">
                Transactions
              </Link>
              <Link className={linkClass("/settings")} href="/settings">
                Settings
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="rounded-md border px-3 py-2 text-sm transition hover:bg-gray-50 dark:hover:bg-gray-800 dark:border-gray-700"
              type="button"
              title="Toggle theme"
            >
              {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
            </button>

            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </div>

        {/* Mobile nav */}
        <div className="sm:hidden border-t dark:border-gray-800">
          <div className="max-w-6xl mx-auto px-4 py-2 flex gap-2">
            <Link className={linkClass("/")} href="/">
              Dashboard
            </Link>
            <Link className={linkClass("/transactions")} href="/transactions">
              Transactions
            </Link>
            <Link className={linkClass("/settings")} href="/settings">
              Settings
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
