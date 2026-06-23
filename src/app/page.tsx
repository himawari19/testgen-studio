"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession } from "next-auth/react";
import {
  Layers,
  Zap,
  ListChecks,
  Code2,
  Activity,
  MousePointerClick,
  Check,
  ArrowRight,
  FileSpreadsheet,
} from "lucide-react";

function GoogleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

const FEATURES = [
  {
    icon: <ListChecks className="w-5 h-5" />,
    title: "AI Test Cases",
    desc: "Crawl any page and get structured, prioritized test cases.",
    points: ["Positive, negative, edge & security paths", "Priority & type auto-assigned", "Clean markdown table you can export"],
  },
  {
    icon: <Code2 className="w-5 h-5" />,
    title: "Automation Scripts",
    desc: "Turn each case into ready-to-run automation code.",
    points: ["Playwright, Cypress & Selenium", "TypeScript, Python, Java & more", "Download all as a ZIP"],
  },
  {
    icon: <MousePointerClick className="w-5 h-5" />,
    title: "Selector Playground",
    desc: "Validate CSS selectors against a live page.",
    points: ["See exactly what matches", "Catch fragile selectors early", "No setup required"],
  },
  {
    icon: <Activity className="w-5 h-5" />,
    title: "Selector Monitor",
    desc: "Track selectors over time as pages change.",
    points: ["Healthy / warning / broken status", "Snapshot history per URL", "Know before your tests do"],
  },
];

const STEPS = [
  { n: "01", title: "Paste a URL", desc: "Point TestGen at any page you want to test - login forms, dashboards, checkout flows." },
  { n: "02", title: "Bring your AI key", desc: "Pick OpenAI, Claude, Gemini, Groq, DeepSeek and more. Your key stays in your browser." },
  { n: "03", title: "Generate & export", desc: "Get test cases and runnable scripts in seconds. Copy, download, or run them." },
];

const CODE_SAMPLES = [
  {
    label: "Playwright",
    file: "login.spec.ts",
    code: `import { test, expect } from "@playwright/test";

test("valid login redirects to dashboard", async ({ page }) => {
  await page.goto("https://example.com/login");
  await page.fill("#email", "user@test.com");
  await page.fill("#password", "correct-horse");
  await page.click("button[type=submit]");
  await expect(page).toHaveURL(/dashboard/);
});`,
  },
  {
    label: "Cypress",
    file: "checkout.cy.js",
    code: `describe("checkout flow", () => {
  it("shows payment confirmation", () => {
    cy.visit("https://example.com/cart");
    cy.contains("Checkout").click();
    cy.get("#card-number").type("4242424242424242");
    cy.contains("Pay now").click();
    cy.contains("Payment successful").should("be.visible");
  });
});`,
  },
  {
    label: "Selenium",
    file: "search_test.py",
    code: `from selenium import webdriver
from selenium.webdriver.common.by import By

driver = webdriver.Chrome()
driver.get("https://example.com")
driver.find_element(By.NAME, "q").send_keys("pricing")
driver.find_element(By.CSS_SELECTOR, "button[type=submit]").click()
assert "pricing" in driver.current_url
driver.quit()`,
  },
];

const EXCEL_ROWS = [
  ["1", "LOG-001", "Valid Login Redirects", "POSITIVE", "Browser is open, app is accessible", "Open login page; fill email/password; click submit", "Dashboard page is shown", "-", "-", "CRITICAL", "-"],
  ["2", "LOG-002", "Reject Wrong Password", "NEGATIVE", "Browser is open, app is accessible", "Open login page; fill wrong password; click submit", "Invalid credential message is visible", "-", "-", "HIGH", "-"],
  ["3", "LOG-003", "Empty Email Validation", "BOUNDARY", "Browser is open, app is accessible", "Leave email empty; fill password; click submit", "Email required validation is shown", "-", "-", "MEDIUM", "-"],
];

const PROVIDERS = [
  { name: "OpenAI", icon: "/logos/openai.svg" },
  { name: "Claude", icon: "/logos/claude.svg" },
  { name: "Gemini", icon: "/logos/gemini.svg" },
  { name: "Groq", icon: "/logos/groq.png", iconBg: "bg-[#f43d00]" },
  { name: "DeepSeek", icon: "/logos/deepseek.svg" },
  { name: "Moonshot", icon: "/logos/moonshot.svg" },
  { name: "Qwen", icon: "/logos/qwen.svg" },
  { name: "9Router", icon: "/logos/9router.svg", iconBg: "bg-[#f97316]" },
];

const FAQ = [
  {
    q: "Do I need to pay for anything?",
    a: "No. Generate 5 test suites free without an account. Sign in with Google for unlimited generations and saved history. You bring your own AI provider key, so you only pay your AI provider directly.",
  },
  {
    q: "Where are my API keys stored?",
    a: "In your browser's local storage only. Keys are forwarded per request to your chosen AI provider and never saved on our servers.",
  },
  {
    q: "Which frameworks and languages are supported?",
    a: "Playwright, Cypress and Selenium across TypeScript, JavaScript, Python and Java - pick the combo you actually use.",
  },
  {
    q: "Does it work on JavaScript-heavy sites?",
    a: "It reads server-rendered HTML, so static and SSR pages work best. Single-page apps that render everything client-side may expose fewer elements.",
  },
];

export default function Landing() {
  const [sample, setSample] = useState(0);
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Nav */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/80 border-b border-slate-100">
        <div className="max-w-none px-5 sm:px-8 lg:px-10 h-16 grid grid-cols-[1fr_auto_1fr] items-center">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold tracking-tight">TestGen Studio</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition">Features</a>
            <a href="#how" className="hover:text-slate-900 transition">How it works</a>
            <a href="#faq" className="hover:text-slate-900 transition">FAQ</a>
          </nav>
          <div />
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-indigo-50/70 via-white to-white" />
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 -z-10 w-[680px] h-[680px] rounded-full bg-indigo-200/30 blur-3xl" />
        <div className="max-w-none px-5 sm:px-8 lg:px-10 pt-10 sm:pt-12 pb-14 text-center">
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-[1.05]">
            Test cases & automation
            <br className="hidden sm:block" />
            scripts, <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">generated by AI</span>
          </h1>
          <p className="mt-5 text-lg text-slate-500 max-w-2xl mx-auto">
            Paste a URL, choose your AI provider, and get structured test cases plus
            runnable Playwright, Cypress or Selenium scripts - in seconds.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-sm shadow-indigo-600/20"
            >
              <Zap className="w-4 h-4" />
              {session ? "Go to App" : "Try it free"}
            </Link>
            {!session && (
              <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:border-slate-300 transition">
                <GoogleIcon />
                Sign in with Google
              </Link>
            )}
          </div>
          <p className="mt-4 text-xs text-slate-400">
            No card required - Generate works without an account
          </p>

          {/* Hero mockups */}
          <div className="mt-12 grid lg:grid-cols-[0.9fr_1.5fr] gap-5 w-full text-left items-stretch">
            <div className="rounded-2xl border border-slate-200 bg-slate-900 shadow-2xl shadow-indigo-900/10 overflow-hidden">
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-slate-700/60">
                <span className="w-3 h-3 rounded-full bg-red-400/80" />
                <span className="w-3 h-3 rounded-full bg-amber-400/80" />
                <span className="w-3 h-3 rounded-full bg-emerald-400/80" />
                <span className="ml-3 text-xs text-slate-400 font-mono">{CODE_SAMPLES[sample].file}</span>
              </div>
              <div className="flex gap-2 px-4 pt-4">
                {CODE_SAMPLES.map((item, index) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setSample(index)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${sample === index ? "bg-indigo-500 text-white" : "bg-slate-800 text-slate-400 hover:text-slate-200"}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <pre className="px-5 py-4 min-h-[320px] text-[12.5px] leading-relaxed font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap">
                {CODE_SAMPLES[sample].code}
              </pre>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-indigo-900/10 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">test-cases.xlsx</p>
                    <p className="text-xs text-slate-400">Generated test case table</p>
                  </div>
                </div>
                <span className="text-[11px] px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">XLSX</span>
              </div>
              <div className="p-4 overflow-x-auto min-h-[320px]">
                <table className="min-w-[1100px] w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500">
                      {["#", "Test Case ID", "Test Case Name", "Type", "Pre Condition", "Test Steps", "Expected Result", "Actual Result", "Status", "Priority", "Evidence"].map((h) => (
                        <th key={h} className="border border-slate-200 px-2 py-2 text-left font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {EXCEL_ROWS.map((row) => (
                      <tr key={row[0]} className="text-slate-700">
                        {row.map((cell, index) => (
                          <td key={`${row[0]}-${cell}`} className={`border border-slate-200 px-2 py-2 ${index === 9 ? "font-medium text-red-600" : ""}`}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Providers strip */}
          <div className="mt-12">
            <p className="text-xs uppercase tracking-wider text-slate-400 mb-4">Works with your favourite models</p>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              {PROVIDERS.map((p) => (
                <span key={p.name} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-sm text-slate-600">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center ${p.iconBg || "bg-slate-50"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.icon} alt="" className="w-3.5 h-3.5 object-contain" loading="lazy" />
                  </span>
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-none px-5 sm:px-8 lg:px-10 py-16 scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl font-bold tracking-tight">Everything you need to ship tests faster</h2>
          <p className="mt-3 text-slate-500">From discovery to runnable code, in one place.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-5 max-w-6xl mx-auto">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-lg transition bg-white"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-lg">{f.title}</h3>
              </div>
              <p className="text-sm text-slate-500 mb-4">{f.desc}</p>
              <ul className="space-y-2">
                {f.points.map((pt) => (
                  <li key={pt} className="flex items-start gap-2 text-sm text-slate-600">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-slate-50 border-y border-slate-100 scroll-mt-20">
        <div className="max-w-none px-5 sm:px-8 lg:px-10 py-16">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold tracking-tight">How it works</h2>
            <p className="mt-3 text-slate-500">Three steps from URL to a working test suite.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {STEPS.map((s) => (
              <div key={s.n} className="relative">
                <div className="text-5xl font-bold text-indigo-100">{s.n}</div>
                <h3 className="mt-2 font-semibold text-lg">{s.title}</h3>
                <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-5 sm:px-8 py-16 scroll-mt-20">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold tracking-tight">Frequently asked questions</h2>
        </div>
        <div className="space-y-3">
          {FAQ.map((item) => (
            <details key={item.q} className="group rounded-xl border border-slate-200 bg-white p-5 open:shadow-sm">
              <summary className="flex items-center justify-between cursor-pointer list-none font-medium text-slate-800">
                {item.q}
                <ArrowRight className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-90" />
              </summary>
              <p className="mt-3 text-sm text-slate-500 leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100">
        <div className="max-w-none px-5 sm:px-8 lg:px-10 py-6 text-center text-sm text-slate-400">
          Powered @akusaraproject
        </div>
      </footer>
    </div>
  );
}
