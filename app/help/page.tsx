import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

export const metadata = { title: "Help" };

const FAQ = [
  { q: "What is Sentinel AI?", a: "Sentinel AI is a contract review platform that uses AI to extract clauses from legal documents, compare them against your approved templates, flag deviations, and let your team review and approve changes." },
  { q: "How do I upload a contract?", a: "Go to Documents → click 'Upload Contract' → select a file (PDF, DOCX, or TXT) → enter the company name → select a template to compare against (required) → upload. AI review runs automatically." },
  { q: "What happens after I upload?", a: "The system extracts clauses, matches them against your template, checks against approved KB clauses, and runs an AI review — all automatically. You'll see a risk score and clauses needing attention immediately." },
  { q: "How do I review a document?", a: "Open the document with 'Review →' → only clauses needing attention are shown. Click Accept, Edit, or Flag for each. STANDARD clauses that match the template are hidden." },
  { q: "How do I make a final decision?", a: "Once all non-STANDARD clauses are accepted, a blue 'Ready for Final Decision' box appears on the right. Click 'Record Final Decision' → choose an outcome → confirm. Your name is auto-filled." },
  { q: "What are Knowledge Entries?", a: "Knowledge Entries are best practices and decision patterns stored for future reference. Click 'Save for future contracts' after accepting a clause to add it to the approved clauses knowledge base." },
  { q: "What are Approved Clauses?", a: "Approved Clauses are your standard boilerplate clauses used during AI analysis to auto-match incoming clauses. Upload standard contracts in the Templates tab to populate them." },
  { q: "Who can see what?", a: "Admin: everything including Settings and People. Team Leader: everything except Settings. Associate: Documents, Clauses, Decisions, Knowledge only." },
  { q: "How do I change a password?", a: "Go to My Team → click a name → enter new password in the field → Save. All accounts default to admin123 on creation." },
  { q: "What do the risk levels mean?", a: "LOW = matches standard, MEDIUM = minor deviation, HIGH = significant deviation, CRITICAL = unacceptable. The risk score drops as clauses are reviewed." },
  { q: "Can I download an approved document?", a: "Yes — once a document is approved, a green 'Download Document' button appears on the document detail page and in the documents list." },
];

export default function HelpPage() {
  return (
    <div>
      <PageHeader title="Help & FAQ" subtitle="How to use Sentinel AI" />

      {/* Quick start */}
      <section className="mb-6 rounded-lg border border-border bg-surface-raised p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-text-primary mb-2">Quick Start</h2>
        <ol className="list-decimal list-inside space-y-1 text-sm text-text-secondary">
          <li><Link href="/documents" className="text-text-primary hover:underline" style={{ textDecorationColor: "var(--accent)" }}>Upload a contract</Link> — select a file, enter company name, pick a template</li>
          <li><strong>AI review runs automatically</strong> — clauses extracted, matched, risk-scored</li>
          <li><strong>Review clauses:</strong> Accept, Edit, or Flag each item needing attention</li>
          <li><strong>Record final decision:</strong> Approve or Reject when all clauses are reviewed</li>
          <li><strong>Download</strong> the approved document, or save clause edits for future contracts</li>
        </ol>
      </section>

      {/* FAQ */}
      <section className="rounded-lg border border-border bg-surface-raised p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-text-primary mb-3">FAQ</h2>
        <div className="space-y-4">
          {FAQ.map((item) => (
            <div key={item.q} className="border-b border-border pb-4 last:border-0 last:pb-0">
              <h3 className="text-sm font-medium text-text-primary mb-1">{item.q}</h3>
              <p className="text-sm text-text-secondary">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-4 text-center text-xs text-text-muted">
        Need more help? Contact your administrator.
      </div>
    </div>
  );
}
