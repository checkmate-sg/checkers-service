
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const Index = () => {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard as the main app entry point
    router.push("/dashboard", { replace: true });
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-checkmate-secondary">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 text-checkmate-text">
          Check<span className="text-checkmate-primary">Mate</span>
        </h1>
        <p className="text-xl text-gray-600">Loading...</p>
      </div>
    </div>
  );
};

export default Index;
