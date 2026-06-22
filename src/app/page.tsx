"use client";

import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import {
  Layers,
  Zap,
  ListChecks,
  Code2,
  Activity,
  MousePointerClick,
  ArrowRight,
  Sparkles,
} from "lucide-react";

const FEATURES = [
  {
    icon: <ListChecks className="w-5 h-5" />,
    title: "AI Test Cases",
    desc: "Paste a URL and get structured, prioritized test cases covering positive, negative, edge and security paths.",
  },
  {
    icon: <Code2 className="w-5 h-5" />,
    title: "Automation Scripts",
    desc: "Turn each case into ready-to-run Playwright, Cypress or Selenium scripts in your language of choice.",
  },
  {
    icon: <MousePointerClick className="w-5 h-5" />,
    title: "Selector Playground",
    desc: "Test CSS selectors against any live page and see exactly what they match before you ship.",
  },
  {
    icon: <Activity className="w-5 h-5" />,
    title: "Selector Monitor",
    desc: "Track your selectors over time and get alerted the moment a page change breaks them.",
  },
];

const STEPS = [
  { n: "01", title: "Paste a URL", desc: "Point TestGen at any page you want to test." },
  { n: "02", title: "Pick your AI", desc: "Bring your own key — OpenAI, Claude, Gemini, Groq and more." },
  { n: "03", title: "Generate", desc: "Get test cases and runnable scripts in seconds." },
];

export default function Landing() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Nav */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/70 border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold tracking-tight">TestGen Studio</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/app"
              className="px-3.5 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition"
            >
              Open app
            </Link>
            {session?.user ? (
              <Link
                href="/app"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition"
              >
                Dashboard
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => signIn("google", { callbackUrl: "/app" })}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-indigo-50/60 via-white to-white" />
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 -z-10 w-[600px] h-[600px] rounded-full bg-indigo-200/30 blur-3xl" />
        <div className="max-w-3xl mx-auto px-5 sm:px-8 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Bring your own AI key
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1]">
            Build smarter test cases and automation scripts with AI
          </h1>
          <p className="mt-5 text-lg text-slate-500 max-w-xl mx-auto">
            Paste a URL, choose your AI provider, and get structured test cases plus
            runnable automation scripts in seconds.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-sm"
            >
              <Zap className="w-4 h-4" />
              Try it free
            </Link>
            {!session?.user && (
              <button
                type="button"
                onClick={() => signIn("google", { callbackUrl: "/app" })}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:border-slate-300 transition"
              >
                Sign in with Google
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="mt-4 text-xs text-slate-400">
            No card required · Generate works without an account
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="p-5 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:shadow-sm transition bg-white"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                {f.icon}
              </div>
              <h3 className="font-semibold text-sm">{f.title}</h3>
              <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-5 sm:px-8 py-12">
        <h2 className="text-center text-2xl font-bold tracking-tight">How it works</h2>
        <div className="mt-10 grid sm:grid-cols-3 gap-8">
          {STEPS.map((s) => (
            <div key={s.n}>
              <div className="text-indigo-300 font-bold text-2xl">{s.n}</div>
              <h3 className="mt-2 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-5 sm:px-8 py-16">
        <div className="rounded-3xl bg-indigo-600 px-8 py-12 text-center text-white">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Start generating tests now</h2>
          <p className="mt-3 text-indigo-100 max-w-md mx-auto">
            Your API keys stay in your browser — we never store them.
          </p>
          <Link
            href="/app"
            className="mt-7 inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-indigo-700 bg-white hover:bg-indigo-50 transition"
          >
            <Zap className="w-4 h-4" />
            Open TestGen Studio
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>TestGen Studio</span>
          </div>
          <p>Built for QA engineers. Bring your own AI.</p>
        </div>
      </footer>
    </div>
  );
}
