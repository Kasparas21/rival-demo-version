"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { formatQuotePrice } from "@/lib/billing/custom-quotes";

type Quote = {
  id: string;
  user_id: string;
  status: string;
  price_cents: number;
  currency: string;
  billing_period: string;
  sent_at: string | null;
  created_at: string;
};

export default function AdminQuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      const res = await fetch(`/api/admin/quotes?${params.toString()}`);
      const json = (await res.json()) as { quotes?: Quote[] };
      setQuotes(json.quotes ?? []);
      setLoading(false);
    }
    void load();
  }, [status]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Quotes pipeline</h1>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="accepted">Accepted</option>
          <option value="expired">Expired</option>
          <option value="revoked">Revoked</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-100 bg-zinc-50 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Sent</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                  Loading…
                </td>
              </tr>
            ) : quotes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                  No quotes.
                </td>
              </tr>
            ) : (
              quotes.map((q) => (
                <tr key={q.id} className="border-b border-zinc-50">
                  <td className="px-4 py-3 font-medium">{q.status}</td>
                  <td className="px-4 py-3">
                    {formatQuotePrice(q.price_cents, q.currency)} / {q.billing_period}
                  </td>
                  <td className="px-4 py-3">{new Date(q.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {q.sent_at ? new Date(q.sent_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/users/${q.user_id}`} className="text-sky-600 hover:underline">
                      User
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
