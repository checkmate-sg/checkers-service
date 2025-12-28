import { Checkers } from './external/lib/Checkers';
import { Leaderboard } from './external/lib/Leaderboard';
import { Polls } from './external/lib/Polls';
import { Votes } from './external/lib/Votes';
import { setupClientAPIs } from './utils';

// Checkers API
export const checkersAPI = setupClientAPIs(Checkers);
// Polls API
export const pollsAPI = setupClientAPIs(Polls);
// Votes API
export const votesAPI = setupClientAPIs(Votes);
// Leaderboard API 
export const leaderboardAPI = setupClientAPIs(Leaderboard);
