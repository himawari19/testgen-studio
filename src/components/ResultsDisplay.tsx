"use client";

import { useState } from "react";
import { GenerateResponse } from "@/types";
import TestCaseTable from "./TestCaseTable";
import ScriptViewer from "./ScriptViewer";
import DownloadButtons from "./DownloadButtons";
import { CheckCircle2, Table2, FileCode2, RotateCcw } from "lucide-react";

interface ResultsDisplayProps {
  results: GenerateResponse;
  onGenerateAnother?: () => void;
}

export default function ResultsDisplay({ results, onGenerateAnother }: ResultsDisplayProps) {
  const [activeTab, setActiveTab] = useState<"table" | "scripts">("table");

  // ponytail: Dynamically detect the framework type of generated scripts
  const getFrameworkLabel = (): string => {
    if (!results.scripts || results.scripts.length === 0) return "Playwright";
    const first = results.scripts[0];
    const path = (first.script_location || "").toLowerCase();
    const name = (first.file_name || "").toLowerCase();
    const content = (first.content || "").toLowerCase();

    if (name.includes(".cy.") || path.includes("cypress")) return "Cypress";
    if (path.includes("selenium") || name.endsWith(".java") || name.endsWith(".cs") || content.includes("webdriver")) return "Selenium";
    return "Playwright";
  };

  const fwLabel = getFrameworkLabel();

  return (
    <div className="mt-8">
      {/* Success Banner */}
      <div className="card p-4 mb-6 border-emerald-200 bg-emerald-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="text-sm font-medium text-emerald-800">Generation Complete</p>
              <p className="text-xs text-emerald-600 mt-0.5">
                {results.page_title} - {results.elements_found} elements found, {results.scripts.length} scripts generated
              </p>
            </div>
          </div>
          <DownloadButtons results={results} />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-5">
        <nav className="flex gap-1">
          <button
            onClick={() => setActiveTab("table")}
            className={`flex items-center gap-2 px-4 pb-3 border-b-2 text-sm font-medium transition-all ${
              activeTab === "table"
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            <Table2 className="w-4 h-4" />
            Test Cases
          </button>
          <button
            onClick={() => setActiveTab("scripts")}
            className={`flex items-center gap-2 px-4 pb-3 border-b-2 text-sm font-medium transition-all ${
              activeTab === "scripts"
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            <FileCode2 className="w-4 h-4" />
            {fwLabel} Scripts
            <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
              {results.scripts.length}
            </span>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "table" && (
        <TestCaseTable
          markdown={results.test_case_table}
          testCases={results.test_cases}
          scripts={results.scripts}
          url={results.url}
        />
      )}
      {activeTab === "scripts" && (
        <ScriptViewer scripts={results.scripts} />
      )}

      {/* ponytail: prominent CTA button at the bottom of results to generate another */}
      {onGenerateAnother && (
        <div className="mt-8 flex justify-center pb-8 border-t border-slate-100 dark:border-slate-800 pt-6">
          <button
            type="button"
            onClick={onGenerateAnother}
            className="btn-primary flex items-center gap-2 px-6 py-3 shadow-lg shadow-indigo-600/10 text-sm font-semibold"
          >
            <RotateCcw className="w-4 h-4" />
            Generate Another Suite
          </button>
        </div>
      )}
    </div>
  );
}
