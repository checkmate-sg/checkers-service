'use client';

import { ProgressItem } from "../common/progress-item/ProgressItem";

export const CheckersDashboard = () => {
    const isProd = process.env.NODE_ENV === "production";
    
    return (
        <div className="flex flex-col gap-y-4 p-4">
            <h6 className="text-orange-600 text-lg font-semibold">
                Up for a challenge? Attain these 3 milestones to finish the
                CheckMate Checker's Program and get certified.
            </h6>
            <ProgressItem 
                name="Messages Voted On"
                imgSrc="/votes.png"
                currentNum={20}
                targetNum={50}
                isPercentageTarget={false}
                tooltipHeader="Messages Voted On"
                tooltipDescription={`Number of messages that you have voted on (passing does not count). You need to vote on at least 20 messages.`}/>

            <ProgressItem 
                name="Voting Accuracy"
                imgSrc="/accuracy.png"
                currentNum={70}
                targetNum={60}
                isPercentageTarget={true}
                tooltipHeader="Voting Accuracy (%)"
                tooltipDescription={`% of your votes that match the majority vote. You need to obtain at least 60%
              }% accuracy. Messages where the majority category does not receive 50% of the votes are excluded from this calculation.`}/>

            <ProgressItem 
                name="Messages Reported"
                imgSrc="/message.png"
                currentNum={3}
                targetNum={10}
                isPercentageTarget={false}
                tooltipHeader="Messages Reported"
                tooltipDescription={
                    <>
                    Number of messages that you have submitted to our{" "}
                    <a
                      href={
                        isProd
                          ? "https://wa.me/6580432188"
                          : "https://wa.me/6586177848"
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 underline"
                    >
                      WhatsApp Bot
                    </a>
                    . You need to submit at least 10
                    messages that are not eventually marked nvc-can't tell.
                  </>
                }/>
        </div>
    )
}