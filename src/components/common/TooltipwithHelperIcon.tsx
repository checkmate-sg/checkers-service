"use client";

import { Info } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

interface TooltipProps {
  header: string;
  text: string | React.ReactNode;
}

export default function TooltipWithHelperIcon({ header, text }: TooltipProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          aria-label={`${header} help`}
          className="inline-flex items-center rounded-md p-1 text-blue-gray-500 cursor-pointer"
          onClick={e => e.stopPropagation()}
          onPointerDown={e => e.stopPropagation()}
        >
          <Info />
        </span>
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="center"
        collisionPadding={16}
        className="max-w-[calc(100vw-32px)] w-64 p-3"
      >
        <div>
          <h3 className="text-sm font-medium leading-snug text-black">{header}</h3>
          <p className="mt-1 text-sm font-normal text-black/80">{text}</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
