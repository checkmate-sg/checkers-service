// Time constants
export const DAYS_MS = 24 * 60 * 60 * 1000;
export const INACTIVITY_WARNING_DAYS = 3;
export const INACTIVITY_DEACTIVATION_DAYS = 10;
export const PROGRAMME_EXTENSION_DAYS = 60;
export const PROGRAMME_OFFBOARDING_DAYS = 90;

// Message templates
export const MESSAGES = {
  inactivityWarning: (name: string, groupLink: string) => `📍 We Miss You! 👀

Hey ${name}, it looks like you've been inactive for the past 3 days. Just a friendly reminder: if we don't see any activity for 7 days, your access as a checker will be temporarily deactivated.

If you need any help or have any questions, feel free to ask in the Q&A channel of our <a href="${groupLink}">Checkers' Crew</a> - we're here to help! 😊`,

  deactivationNotice: (name: string) => `📍 Temporary Deactivation Notice

Hi ${name},

Your access as a checker has been temporarily deactivated due to inactivity. No worries though - simply press the button below to get back to checking! 🚀

We're excited to see you back in action soon 😊`,

  programmeExtension: (name: string, quizLink: string) => `📍 You've Got Another Chance! 🎓

Hi ${name},

Although you haven't met the graduation criteria just yet, we've extended your time in the programme by another month! You now have extra time to give it another go. 😊

If you need a refresher, you can refer to our <a href="${quizLink}">onboarding quiz</a> again. Don't hesitate to ask questions in the group chat if you need any guidance.

You're almost there, let's finish strong! 💪`,

  programmeOffboarding: (name: string, surveyLink: string) => `📍 CheckMate Fact-checker Programme Status

Hi ${name},

Thank you so much for your time and dedication during the CheckMate programme. While you've given it your best, it seems we haven't quite met the criteria needed to continue as a volunteer in our checking crew.

We'd love to hear about your experience - your feedback will help us improve! Please take a moment to fill out this <a href="${surveyLink}">survey</a>.

As part of this process, you'll also be removed from the Checkers' Crew Telegram chat, and will not receive future messages to vote on. We appreciate your understanding and wish you all the best moving forward 💛

Thank you for your contribution,

The CheckMate Team`,
};
