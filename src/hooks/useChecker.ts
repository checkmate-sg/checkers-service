import { useEffect, useState } from "react";

export function useChecker() {
  const [checker, setChecker] = useState<any>(null);

  useEffect(() => {
    fetch("/api/checker")
      .then((res) => res.json())
      .then(setChecker);
  }, []);

  return checker;
}
