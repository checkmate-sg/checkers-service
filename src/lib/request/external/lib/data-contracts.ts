/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

/** Generic schema for expressing API Errors */
export interface APIError {
  /**
   * API Error code associated with the error
   * @format int32
   */
  code: number;
  /** Error message associated with the error */
  message?: string;
  /** Request details associated with the error */
  request?: object;
  /** Other details associated with the error */
  details?: object;
}

/**
 * MongoDB ObjectId (24 hex characters)
 * @pattern ^[a-fA-F0-9]{24}$
 * @example "60f7a7c8d5c5f6b9a1c2d3e4"
 */
export type MongoObjectId = string;

/**
 * String representation of an ObjectId
 * @pattern ^[a-fA-F0-9]{24}$
 * @example "60f7a7c8d5c5f6b9a1c2d3e4"
 */
export type ObjectIdString = string;

/**
 * ISO-8601 timestamp string
 * @format date-time
 * @example "2025-09-18T12:34:56Z"
 */
export type DateTime = string;

/** Base document interface that all MongoDB documents extend */
export interface BaseDocument {
  /** MongoDB ObjectId (24 hex characters) */
  _id?: MongoObjectId;
}

/** crowed source message category */
export enum Category {
  Scam = "scam",
  Illicit = "illicit",
  Info = "info",
  Untrue = "untrue",
  Misleading = "misleading",
  Accurate = "accurate",
  Satire = "satire",
  Spam = "spam",
  Legitimate = "legitimate",
  Irrelevant = "irrelevant",
  Unsure = "unsure",
}

/** Category including 'pass' and allowing null */
export enum CategoryWithPassNullable {
  Scam = "scam",
  Illicit = "illicit",
  Info = "info",
  Satire = "satire",
  Spam = "spam",
  Legitimate = "legitimate",
  Irrelevant = "irrelevant",
  Unsure = "unsure",
  Pass = "pass",
}

/** Onboarding status of the Checker */
export enum OnboardingStatus {
  Name = "name",
  Number = "number",
  Verify = "verify",
  Quiz = "quiz",
  OnboardWhatsapp = "onboardWhatsapp",
  JoinGroupChat = "joinGroupChat",
  Nlb = "nlb",
  Completed = "completed",
  Offboarded = "offboarded",
}

/** Evaluation for an AI response quality (nullable) */
export enum ResponseCategory {
  Great = "great",
  Acceptable = "acceptable",
  Unacceptable = "unacceptable",
}

/**
 * Truth score on a 0-5 scale
 * @min 0
 * @max 5
 */
export type TruthScore = number;

/** Database collections enum for type safety */
export enum Collections {
  Checkers = "checkers",
  Polls = "polls",
  Votes = "votes",
}

/** Format of the AI generated responses passed from CheckMate AI platform */
export interface Response {
  /** English response */
  en: string;
  /** Chinese response */
  cn: string;
  /** Related links cited by the AI response */
  links: string[];
  /** ISO-8601 timestamp string */
  timestamp: DateTime;
}

/** Representation of a Checker user. */
export type Checker = BaseDocument & {
  /** Name of the Checker, set by them during onboarding */
  name: string | null;
  /** Telegram ID of the Checker */
  telegramId: string;
  /** Whatsapp ID of the Checker */
  whatsappId: string | null;
  /** SingPass ID of the Checker (not used yet) */
  singpassId: string | null;
  /** Whether the Checker is active and will be triggered */
  isActive: boolean;
  /** Whether the Checker has completed the onboarding process */
  isOnboardingComplete: boolean;
  /** ISO-8601 timestamp string */
  onboardingTime: DateTime;
  /** Whether the Checker has completed the onboarding quiz  */
  isQuizComplete: boolean;
  /** The score the Checker got in the quiz  */
  quizScore: number | null;
  /** Onboarding status of the Checker */
  onboardingStatus: OnboardingStatus;
  /** Whether the Checker has received the extension for the program */
  hasReceivedExtension: boolean;
  /** Whether the Checker has completed the programme */
  hasCompletedProgramme: boolean;
  /** The static URL of the Checker's certificate */
  certificateUrl: string | null;
  /** The number of polls the Checkers has voted on */
  numVoted: number;
  /** ISO-8601 timestamp string */
  lastVotedTimestamp: DateTime;
  /** Message ID of the message the Checker used to set their name */
  getNameMessageId: string | null;
  /** Number of polls the Checker has been assigned to vote on today */
  dailyAssignmentCount: number;
  /** The checker's preferred number of vote assignments per day */
  targetDailyVotes: number;
};

/** Representation of a update request for Checker details. */
export interface CheckerPatchRequest {
  name?: string | null;
  whatsappId?: string | null;
  isActive?: boolean;
  /** Onboarding status of the Checker */
  onboardingStatus?: OnboardingStatus;
  dailyAssignmentCount?: number;
  targetDailyVotes?: number;
}

/** Representation of the Messages to be checked */
export type Poll = BaseDocument & {
  /** Check ID from CheckMate AI platform  */
  checkId?: string;
  /** Text of the poll, if any */
  text?: string | null;
  /** URL of the image in the poll, if any  */
  imageUrl?: string | null;
  /** Caption of the poll, if any  */
  caption?: string | null;
  /** Format of the AI generated responses passed from CheckMate AI platform */
  longformResponse?: Response;
  /** Format of the AI generated responses passed from CheckMate AI platform */
  shortformResponse?: Response;
  /** crowed source message category */
  crowdSourcedCategory?: Category;
  /** Truth score if the category is info/untrue/misleading/accurate */
  crowdSourcedTruthScore?: number | null;
  /** ISO-8601 timestamp string */
  startedTimestamp?: DateTime;
  /** ISO-8601 timestamp string */
  assessedTimestamp?: DateTime;
};

/** Poll request to kick off the poll process, received via webhook from CheckMate AI Platform */
export type PollRequest = BaseDocument & {
  /** Check ID from CheckMate AI platform  */
  checkId?: string;
  /** Text of the poll, if any */
  text?: string | null;
  /** URL of the image in the poll, if any  */
  imageUrl?: string | null;
  /** Caption of the poll, if any  */
  caption?: string | null;
  /** Format of the AI generated responses passed from CheckMate AI platform */
  longformResponse?: Response;
  /** Format of the AI generated responses passed from CheckMate AI platform */
  shortformResponse?: Response;
};

/** Representation of individual vote on a message  */
export type Vote = BaseDocument & {
  /** MongoDB ObjectId (24 hex characters) */
  pollId?: MongoObjectId;
  /** MongoDB ObjectId (24 hex characters) */
  checkerId?: MongoObjectId;
  /** ISO-8601 timestamp string */
  createTimestamp?: DateTime;
  votedTimestamp?: DateTime;
  category?: Category;
  /** Truth score on a 0-5 scale */
  truthScore?: TruthScore;
  /** Evaluation for an AI response quality (nullable) */
  responseCategory?: ResponseCategory;
  commentOnResponse?: string | null;
};

/** POST reqeust body to update the Vote Content of user  */
export interface VotePOST {
  category: Category;
  truthScore?: TruthScore;
  /** Evaluation for an AI response quality (nullable) */
  responseCategory: ResponseCategory;
  commentOnResponse?: string;
}

/** Representation of individual vote with ALL votes details  */
export type VotesMessageBrief = Vote & {
  /** Text of the poll, if any */
  text?: string | null;
  /** URL of the image in the poll, if any  */
  imageUrl?: string | null;
  /** crowed source message category */
  crowdSourcedCategory?: Category;
};

/** Representation of individual programme statistics for each checker  */
export interface ProgrammeBrief {
  /**
   * Unique identifier for the programme
   * @example "507f1f77bcf86cd799439011"
   */
  _id: string;
  /**
   * Reference to the Checker (ObjectId)
   * @example "507f1f77bcf86cd799439012"
   */
  checkerId: string;
  /**
   * When the checker enrolled (onboarding completion)
   * @format date-time
   * @example "2024-01-15T00:00:00Z"
   */
  startDate: string;
  /**
   * When the programme ended (completion/offboarding), null if active
   * @format date-time
   * @example null
   */
  endDate: string | null;
  /**
   * Current programme status
   * @example "active"
   */
  status: ProgrammeBriefStatusEnum;
  targets: Targets;
  /**
   * Snapshot of checker.numVoted at enrollment
   * @min 0
   * @example 50
   */
  votesAtStart: number;
  /**
   * Whether Day 60 extension notice was sent
   * @example false
   */
  hasReceivedExtension: boolean;
  /**
   * Whether low accuracy warning was sent
   * @example false
   */
  hasReceivedLowAccuracyWarning: boolean;
  /**
   * URL to the generated certificate
   * @format uri
   * @example null
   */
  certificateUrl: string | null;
  /**
   * When the checker graduated
   * @format date-time
   * @example null
   */
  completedAt: string | null;
  /**
   * Document creation timestamp
   * @format date-time
   * @example "2024-01-15T00:00:00Z"
   */
  createdAt: string;
  /**
   * Document last update timestamp
   * @format date-time
   * @example "2024-01-20T12:30:00Z"
   */
  updatedAt: string;
}

export interface Targets {
  /**
   * Target number of votes (e.g., 50)
   * @min 0
   * @example 50
   */
  votes: number;
  /**
   * Target accuracy percentage (e.g., 60)
   * @format float
   * @min 0
   * @max 100
   * @example 60
   */
  accuracy: number;
  /**
   * Target number of reports (e.g., 10)
   * @min 0
   * @example 10
   */
  reports: number;
}

export interface ProgressMetric {
  /**
   * Current value of the metric
   * @example 35
   */
  current: number;
  /**
   * Target value of the metric
   * @example 50
   */
  target: number;
}

export interface Progress {
  /** @example {"current":35,"target":50} */
  votes: ProgressMetric;
  /** @example {"current":72.5,"target":60} */
  accuracy: ProgressMetric;
  /** @example {"current":8,"target":10} */
  reports: ProgressMetric;
}

export interface ProgrammeProgressResponse {
  /** Representation of individual programme statistics for each checker  */
  programme: ProgrammeBrief;
  progress: Progress;
}

export interface Leaderboard {
  /** Checkers Ids */
  _id: string;
  /** Name from the checkers collection */
  checkerName: string;
  /** Total count of votes */
  numberOfVotes: number;
  /** Sum of all scores */
  totalScore: number;
  /**
   * Average response time in hours
   * @format float
   */
  averageResponseTime: number;
  /**
   * Percentage (0-100), rounded to 2 d.p.
   * @format float
   */
  accuracy: number;
  /** Count of votes where isCorrect = true */
  correctVotes: number;
}

/**
 * the count of the total number of records
 * @example 100
 */
export type PaginationTotal = number;

/**
 * The maximum number of items returned in the response.
 * @example 100
 */
export type PaginationLimit = number;

/**
 * The number of items to skipped starting to collect the items. The offset must be a non-negative integer.
 * @example 100
 */
export type PaginationOffset = number;

/** Pagination Response structure */
export interface PaginationResponse {
  /** the count of the total number of records */
  total?: PaginationTotal;
  /** The number of items to skipped starting to collect the items. The offset must be a non-negative integer. */
  offset?: PaginationOffset;
  /** The maximum number of items returned in the response. */
  limit?: PaginationLimit;
}

/** Representation of a Paginated Response */
export interface APIPagination {
  /**
   * Total number of objects
   * @format int32
   * @default 0
   */
  total?: number;
  /**
   * Number of items per page
   * @format int32
   * @min 0
   * @max 50
   * @exclusiveMax false
   */
  limit?: number;
  /**
   * Number of skipped items
   * @format int32
   * @min 0
   */
  offset?: number;
}

/**
 * Current programme status
 * @example "active"
 */
export enum ProgrammeBriefStatusEnum {
  Active = "active",
  Completed = "completed",
  Extended = "extended",
  Offboarded = "offboarded",
}
