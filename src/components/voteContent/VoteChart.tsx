import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

export interface TruthScoreBreakdown {
  total?: number;
  "0"?: number;
  "1"?: number;
  "2"?: number;
  "3"?: number;
  "4"?: number;
  "5"?: number;
}

export interface PollStatistics {
  scam?: number;
  illicit?: number;
  info?: TruthScoreBreakdown;
  satire?: number;
  spam?: number;
  legitimate?: number;
  irrelevant?: number;
  unsure?: number;
  pass?: number;
  great?: number;
  acceptable?: number;
  unacceptable?: number;
}

interface VoteChartProps {
  assessedInfo: PollStatistics | null;
}

export default function VoteChart(Props: VoteChartProps) {
  const assessedInfo = Props.assessedInfo;

  if (assessedInfo === null) {
    return null;
  }

  const infoObj =
    "total" in assessedInfo.info
      ? {
          name: "Info",
          count: assessedInfo.info.total,
        }
      : {
          name: "Info",
          0: assessedInfo.info["0"],
          1: assessedInfo.info["1"],
          2: assessedInfo.info["2"],
          3: assessedInfo.info["3"],
          4: assessedInfo.info["4"],
          5: assessedInfo.info["5"],
        };

  const irrelevantCount = assessedInfo.irrelevant;

  const data = [
    {
      name: "Scam",
      count: assessedInfo.scam,
    },
    {
      name: "Illicit",
      count: assessedInfo.illicit,
    },
    infoObj,
    {
      name: "Satire",
      count: assessedInfo.satire,
    },
    {
      name: "Mktg",
      count: assessedInfo.spam,
    },
    {
      name: "NVC",
      credible: assessedInfo.legitimate,
      canttell: irrelevantCount,
    },
    {
      name: "Unsure",
      count: assessedInfo.unsure,
    },
  ];

  return (
    <div className="w-full flex justify-center py-4">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          width={500}
          height={300}
          data={data}
          margin={{
            top: 5,
            right: 5,
            left: 0,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" angle={-45} tick={{ fontSize: 12, dy: 5 }} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Bar dataKey="count" stackId="a" fill="#8884d8" />
          <Bar dataKey="0" stackId="a" fill="#FFE5B4" /> {/* Light Peach */}
          <Bar dataKey="1" stackId="a" fill="#FFC04C" /> {/* Orange Yellow */}
          <Bar dataKey="2" stackId="a" fill="#FFB347" /> {/* Orange */}
          <Bar dataKey="3" stackId="a" fill="#FF8C00" /> {/* Dark Orange */}
          <Bar dataKey="4" stackId="a" fill="#E67300" /> {/* Pumpkin */}
          <Bar dataKey="5" stackId="a" fill="#CC5500" /> {/* Burnt Orange */}
          <Bar dataKey="credible" stackId="a" fill="#82ca9d" />
          <Bar dataKey="canttell" stackId="a" fill="#808080" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
