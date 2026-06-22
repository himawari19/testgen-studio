"use client";

import { useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { GenerateResponse } from "@/types";
import toast from "react-hot-toast";
import { Download, ChevronDown } from "lucide-react";

interface DownloadButtonsProps {
  results: GenerateResponse;
}

export default function DownloadButtons({ results }: DownloadButtonsProps) {
  const [showMenu, setShowMenu] = useState(false);

  const downloadMarkdown = () => {
    const blob = new Blob([results.test_case_table], { type: "text/markdown" });
    saveAs(blob, "test-cases.md");
    toast.success("Test cases downloaded as .md");
    setShowMenu(false);
  };

  const downloadCSV = () => {
    // Parse markdown table to CSV
    const rows = results.test_case_table.trim().split("\n");
    const headers = rows[0]
      ?.split("|")
      .filter((h) => h.trim())
      .map((h) => h.trim());
    const dataRows = rows.slice(2).map((row) =>
      row
        .split("|")
        .filter((c) => c.trim() !== "")
        .map((c) => `"${c.trim().replace(/"/g, '""')}"`)
    );

    const csvContent = [
      headers?.map((h) => `"${h}"`).join(","),
      ...dataRows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    saveAs(blob, "test-cases.csv");
    toast.success("Test cases downloaded as .csv");
    setShowMenu(false);
  };

  // ponytail: Dynamically detect the framework type of generated scripts
  const getFrameworkType = (): string => {
    if (!results.scripts || results.scripts.length === 0) return "playwright";
    const first = results.scripts[0];
    const path = (first.script_location || "").toLowerCase();
    const name = (first.file_name || "").toLowerCase();
    const content = (first.content || "").toLowerCase();

    if (name.includes(".cy.") || path.includes("cypress")) return "cypress";
    if (path.includes("selenium") || name.endsWith(".java") || name.endsWith(".cs") || content.includes("webdriver")) return "selenium";
    return "playwright";
  };

  const fwType = getFrameworkType();
  const fwLabel = fwType.charAt(0).toUpperCase() + fwType.slice(1);

  const downloadZip = async () => {
    const zip = new JSZip();
    for (const script of results.scripts) {
      const cleanContent = script.content.replace(/\\n/g, "\n").replace(/\\"/g, '"');
      zip.file(script.script_location, cleanContent);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, `${fwType}-scripts.zip`);
    toast.success(`${fwLabel} scripts downloaded`);
    setShowMenu(false);
  };

  const hasCases = (results.test_cases?.length ?? 0) > 0 || !!results.test_case_table?.trim();
  const hasScripts = results.scripts?.length > 0;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowMenu(!showMenu)}
        className="btn-ghost text-xs flex items-center gap-1.5"
      >
        <Download className="w-3.5 h-3.5" />
        Download
        <ChevronDown className={`w-3 h-3 transition-transform ${showMenu ? "rotate-180" : ""}`} />
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-slate-200 rounded-lg shadow-dropdown z-50 py-1">
            {hasCases && (
              <>
                <button
                  type="button"
                  onClick={downloadMarkdown}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition flex items-center gap-2"
                >
                  <span className="w-8 text-right font-mono text-slate-400">.md</span>
                  Test Cases (Markdown)
                </button>
                <button
                  type="button"
                  onClick={downloadCSV}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition flex items-center gap-2"
                >
                  <span className="w-8 text-right font-mono text-slate-400">.csv</span>
                  Test Cases (Excel/CSV)
                </button>
              </>
            )}
            {hasCases && hasScripts && <div className="border-t border-slate-100 my-1" />}
            {hasScripts && (
              <button
                type="button"
                onClick={downloadZip}
                className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition flex items-center gap-2"
              >
                <span className="w-8 text-right font-mono text-slate-400">.zip</span>
                {fwLabel} Scripts
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
