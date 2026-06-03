// Settings — editable AI provider, API keys, and toggles.
// Only visible to partner (Admin) role.

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDefaultOrganisation } from "@/lib/org";
import { PageHeader } from "@/components/PageHeader";
import { SettingsClient } from "@/components/SettingsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (role !== "admin") redirect("/");

  const org = await getDefaultOrganisation();
  if (!org) return <p className="text-text-secondary">No organisation found.</p>;

  return (
    <div>
      <PageHeader title="Settings" subtitle={org.name} />
      <SettingsClient organisationId={org.id} />
    </div>
  );
}
