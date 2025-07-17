export const dynamic = "force-dynamic";

("use client");

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return <p>Redirecting to dashboard...</p>;
}
