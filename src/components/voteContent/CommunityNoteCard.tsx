import React, { useState } from 'react';

import { LinkIcon, UserIcon } from '@heroicons/react/20/solid';

import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

interface CommunityNoteCardProps {
    longformEN: string;
    longformCN: string;
    longformLinks: string[];
}

// Helper function to detect URLs and split the text
const splitTextByUrls = (text: string) => {
    // This regex will match URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    let match;
    let lastIndex = 0;
    const parts = [];
  
    // Find al matches and their indices
    while ((match = urlRegex.exec(text)) !== null) {
      const url = match[0];
      const index = match.index;
  
      // Push text before URL
      if (index > lastIndex) {
        parts.push({ text: text.substring(lastIndex, index), isUrl: false });
      }
  
      // Push URL
      parts.push({ text: url, isUrl: true });
  
      // Update lastIndex to end of current URL
      lastIndex = index + url.length;
    }
  
    // Push remaining text after last URL
    if (lastIndex < text.length) {
      parts.push({ text: text.substring(lastIndex), isUrl: false });
    }
  
    return parts;
  };

export default function CommunityNoteCard(props: CommunityNoteCardProps) {
    const [isExpanded, setIsExpanded] = useState<Boolean>(false);
    const lengthBeforeTruncation = 300; 
    const { longformEN, longformCN, longformLinks} = props;
    let displayText = longformEN ?? "";

    const toggleExpansion = () => {
        setIsExpanded(!isExpanded);
      };

    const shouldTruncate = displayText.length > lengthBeforeTruncation;
    const textToShow = 
        isExpanded || !shouldTruncate
        ? displayText 
        : displayText.slice(0, lengthBeforeTruncation) + "...";

    // Split text by URLs 
    const textParts = splitTextByUrls(textToShow);

    return (
        <Card className="bg-blue-100 p-3 mx-3 my-2">
            <CardContent className="-m-2">
                <div className="flex items-center my-3">
                    <UserIcon className="h-6 w-6 text-[#ff8932] mr-2 flex-shrink-0" />
                    <p className="font-semibold text-slate-700 leading-none">Community Note :</p>
                </div>

                <div className="w-full">
                    {textParts.map((part, index) => {
                        // Split the text part by new lines
                        const lines = part.text.split("\n");

                        return (
                            <React.Fragment key={index}>
                                {lines.map((line, lineIndex) => (
                                    <React.Fragment key={lineIndex}>
                                        {part.isUrl ? (
                                            <a
                                                href={line}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-500 hover:underline"
                                            >
                                                {line}
                                            </a>
                                        ) : (
                                            <span>{line}</span>
                                        )}
                                        {lineIndex < lines.length - 1 && <br />}
                                    </React.Fragment>
                                ))}
                            </React.Fragment>
                        );
                    })}
                </div>
                {shouldTruncate && (
                    <Button
                        onClick={toggleExpansion}
                        variant="ghost"
                        className="p-0 text-indigo-500 hover:bg-transparent hover:text-indigo-700"
                    >
                        {isExpanded ? "Show Less" : "Read More"}
                    </Button>
                )}
            </CardContent>
            {longformLinks.length > 0 ? (
                <>
                    <div className="px-4 py-2">
                        <p className="font-semibold leading-none">Reference Links: </p>
                    </div>
                    <ul className="px-4 list-disc pt-1">
                        {longformLinks.map((link) => {
                            return (
                                <li className="flex gap-x-2"
                                    key={link}>
                                    <LinkIcon
                                        aria-hidden="true"
                                        className="h-6 w-5 flex-none"
                                    />
                                    <a
                                        href={link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline  break-all"
                                    >
                                        {link}
                                    </a>
                                </li>
                            )
                        })}
                    </ul>
                </>
            ): null}

        </Card>
    )
}