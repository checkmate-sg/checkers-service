import { Checkers } from './external/lib/Checkers';
import { Polls } from './external/lib/Polls';
import { setupClientAPIs } from './utils';

// Checkers API 
export const checkersAPI = setupClientAPIs(Checkers);
// Polls API
export const pollsAPI = setupClientAPIs(Polls);