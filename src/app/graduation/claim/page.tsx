import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";

import { ClaimCertificateForm } from "./ClaimCertificateForm";

export default async function ClaimCertificatePage() {
  const session = await auth();
  if (!session?.user) redirect("/unauthorized");

  const { env } = getCloudflareContext();

  const checkerResult = await env.CHECKERS_DB_SERVICE.findOneChecker({ _id: session.user.id });
  const checker = checkerResult.data;

  if (!checker || !checker.hasCompletedProgramme) {
    redirect("/dashboard");
  }

  // Look for a completed programme still awaiting a certificate.
  const pendingResult = await env.CHECKERS_DB_SERVICE.findProgrammes(
    { checkerId: session.user.id, status: "completed", certificateUrl: null },
    { sort: { completedAt: -1 } }
  );
  const pendingProgramme = pendingResult.data?.[0];

  if (!pendingProgramme) {
    // Either never graduated or certificate already issued — show the existing cert if any.
    if (checker.certificateUrl) {
      return (
        <div className="p-6 max-w-md mx-auto flex flex-col gap-4">
          <h1 className="text-xl font-semibold">Your certificate is ready</h1>
          <p className="text-sm text-gray-600">
            You've already claimed your certificate. You can view it below.
          </p>
          <a
            href={checker.certificateUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex justify-center rounded-md bg-primary px-4 py-2 text-primary-foreground"
          >
            View your certificate
          </a>
        </div>
      );
    }
    redirect("/dashboard");
  }

  return <ClaimCertificateForm checkerId={session.user.id} initialName={checker.name ?? ""} />;
}
