"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { ModelsResponse } from "@/types";

import Sidebar, { PageId } from "@/components/Sidebar";
import GeneratePage from "@/components/pages/GeneratePage";
import HistoryPage from "@/components/pages/HistoryPage";
import PlaygroundPage from "@/components/pages/PlaygroundPage";
import MonitorPage from "@/components/pages/MonitorPage";
import SettingsPage from "@/components/pages/SettingsPage";
import AISettings from "@/components/AISettings";

export default function Home() {
  const [activePage, setActivePage] = useState<PageId>("generate");
  const [modelsData, setModelsData] = useState<ModelsResponse | null>(null);
  const [aiProvider, setAiProvider] = useState("");
  const [aiModel, setAiModel] = useState("");

  const refreshModels = useCallback(async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await axios.get<ModelsResponse>(`${API_URL}/api/models`);
      setModelsData(res.data);

      // Load saved selection from localStorage
      const saved = localStorage.getItem("urltoscript_selected_provider_model");
      if (saved) {
        const { provider, model } = JSON.parse(saved);
        // Verify key is still connected and model is valid
        if (res.data.status[provider] === "connected" && res.data.providers[provider]?.includes(model)) {
          setAiProvider(provider);
          setAiModel(model);
          return;
        }
      }
      
      // ponytail: if saved is invalid/not connected, do not auto select
      setAiProvider("");
      setAiModel("");
    } catch (e) {
      console.error("Failed to load models configuration", e);
    }
  }, []);

  const handleProviderChange = (provider: string, model: string) => {
    setAiProvider(provider);
    setAiModel(model);
    if (provider && model) {
      localStorage.setItem(
        "urltoscript_selected_provider_model",
        JSON.stringify({ provider, model })
      );
    } else {
      localStorage.removeItem("urltoscript_selected_provider_model");
    }
  };

  const [prefillUrl, setPrefillUrl] = useState("");
  const [prefillContext, setPrefillContext] = useState("");

  const handleRerun = (url: string, context: string) => {
    setPrefillUrl(url);
    setPrefillContext(context);
    setActivePage("generate");
    window.history.replaceState(null, "", "#generate");
  };

  // Update URL hash for deep linking
  const handleNavigate = useCallback((page: PageId) => {
    setActivePage(page);
    window.history.replaceState(null, "", `#${page}`);
  }, []);

  // Read hash on mount + load dark mode preference & models
  useEffect(() => {
    const hash = window.location.hash.replace("#", "") as PageId;
    const validPages: PageId[] = ["generate", "history", "playground", "monitor", "settings"];
    if (validPages.includes(hash)) {
      setActivePage(hash);
    }

    // Load dark mode from settings
    const saved = localStorage.getItem("selectorhub_settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.darkMode) {
          document.documentElement.classList.add("dark");
        }
      } catch {
        // ignore
      }
    }

    refreshModels();
  }, [refreshModels]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+H → History
      if (e.ctrlKey && e.shiftKey && e.key === "H") {
        e.preventDefault();
        handleNavigate("history");
      }
      // Ctrl+Shift+P → Playground
      if (e.ctrlKey && e.shiftKey && e.key === "P") {
        e.preventDefault();
        handleNavigate("playground");
      }
      // Ctrl+Shift+M → Monitor
      if (e.ctrlKey && e.shiftKey && e.key === "M") {
        e.preventDefault();
        handleNavigate("monitor");
      }
      // Ctrl+K → Focus URL input
      if (e.ctrlKey && e.key === "k") {
        e.preventDefault();
        const urlInput = document.getElementById("url");
        if (urlInput) urlInput.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNavigate]);

  const renderPage = () => {
    switch (activePage) {
      case "generate":
        return (
          <GeneratePage
            aiProvider={aiProvider}
            aiModel={aiModel}
            prefillUrl={prefillUrl}
            prefillContext={prefillContext}
            onPrefillConsumed={() => { setPrefillUrl(""); setPrefillContext(""); }}
          />
        );
      case "history":
        return <HistoryPage onRerun={handleRerun} />;
      case "playground":
        return <PlaygroundPage />;
      case "monitor":
        return <MonitorPage />;
      case "settings":
        return (
          <SettingsPage
            onProviderChange={handleProviderChange}
            selectedProvider={aiProvider}
            selectedModel={aiModel}
            modelsData={modelsData}
            refreshModels={refreshModels}
          />
        );
      default:
        return (
          <GeneratePage
            aiProvider={aiProvider}
            aiModel={aiModel}
          />
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Sidebar */}
      <Sidebar activePage={activePage} onNavigate={handleNavigate} />

      {/* Main Content */}
      <main className="flex-1 min-w-0 pt-[57px] lg:pt-0">
        {/* Top Bar - desktop */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 hidden lg:block">
          <div className="flex items-center justify-end px-6 lg:px-8 py-3">
            {activePage !== "settings" && (
              <AISettings
                onProviderChange={handleProviderChange}
                selectedProvider={aiProvider}
                selectedModel={aiModel}
                modelsData={modelsData}
                refreshModels={refreshModels}
              />
            )}
          </div>
        </header>

        {/* Top Bar - mobile (AI settings only) */}
        <div className="lg:hidden sticky top-[57px] z-20 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-end px-4 py-2">
            {activePage !== "settings" && (
              <AISettings
                onProviderChange={handleProviderChange}
                selectedProvider={aiProvider}
                selectedModel={aiModel}
                modelsData={modelsData}
                refreshModels={refreshModels}
              />
            )}
          </div>
        </div>

        {/* Page Content */}
        <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}
