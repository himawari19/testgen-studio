"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { LogOut, LogIn } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export default function UserMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (status === "loading") {
    return <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />;
  }

  if (!session?.user) {
    return (
      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: "/app" })}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition"
      >
        <LogIn className="w-4 h-4" />
        Sign in
      </button>
    );
  }

  const { name, email, image } = session.user;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full hover:ring-2 hover:ring-indigo-200 transition"
        aria-label="User menu"
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={name || "User"} className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-semibold">
            {(name || email || "?").charAt(0).toUpperCase()}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50 p-1.5">
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{name}</p>
            <p className="text-xs text-slate-500 truncate">{email}</p>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full flex items-center gap-2 px-3 py-2 mt-1 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
