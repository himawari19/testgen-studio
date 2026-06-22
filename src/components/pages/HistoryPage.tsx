"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  History,
  Search,
  Trash2,
  ExternalLink,
  Clock,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  X,
  AlertTriangle,
} from "lucide-react";
import { HistoryItem, HistoryDetail, HistoryListResponse } from "@/types";
import ResultsDisplay from "@/components/ResultsDisplay";
import toast from "react-hot-toast";

const API_URL = "";

interface ConfirmDialog {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
}

function ConfirmModal({ dialog, onClose }: { dialog: ConfirmDialog; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl border border-slate-200 p-6 w-full max-w-sm mx-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4.5 h-4.5 text-red-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{dialog.title}</h3>
            <p className="text-xs text-slate-500 mt-1">{dialog.message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => { dialog.onConfirm(); onClose(); }}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
          >
            {dialog.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

interface HistoryPageProps {
  onRerun?: (url: string, context: string) => void;
}

export default function HistoryPage({ onRerun }: HistoryPageProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedDetail, setExpandedDetail] = useState<HistoryDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog | null>(null);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const params: Record<string, string> = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      const res = await axios.get<HistoryListResponse>(`${API_URL}/api/history`, { params });
      setHistory(res.data.items);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load history. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => { fetchHistory(); }, 300);
    return () => clearTimeout(timer);
  }, [fetchHistory]);

  const handleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedDetail(null);
      return;
    }
    setExpandedId(id);
    setLoadingDetail(true);
    try {
      const res = await axios.get<HistoryDetail>(`${API_URL}/api/history/${id}`);
      setExpandedDetail(res.data);
    } catch {
      toast.error("Failed to load details. Please try again.");
      setExpandedId(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDialog({
      title: "Delete record?",
      message: "This history record will be permanently removed. This action cannot be undone.",
      confirmLabel: "Delete",
      onConfirm: async () => {
        try {
          await axios.delete(`${API_URL}/api/history/${id}`);
          setHistory(prev => prev.filter(item => item.id !== id));
          if (expandedId === id) { setExpandedId(null); setExpandedDetail(null); }
          toast.success("Record deleted.");
        } catch {
          toast.error("Failed to delete record. Please try again.");
        }
      },
    });
  };

  const handleClearAll = () => {
    setConfirmDialog({
      title: "Clear all history?",
      message: `All ${history.length} record${history.length !== 1 ? "s" : ""} will be permanently deleted. This action cannot be undone.`,
      confirmLabel: "Clear All History",
      onConfirm: async () => {
        try {
          await axios.delete(`${API_URL}/api/history`);
          setHistory([]);
          setExpandedId(null);
          setExpandedDetail(null);
          toast.success("All history cleared.");
        } catch {
          toast.error("Failed to clear history. Please try again.");
        }
      },
    });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <div>
      {confirmDialog && (
        <ConfirmModal dialog={confirmDialog} onClose={() => setConfirmDialog(null)} />
      )}

      {/* Page Header */}
      <div className="flex items-start justify-between mb-6 lg:mb-8">
        <div>
          <h2 className="text-xl lg:text-2xl font-semibold text-slate-900 mb-2">
            Generation History
          </h2>
          <p className="text-sm lg:text-base text-slate-500 max-w-xl">
            View and manage your past test generations. Expand to see full results or re-run.
          </p>
        </div>
        {history.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition shrink-0 mt-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear All History
          </button>
        )}
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by URL, context, or title..."
            className="input-field pl-10"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-slate-100"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700">Failed to load history</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
            <button
              type="button"
              onClick={fetchHistory}
              className="text-xs text-red-700 underline mt-1 hover:text-red-900"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && history.length === 0 && (
        <div className="card p-8 sm:p-12 text-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <History className="w-7 h-7 sm:w-8 sm:h-8 text-slate-400" />
          </div>
          <h3 className="text-base sm:text-lg font-medium text-slate-700 mb-2">
            {searchQuery ? "No results found" : "No history yet"}
          </h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? `No records match "${searchQuery}". Try a different search term.`
              : "Your generated test cases and scripts will appear here. Go to Generate to create your first automation."}
          </p>
        </div>
      )}

      {/* History List */}
      {!isLoading && history.length > 0 && (
        <div className="space-y-3">
          {history.map((item) => (
            <div key={item.id} className="card overflow-hidden">
              <button
                type="button"
                onClick={() => handleExpand(item.id)}
                className="w-full p-4 text-left hover:bg-slate-50/50 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="text-sm font-medium text-slate-800 truncate">{item.url}</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mb-2">{item.user_context}</p>
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(item.created_at)}
                      </span>
                      {(item.test_cases_count ?? 0) > 0 && <span>{item.test_cases_count} cases</span>}
                      <span>{item.scripts_count} scripts</span>
                      <span className="text-slate-300">{item.ai_provider}/{item.ai_model}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {onRerun && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onRerun(item.url, item.user_context); }}
                        className="p-2 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition"
                        title="Re-run generation"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleDelete(item.id, e)}
                      className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition"
                      title="Delete record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {expandedId === item.id
                      ? <ChevronUp className="w-4 h-4 text-slate-400" />
                      : <ChevronDown className="w-4 h-4 text-slate-400" />
                    }
                  </div>
                </div>
              </button>

              {expandedId === item.id && (
                <div className="border-t border-slate-100 p-4 bg-slate-50/30">
                  {loadingDetail ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                    </div>
                  ) : expandedDetail ? (
                    <ResultsDisplay
                      results={{
                        url: expandedDetail.url,
                        test_case_table: expandedDetail.test_case_table,
                        test_cases: expandedDetail.test_cases,
                        scripts: expandedDetail.scripts,
                        page_title: expandedDetail.page_title,
                        elements_found: expandedDetail.elements_found,
                      }}
                    />
                  ) : null}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
