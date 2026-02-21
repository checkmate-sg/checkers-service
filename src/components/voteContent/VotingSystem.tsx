import { useState } from "react";

import { Category, Response, ResponseCategory } from "@/lib/request/external/lib/data-contracts";
import { AccordionContent } from "@radix-ui/react-accordion";

import { CheckCircleIcon } from "lucide-react";

import { Accordion, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { Button } from "../ui/button";
import CommunityNoteCard from "./CommunityNoteCard";
import CommunityNoteCategories from "./CommunityNoteCategories";
import DoneButton from "./DoneButton";
import VoteCategories from "./VoteCategories";

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
  const [openItems, setOpenItems] = useState<string[]>(["1"]);
  const [isStep1Locked, setIsStep1Locked] = useState(false);
  const [voteCategory, setVoteCategory] = useState<Category | null>(props.category);
  const [truthScore, setTruthScore] = useState<number | null>(props.truthScore);
  const [crowdSourcedCategory, setCrowdSourcedCategory] = useState<ResponseCategory | null>(
    props.responseCategory
  );
  const [commentOnResponse, setCommentOnResponse] = useState<string | null>(
    props.commentOnResponse
  );

  // Check if community note exists
  const hasCommunityNote = props.shortformResponse.en !== null;

  // Check if step 1 is completed
  const isStep1Completed = () => {
    if (voteCategory === null) return false;
    if (voteCategory === "info") return truthScore !== null;
    return true;
  };

  const onNextStep = (value: number) => {
    const stepStr = String(value);
    if (props.showNoteAfterVote) {
      // A/B test mode: collapse previous sections, only show current
      setOpenItems([stepStr]);
    } else {
      // Default: keep section 1 open and also open section 2, then scroll
      setOpenItems(prev => (prev.includes(stepStr) ? prev : [...prev, stepStr]));
      // Scroll to the next section after a short delay for accordion to expand
      setTimeout(() => {
        document.getElementById(`step-${value}`)?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  const handleVoteCategorySelection = (value: Category) => {
    setVoteCategory(value);
    if (value !== "info") {
      setTruthScore(null);
    }
  };

  const handleTruthScoreChange = (value: number | null) => {
    setTruthScore(value);
  };

  const handleCrowdSourcedCategory = (value: ResponseCategory) => {
    setCrowdSourcedCategory(value);
  };

  const handleCommentOnResponse = (value: string) => {
    setCommentOnResponse(value);
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
      <Accordion type="multiple" value={openItems} onValueChange={setOpenItems}>
        <AccordionItem
          value="1"
          className={`mb-6 mx-2 rounded-lg border px-2 relative ${
            openItems.includes("1")
              ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-50"
              : "border-blue-gray-200"
          }`}
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
              disabled={isStep1Locked}
              onNextStep={props.showNoteAfterVote && !isStep1Locked ? () => {} : onNextStep}
              onVoteCategorySelection={handleVoteCategorySelection}
              onTruthScoreChange={handleTruthScoreChange}
              hasCommunityNote={hasCommunityNote}
            />

            {isStep1Completed() && (!hasCommunityNote || voteCategory === Category.Pass) ? (
              <DoneButton
                voteRequestId={props.voteRequestId}
                voteCategory={voteCategory}
                truthScore={truthScore}
              />
            ) : null}

            {props.showNoteAfterVote &&
            isStep1Completed() &&
            hasCommunityNote &&
            voteCategory !== Category.Pass &&
            !isStep1Locked ? (
              <Button
                variant="doneButton"
                className="my-5 flex items-center justify-center gap-3 w-full"
                size="sm"
                onClick={() => {
                  setIsStep1Locked(true);
                  onNextStep(2);
                }}
              >
                <CheckCircleIcon className="h-5 w-5" />
                Done!
              </Button>
            ) : null}
          </AccordionContent>
        </AccordionItem>

        {props.showNoteAfterVote &&
        isStep1Locked &&
        hasCommunityNote &&
        voteCategory !== Category.Pass ? (
          <CommunityNoteCard
            responseEN={props.shortformResponse.en}
            responseCN={props.shortformResponse.cn}
            responseLinks={props.shortformResponse.links}
          />
        ) : null}
        {hasCommunityNote &&
        voteCategory !== Category.Pass &&
        (!props.showNoteAfterVote || isStep1Locked) ? (
          <AccordionItem
            id="step-2"
            value="2"
            className={`mb-2 mt-6 mx-2 rounded-lg border px-2 relative ${openItems.includes("2") ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-50" : "border-blue-gray-200"}`}
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
                commentOnResponse={commentOnResponse}
                onCommentOnResponseChanged={handleCommentOnResponse}
              />

              {isStep1Completed() && crowdSourcedCategory ? (
                <DoneButton
                  voteRequestId={props.voteRequestId}
                  voteCategory={voteCategory}
                  truthScore={truthScore}
                  crowdSourcedCategory={crowdSourcedCategory}
                  commentOnResponse={commentOnResponse}
                />
              ) : null}
            </AccordionContent>
          </AccordionItem>
        ) : null}
      </Accordion>
    </div>
  );
}
