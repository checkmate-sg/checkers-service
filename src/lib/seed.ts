import { ObjectId } from "mongodb";
import { connectToDB } from "./mongodb";

export async function seedDatabase() {
  const db = await connectToDB();
  const checkers = db.collection("checkers");
  const votes = db.collection("votes");

  const existing = await checkers.findOne({});
  if (existing) return; // Don't re-seed if data exists

  const voteDocs = [
    {
      _id: new ObjectId("64f1a1b1c1d1e1f1a1b1c1d1"),
      content:
        "🚨 URGENT: New COVID variant spreads through 5G towers! Share this...",
      timestamp: "2024-01-15 14:30",
      sender: "Unknown WhatsApp User",
      screenshot:
        "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=300&fit=crop",
      category: "False",
      finalResult: "False - 85% consensus",
      aiNote: {
        summary:
          "This message contains multiple false claims linking COVID-19 to 5G...",
        references: ["WHO COVID-19 fact sheet", "FDA 5G safety guidelines"],
      },
    },
    {
      _id: new ObjectId("64f1a1b1c1d1e1f1a1b1c1d2"),
      content:
        "Government announces new tax relief for families earning under $50k...",
      timestamp: "2024-01-14 09:15",
      sender: "News Channel",
      screenshot:
        "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=300",
      category: "Pending",
      finalResult: null,
      aiNote: {
        summary:
          "This appears to be legitimate news but requires verification...",
        references: ["Government press releases", "Tax authority website"],
      },
    },
    {
      _id: new ObjectId("64f1a1b1c1d1e1f1a1b1c1d3"),
      content: "BREAKING: Celebrity caught in scandal, photos leaked...",
      timestamp: "2024-01-13 16:45",
      sender: "Gossip Group",
      screenshot:
        "https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=400&h=300",
      category: "Misleading",
      finalResult: "Misleading - 72% consensus",
      aiNote: {
        summary:
          "This contains unverified claims and potentially manipulated content...",
        references: ["Entertainment fact-checkers", "Image verification tools"],
      },
    },
    {
      _id: new ObjectId("64f1a1b1c1d1e1f1a1b1c1d4"),
      content: "💰 Get rich quick with crypto! Guaranteed 500% return!",
      timestamp: "2024-01-12 08:15",
      sender: "InvestmentGroup",
      screenshot:
        "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300",
      category: "Pending",
      finalResult: null,
      aiNote: {
        summary:
          "This message exhibits common scam indicators such as high return guarantees...",
        references: ["SEC Crypto Scam Advisory", "Cointelegraph analysis"],
      },
    },
  ];

  await votes.insertMany(voteDocs);

  await checkers.insertMany([
    {
      _id: new ObjectId("665eaaaa0000000000000001"), // Fixed ID for login
      name: "Zack",
      phoneNumber: "+123456789",
      // Track voting details - only one vote for now
      voteHistory: [
        {
          voteId: voteDocs[0]._id,
          myVote: "False",
          aiRating: "great", // How well the user's vote aligned with AI analysis
          votedAt: new Date("2024-01-15T15:00:00Z"),
          status: "voted",
        },
        // Other votes (voteDocs[1], [2], [3]) not in voteHistory, so they'll show as "pending"
      ],
      correctVotes: 1,
      totalVotes: 1,
    },
    {
      name: "Jane Doe",
      phoneNumber: "+987654321",
      voteHistory: [],
      correctVotes: 0,
      totalVotes: 0,
    },
  ]);
}
