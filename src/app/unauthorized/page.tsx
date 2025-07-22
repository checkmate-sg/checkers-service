"use client";

import { useEffect } from "react";
import { useSession, signIn } from "next-auth/react";

const UnauthorizedPage = () => {
  // const { data: session, status } = useSession();

  // useEffect(() => {
  //   console.log("[UnauthorizedPage] useSession status:", status);
  //   console.log("[UnauthorizedPage] session data:", session);

  //   const checkTelegramInitData = () => {
  //     if (typeof window !== "undefined" && window.Telegram?.WebApp) {
  //       console.log("[UnauthorizedPage] Telegram SDK loaded");
  //       console.log(
  //         "[UnauthorizedPage] Telegram initData:",
  //         window.Telegram.WebApp.initData
  //       );

  //       if (!session && window.Telegram.WebApp.initData) {
  //         console.log(
  //           "[UnauthorizedPage] Attempting re-signin with initData..."
  //         );
  //         signIn("credentials", {
  //           redirect: false,
  //           initData: window.Telegram.WebApp.initData,
  //         }).then((res) => {
  //           console.log("[UnauthorizedPage] Sign-in result:", res);
  //           if (res?.ok) {
  //             window.location.reload();
  //           }
  //         });
  //       }
  //     } else {
  //       console.warn("[UnauthorizedPage] Telegram SDK not loaded yet");
  //     }
  //   };

  //   checkTelegramInitData();
  // }, [session, status]);

  return (
    <div className="text-center p-6 text-red-600">
      <h1 className="text-3xl font-bold">Access Denied</h1>
      <p>You are not authorized to use this app.</p>
    </div>
  );
};

export default UnauthorizedPage;
