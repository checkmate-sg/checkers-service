import {
  EllipsisHorizontalCircleIcon,
  FaceSmileIcon,
  HandThumbUpIcon,
  MegaphoneIcon,
  NewspaperIcon,
  QuestionMarkCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/solid";

interface VoteResultProps {
  category: string | null;
  truthScore: number | null;
}

export default function VoteResult(Prop: VoteResultProps) {
  const getIconAndName = () => {
    let catIcon, catName;

    switch (Prop.category) {
      case "scam":
      case "illicit": // illicit merged into scam
        catName = "Scam/Illicit";
        catIcon = <XCircleIcon className="h-7 w-7" />;
        break;
      case "info":
      case "untrue":
      case "misleading":
      case "accurate":
        catName = (
          <>
            <span>News/Info/Opinion</span>
            <span className="block">{Prop.truthScore?.toFixed(2)}</span>
          </>
        );
        catIcon = <NewspaperIcon className="h-7 w-7" />;
        break;
      case "spam":
        catName = "Marketing/Spam";
        catIcon = <MegaphoneIcon className="h-7 w-7" />;
        break;
      case "irrelevant":
        catName = "NVC-Can't Tell";
        catIcon = <EllipsisHorizontalCircleIcon className="h-7 w-7" />;
        break;
      case "legitimate":
        catName = "NVC-Credible";
        catIcon = <HandThumbUpIcon className="h-7 w-7" />;
        break;
      case "satire":
        catName = "Satire";
        catIcon = <FaceSmileIcon className="h-7 w-7" />;
        break;
      default:
        catName = "Unsure";
        catIcon = <QuestionMarkCircleIcon className="h-7 w-7" />;
        break;
    }
    return [catIcon, catName];
  };

  const [catIcon, catName] = getIconAndName();

  return (
    <div className="grid grid-flow-row justify-items-center text-center rounded-lg shadow-md p-3 mt-2 bg-primary text-background">
      <div className="h-7 w-7 flex items-center justify-center">{catIcon}</div>
      <div className="h-12 flex items-center justify-center">
        <p className="text-md">{catName}</p>
      </div>
    </div>
  );
}
