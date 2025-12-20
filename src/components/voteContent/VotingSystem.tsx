import { useState } from 'react';

import { Category, Response, ResponseCategory } from '@/lib/request/external/lib/data-contracts';
import { AccordionContent } from '@radix-ui/react-accordion';

import { Accordion, AccordionItem, AccordionTrigger } from '../ui/accordion';
import CommunityNoteCard from './CommunityNoteCard';
import CommunityNoteCategories from './CommunityNoteCategories';
import DoneButton from './DoneButton';
import VoteCategories from './VoteCategories';

interface VotingSystemProps {
  voteRequestId: string;
  category: Category | null;
  truthScore: number | null;
  responseCategory: ResponseCategory | null;
  commentOnResponse: string | null;
  showNoteAfterVote: boolean;
  shortformResponse: Response;
}

interface IconProps {
  id: number;
  open: number | undefined;
}

export default function VotingSystem(props: VotingSystemProps) {
  // local state mirrors the original behaviour
  const [openItems, setOpenItems] = useState<string>('1');
  const [voteCategory, setVoteCategory] = useState<Category | null>(props.category);
  const [truthScore, setTruthScore] = useState<number | null>(props.truthScore);
  const [crowdSourcedCategory, setCrowdSourcedCategory] = useState<ResponseCategory | null>(
    props.responseCategory
  );

  // Check if community note exists
  const hasCommunityNote = props.shortformResponse.en !== null;

  // Check if step 1 is completed
  const isStep1Completed = () => {
    if (voteCategory === null) return false;
    if (voteCategory === 'info') return truthScore !== null;
    return true;
  };

  const handleNextStep = (value: number) => {
    // Enable the next accordion and open it automatically
    setOpenItems(String(value));
  };

  const onNextStep = (value: number) => {
    handleNextStep(value);
  };

  const handleVoteCategorySelection = (value: Category) => {
    setVoteCategory(value);
  };

  const handleTruthScoreChange = (value: number | null) => {
    setTruthScore(value);
  };

  const handleCrowdSourcedCategory = (value: ResponseCategory) => {
    console.log(value);
    setCrowdSourcedCategory(value);
  };

  const StepBadge = ({ n }: { n: number }) => (
    <span
      className="ml-2 absolute top-0 left-0 transform -translate-y-1/2 -translate-x-1/2 grid h-8 w-8 place-items-center rounded-full bg-amber-700 text-md font-medium leading-none text-white"
      aria-hidden
    >
      {n}
    </span>
  );

  return (
    <div>
      <Accordion
        type="single"
        collapsible
        value={openItems}
        onValueChange={setOpenItems}
      >
        <AccordionItem
          value="1"
          className={`mb-6 mx-2 rounded-lg border px-2 relative ${openItems.includes('1') ? 
                    "ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-50" 
                    : "border-blue-gray-200"}`}
        >
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
              disabled={props.showNoteAfterVote}
              onNextStep={onNextStep}
              onVoteCategorySelection={handleVoteCategorySelection}
              onTruthScoreChange={handleTruthScoreChange}
              hasCommunityNote={hasCommunityNote}
            />

            {isStep1Completed() && !hasCommunityNote ? (
               <DoneButton
                 voteRequestId={props.voteRequestId}
                 voteCategory={voteCategory}
                 truthScore={truthScore}
               />
             ) : null}
          </AccordionContent>
        </AccordionItem>
        
        {(props.showNoteAfterVote && isStep1Completed() && hasCommunityNote) ? (
            <CommunityNoteCard
            responseEN={props.shortformResponse.en}
            responseCN={props.shortformResponse.cn}
            responseLinks={props.shortformResponse.links}
          />
        ): null}
        {hasCommunityNote? (
           <AccordionItem
           value="2"
           className={`mb-2 mt-6 mx-2 rounded-lg border px-2 relative ${openItems.includes('2') ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-50" : "border-blue-gray-200"}`}
         >
           <div className="pl-3">
             <AccordionTrigger className="text-primary font-bold border-b-0 after:hidden focus:outline-none focus:ring-0">
               Rate Community Note:
             </AccordionTrigger>
             <StepBadge n={2} />
           </div>
 
           <AccordionContent className="px-4 text-base font-normal">
             <CommunityNoteCategories
               crowdSourcedCategory={crowdSourcedCategory}
               onCrowdSourcedCategorySelection={handleCrowdSourcedCategory}
             />
 
             {isStep1Completed() && crowdSourcedCategory ? (
               <DoneButton
                 voteRequestId={props.voteRequestId}
                 voteCategory={voteCategory}
                 truthScore={truthScore}
                 crowdSourcedCategory={crowdSourcedCategory}
               />
             ) : null}
           </AccordionContent>
         </AccordionItem>
        ): null}
      </Accordion>
    </div>
  );
}
