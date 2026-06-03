"use client";

// My Team management — list, add, edit (inline), and remove team members.

import { useState, useEffect } from "react";
import { Toast, type ToastState } from "./Toast";

interface Person {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string | null;
  role: string;
}

export function PeopleClient({ organisationId }: { organisationId: string }) {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);

  // Add form
  const [addOpen, setAddOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [adding, setAdding] = useState(false);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFirst, setEditFirst] = useState("");
  const [editLast, setEditLast] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editIsTeamLead, setEditIsTeamLead] = useState(false);
  const [editPassword, setEditPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPeople();
  }, [organisationId]);

  async function fetchPeople() {
    setLoading(true);
    try {
      const res = await fetch(`/api/people?organisationId=${organisationId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed");
      setPeople(data.people);
    } catch (e) {
      setToast({ type: "error", message: e instanceof Error ? e.message : "Failed" });
    } finally {
      setLoading(false);
    }
  }

  function startEdit(p: Person) {
    setEditingId(p.id);
    setEditFirst(p.firstName);
    setEditLast(p.lastName);
    setEditTitle(p.jobTitle ?? "");
    setEditIsTeamLead(p.role === "teamLeader");
    setEditPassword("");
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(id: string) {
    setSaving(true);
    try {
      const body: Record<string, string> = { firstName: editFirst, lastName: editLast, jobTitle: editTitle, role: editIsTeamLead ? "teamLeader" : "associate" };
      if (editPassword.trim()) body.password = editPassword.trim();
      const res = await fetch(`/api/people/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed");
      setPeople((prev) => prev.map((p) => p.id === id ? { ...p, firstName: data.firstName, lastName: data.lastName, jobTitle: data.jobTitle, role: data.role } : p));
      setEditingId(null);
      setToast({ type: "success", message: editPassword.trim() ? "Updated — password changed" : "Updated" });
    } catch (e) {
      setToast({ type: "error", message: e instanceof Error ? e.message : "Failed" });
    } finally {
      setSaving(false);
    }
  }

  async function addPerson() {
    setAdding(true);
    try {
      const res = await fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organisationId, firstName, lastName, email, jobTitle: jobTitle || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed");
      setPeople((prev) => [...prev, data]);
      setToast({ type: "success", message: `${data.firstName} ${data.lastName} added. Password: ${data.generatedPassword}` });
      setAddOpen(false);
      setFirstName(""); setLastName(""); setEmail(""); setJobTitle("");
    } catch (e) {
      setToast({ type: "error", message: e instanceof Error ? e.message : "Failed" });
    } finally {
      setAdding(false);
    }
  }

  async function removePerson(id: string, name: string) {
    try {
      const res = await fetch(`/api/people/${id}?organisationId=${organisationId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed");
      setPeople((prev) => prev.filter((p) => p.id !== id));
      setToast({ type: "success", message: `${name} removed` });
    } catch (e) {
      setToast({ type: "error", message: e instanceof Error ? e.message : "Failed" });
    }
  }

  const fieldCls = "w-full rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-sm text-text-primary focus:border-border-strong focus:outline-none";

  if (loading) return <p className="text-sm text-text-muted">Loading…</p>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-text-muted">{people.length} team members</span>
        <button
          onClick={() => setAddOpen(true)}
          className="rounded-md px-3 py-1.5 text-sm font-semibold text-white"
          style={{ backgroundColor: "var(--accent)" }}
        >
          Add Team Member
        </button>
      </div>

      {people.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface-raised p-6 text-center text-sm text-text-muted">
          No people in this organisation.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface-raised shadow-sm">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-text-muted">
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Title</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => {
                const isEditing = editingId === p.id;
                return (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <div className="flex gap-1.5">
                        <input className="w-28 rounded border border-border bg-surface-raised px-1.5 py-1 text-sm text-text-primary" value={editFirst} onChange={(e) => setEditFirst(e.target.value)} />
                        <input className="w-28 rounded border border-border bg-surface-raised px-1.5 py-1 text-sm text-text-primary" value={editLast} onChange={(e) => setEditLast(e.target.value)} />
                      </div>
                    ) : (
                      <span className="font-medium text-text-primary cursor-pointer hover:underline flex items-center gap-1.5" onClick={() => startEdit(p)} title="Click to edit name">
                        {p.firstName} {p.lastName}
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3 w-3 text-text-muted opacity-0 group-hover:opacity-100"><path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z"/></svg>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{p.email}</td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <div>
                        <input className="w-32 rounded border border-border bg-surface-raised px-1.5 py-1 text-sm text-text-primary" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Job title" />
                        <label className="mt-1 flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
                          <input type="checkbox" checked={editIsTeamLead} onChange={(e) => setEditIsTeamLead(e.target.checked)} className="rounded" />
                          Team Leader
                        </label>
                        <input className="mt-1.5 w-28 rounded border border-border bg-surface-raised px-1.5 py-1 text-sm text-text-primary" type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="New password" />
                      </div>
                    ) : (
                      <span className="text-text-secondary cursor-pointer hover:underline" onClick={() => startEdit(p)}>
                        {p.jobTitle ?? "—"}{p.role === "teamLeader" ? <span className="ml-1 text-[10px] font-semibold text-white px-1.5 py-0.5 rounded-full" style={{backgroundColor: "var(--accent)"}}>TL</span> : ""}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isEditing ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => saveEdit(p.id)} disabled={saving} className="rounded px-2 py-1 text-xs font-semibold text-white" style={{ backgroundColor: "var(--success)" }}>
                          {saving ? "…" : "Save"}
                        </button>
                        <button onClick={cancelEdit} className="rounded border border-border px-2 py-1 text-xs text-text-secondary hover:bg-surface">Cancel</button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => startEdit(p)} className="rounded p-1 text-text-muted hover:bg-surface hover:text-text-primary" title="Edit">
                          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4"><path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z"/></svg>
                        </button>
                        <button
                        onClick={() => removePerson(p.id, `${p.firstName} ${p.lastName}`)}
                        className="rounded p-1 text-text-muted hover:bg-surface hover:text-danger"
                        title="Remove"
                      >
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                          <path d="M2 4h12M5.333 4V2.667a1.333 1.333 0 011.334-1.334h2.666a1.333 1.333 0 011.334 1.334V4m2 0v9.333a1.333 1.333 0 01-1.334 1.334H4.667a1.333 1.333 0 01-1.334-1.334V4h9.334z" />
                        </svg>
                      </button>
                      </div>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add modal */}
      {addOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4" onClick={() => setAddOpen(false)}>
          <div className="w-full max-w-md rounded-lg border border-border bg-surface-raised p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-text-primary">Add team member</h2>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-text-secondary">First name</span>
                <input className={fieldCls} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-text-secondary">Last name</span>
                <input className={fieldCls} value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-text-secondary">Email</span>
                <input className={fieldCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-text-secondary">Job title</span>
                <input className={fieldCls} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Partner, Associate" />
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={addPerson} disabled={adding || !firstName || !lastName || !email} className="rounded-md px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: "var(--accent)" }}>
                {adding ? "Adding…" : "Add person"}
              </button>
              <button onClick={() => setAddOpen(false)} className="rounded-md border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-surface">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
