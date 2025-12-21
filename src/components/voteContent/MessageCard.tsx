"use client";

import normalizeUrl from 'normalize-url';
import React, { useState } from 'react';
import urlRegexSafe from 'url-regex-safe';

import { ChatBubbleLeftEllipsisIcon } from '@heroicons/react/20/solid';

import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

interface MessageCardProps {
  text: string | null;
  caption: string | null;
  imageUrl: string | null;
}
// Helper function to detect URLs and split the text
const splitTextByUrls = (text: string) => {
  // This regex will match URLs
  const urlRegex = urlRegexSafe();
  let match;
  let lastIndex = 0;
  const parts = [];

  // Find all matches and their indices
  while ((match = urlRegex.exec(text)) !== null) {
    const url = match[0];
    const index = match.index;

    // Push text before URL
    if (index > lastIndex) {
      parts.push({ text: text.substring(lastIndex, index), isUrl: false });
    }

    // Push URL
    parts.push({
      text: normalizeUrl(url, { defaultProtocol: "https", stripWWW: false }),
      isUrl: true,
    });

    // Update lastIndex to end of current URL
    lastIndex = index + url.length;
  }
  // Push remaining text after last URL
  if (lastIndex < text.length) {
    parts.push({ text: text.substring(lastIndex), isUrl: false });
  }

  return parts;
};

export default function MessageCard(props: MessageCardProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const lengthBeforeTruncation = 300;
  const { text, caption, imageUrl } = props;
  let type = "text";

  if (imageUrl) {
    type = "image";
  }

  const toggleExpansion = () => {
    setIsExpanded(!isExpanded);
  };
  let displayText = "";
  if (type === "text") {
    displayText = text ?? "";
  } else {
    displayText = caption ?? "";
  }

  const shouldTruncate = displayText.length > lengthBeforeTruncation;
  const textToShow =
    isExpanded || !shouldTruncate
      ? displayText
      : displayText.slice(0, lengthBeforeTruncation) + "...";
  // Split text by URLs
  const textParts = splitTextByUrls(textToShow);

  return (
    <Card className="bg-orange-200 p-3 mx-3 my-2 border-orange-200">
      <CardContent className="-m-2">
        <div className="flex items-center my-3">
          <ChatBubbleLeftEllipsisIcon className="h-6 w-6 text-[#ff327d] mr-2 flex-shrink-0" />
          <p className="font-semibold text-slate-700 leading-none">Message :</p>
        </div>

        <div className="w-full">
          {imageUrl && displayText.length > 0 && <span className="font-bold">Caption : </span>}

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
      {type === "image" && imageUrl !== null && (
        <img src={imageUrl} alt="message-image" className="w-full object-contain rounded-xl" />
      )}
    </Card>
  );
}
