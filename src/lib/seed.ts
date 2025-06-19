import { ObjectId } from "mongodb";
import { connectToDB } from "./mongodb";

export async function seedDatabase() {
  const db = await connectToDB();
  const checkers = db.collection("checkers");
  const votes = db.collection("votes");

  // ALWAYS process voting logic on every deployment
  await processVotingLogic(votes, checkers);

  // Only seed if database is empty
  const existing = await checkers.findOne({});
  if (existing) return; // Don't re-seed if data exists

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);
  const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);

  const voteDocs = [
    {
      _id: new ObjectId("64f1a1b1c1d1e1f1a1b1c1d1"),
      content:
        "🚨 URGENT: New COVID variant spreads through 5G towers! Share this...",
      timestamp: twoDaysAgo.toISOString(),
      sender: "Unknown WhatsApp User",
      screenshot:
        "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=300&fit=crop",
      category: "False",
      status: "pending", // Always start as pending
      finalResult: null,
      votes: [
        {
          checkerId: new ObjectId("665eaaaa0000000000000001"),
          vote: "False",
          votedAt: new Date(twoDaysAgo.getTime() + 30 * 60 * 1000), // 30 mins after creation
        },
      ],
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
      timestamp: twelveHoursAgo.toISOString(), // 12 hours ago - still pending
      sender: "News Channel",
      screenshot:
        "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=300",
      category: "Pending",
      status: "pending",
      finalResult: null,
      votes: [], // No votes yet
      aiNote: {
        summary:
          "This appears to be legitimate news but requires verification...",
        references: ["Government press releases", "Tax authority website"],
      },
    },
    {
      _id: new ObjectId("64f1a1b1c1d1e1f1a1b1c1d3"),
      content: "BREAKING: Celebrity caught in scandal, photos leaked...",
      timestamp: oneDayAgo.toISOString(), // Exactly 24 hours ago
      sender: "Gossip Group",
      screenshot:
        "https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=400&h=300",
      category: "Misleading",
      status: "pending", // Will be processed by processVotingLogic
      finalResult: null,
      votes: [
        {
          checkerId: new ObjectId("665eaaaa0000000000000002"),
          vote: "Misleading",
          votedAt: new Date(oneDayAgo.getTime() + 2 * 60 * 60 * 1000), // 2 hours after creation
        },
        {
          checkerId: new ObjectId("665eaaaa0000000000000003"),
          vote: "Misleading",
          votedAt: new Date(oneDayAgo.getTime() + 4 * 60 * 60 * 1000), // 4 hours after creation
        },
      ],
      aiNote: {
        summary:
          "This contains unverified claims and potentially manipulated content...",
        references: ["Entertainment fact-checkers", "Image verification tools"],
      },
    },
    {
      _id: new ObjectId("64f1a1b1c1d1e1f1a1b1c1d4"),
      content: "💰 Get rich quick with crypto! Guaranteed 500% return!",
      timestamp: threeDaysAgo.toISOString(), // 72 hours ago
      sender: "InvestmentGroup",
      screenshot:
        "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300",
      category: "Pending",
      status: "pending", // Will be processed by processVotingLogic
      finalResult: null,
      votes: [], // No votes - should become "Pass"
      aiNote: {
        summary:
          "This message exhibits common scam indicators such as high return guarantees...",
        references: ["SEC Crypto Scam Advisory", "Cointelegraph analysis"],
      },
    },

    {
      _id: new ObjectId("64f1a1b1c1d1e1f1a1b1c1d5"),
      content: "🚨 URGENT: This is a post to show voted and not completed",
      timestamp: twelveHoursAgo.toISOString(),
      sender: "Unknown WhatsApp User",
      screenshot:
        "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=300&fit=crop",
      category: "False",
      status: "pending", // Always start as pending
      finalResult: null,
      votes: [
        {
          checkerId: new ObjectId("665eaaaa0000000000000001"),
          vote: "False",
          votedAt: new Date(twelveHoursAgo.getTime() + 30 * 60 * 1000), // 30 mins after creation
          aiRating: "great",
          comment:
            "Well-researched political analysis with proper citations and balanced perspective.",
          tags: ["Politics", "Technology", "Urgent"],
        },
      ],
      aiNote: {
        summary:
          "This message contains multiple false claims linking COVID-19 to 5G...",
        references: ["WHO COVID-19 fact sheet", "FDA 5G safety guidelines"],
      },
    },
  ];

  await votes.insertMany(voteDocs);

  // Updated checkers without voteHistory
  await checkers.insertMany([
    {
      _id: new ObjectId("665eaaaa0000000000000001"), // Fixed ID for login
      name: "Zack",
      phoneNumber: "+123456789",
      correctVotes: 0, // Will be updated by processVotingLogic
      totalVotes: 0, // Will be updated by processVotingLogic
    },
    {
      _id: new ObjectId("665eaaaa0000000000000002"),
      name: "Jane Doe",
      phoneNumber: "+987654321",
      correctVotes: 0, // Will be updated by processVotingLogic
      totalVotes: 0, // Will be updated by processVotingLogic
    },
    {
      _id: new ObjectId("665eaaaa0000000000000003"),
      name: "John Smith",
      phoneNumber: "+555123456",
      correctVotes: 0, // Will be updated by processVotingLogic
      totalVotes: 0, // Will be updated by processVotingLogic
    },
  ]);

  console.log("Database seeded successfully!");

  // Process voting logic again after seeding to handle any newly seeded votes
  await processVotingLogic(votes, checkers);
}

async function processVotingLogic(votesCollection, checkersCollection) {
  const now = new Date();
  const twentyFourHoursAgo = now.getTime() - 24 * 60 * 60 * 1000;

  // Find all pending votes that are older than 24 hours
  const pendingVotes = await votesCollection
    .find({
      status: "pending",
      timestamp: { $lt: new Date(twentyFourHoursAgo).toISOString() },
    })
    .toArray();

  console.log(`Found ${pendingVotes.length} votes to process...`);

  for (const vote of pendingVotes) {
    let finalResult;
    let majorityVote = null;
    const status = "completed";

    if (vote.votes && vote.votes.length > 0) {
      // Calculate majority vote
      const voteCounts = {};
      vote.votes.forEach((v) => {
        voteCounts[v.vote] = (voteCounts[v.vote] || 0) + 1;
      });

      // Find the vote option with the highest count
      const sortedVotes = Object.entries(voteCounts).sort(
        (a, b) => (b[1] as number) - (a[1] as number)
      );
      majorityVote = sortedVotes[0][0];
      const majorityCount = sortedVotes[0][1] as number;
      const totalVotes = vote.votes.length;
      const percentage = Math.round((majorityCount / totalVotes) * 100);

      finalResult = `${majorityVote} - ${percentage}% consensus`;

      // Update checker stats for all voters
      for (const voterVote of vote.votes) {
        const checkerId = voterVote.checkerId;
        const isCorrect = voterVote.vote === majorityVote;

        // Create the update query with the correct type
        const updateQuery: {
          $inc: { totalVotes: number; correctVotes?: number };
        } = {
          $inc: { totalVotes: 1 },
        };

        // If the vote matches the majority, also increment correctVotes
        if (isCorrect) {
          updateQuery.$inc.correctVotes = 1;
        }

        await checkersCollection.updateOne({ _id: checkerId }, updateQuery);

        console.log(
          `Updated checker ${checkerId}: +1 total vote${
            isCorrect ? ", +1 correct vote" : ""
          }`
        );
      }
    } else {
      // No votes received, set as Pass
      finalResult = "Pass - No votes received";
    }

    // Update the vote document
    await votesCollection.updateOne(
      { _id: vote._id },
      {
        $set: {
          status: status,
          finalResult: finalResult,
          processedAt: now,
        },
      }
    );

    console.log(`Processed vote ${vote._id}: ${finalResult}`);
  }

  if (pendingVotes.length === 0) {
    console.log(
      "No votes to process - all votes are either recent or already completed."
    );
  }
}

// Export the processing function for use elsewhere
export { processVotingLogic };
