"use client";

import { Info } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

interface TooltipProps {
  header: string;
  text: string | React.ReactNode;
}

export default function TooltipWithHelperIcon({ header, text }: TooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          aria-label={`${header} help`}
          className="inline-flex items-center rounded-md p-1 text-blue-gray-500 cursor-pointer"
          onClick={e => e.stopPropagation()}
        >
          <Info />
        </span>
      </TooltipTrigger>

      <TooltipContent side="top" align="center" className="p-3">
        <div>
          <h3 className="text-sm font-medium leading-snug text-black">{header}</h3>
          <p className="mt-1 text-sm font-normal text-black/80">{text}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
