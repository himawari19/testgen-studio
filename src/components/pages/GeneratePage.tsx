"use client";

import { useState, useEffect } from "react";
import InputForm from "@/components/InputForm";
import ResultsDisplay from "@/components/ResultsDisplay";
import { GenerateResponse } from "@/types";
import { Globe, FileCode2, Zap, Layers, RotateCcw } from "lucide-react";

interface GeneratePageProps {
  aiProvider: string;
  aiModel: string;
  prefillUrl?: string;
  prefillContext?: string;
  onPrefillConsumed?: () => void;
}

export default function GeneratePage({
  aiProvider,
  aiModel,
  prefillUrl,
  prefillContext,
  onPrefillConsumed,
}: GeneratePageProps) {
  const [allResults, setAllResults] = useState<GenerateResponse[]>([]);
  const [activeResultTab, setActiveResultTab] = useState(0);
  const [results, setResults] = useState<GenerateResponse | null>(null);
  const [pendingResults, setPendingResults] = useState<GenerateResponse | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [step, setStep] = useState("");
  const [error, setError] = useState("");
  // Consume prefill and clear results when re-running from history
  useEffect(() => {
    if (prefillUrl || prefillContext) {
      setResults(null);
      setPendingResults(null);
      setShowSuccessModal(false);
      setError("");
    }
  }, [prefillUrl, prefillContext]);

  // ponytail: smooth scroll to the results section after user commits
  useEffect(() => {
    if (results) {
      const timer = setTimeout(() => {
        const element = document.getElementById("generation-results");
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [results]);

  const handleNewGeneration = () => {
    setResults(null);
    setAllResults([]);
    setActiveResultTab(0);
    setPendingResults(null);
    setShowSuccessModal(false);
    setError("");
    setStatus("");
    setStep("");
  };

  const handleResults = (data: GenerateResponse) => {
    setPendingResults(data);
    setShowSuccessModal(true);
  };

  const confirmResult = () => {
    if (!pendingResults) return;
    setAllResults(prev => {
      const next = [...prev, pendingResults];
      setActiveResultTab(next.length - 1);
      return next;
    });
    setResults(pendingResults);
    setShowSuccessModal(false);
  };

  // ponytail: Modal progress utilities to translate explicit step name to timeline states
  const getProgressPercent = (currentStep: string): string => {
    switch (currentStep) {
      case "crawling": return "25%";
      case "crawled": return "45%";
      case "analyzing": return "70%";
      case "analyzed": return "85%";
      case "formatting": return "95%";
      case "complete": return "100%";
      default: return "15%";
    }
  };

  const STEP_ORDER = ["crawling","crawled","analyzing","analyzed","formatting","complete"];
  const STEP_DONE_AT: Record<string, number> = { crawling: 1, analyzing: 3, formatting: 5 };
  const isStepActive = (s: string, cur: string) => s === cur;
  const isStepDone = (s: string, cur: string) => (STEP_ORDER.indexOf(cur) ?? -1) >= (STEP_DONE_AT[s] ?? 99);

  const renderTimelineStep = (label: string, isActive: boolean, isDone: boolean) => {
    let bulletColor = "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500";
    let textColor = "text-slate-400 dark:text-slate-500";
    
    if (isDone) {
      bulletColor = "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20";
      textColor = "text-slate-700 dark:text-slate-300 font-medium";
    } else if (isActive) {
      bulletColor = "bg-indigo-600 animate-pulse text-white shadow-sm shadow-indigo-600/20";
      textColor = "text-indigo-600 dark:text-indigo-400 font-semibold";
    }

    return (
      <div className="flex items-center gap-3">
        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${bulletColor} transition-all duration-300`}>
          {isDone ? "✓" : isActive ? "●" : ""}
        </div>
        <span className={`text-xs ${textColor} transition-all duration-300`}>{label}</span>
      </div>
    );
  };

  const showForm = !isLoading && !showSuccessModal && !results;

  return (
    <div>
      {/* Page Header - only show when form is visible */}
      <div className={showForm ? "" : "hidden"}>
        <div className="mb-6 lg:mb-8">
          <h2 className="text-xl lg:text-2xl font-semibold text-slate-900 mb-2">
            Generate Test Automation
          </h2>
          <p className="text-sm lg:text-base text-slate-500 max-w-xl">
            Enter a URL and describe what you want to test. We&apos;ll crawl the page,
            analyze its elements, and generate Playwright test scripts automatically.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 sm:gap-3 mt-4 sm:mt-5">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs sm:text-sm text-slate-600">
              <Globe className="w-3.5 h-3.5 text-indigo-500" />
              Page Crawling
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs sm:text-sm text-slate-600">
              <FileCode2 className="w-3.5 h-3.5 text-indigo-500" />
              Playwright &amp; Cypress
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs sm:text-sm text-slate-600">
              <Zap className="w-3.5 h-3.5 text-indigo-500" />
              AI-Powered
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs sm:text-sm text-slate-600">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              Real-time Streaming
            </div>
          </div>
        </div>
      </div>

      {/* Input Form - Hidden visually instead of unmounted to preserve form state inputs */}
      <div className={showForm ? "" : "hidden"}>
        <InputForm
          onResults={handleResults}
          onLoading={setIsLoading}
          onStatus={(msg, stepVal) => {
            setStatus(msg);
            if (stepVal) setStep(stepVal);
          }}
          onError={setError}
          aiProvider={aiProvider}
          aiModel={aiModel}
          prefillUrl={prefillUrl}
          prefillContext={prefillContext}
          onPrefillConsumed={onPrefillConsumed}
        />
      </div>

      {/* Premium Loader Modal (Blocking Overlay) */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md transition-all duration-300">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 max-w-sm w-full mx-4 shadow-2xl relative overflow-hidden transition-all transform scale-100">
            {/* Background blur decorative circles */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-2xl"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/10 dark:bg-purple-500/20 rounded-full blur-2xl"></div>

            <div className="flex flex-col items-center text-center relative z-10">
              {/* Premium Spinner - Dual Rotating Gradient Rings with Center Glowing Orb */}
              <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
                {/* Glowing backdrop */}
                <div className="absolute inset-0 bg-indigo-500/20 dark:bg-indigo-500/30 rounded-full blur-xl animate-pulse"></div>
                
                {/* Outer spinning ring with gradient */}
                <div className="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-slate-800"></div>
                <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin duration-1000"></div>
                
                {/* Inner reverse-spinning ring */}
                <div className="absolute inset-2.5 rounded-full border-2 border-slate-100 dark:border-slate-800"></div>
                <div 
                  className="absolute inset-2.5 rounded-full border-2 border-purple-500 border-b-transparent animate-spin" 
                  style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}
                ></div>
                
                {/* Center glowing pulsing orb */}
                <div className="w-3.5 h-3.5 bg-gradient-to-tr from-indigo-500 to-pink-500 rounded-full shadow-md animate-ping"></div>
              </div>

              <h3 className="text-xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                Generating Test Suite
              </h3>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mb-4">
                <div 
                  className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: getProgressPercent(step) }}
                ></div>
              </div>

              {/* Pulsing Status Text */}
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1 max-w-[280px] truncate">
                {status}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && pendingResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md transition-all duration-300">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 max-w-sm w-full mx-4 shadow-2xl relative overflow-hidden transition-all transform scale-100">
            {/* Background blur decorative circles */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-full blur-2xl"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-teal-500/10 dark:bg-teal-500/20 rounded-full blur-2xl"></div>

            <div className="flex flex-col items-center text-center relative z-10">
              {/* Success Icon */}
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-5 animate-bounce shadow-md">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                Generation Complete!
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Your test automation suite is ready.
              </p>

              {/* Statistics Panel */}
              <div className="w-full bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-left space-y-2.5 mb-6 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-medium">Target Page:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">{pendingResults.page_title || "Untitled"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>DOM Elements Found:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{pendingResults.elements_found}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Generated Test Cases:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{pendingResults.test_cases?.length || pendingResults.scripts?.length || 0}</span>
                </div>
                {pendingResults.tokens_used !== undefined && pendingResults.tokens_used > 0 && (
                  <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Tokens Used (AI):</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{pendingResults.tokens_used}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 w-full">
                <button
                  type="button"
                  onClick={confirmResult}
                  className="btn-primary w-full py-3 text-sm font-semibold tracking-wide shadow-lg shadow-indigo-600/20"
                >
                  View Generated Suite
                </button>
                <button
                  type="button"
                  onClick={handleNewGeneration}
                  className="btn-secondary w-full py-2.5 text-xs font-semibold"
                >
                  Generate Again (Edit Form)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="mt-4 sm:mt-6 p-4 bg-red-50 border border-red-100 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Results */}
      {allResults.length > 0 && !isLoading && (
        <div id="generation-results" className="scroll-mt-6">
          {allResults.length > 1 && (
            <div className="flex gap-1 mb-4 border-b border-slate-200">
              {allResults.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveResultTab(i)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
                    activeResultTab === i
                      ? "border-indigo-600 text-indigo-700"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {r.page_title ? r.page_title.split("|")[0].trim().substring(0, 24) : `URL ${i + 1}`}
                </button>
              ))}
            </div>
          )}
          <ResultsDisplay
            results={allResults[activeResultTab]}
            onGenerateAnother={handleNewGeneration}
          />
        </div>
      )}
    </div>
  );
}
