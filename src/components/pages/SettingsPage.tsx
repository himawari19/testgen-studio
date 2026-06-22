"use client";

import { useState, useEffect } from "react";
import AISettings from "@/components/AISettings";
import { Moon, Sun, Keyboard, FileText } from "lucide-react";
import toast from "react-hot-toast";
import { ModelsResponse } from "@/types";

interface SettingsPageProps {
  onProviderChange: (provider: string, model: string) => void;
  selectedProvider: string;
  selectedModel: string;
  modelsData: ModelsResponse | null;
  refreshModels: () => Promise<void>;
}

export default function SettingsPage({
  onProviderChange,
  selectedProvider,
  selectedModel,
  modelsData,
  refreshModels,
}: SettingsPageProps) {
  const [darkMode, setDarkMode] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("selectorhub_settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setDarkMode(parsed.darkMode || false);
        setCustomPrompt(parsed.customPrompt || "");
      } catch {
        // ignore
      }
    }
  }, []);

  const saveSettings = (key: string, value: any) => {
    const saved = localStorage.getItem("selectorhub_settings");
    const current = saved ? JSON.parse(saved) : {};
    current[key] = value;
    localStorage.setItem("selectorhub_settings", JSON.stringify(current));
  };

  const handleDarkMode = (enabled: boolean) => {
    setDarkMode(enabled);
    saveSettings("darkMode", enabled);
    if (enabled) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    toast.success(enabled ? "Dark mode enabled" : "Light mode enabled");
  };

  const handleSavePrompt = () => {
    saveSettings("customPrompt", customPrompt);
    toast.success("Custom prompt saved");
  };

  const shortcuts = [
    { keys: "Ctrl + Enter", action: "Submit generate form" },
    { keys: "Ctrl + K", action: "Focus URL input" },
    { keys: "Ctrl + Shift + H", action: "Go to History" },
    { keys: "Ctrl + Shift + P", action: "Go to Playground" },
    { keys: "Ctrl + Shift + M", action: "Go to Monitor" },
    { keys: "Escape", action: "Close panels/modals" },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6 lg:mb-8">
        <h2 className="text-xl lg:text-2xl font-semibold text-slate-900 mb-2">Settings</h2>
        <p className="text-sm lg:text-base text-slate-500 max-w-xl">
          Manage your AI providers, appearance, and application preferences.
        </p>
      </div>

      <div className="space-y-6">
        {/* AI Provider Settings */}
        <div className="card p-4 sm:p-6">
          <h3 className="text-base font-semibold text-slate-800 mb-1">AI Providers</h3>
          <p className="text-sm text-slate-500 mb-5">
            Connect your API keys to enable AI-powered test generation.
          </p>
          <AISettings
            onProviderChange={onProviderChange}
            selectedProvider={selectedProvider}
            selectedModel={selectedModel}
            modelsData={modelsData}
            refreshModels={refreshModels}
            inline
          />
        </div>

        {/* Custom Prompt Template */}
        <div className="card p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-slate-500" />
            <h3 className="text-base font-semibold text-slate-800">Custom Prompt Template</h3>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            Add extra instructions that will be appended to the AI prompt when generating test cases.
          </p>
          <textarea
            rows={4}
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="e.g., Always use data-testid selectors when available. Generate tests in BDD style. Include accessibility checks."
            className="input-field resize-y text-sm"
          />
          <div className="flex justify-end mt-3">
            <button
              type="button"
              onClick={handleSavePrompt}
              className="btn-primary text-xs"
            >
              Save Prompt
            </button>
          </div>
        </div>

        {/* Appearance */}
        <div className="card p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-1">
            {darkMode ? <Moon className="w-4 h-4 text-slate-500" /> : <Sun className="w-4 h-4 text-slate-500" />}
            <h3 className="text-base font-semibold text-slate-800">Appearance</h3>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            Customize the look and feel of the application.
          </p>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-slate-700">Dark Mode</p>
              <p className="text-xs text-slate-500">Switch between light and dark themes</p>
            </div>
            <button
              type="button"
              onClick={() => handleDarkMode(!darkMode)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                darkMode ? "bg-indigo-600" : "bg-slate-300"
              }`}
              aria-label={darkMode ? "Disable dark mode" : "Enable dark mode"}
              title={darkMode ? "Disable dark mode" : "Enable dark mode"}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  darkMode ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="card p-4 sm:p-6">
          <button
            type="button"
            onClick={() => setShowShortcuts(!showShortcuts)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-slate-500" />
              <h3 className="text-base font-semibold text-slate-800">Keyboard Shortcuts</h3>
            </div>
            <span className="text-xs text-slate-400">
              {showShortcuts ? "Hide" : "Show"}
            </span>
          </button>

          {showShortcuts && (
            <div className="mt-4 space-y-2">
              {shortcuts.map((shortcut, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg"
                >
                  <span className="text-sm text-slate-700">{shortcut.action}</span>
                  <kbd className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono text-slate-600 shadow-sm">
                    {shortcut.keys}
                  </kbd>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
