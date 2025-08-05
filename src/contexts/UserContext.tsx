"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface CheckerDetails {
  checkerId: string | null;
  checkerName: string | null;
  telegramId: string | null;
  isOnboardingComplete: boolean | null;
}

interface UserContextType extends CheckerDetails {
  setCheckerDetails: (
    updater: (prev: CheckerDetails) => CheckerDetails
  ) => void;
  clearCheckerDetails: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [checkerDetails, setCheckerDetailsState] = useState<CheckerDetails>({
    checkerId: null,
    checkerName: null,
    telegramId: null,
    isOnboardingComplete: null,
  });

  const setCheckerDetails = (
    updater: (prev: CheckerDetails) => CheckerDetails
  ) => {
    setCheckerDetailsState(updater);
  };

  const clearCheckerDetails = () => {
    setCheckerDetailsState({
      checkerId: null,
      checkerName: null,
      telegramId: null,
      isOnboardingComplete: null,
    });
  };

  return (
    <UserContext.Provider
      value={{
        ...checkerDetails,
        setCheckerDetails,
        clearCheckerDetails,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
