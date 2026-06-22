"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signIn } from "next-auth/react";
import { Lock } from "lucide-react";
import axios from "axios";
import { ModelsResponse } from "@/types";
import { getApiKey } from "@/lib/keys";

import Sidebar, { PageId } from "@/components/Sidebar";
import GeneratePage from "@/components/pages/GeneratePage";
import HistoryPage from "@/components/pages/HistoryPage";
import PlaygroundPage from "@/components/pages/PlaygroundPage";
import MonitorPage from "@/components/pages/MonitorPage";
import SettingsPage from "@/components/pages/SettingsPage";
import AISettings from "@/components/AISettings";
import UserMenu from "@/components/UserMenu";

// Pages that require login. Generate is open to guests.
const GATED_PAGES: PageId[] = ["history", "playground", "monitor", "settings"];

export default function Dashboard() {
  const { data: session } = useSession();
  const [activePage, setActivePage] = useState<PageId>("generate");
  const [modelsData, setModelsData] = useState<ModelsResponse | null>(null);
  const [aiProvider, setAiProvider] = useState("");
  const [aiModel, setAiModel] = useState("");

  const refreshModels = useCallback(async () => {
    try {
      const API_URL = "";
      const res = await axios.get<ModelsResponse>(`${API_URL}/api/models`);
      setModelsData(res.data);

      // Load saved selection from localStorage
      const saved = localStorage.getItem("urltoscript_selected_provider_model");
      if (saved) {
        const { provider, model } = JSON.parse(saved);
        if (provider === "9router-public") {
          const publicConfig = JSON.parse(localStorage.getItem("9router_public") || "{}");
          const publicModel = publicConfig.selectedModel || model;
          if (Array.isArray(publicConfig.models) && publicConfig.models.includes(publicModel)) {
            setAiProvider(provider);
            setAiModel(publicModel);
            return;
          }
        }
        // Verify the provider is connected (cloud = key in browser; 9router = live status)
        const isConnected = provider === "9router"
          ? res.data.status[provider] === "connected"
          : !!getApiKey(provider);
        if (isConnected && res.data.providers[provider]?.includes(model)) {
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

    refreshModels();
  }, [refreshModels]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "H") {
        e.preventDefault();
        handleNavigate("history");
      }
      if (e.ctrlKey && e.shiftKey && e.key === "P") {
        e.preventDefault();
        handleNavigate("playground");
      }
      if (e.ctrlKey && e.shiftKey && e.key === "M") {
        e.preventDefault();
        handleNavigate("monitor");
      }
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
    // Gate login-required pages for guests
    if (GATED_PAGES.includes(activePage) && !session?.user) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-sm">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mb-4">
              <Lock className="w-7 h-7 text-indigo-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Sign in required</h2>
            <p className="text-sm text-slate-500 mt-1.5 mb-5">
              Sign in with Google to access {activePage}, save your history, and keep your work in sync.
            </p>
            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl: "/app" })}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition"
            >
              Sign in with Google
            </button>
          </div>
        </div>
      );
    }

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
        return <GeneratePage aiProvider={aiProvider} aiModel={aiModel} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar activePage={activePage} onNavigate={handleNavigate} />

      <main className="flex-1 min-w-0 pt-[57px] lg:pt-0">
        {/* Top Bar - desktop */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 hidden lg:block">
          <div className="flex items-center justify-end gap-3 px-6 lg:px-8 py-3">
            {activePage !== "settings" && (
              <AISettings
                onProviderChange={handleProviderChange}
                selectedProvider={aiProvider}
                selectedModel={aiModel}
                modelsData={modelsData}
                refreshModels={refreshModels}
              />
            )}
            <UserMenu />
          </div>
        </header>

        {/* Top Bar - mobile */}
        <div className="lg:hidden sticky top-[57px] z-20 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-end gap-2 px-4 py-2">
            {activePage !== "settings" && (
              <AISettings
                onProviderChange={handleProviderChange}
                selectedProvider={aiProvider}
                selectedModel={aiModel}
                modelsData={modelsData}
                refreshModels={refreshModels}
              />
            )}
            <UserMenu />
          </div>
        </div>

        <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}
