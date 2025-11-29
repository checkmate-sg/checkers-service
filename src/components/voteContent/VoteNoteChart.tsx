import { PollStatistics } from './VoteChart';
import { VoteOption } from './VoteOption';

interface VoteNoteChartProps {
    assessedInfo: PollStatistics;
    communityNoteCategory: "great" | "acceptable" | "unacceptable" | null;
}

export default function VoteNoteChart(Props: VoteNoteChartProps) {
    const assessedInfo = Props.assessedInfo;

    const Note_Category_Data = [
        {name: "Great", value: assessedInfo?.great},
        {
            name: "Acceptable",
            value: assessedInfo?.acceptable
        },
        {
            name: "Unacceptable",
            value: assessedInfo?.unacceptable
        }
    ];

    // Calculate total vote count 
    const totalVotes = Note_Category_Data.reduce(
        (acc, options) => acc + (options.value ?? 0), 0
    );

    return (
        <div className="w-full max-w-md mx-auto p-1 rounded-lg">
          <h2 className="text-orange-800 mb-1 text-center text-lg font-bold">
            Community Note Category
          </h2>
          <h3 className="mb-4 text-orange-800 text-center text-sm">
            {totalVotes} total votes
          </h3>
          {Note_Category_Data.map((item) => (
            <VoteOption
              label={item.name}
              percentage={((item.value ?? 0) / totalVotes) * 100}
              votes={item.value ?? 0}
              selected={Props.communityNoteCategory === item.name.toLowerCase()}
            />
          ))}
        </div>
      );
}