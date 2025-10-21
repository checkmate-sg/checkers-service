"use client";

import { Info } from 'lucide-react';

import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

interface TooltipProps{
    header: string;
    text: string | React.ReactNode;
}

export default function TooltipWithHelperIcon({
    header,
    text
} : TooltipProps) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    type="button"
                    aria-label={`${header} help`}
                    className="inline-flex items-center rounded-md p-1 text-blue-gray-500 bg-transparent hover:bg-transparent">
                        <Info />
                </Button>
            </TooltipTrigger>

            <TooltipContent
                side="top"
                align="center"
                className="p-3">
                    <div>
                        <h3 className="text-sm font-medium leading-snug text-black">
                            {header}
                        </h3>
                        <p className="mt-1 text-sm font-normal text-black/80">
                            {text}
                        </p>
                    </div>
            </TooltipContent>
        </Tooltip>
    )
}