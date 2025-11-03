import { useState } from 'react';

import { Category, ResponseCategory } from '@/lib/request/external/lib/data-contracts';
import { AccordionContent } from '@radix-ui/react-accordion';

import { Accordion, AccordionItem, AccordionTrigger } from '../ui/accordion';
import CommunityNoteCategories from './CommunityNoteCategories';
import DoneButton from './DoneButton';
import VoteCategories from './VoteCategories';

interface VotingSystemProps {
    voteRequestId: string;
    category: Category | null;
    truthScore: number | null;
    responseCategory: ResponseCategory | null;
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
    const [voteCategory, setVoteCategory] = useState<Category | null>(props.category);
    const [truthScore, setTruthScore] = useState<number | null>(props.truthScore);
    const [crowdSourcedCategory, setCrowdSourcedCategory] = useState<ResponseCategory | null>(props.responseCategory);

    const handleNextStep = (value: number) => {
        // Enable the next accordion and open it automatically 
        setOpenItems((prev) => [...prev, value]);
    }

    const onNextStep = (value: number) => {
        handleNextStep(value);
    }

    const handleVoteCategorySelection = (value: Category) => {
        setVoteCategory(value);
    }

    const handleTruthScoreChange = (value: number | null) => {
        setTruthScore(value);
    }

    const handleCrowdSourcedCategory = (value: ResponseCategory ) => {
        console.log(value);
        setCrowdSourcedCategory(value);
    }

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
                value={openItems.map(String)} 
                onValueChange={(v) => setOpenItems((v as string[]).map(Number))}
            >
                <AccordionItem
                    value="1"
                    disabled={false}
                    className={`mb-6 rounded-lg border px-2 relative ${openItems.includes(1) ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-50" : "border-blue-gray-200"}`}>
                        <div className="pl-3">
                            <AccordionTrigger className="text-primary font-bold border-b-0 after:hidden focus:outline-none focus:ring-0">
                                Select message category: 
                            </AccordionTrigger>
                            <StepBadge n={1} />
                        </div>

                        <AccordionContent className="px-4 text-base font-normal">
                            <VoteCategories 
                                category={voteCategory}
                                truthScore={truthScore}
                                onNextStep={onNextStep}
                                onVoteCategorySelection={handleVoteCategorySelection}
                                onTruthScoreChange={handleTruthScoreChange}/>
                        </AccordionContent>
                </AccordionItem>

                <AccordionItem 
                    value="2" 
                    disabled={false}
                    className={`mb-2 rounded-lg border px-2 relative ${openItems.includes(1) ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-50" : "border-blue-gray-200"}`}>
                        <div className="pl-3">
                            <AccordionTrigger className="text-primary font-bold border-b-0 after:hidden focus:outline-none focus:ring-0">
                                Rate Community Note:
                            </AccordionTrigger>
                            <StepBadge n={2} />
                        </div>

                        <AccordionContent className="px-4 text-base font-normal">
                           <CommunityNoteCategories 
                              crowdSourcedCategory={props.responseCategory}
                              onCrowdSourcedCategorySelection={handleCrowdSourcedCategory}
                            />

                            {voteCategory && crowdSourcedCategory ? (
                                <DoneButton 
                                    voteRequestId={props.voteRequestId}
                                    voteCategory={voteCategory}
                                    truthScore={truthScore}
                                    crowdSourcedCategory={crowdSourcedCategory}
                                />
                            ): null}
                        </AccordionContent>
                </AccordionItem>
            </Accordion>
       </div>
    )
}