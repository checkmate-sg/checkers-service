import { useState } from 'react';

import { AccordionContent } from '@radix-ui/react-accordion';

import { Accordion, AccordionItem, AccordionTrigger } from '../ui/accordion';
import VoteCategories from './VoteCategories';

interface VotingSystemProps {
    voteRequestId: string;
    category: string | null;
    truthScore: number | null;
    responseCategory: string | null;
    commentOnResponse: string | null;
}

interface IconProps {
    id: number;
    open: number | undefined;
}

export default function VotingSystem(
    props: VotingSystemProps
) {
    // local state mirrors the original behaviour
    const [openItems, setOpenItems] = useState<number[]>([1]);


    const StepBadge = ({ n }: { n: number }) => (
        <span
        className="ml-2 absolute top-0 left-0 transform -translate-y-1/2 -translate-x-1/2 grid h-8 w-8 place-items-center rounded-full bg-amber-700 text-md font-medium leading-none text-white"
        aria-hidden
        >
        {n}
        </span>
        );

    return (
       <div className="mx-3">
            <Accordion
                type="multiple"
                value={openItems.map(String)} onValueChange={(v) => setOpenItems((v as string[]).map(Number))}
            >
                <AccordionItem 
                    value="1" 
                    disabled={false}
                    className={`mb-2 rounded-lg border px-2 relative ${openItems.includes(1) ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-50" : "border-blue-gray-200"}`}>
                        <div className="pl-3">
                            <AccordionTrigger className="text-primary font-bold border-b-0 after:hidden focus:outline-none focus:ring-0">
                                Select message category: 
                            </AccordionTrigger>
                            <StepBadge n={1} />
                        </div>

                        <AccordionContent className="px-4 text-base font-normal">
                            <VoteCategories 
                                category={props.category}
                                truthScore={props.truthScore}/>
                        </AccordionContent>
                </AccordionItem>
            </Accordion>
       </div>
    )
}