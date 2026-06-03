"use client";

// Editable organisation settings — AI provider, API keys, toggles.

import { useState, useEffect } from "react";
import { Toast, type ToastState } from "./Toast";

interface SettingsData {
  defaultAIProvider: string;
  requireHumanApproval: boolean;
  auditLoggingEnabled: boolean;
  timezone: string | null;
  deepseekApiKeySet: boolean;
  openaiApiKeySet: boolean;
  localAiUrlSet: boolean;
}

const PROVIDERS = ["DEEPSEEK", "OPENAI", "LOCAL", "MOCK"];

export function SettingsClient({ organisationId }: { organisationId: string }) {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  // Form state
  const [provider, setProvider] = useState("DEEPSEEK");
  const [humanApproval, setHumanApproval] = useState(true);
  const [auditLogging, setAuditLogging] = useState(true);
  const [deepseekKey, setDeepseekKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [localUrl, setLocalUrl] = useState("");

  useEffect(() => {
    fetch(`/api/settings?organisationId=${organisationId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setSettings(data);
        setProvider(data.defaultAIProvider);
        setHumanApproval(data.requireHumanApproval);
        setAuditLogging(data.auditLoggingEnabled);
      })
      .catch((e) =>
        setToast({ type: "error", message: e instanceof Error ? e.message : "Failed to load" }),
      )
      .finally(() => setLoading(false));
  }, [organisationId]);

  async function save() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        organisationId,
        defaultAIProvider: provider,
        requireHumanApproval: humanApproval,
        auditLoggingEnabled: auditLogging,
      };

      // Only send keys if the user typed something
      if (deepseekKey.trim()) body.deepseekApiKey = deepseekKey.trim();
      if (openaiKey.trim()) body.openaiApiKey = openaiKey.trim();
      if (localUrl.trim()) body.localAiUrl = localUrl.trim();

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Save failed");

      setSettings(data);
      setDeepseekKey("");
      setOpenaiKey("");
      setLocalUrl("");
      setToast({ type: "success", message: "Settings saved" });
    } catch (e) {
      setToast({
        type: "error",
        message: e instanceof Error ? e.message : "Save failed",
      });
    } finally {
      setSaving(false);
    }
  }

  const fieldCls =
    "w-full rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-sm text-text-primary focus:border-border-strong focus:outline-none";
  const labelCls = "mb-1 block text-xs font-medium text-text-secondary";
  const sectionCls = "mb-6 rounded-lg border border-border bg-surface-raised p-5 shadow-sm";

  if (loading) {
    return <p className="text-sm text-text-muted">Loading settings…</p>;
  }

  return (
    <div className="max-w-3xl">
      {/* Provider + Toggles */}
      <section className={sectionCls}>
        <h2 className="mb-4 text-sm font-semibold text-text-primary">AI Provider</h2>
        <label className="block">
          <span className={labelCls}>Default AI Provider</span>
          <select
            className={fieldCls}
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          >
            {PROVIDERS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>

        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={humanApproval}
              onChange={(e) => setHumanApproval(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            <span className="text-sm text-text-primary">Require human approval before acting on AI output</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={auditLogging}
              onChange={(e) => setAuditLogging(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            <span className="text-sm text-text-primary">Enable audit logging for all operations</span>
          </label>
        </div>
      </section>

      {/* API Keys */}
      <section className={sectionCls}>
        <h2 className="mb-4 text-sm font-semibold text-text-primary">API Keys</h2>
        <p className="mb-4 text-xs text-text-muted">
          Keys stored at organisation level. They take precedence over environment variables.
          Leave blank to keep the current value.
        </p>

        <div className="space-y-4">
          <label className="block">
            <span className={labelCls}>
              DeepSeek API Key{" "}
              {settings?.deepseekApiKeySet ? (
                <span className="text-green-600 dark:text-green-400">(configured)</span>
              ) : (
                <span className="text-text-muted">(not set)</span>
              )}
            </span>
            <input
              className={fieldCls}
              type="password"
              value={deepseekKey}
              onChange={(e) => setDeepseekKey(e.target.value)}
              placeholder={settings?.deepseekApiKeySet ? "•••••••• (set via .env or previous save)" : "sk-..."}
            />
          </label>

          <label className="block">
            <span className={labelCls}>
              OpenAI API Key{" "}
              {settings?.openaiApiKeySet ? (
                <span className="text-green-600 dark:text-green-400">(configured)</span>
              ) : (
                <span className="text-text-muted">(not set)</span>
              )}
            </span>
            <input
              className={fieldCls}
              type="password"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder={settings?.openaiApiKeySet ? "•••••••• (set via previous save)" : "sk-..."}
            />
          </label>

          <label className="block">
            <span className={labelCls}>
              Local AI URL{" "}
              {settings?.localAiUrlSet ? (
                <span className="text-green-600 dark:text-green-400">(configured)</span>
              ) : (
                <span className="text-text-muted">(not set)</span>
              )}
            </span>
            <input
              className={fieldCls}
              type="text"
              value={localUrl}
              onChange={(e) => setLocalUrl(e.target.value)}
              placeholder={settings?.localAiUrlSet ? "(set via previous save)" : "http://localhost:11434"}
            />
          </label>
        </div>
      </section>

      <button
        onClick={save}
        disabled={saving}
        className="rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        style={{ backgroundColor: "var(--accent)" }}
      >
        {saving ? "Saving…" : "Save Settings"}
      </button>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
