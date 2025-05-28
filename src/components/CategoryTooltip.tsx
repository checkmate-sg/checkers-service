
import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface CategoryTooltipProps {
  category: string;
}

const CategoryTooltip = ({ category }: CategoryTooltipProps) => {
  const getTooltipContent = (category: string) => {
    switch (category) {
      case "Scam":
        return "Messages attempting to defraud or steal personal/financial information";
      case "Satire":
        return "Humorous or satirical content not meant to be taken literally";
      case "Illicit":
        return "Content promoting illegal activities or services";
      case "Misleading":
        return "Information that is partially true but presented in a way that misleads";
      case "False":
        return "Completely untrue information or fabricated claims";
      case "Spam":
        return "Unsolicited bulk messages or repetitive promotional content";
      case "Legitimate":
        return "Accurate, truthful information from credible sources";
      default:
        return "Select the most appropriate category for this message";
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <HelpCircle 
          size={14} 
          className="text-gray-400 hover:text-checkmate-primary cursor-help ml-1" 
        />
      </TooltipTrigger>
      <TooltipContent 
        side="top" 
        className="max-w-48 text-xs bg-white border border-gray-200 shadow-lg z-50"
      >
        <p>{getTooltipContent(category)}</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default CategoryTooltip;
