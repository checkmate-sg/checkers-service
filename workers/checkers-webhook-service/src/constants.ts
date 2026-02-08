// Resources message
export const RESOURCES_MESSAGE = `Here are some resources you might find useful:
1) <a href="https://checkmate.sg">Our official CheckMate website</a>
2) <a href="https://bit.ly/checkmates-wiki">Our fact-checking wiki</a>
3) <a href="https://bit.ly/checkmates-quiz">The Typeform quiz you just took</a>
4) <a href="https://www.nlb.gov.sg/main/site/learnx/explore-communities/explore-communities-content/sure-learning-community">The S.U.R.E Learning Community</a> that we're partnering the National Library Board on
5) <a href="https://facticity.ai/">Facticity</a>, which is useful for video links (just put them into facticity)
6) <a href="https://www.virustotal.com/gui/home/url">Virustotal</a>, which you can use for scanning suspicious URL links
7) <a href="https://onelink.to/scamshield">The ScamShield app</a>, which you can use for checking phone numbers`;

// Progress bar helper
export function progressBar(currentStep: number): string {
  const totalSteps = 5;
  let progress = "Onboarding Progress: ";
  for (let i = 0; i < totalSteps; i++) {
    progress += i < currentStep ? "🟩" : "⬜";
  }
  return progress;
}

// Phone number validation
export function isNumeric(str: string): boolean {
  return /^\d+$/.test(str);
}

// Normalize phone number to international format (without + prefix)
export function normalizePhoneNumber(phone: string): string | null {
  let normalized = phone.replace(/[\s+]/g, "");

  // Singapore numbers: add country code if missing
  if (normalized.length === 8 && (normalized.startsWith("9") || normalized.startsWith("8"))) {
    normalized = `65${normalized}`;
  }

  if (!isNumeric(normalized)) {
    return null;
  }

  return normalized;
}

// New checker template
export function createNewChecker(telegramId: string): {
  name: null;
  telegramId: string;
  whatsappId: null;
  singpassId: null;
  isActive: false;
  isOnboardingComplete: false;
  onboardingTime: null;
  isQuizComplete: false;
  quizScore: null;
  onboardingStatus: "name";
  hasReceivedExtension: false;
  hasCompletedProgramme: false;
  certificateUrl: null;
  lastActivatedDate: null;
  offboardingTime: null;
  lastInactivityWarningSent: null;
  numVoted: 0;
  lastVotedTimestamp: null;
  getNameMessageId: null;
  dailyAssignmentCount: 0;
  currentProgrammeId: null;
} {
  return {
    name: null,
    telegramId,
    whatsappId: null,
    singpassId: null,
    isActive: false,
    isOnboardingComplete: false,
    onboardingTime: null,
    isQuizComplete: false,
    quizScore: null,
    onboardingStatus: "name",
    hasReceivedExtension: false,
    hasCompletedProgramme: false,
    certificateUrl: null,
    lastActivatedDate: null,
    offboardingTime: null,
    lastInactivityWarningSent: null,
    numVoted: 0,
    lastVotedTimestamp: null,
    getNameMessageId: null,
    dailyAssignmentCount: 0,
    currentProgrammeId: null,
  };
}
