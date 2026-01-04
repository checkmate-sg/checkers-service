import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface CategoryTooltipProps {
  category: string;
}

const CategoryTooltip = ({ category }: CategoryTooltipProps) => {
  const getTooltipContent = (category: string) => {
    switch (category) {
      case "Scam":
      case "Illicit":
      case "Scam/Illicit":
        return "Intended to obtain money/personal information via deception, or other illicit activity (e.g. moneylending, prostitution)";
      case "News/Info/Opinion":
        return "Content intended to inform/convince/mislead a broad base of people";
      case "Satire":
        return "Content clearly satirical in nature";
      case "Marketing/Spam":
        return "Content intended to (i) promote or publicise a non-malicious product, service or event or (ii) convice recipient to spread non-malicious messages to others";
      case "No Verifiable Content":
        return "Content that isn't capable of being checked using publicly-available information due to its nature";
      case "Unsure":
        return "Either (i) Needs more information from sender to assess, or (ii) a search of publicly available information yields no useful results";
      case "Pass":
        return "Skip this message if you're really unable to assess it";
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
