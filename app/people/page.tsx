// My Team — manage organisation members. Admin + Team Leader only.

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDefaultOrganisation } from "@/lib/org";
import { PageHeader } from "@/components/PageHeader";
import { PeopleClient } from "@/components/PeopleClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Team" };

export default async function PeoplePage() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (role !== "admin" && role !== "teamLeader") redirect("/");

  const org = await getDefaultOrganisation();
  if (!org) return <p className="text-text-secondary">No organisation found.</p>;

  return (
    <div>
      <PageHeader title="My Team" subtitle="Manage your team members" />
      <PeopleClient organisationId={org.id} />
    </div>
  );
}
