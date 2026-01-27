import { ChevronDown } from "lucide-react";
import React, { memo, useEffect, useRef } from "react";

import { Button } from "../ui/button";

interface Props {
  children?: React.ReactNode;
  onLoad?(): void;
  manual?: boolean;
  disabled?: boolean;
}

export const SimpleInfinityScroll = memo<Props>(({ onLoad, ...props }) => {
  const bottomElRef = useRef<HTMLDivElement>();

  useEffect(() => {
    if (!bottomElRef.current) return;

    const options = {
      rootMargin: "40px",
      threshold: 0.5,
    };

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) onLoad?.();
      });
    }, options);

    observer.observe(bottomElRef.current);

    return () => {
      observer.disconnect();
    };
  }, [onLoad]);

  if (typeof onLoad !== "function") return props.children;

  if (props.disabled) return props.children;

  return (
    <>
      {props.children}
      {props.manual ? (
        <div className="mt-4 text-center">
          <Button
            size="sm"
            variant="ghost"
            onClick={onLoad}
            className="inline-flex items-center gap-1"
          >
            View more
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div ref={bottomElRef} className="mb-2 h-1 w-full" aria-hidden="true" />
      )}
    </>
  );
});
