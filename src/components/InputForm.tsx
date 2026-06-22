"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { GenerateResponse } from "@/types";
import { getApiKey } from "@/lib/keys";
import { Send, Globe, MessageSquare, Loader2, Lock, ChevronDown, Code2, Zap, Plus, X } from "lucide-react";

const API_URL = "";
const GUEST_LIMIT = 5;
const GUEST_COUNT_KEY = "testgen_guest_generations";

interface AuthConfig {
  auth_type: string | null;
  username?: string;
  password?: string;
  token?: string;
  cookies?: Record<string, string>;
  login_url?: string;
  form_fields?: Record<string, string>;
}

interface InputFormProps {
  onResults: (results: GenerateResponse) => void;
  onLoading: (loading: boolean) => void;
  onStatus: (status: string, step?: string) => void;
  onError: (error: string) => void;
  aiProvider: string;
  aiModel: string;
  prefillUrl?: string;
  prefillContext?: string;
  onPrefillConsumed?: () => void;
}

const getAvailableLanguages = (fw: string) => {
  switch (fw) {
    case "cypress":
      return [
        { id: "javascript", label: "JavaScript" },
        { id: "typescript", label: "TypeScript" },
      ];
    case "selenium":
      return [
        { id: "python", label: "Python" },
        { id: "java", label: "Java" },
        { id: "javascript", label: "JavaScript" },
        { id: "csharp", label: "C#" },
      ];
    case "playwright":
    default:
      return [
        { id: "typescript", label: "TypeScript" },
        { id: "javascript", label: "JavaScript" },
        { id: "python", label: "Python" },
      ];
  }
};

function ensureProtocol(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export default function InputForm({
  onResults,
  onLoading,
  onStatus,
  onError,
  aiProvider,
  aiModel,
  prefillUrl,
  prefillContext,
  onPrefillConsumed,
}: InputFormProps) {
  const [url, setUrl] = useState("");
  const [extraUrls, setExtraUrls] = useState<string[]>([]);
  const [userContext, setUserContext] = useState("");
  const [urlError, setUrlError] = useState("");
  const [contextError, setContextError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authType, setAuthType] = useState<string>("none");
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [authCookies, setAuthCookies] = useState("");
  const [authLoginUrl, setAuthLoginUrl] = useState("");
  const [authFormFields, setAuthFormFields] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const { status: sessionStatus } = useSession();
  const isAuthed = sessionStatus === "authenticated";
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);

  // Framework & Language State
  const [framework, setFramework] = useState("playwright");
  const [language, setLanguage] = useState("typescript");
  const [fastMode, setFastMode] = useState(false);
  const [generationMode, setGenerationMode] = useState<'quick' | 'standard' | 'thorough'>('quick');
  const [outputMode, setOutputMode] = useState<'both' | 'cases' | 'scripts'>('both');

  const MODES = [
    { id: 'quick',     label: 'Quick',    sub: '~10 tests',  title: 'Essential coverage - fast results' },
    { id: 'standard',  label: 'Standard', sub: '~30 tests',  title: 'Balanced coverage for most flows' },
    { id: 'thorough',  label: 'Thorough', sub: '~50 tests',  title: 'Deep coverage - all edge cases' },
  ] as const;

  const OUTPUT_MODES = [
    { id: 'cases',   label: 'Cases Only',      sub: 'Planning only',    title: 'Only generate test case scenarios - no scripts (fastest)' },
    { id: 'scripts', label: 'Scripts Only',    sub: 'Code only',        title: 'Generate scripts only - test case table hidden' },
    { id: 'both',    label: 'Cases + Scripts', sub: 'Full output',      title: 'Generate test cases and automation scripts' },
  ] as const;

  const handleFrameworkChange = (fw: string) => {
    setFramework(fw);
    const available = getAvailableLanguages(fw);
    if (!available.some((l) => l.id === language)) {
      setLanguage(available[0].id);
    }
  };

  // Handle prefill from history re-run
  useEffect(() => {
    if (prefillUrl) {
      setUrl(prefillUrl);
      setUrlError("");
    }
    if (prefillContext) {
      setUserContext(prefillContext);
      setContextError("");
    }
    if ((prefillUrl || prefillContext) && onPrefillConsumed) {
      onPrefillConsumed();
    }
  }, [prefillUrl, prefillContext, onPrefillConsumed]);

  const validateUrl = (value: string): boolean => {
    if (!value.trim()) {
      setUrlError("URL is required");
      return false;
    }
    const withProtocol = ensureProtocol(value);
    if (withProtocol !== value) {
      setUrl(withProtocol);
    }
    setUrlError("");
    return true;
  };

  const validateContext = (_value: string): boolean => {
    setContextError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onError("");

    const isUrlValid = validateUrl(url);
    const isContextValid = validateContext(userContext);

    if (!isUrlValid || !isContextValid) return;

    // Validate that AI provider and model are explicitly selected in AI Settings
    if (!aiProvider || !aiModel) {
      onError("Please select your AI Provider and Model from 'AI Settings' (top-right) first.");
      return;
    }

    // ponytail: guests get GUEST_LIMIT free generations tracked in localStorage; then sign-in is forced
    if (!isAuthed) {
      const used = parseInt(localStorage.getItem(GUEST_COUNT_KEY) || "0", 10);
      if (used >= GUEST_LIMIT) {
        setShowSignInPrompt(true);
        return;
      }
    }

    setIsSubmitting(true);
    onLoading(true);

    // Build auth config
    let auth: AuthConfig | null = null;
    if (authType !== "none") {
      auth = { auth_type: authType };
      if (authType === "basic") {
        auth.username = authUsername;
        auth.password = authPassword;
      } else if (authType === "bearer") {
        auth.token = authToken;
      } else if (authType === "cookie") {
        try {
          const pairs = authCookies.split(";").reduce((acc, pair) => {
            const [k, v] = pair.split("=").map((s) => s.trim());
            if (k && v) acc[k] = v;
            return acc;
          }, {} as Record<string, string>);
          auth.cookies = pairs;
        } catch {
          auth.cookies = {};
        }
      } else if (authType === "form") {
        auth.login_url = authLoginUrl;
        try {
          const fields = authFormFields.split("\n").reduce((acc, line) => {
            const [selector, value] = line.split("=").map((s) => s.trim());
            if (selector && value) acc[selector] = value;
            return acc;
          }, {} as Record<string, string>);
          auth.form_fields = fields;
        } catch {
          auth.form_fields = {};
        }
      }
    }

    // Use SSE streaming endpoint
    const abortController = new AbortController();
    abortRef.current = abortController;

    // Load custom prompt from settings
    let customPrompt = "";
    try {
      const saved = localStorage.getItem("selectorhub_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        customPrompt = parsed.customPrompt || "";
      }
    } catch {
      // ignore
    }

    const finalContext = customPrompt
      ? `${userContext.trim()}\n\nAdditional instructions: ${customPrompt}`
      : userContext.trim();

    const allUrls = [ensureProtocol(url), ...extraUrls.map(ensureProtocol)].filter(Boolean);

    const streamGenerate = async (singleUrl: string): Promise<boolean> => {
      const routerPublic = aiProvider === '9router-public'
        ? JSON.parse(localStorage.getItem('9router_public') || '{}')
        : {};
      const response = await fetch(`${API_URL}/api/generate/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: singleUrl,
          user_context: finalContext,
          ai_provider: aiProvider,
          ai_model: aiModel,
          api_key: getApiKey(aiProvider),
          framework,
          language,
          fast_mode: fastMode,
          generation_mode: generationMode,
          output_mode: outputMode,
          nine_router_public_url: routerPublic.url || '',
          nine_router_public_key: routerPublic.key || '',
          ...(auth ? { auth } : {}),
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ detail: "Request failed" }));
        throw new Error(errData.detail || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.step === "error") { onError(event.message); return false; }
            if (event.step === "complete") { onResults(event.result); return true; }
            onStatus(event.message, event.step);
          } catch { /* skip malformed */ }
        }
      }
      return false;
    };

    try {
      for (let i = 0; i < allUrls.length; i++) {
        if (allUrls.length > 1) onStatus(`Processing URL ${i + 1}/${allUrls.length}...`, "analyzing");
        const ok = await streamGenerate(allUrls[i]);
        if (!ok) break;
        // count each successful guest generation toward the free limit
        if (!isAuthed) {
          const used = parseInt(localStorage.getItem(GUEST_COUNT_KEY) || "0", 10) + 1;
          localStorage.setItem(GUEST_COUNT_KEY, String(used));
        }
      }
      onStatus("Generation complete!", "complete");
    } catch (err: any) {
      if (err.name === "AbortError") return;
      onError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      onLoading(false);
      setIsSubmitting(false);
      abortRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    onLoading(false);
    setIsSubmitting(false);
    onStatus("");
  };

  return (
    <form onSubmit={handleSubmit} className="card p-4 sm:p-6">
      {showSignInPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-7 max-w-sm w-full shadow-2xl text-center relative">
            <button
              type="button"
              onClick={() => setShowSignInPrompt(false)}
              className="absolute top-3 right-3 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
            <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mb-4">
              <Lock className="w-7 h-7 text-indigo-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              You&apos;ve used your {GUEST_LIMIT} free generations
            </h3>
            <p className="text-sm text-slate-500 mt-1.5 mb-5">
              Sign in with Google to keep generating, save your history, and sync across devices.
            </p>
            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl: "/app" })}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
              </svg>
              Sign in with Google
            </button>
          </div>
        </div>
      )}
      <div className="grid gap-4 sm:gap-5">
        {/* URL Input */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
            <Globe className="w-4 h-4 text-slate-400" />
            Target URL
            {extraUrls.length > 0 && (
              <span className="text-xs text-indigo-600 font-normal">({1 + extraUrls.length} URLs)</span>
            )}
          </label>
          <div className="flex gap-2">
            <input
              id="url"
              type="text"
              value={url}
              onChange={(e) => { setUrl(e.target.value); if (urlError) validateUrl(e.target.value); }}
              placeholder="https://example.com/login"
              className={`input-field flex-1 ${urlError ? "input-error" : ""}`}
              disabled={isSubmitting}
            />
            <button
              type="button"
              onClick={() => setExtraUrls(prev => [...prev, ""])}
              disabled={isSubmitting}
              className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition flex items-center gap-1"
              title="Add another URL"
            >
              <Plus className="w-3.5 h-3.5" /> Add URL
            </button>
          </div>
          {urlError && <p className="mt-1.5 text-xs text-red-500">{urlError}</p>}
          {extraUrls.map((u, i) => (
            <div key={i} className="flex gap-2 mt-2">
              <input
                type="text"
                value={u}
                onChange={e => setExtraUrls(prev => prev.map((x, j) => j === i ? e.target.value : x))}
                placeholder={`https://example.com/page-${i + 2}`}
                className="input-field flex-1"
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setExtraUrls(prev => prev.filter((_, j) => j !== i))}
                className="px-3 py-2 text-slate-400 hover:text-red-500 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* User Context Textarea */}
        <div>
          <label htmlFor="userContext" className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
            <MessageSquare className="w-4 h-4 text-slate-400" />
            Test Context
          </label>
          <textarea
            id="userContext"
            rows={4}
            value={userContext}
            onChange={(e) => {
              setUserContext(e.target.value);
              if (contextError) validateContext(e.target.value);
            }}
            placeholder={"Describe what you want to test. Example:\nTest the login flow with valid email and password. Also cover empty fields, wrong password, and locked-out user scenarios."}
            className={`input-field resize-y ${contextError ? "input-error" : ""}`}
            disabled={isSubmitting}
          />
          {contextError && <p className="mt-1.5 text-xs text-red-500">{contextError}</p>}
          <p className="mt-1.5 text-xs text-slate-400">
            The more specific your description, the better the generated test cases.
          </p>
        </div>
      </div>

      {/* Output Mode */}
      <div className="mt-4">
        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wider">
          <Code2 className="w-3.5 h-3.5 text-indigo-500" />
          Generate Output
        </label>
        <div className="flex gap-2">
          {OUTPUT_MODES.map(m => (
            <button
              key={m.id}
              type="button"
              title={m.title}
              disabled={isSubmitting}
              onClick={() => setOutputMode(m.id)}
              className={`flex-1 flex flex-col items-center py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                outputMode === m.id
                  ? 'bg-indigo-50 border-indigo-400 text-indigo-700 shadow-sm shadow-indigo-100'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              <span>{m.label}</span>
              <span className={`text-[10px] font-normal mt-0.5 ${outputMode === m.id ? 'text-indigo-400' : 'text-slate-400'}`}>{m.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Framework & Language — only when scripts are involved */}
      {outputMode !== 'cases' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
          <div>
            <label htmlFor="framework-select" className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wider">
              <Code2 className="w-3.5 h-3.5 text-indigo-500" />
              Target Framework
            </label>
            <select
              id="framework-select"
              value={framework}
              onChange={(e) => handleFrameworkChange(e.target.value)}
              disabled={isSubmitting}
              className="input-field text-sm py-2 font-medium bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            >
              <option value="playwright">Playwright</option>
              <option value="cypress">Cypress</option>
              <option value="selenium">Selenium</option>
            </select>
          </div>
          <div>
            <label htmlFor="language-select" className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wider">
              <Code2 className="w-3.5 h-3.5 text-indigo-500" />
              Programming Language
            </label>
            <select
              id="language-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={isSubmitting}
              className="input-field text-sm py-2 font-medium bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            >
              {getAvailableLanguages(framework).map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Generation Mode */}
      <div className="mt-4">
        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wider">
          <Zap className="w-3.5 h-3.5 text-indigo-500" />
          Coverage Depth
        </label>
        <div className="flex gap-2">
          {MODES.map(m => (
            <button
              key={m.id}
              type="button"
              title={m.title}
              disabled={isSubmitting}
              onClick={() => setGenerationMode(m.id)}
              className={`flex-1 flex flex-col items-center py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                generationMode === m.id
                  ? 'bg-indigo-50 border-indigo-400 text-indigo-700 shadow-sm shadow-indigo-100'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              <span>{m.label}</span>
              <span className={`text-[10px] font-normal mt-0.5 ${generationMode === m.id ? 'text-indigo-400' : 'text-slate-400'}`}>{m.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Auth Section (Collapsible) */}
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setShowAuth(!showAuth)}
          className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-700 transition"
        >
          <Lock className="w-3.5 h-3.5" />
          Authentication (optional)
          <ChevronDown className={`w-3 h-3 transition-transform ${showAuth ? "rotate-180" : ""}`} />
        </button>

        {showAuth && (
          <div className="mt-3 p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
            <div>
              <label htmlFor="auth-type" className="text-xs font-medium text-slate-600 block mb-1.5">Auth Type</label>
              <select
                id="auth-type"
                value={authType}
                onChange={(e) => setAuthType(e.target.value)}
                className="input-field text-sm py-2"
                disabled={isSubmitting}
                aria-label="Authentication type"
              >
                <option value="none">None</option>
                <option value="basic">Basic Auth (username/password)</option>
                <option value="bearer">Bearer Token</option>
                <option value="cookie">Cookie</option>
                <option value="form">Form Login</option>
              </select>
            </div>

            {authType === "basic" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Username</label>
                  <input
                    type="text"
                    value={authUsername}
                    onChange={(e) => setAuthUsername(e.target.value)}
                    className="input-field text-sm py-2"
                    placeholder="username"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Password</label>
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="input-field text-sm py-2"
                    placeholder="password"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            )}

            {authType === "bearer" && (
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Token</label>
                <input
                  type="password"
                  value={authToken}
                  onChange={(e) => setAuthToken(e.target.value)}
                  className="input-field text-sm py-2 font-mono"
                  placeholder="eyJhbGciOiJIUzI1NiIs..."
                  disabled={isSubmitting}
                />
              </div>
            )}

            {authType === "cookie" && (
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  Cookies (name=value; name2=value2)
                </label>
                <input
                  type="text"
                  value={authCookies}
                  onChange={(e) => setAuthCookies(e.target.value)}
                  className="input-field text-sm py-2 font-mono"
                  placeholder="session_id=abc123; token=xyz"
                  disabled={isSubmitting}
                />
              </div>
            )}

            {authType === "form" && (
              <>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Login URL</label>
                  <input
                    type="text"
                    value={authLoginUrl}
                    onChange={(e) => setAuthLoginUrl(e.target.value)}
                    className="input-field text-sm py-2"
                    placeholder="https://example.com/login"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">
                    Form Fields (selector=value, one per line)
                  </label>
                  <textarea
                    rows={3}
                    value={authFormFields}
                    onChange={(e) => setAuthFormFields(e.target.value)}
                    className="input-field text-sm py-2 font-mono resize-y"
                    placeholder={"#username=admin\n#password=secret123"}
                    disabled={isSubmitting}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        {/* Fast Mode Toggle */}
        <button
          type="button"
          id="fast-mode-toggle"
          onClick={() => setFastMode(v => !v)}
          disabled={isSubmitting}
          title="Fast Mode: uses a lighter model for Stage 1 (faster, slightly less accurate)"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
            fastMode
              ? 'bg-amber-50 border-amber-300 text-amber-700 shadow-sm shadow-amber-200'
              : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
          }`}
        >
          <Zap className={`w-3.5 h-3.5 ${fastMode ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
          {fastMode ? 'Fast Mode ON' : 'Fast Mode'}
        </button>

        <div className="flex items-center gap-2">
          {isSubmitting && (
            <button
              type="button"
              onClick={handleCancel}
              className="btn-ghost text-xs text-red-500 hover:text-red-700"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center disabled:opacity-60"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {isSubmitting ? "Generating..." : "Generate"}
          </button>
        </div>
      </div>
    </form>
  );
}
