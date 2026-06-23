"use client";

import { useState, useMemo } from "react";
import { ChevronDown, Play, Loader2, CheckCircle2, XCircle, Download, Pencil, Check, X as XIcon } from "lucide-react";
import { TestCase, ScriptFile } from "@/types";
import { useIsLocal } from "@/lib/useIsLocal";

function parseMdRow(rowStr: string): string[] {
  const parts = rowStr.split("|");
  if (parts.length <= 2) return [];
  return parts.slice(1, parts.length - 1).map(c => c.trim());
}

function splitSteps(raw: string): string[] {
  return raw
    .replace(/&lt;br\s*\/?&gt;/gi, "<br>")
    .split(/<br\s*\/?>/i)
    .flatMap(s => s.split(/\n/))
    .map(s => s.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);
}

function parseMarkdownToTestCases(markdown: string): TestCase[] {
  const rows = markdown.trim().split("\n");
  if (rows.length < 3) return [];
  const headers = parseMdRow(rows[0]);
  const hi = (name: string) => headers.findIndex(h => h.toLowerCase().includes(name));
  const typeIdx     = hi("type");
  const stepsIdx    = hi("step");
  if (typeIdx === -1 || stepsIdx === -1) return [];
  const nameIdx     = hi("name");
  const preIdx      = hi("pre condition") !== -1 ? hi("pre condition") : hi("condition");
  const expectedIdx = hi("expected");
  const priorityIdx = hi("priority");

  return rows.slice(2)
    .map((row, i) => {
      const cells = parseMdRow(row);
      if (!cells.length) return null;
      return {
        number: i + 1,
        name:            nameIdx     !== -1 ? cells[nameIdx]     : "",
        type:            (typeIdx    !== -1 ? cells[typeIdx]     : "POSITIVE") as TestCase["type"],
        pre_condition:   preIdx      !== -1 ? cells[preIdx]      : "",
        test_steps:      splitSteps(cells[stepsIdx] || ""),
        expected_result: expectedIdx !== -1 ? cells[expectedIdx] : "",
        priority:        (priorityIdx !== -1 ? cells[priorityIdx] : "MEDIUM") as TestCase["priority"],
        file_name: "", script_location: "", relevant_indices: [],
      } as TestCase;
    })
    .filter((tc): tc is TestCase => tc !== null);
}

interface TestCaseTableProps {
  markdown: string;
  testCases?: TestCase[];
  scripts?: ScriptFile[];
  url?: string;
}

type RunState = { status: "pending" | "running" | "passed" | "failed" | "blocked"; actual?: string };

const TYPE_OPTS     = ["ALL", "POSITIVE", "NEGATIVE", "EDGE", "SECURITY", "BOUNDARY"] as const;
const STATUS_OPTS   = ["ALL", "PENDING", "PASSED", "FAILED", "BLOCKED"] as const;
const PRIORITY_OPTS = ["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;

const TYPE_STYLE: Record<string, string> = {
  POSITIVE: "bg-emerald-100 text-emerald-700 border-emerald-200",
  NEGATIVE: "bg-red-100 text-red-700 border-red-200",
  EDGE:     "bg-amber-100 text-amber-700 border-amber-200",
  SECURITY: "bg-purple-100 text-purple-700 border-purple-200",
  BOUNDARY: "bg-blue-100 text-blue-700 border-blue-200",
};
const PRIORITY_STYLE: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-700 border-red-200",
  HIGH:     "bg-orange-100 text-orange-700 border-orange-200",
  MEDIUM:   "bg-yellow-100 text-yellow-700 border-yellow-200",
  LOW:      "bg-slate-100 text-slate-600 border-slate-200",
};
const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-500 border-slate-200",
  PASSED:  "bg-emerald-100 text-emerald-700 border-emerald-200",
  FAILED:  "bg-red-100 text-red-700 border-red-200",
  BLOCKED: "bg-yellow-100 text-yellow-700 border-yellow-200",
};

function Badge({ value, styleMap }: { value: string; styleMap: Record<string, string> }) {
  const cls = styleMap[value] ?? "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wide ${cls}`}>
      {value}
    </span>
  );
}

function FilterSelect<T extends string>({
  value, onChange, options, label,
}: { value: T; onChange: (v: T) => void; options: readonly T[]; label: string }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value as T)}
        className="appearance-none pl-3 pr-8 py-1.5 text-xs font-semibold rounded-md border border-slate-200 bg-white text-slate-700 cursor-pointer hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
      >
        {options.map(o => (
          <option key={o} value={o}>{o === "ALL" ? label : o}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
    </div>
  );
}

function getCaseId(tc: TestCase, index: number): string {
  const prefix = (tc.file_name || "TST").replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase() || "TST";
  return `${prefix}-${String(index + 1).padStart(3, "0")}`;
}

function dlBlob(filename: string, mime: string, content: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type: mime }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function exportCSV(cases: TestCase[]) {
  const hdrs = ["#", "ID", "Name", "Type", "Pre Condition", "Steps", "Expected Result", "Priority"];
  const q = (s: string) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const rows = cases.map((tc, i) => [
    tc.number, getCaseId(tc, i), tc.name, tc.type,
    tc.pre_condition, (tc.test_steps || []).join(" → "), tc.expected_result, tc.priority,
  ].map(v => q(String(v))).join(","));
  dlBlob("test-cases.csv", "text/csv", [hdrs.map(q).join(","), ...rows].join("\n"));
}

function exportGherkin(cases: TestCase[]) {
  const lines = ["Feature: Generated Test Cases", ""];
  for (const tc of cases) {
    lines.push(`  # ${tc.priority}`);
    lines.push(`  Scenario: ${tc.name}`);
    if (tc.pre_condition) lines.push(`    Given ${tc.pre_condition}`);
    for (const step of (tc.test_steps || [])) lines.push(`    When ${step}`);
    if (tc.expected_result) lines.push(`    Then ${tc.expected_result}`);
    lines.push("");
  }
  dlBlob("test-cases.feature", "text/plain", lines.join("\n"));
}

function Stat({ label, val, color }: { label: string; val: number; color: string }) {
  return (
    <div className="flex flex-col items-center leading-none">
      <span className={`text-sm font-bold ${color}`}>{val}</span>
      <span className="text-[8px] text-slate-400 uppercase tracking-wider mt-0.5">{label}</span>
    </div>
  );
}

export default function TestCaseTable({ markdown, testCases, scripts, url }: TestCaseTableProps) {
  const [typeFilter, setTypeFilter]         = useState<typeof TYPE_OPTS[number]>("ALL");
  const [statusFilter, setStatusFilter]     = useState<typeof STATUS_OPTS[number]>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<typeof PRIORITY_OPTS[number]>("ALL");
  const [runStatus, setRunStatus]           = useState<Record<number, RunState>>({});
  const [isRunning, setIsRunning]           = useState(false);
  const [showExport, setShowExport]         = useState(false);
  const [editIdx, setEditIdx]               = useState<number | null>(null);
  const [editDraft, setEditDraft]           = useState<Partial<TestCase>>({});
  const isLocal = useIsLocal();

  const baseCases = useMemo(
    () => (testCases && testCases.length > 0) ? testCases : parseMarkdownToTestCases(markdown),
    [testCases, markdown]
  );
  const [cases, setCases] = useState<TestCase[]>([]);
  // sync when baseCases changes (new generation)
  useMemo(() => setCases(baseCases), [baseCases]);

  const runTest = async (tc: TestCase, index: number) => {
    const script = scripts?.[index];
    if (!script?.content) return;
    setRunStatus(prev => ({ ...prev, [tc.number]: { status: "running" } }));
    try {
      const res = await fetch("/api/runner/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script_content: script.content, url: url || "" }),
      });
      const data = await res.json();
      setRunStatus(prev => ({
        ...prev,
        [tc.number]: {
          status: data.passed ? "passed" : "failed",
          actual: data.error || (data.passed ? "All assertions passed" : "Test failed"),
        },
      }));
    } catch {
      setRunStatus(prev => ({ ...prev, [tc.number]: { status: "failed", actual: "Network error" } }));
    }
  };

  const runAll = async () => {
    if (!scripts?.length) return;
    setIsRunning(true);
    await Promise.all(cases.map((tc, i) => runTest(tc, i)));
    setIsRunning(false);
  };

  if (cases.length === 0) {
    return (
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <h3 className="text-sm font-medium text-slate-700">Test Case Table</h3>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm min-w-[600px]">
            <tbody className="divide-y divide-slate-100">
              {markdown.trim().split("\n").slice(2).map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition">
                  {parseMdRow(row).map((cell, j) => (
                    <td key={j} className="px-5 py-3 text-slate-700">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const filtered = cases.filter(tc => {
    const tcStatus = (runStatus[tc.number]?.status || "pending").toUpperCase();
    return (
      (typeFilter === "ALL" || tc.type === typeFilter) &&
      (priorityFilter === "ALL" || tc.priority === priorityFilter) &&
      (statusFilter === "ALL" || tcStatus === statusFilter)
    );
  });

  const pass    = Object.values(runStatus).filter(r => r.status === "passed").length;
  const fail    = Object.values(runStatus).filter(r => r.status === "failed").length;
  const blocked = Object.values(runStatus).filter(r => r.status === "blocked").length;
  const pend    = cases.length - pass - fail - blocked;
  const byType  = (t: string) => cases.filter(tc => tc.type === t).length;
  const byPri   = (p: string) => cases.filter(tc => tc.priority === p).length;

  return (
    <div className="card overflow-hidden">
      {/* Title row */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-slate-100">
        <h3 className="text-sm font-medium text-slate-700">
          Test Case Table{" "}
          <span className="text-slate-400 font-normal text-xs">
            ({filtered.length}{filtered.length !== cases.length ? `/${cases.length}` : ""} cases)
          </span>
        </h3>
        <div className="flex items-center gap-2">
          {/* Export dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExport(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-200 text-slate-600 hover:border-slate-300 transition"
            >
              <Download className="w-3 h-3" />
              Export
              <ChevronDown className={`w-3 h-3 transition-transform ${showExport ? "rotate-180" : ""}`} />
            </button>
            {showExport && (
              <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[140px]">
                <button
                  type="button"
                  onClick={() => { exportCSV(cases); setShowExport(false); }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition"
                >
                  Download CSV
                </button>
                <button
                  type="button"
                  onClick={() => { exportGherkin(cases); setShowExport(false); }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition"
                >
                  Download .feature (Gherkin)
                </button>
              </div>
            )}
          </div>
          {isLocal && scripts && scripts.length > 0 && (
            <button
              type="button"
              onClick={runAll}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 transition"
            >
              {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
              {isRunning ? "Running..." : "Run Tests"}
            </button>
          )}
        </div>
      </div>

      {/* Stats + filters row */}
      <div className="flex items-center border-b border-slate-100 divide-x divide-slate-100">
        <div className="flex items-center gap-3.5 px-4 py-2">
          <span className="text-[8px] font-semibold text-slate-400 uppercase tracking-widest">Execution Status</span>
          <Stat label="PASS"  val={pass}    color="text-emerald-500" />
          <Stat label="FAIL"  val={fail}    color="text-red-500" />
          <Stat label="BLOCK" val={blocked} color="text-amber-500" />
          <Stat label="PEND"  val={pend}    color="text-slate-400" />
        </div>
        <div className="flex items-center gap-3.5 px-4 py-2">
          <span className="text-[8px] font-semibold text-slate-400 uppercase tracking-widest">Test Type</span>
          <Stat label="POS"   val={byType("POSITIVE")} color="text-emerald-500" />
          <Stat label="NEG"   val={byType("NEGATIVE")} color="text-red-500" />
          <Stat label="EDGE"  val={byType("EDGE")}     color="text-amber-500" />
          <Stat label="SEC"   val={byType("SECURITY")} color="text-purple-500" />
          <Stat label="BNDRY" val={byType("BOUNDARY")} color="text-blue-500" />
        </div>
        <div className="flex items-center gap-3.5 px-4 py-2">
          <span className="text-[8px] font-semibold text-slate-400 uppercase tracking-widest">Priority</span>
          <Stat label="CRIT" val={byPri("CRITICAL")} color="text-red-500" />
          <Stat label="HIGH" val={byPri("HIGH")}     color="text-orange-500" />
          <Stat label="MED"  val={byPri("MEDIUM")}   color="text-blue-500" />
          <Stat label="LOW"  val={byPri("LOW")}      color="text-slate-400" />
        </div>
        <div className="flex items-center gap-2 px-4 py-2 ml-auto">
          <FilterSelect value={typeFilter}     onChange={setTypeFilter}     options={TYPE_OPTS}     label="TYPE" />
          <FilterSelect value={statusFilter}   onChange={setStatusFilter}   options={STATUS_OPTS}   label="STATUS" />
          <FilterSelect value={priorityFilter} onChange={setPriorityFilter} options={PRIORITY_OPTS} label="PRIORITY" />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-xs min-w-[900px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {["#", "Test Case ID", "Test Case Name", "Type", "Pre Condition", "Test Steps", "Expected Result", "Actual Result", "Status", "Priority", "Evidence"].map(h => (
                <th key={h} className="px-4 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
              <th className="px-4 py-3" />
              {isLocal && scripts?.length ? <th className="px-4 py-3" /> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((tc, i) => {
              const rs = runStatus[tc.number];
              const tcStatus = (rs?.status || "pending").toUpperCase();
              const isEditing = editIdx === i;
              const startEdit = () => { setEditIdx(i); setEditDraft({ name: tc.name, pre_condition: tc.pre_condition, test_steps: tc.test_steps, expected_result: tc.expected_result }); };
              const saveEdit = () => {
                setCases(prev => prev.map((c, j) => j === i ? { ...c, ...editDraft, test_steps: typeof editDraft.test_steps === "string" ? splitSteps(editDraft.test_steps as any) : editDraft.test_steps ?? c.test_steps } : c));
                setEditIdx(null);
              };
              return (
                <tr key={i} className={`hover:bg-slate-50/50 transition align-top ${isEditing ? "bg-indigo-50/30" : ""}`}>
                  <td className="px-4 py-3 text-slate-500">{tc.number}</td>
                  <td className="px-4 py-3 font-mono text-slate-700 whitespace-nowrap">{getCaseId(tc, i)}</td>
                  <td className="px-4 py-3 text-slate-800 font-medium max-w-[180px]">
                    {isEditing
                      ? <input className="w-full text-xs border border-indigo-300 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400" value={editDraft.name ?? ""} onChange={e => setEditDraft(d => ({ ...d, name: e.target.value }))} />
                      : tc.name}
                  </td>
                  <td className="px-4 py-3">
                    <Badge value={tc.type} styleMap={TYPE_STYLE} />
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-[160px]">
                    {isEditing
                      ? <input className="w-full text-xs border border-indigo-300 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400" value={editDraft.pre_condition ?? ""} onChange={e => setEditDraft(d => ({ ...d, pre_condition: e.target.value }))} />
                      : tc.pre_condition}
                  </td>
                  <td className="px-4 py-3 text-slate-700 max-w-[240px]">
                    {isEditing
                      ? <textarea rows={3} className="w-full text-xs border border-indigo-300 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-y" value={(editDraft.test_steps as any ?? tc.test_steps).join("\n")} onChange={e => setEditDraft(d => ({ ...d, test_steps: e.target.value.split("\n") as any }))} />
                      : <ol className="space-y-0.5 list-none">
                          {(tc.test_steps || []).map((s, n) => (
                            <li key={n} className="flex gap-1.5">
                              <span className="text-slate-400 shrink-0 w-4 text-right">{n + 1}.</span>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ol>
                    }
                  </td>
                  <td className="px-4 py-3 text-slate-700 max-w-[180px]">
                    {isEditing
                      ? <textarea rows={2} className="w-full text-xs border border-indigo-300 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-y" value={editDraft.expected_result ?? ""} onChange={e => setEditDraft(d => ({ ...d, expected_result: e.target.value }))} />
                      : tc.expected_result}
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-[160px]">
                    {rs?.actual
                      ? <span className={rs.status === "passed" ? "text-emerald-600" : "text-red-600"}>{rs.actual}</span>
                      : "-"}
                  </td>
                  <td className="px-4 py-3">
                    {rs?.status === "running"
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                      : <Badge value={tcStatus} styleMap={STATUS_STYLE} />
                    }
                  </td>
                  <td className="px-4 py-3">
                    <Badge value={tc.priority} styleMap={PRIORITY_STYLE} />
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {rs?.status === "passed" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    {rs?.status === "failed"  && <XCircle className="w-4 h-4 text-red-500" />}
                    {!rs && "-"}
                  </td>
                  {/* Edit button */}
                  <td className="px-2 py-3">
                    {isEditing ? (
                      <div className="flex gap-1">
                        <button type="button" onClick={saveEdit} className="p-1 rounded hover:bg-emerald-50 text-emerald-600 transition" title="Save"><Check className="w-3.5 h-3.5" /></button>
                        <button type="button" onClick={() => setEditIdx(null)} className="p-1 rounded hover:bg-red-50 text-red-400 transition" title="Cancel"><XIcon className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <button type="button" onClick={startEdit} className="p-1 rounded hover:bg-slate-100 text-slate-300 hover:text-slate-500 transition" title="Edit row"><Pencil className="w-3.5 h-3.5" /></button>
                    )}
                  </td>
                  {isLocal && scripts?.length ? (
                    <td className="px-2 py-3">
                      <button
                        type="button"
                        onClick={() => runTest(tc, i)}
                        disabled={rs?.status === "running"}
                        className="p-1 rounded hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition disabled:opacity-40"
                        title="Run this test"
                      >
                        {rs?.status === "running"
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Play className="w-3.5 h-3.5" />
                        }
                      </button>
                    </td>
                  ) : null}
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-center text-slate-400">
                  No test cases match the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
