export const MIN_VOTES_NEEDED = 30;

// Lowest daily target a checker can choose (also the slider's lowest snap point).
export const MIN_TARGET_DAILY_VOTES = 5;

// Upper bound for a checker's daily target. Doubles as the "receive every check"
// sentinel: the dashboard slider only emits 5/10/20/30/50, so a stored value of
// MAX_TARGET_DAILY_VOTES unambiguously marks a receive-all checker. 100 is a
// practical stand-in for "all" — exceeding it daily is unlikely.
export const MAX_TARGET_DAILY_VOTES = 100;
