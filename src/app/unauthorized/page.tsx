"use client";

import { useEffect } from "react";
import { useSession, signIn } from "next-auth/react";

const UnauthorizedPage = () => {
  const { data: session, status } = useSession();

  useEffect(() => {
    console.log("[UnauthorizedPage] useSession status:", status);
    console.log("[UnauthorizedPage] session data:", session);

    const initData = window.Telegram?.WebApp?.initData;
    console.log("[UnauthorizedPage] Telegram initData:", initData);

    if (!session && initData) {
      console.log("[UnauthorizedPage] Trying to sign in again with initData");
      signIn("credentials", {
        redirect: false,
        initData,
      }).then((res) => {
        console.log("[UnauthorizedPage] Sign-in attempt result:", res);
        if (res?.ok) {
          console.log("[UnauthorizedPage] Sign-in succeeded, reloading...");
          window.location.reload();
        }
      });
    }
  }, [session, status]);

  return (
    <div className="text-center p-6 text-red-600">
      <h1 className="text-3xl font-bold">Access Denied</h1>
      <p>You are not authorized to use this app.</p>
    </div>
  );
};

export default UnauthorizedPage;
