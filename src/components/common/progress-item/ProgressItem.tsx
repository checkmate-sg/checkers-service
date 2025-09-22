'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TooltipContent } from '@radix-ui/react-tooltip';
import { IconHelp } from '@tabler/icons-react';

interface ProgressItemProps {
    name: string;
    imgSrc: string;
    currentNum: number;
    targetNum: number;
    isPercentageTarget?: boolean;
    tooltipHeader: string;
    tooltipDescription: React.ReactNode;
    extra?: React.ReactNode;
}

export const ProgressItem = (Prop: ProgressItemProps) => {
    const progressValue = Prop.isPercentageTarget
    ? parseFloat(Math.min(Prop.currentNum, 100).toFixed(2))
    : parseFloat(Math.min((Prop.currentNum / Prop.targetNum) * 100, 100).toFixed(2));

    const targetPosition = Math.min((Prop.targetNum / 100) * 100, 100);

    const targetString = `${Prop.currentNum} / ${Prop.targetNum}`;

    const barColor = Prop.isPercentageTarget
    ? Prop.currentNum < Prop.targetNum
      ? "[&>div]:bg-red-500"
      : "[&>div]:bg-green-500"
    : "[&>div]:bg-primary";

    return (
        <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center gap-3 justify-center">
                <CardTitle className="text-base font-normal">
                    {Prop.imgSrc ? (
                        <img src={Prop.imgSrc}
                        alt="vote logo" 
                        className="h-16 w-16 rounded-xl object-contain mx-auto my-2" />
                    ): null}
                    {Prop.name}
                    <TooltipProvider delayDuration={0}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button 
                                    type="button"
                                    className="inline-flex h-6 w-6 items-center justify-center rounded-full p-0.5"
                                    aria-label="More info">
                                    <IconHelp className="h-4 w-4"/>
                                </button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-card-foreground z-50 max-w-xs p-3 rounded-md">
                                <div className="text-sm font-medium text-card">
                                    {Prop.tooltipHeader}
                                </div>
                                <div className="text-xs text-card mt-1 leading-relaxed">
                                    {Prop.tooltipDescription}
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {!Prop.isPercentageTarget && (
                    <div className="flex items-baseline justify-between text-sm text-primary">
                    <div className="font-semibold">
                        <h6>
                        {Prop.currentNum / Prop.targetNum < 0.75
                            ? "Some way to go..."
                            : Prop.currentNum / Prop.targetNum < 1
                            ? "Almost there..."
                            : "Completed ✅"}
                        </h6>
                    </div>
                    <div className="font-medium">
                        {targetString}
                    </div>
                </div>
                )}
                {Prop.isPercentageTarget && (
                    <div className="mb-2 flex items-center justify-between">
                        <div className="relative w-full pb-3">
                            <h6
                            className="absolute transform -translate-x-1/2 text-primary-color"
                            style={{ left: `${targetPosition-3}%` }}
                            >
                            {`${Prop.targetNum}%`}
                            </h6>
                        </div>
                    </div>
                    )}  
                <div className="relative w-full p-1">
                    <Progress 
                        value={progressValue} 
                        className={barColor}/>
                    {Prop.isPercentageTarget && (
                        <div
                            className="absolute top-0 left-0 h-full border-l-4 border-primary"
                            style={{ left: `${targetPosition - 3}%` }}
                        ></div>
                        )}
                </div>
            </CardContent>
        </Card>
    )
}