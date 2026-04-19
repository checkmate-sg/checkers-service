"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  checkerId: string;
  initialName: string;
}

const MAX_NAME_LEN = 100;

export function ClaimCertificateForm({ checkerId, initialName }: Props) {
  const [name, setName] = useState(initialName);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter a name.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/checkers/${checkerId}/certificate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message || "Failed to submit");
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="p-6 max-w-md mx-auto flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Thanks!</h1>
        <p className="text-sm text-gray-600">
          We're preparing your certificate — you'll get a Telegram message shortly with the link and
          a LinkedIn share button.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 max-w-md mx-auto flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Claim your certificate</h1>
      <div className="flex flex-col gap-2">
        <Label htmlFor="cert-name">This name will appear on your certificate.</Label>
        <Input
          id="cert-name"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={MAX_NAME_LEN}
          required
          disabled={submitting}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={submitting || !name.trim()}>
        {submitting ? "Submitting…" : "Issue my certificate"}
      </Button>
    </form>
  );
}
