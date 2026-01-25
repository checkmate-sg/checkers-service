# CheckMate Checkers Service - Features

## Onboarding

### Overview

A 6-step flow that guides new checkers through registration via Telegram bot.

### Entry Points

- `/start` command (prompts to onboard if new user)
- `/onboard` command (main entry point)

### Flow Steps

| Step | Status               | Description                                                       |
| ---- | -------------------- | ----------------------------------------------------------------- |
| 1    | `name`               | Enter display name                                                |
| 2    | `number`             | Provide phone number (via Telegram contact share or manual entry) |
| 3    | `otpSent` → `verify` | Receive OTP via WhatsApp and verify                               |
| 4    | `quiz`               | Complete Typeform onboarding quiz                                 |
| 5    | `onboardWhatsapp`    | Explore the WhatsApp CheckMate service                            |
| 6    | `joinGroupChat`      | Join the Checkers' Telegram group chat                            |
| 7    | `nlb`                | View NLB partnership info and complete onboarding                 |

### Completion Effects

- `isOnboardingComplete` set to `true`
- `onboardingStatus` set to `completed`
- `isActive` set to `true`
- First Programme created with targets
- Congratulations message sent with portal link

### Resume Functionality

Running `/onboard` while already in progress resumes from current step.

---

## Voting

### How Votes Are Assigned

1. CheckMate platform sends message via webhook
2. Poll created with message content and optional AI responses
3. Vote records created for all active, onboarded checkers
4. Telegram notification sent with "Vote" button opening MiniApp

### Vote Categories

| Category | Description                                     | Truth Score?  |
| -------- | ----------------------------------------------- | ------------- |
| `scam`   | Scams, illicit activity, illegal content        | No            |
| `info`   | News/info/opinion intended to inform or mislead | **Yes** (0-5) |
| `satire` | Clearly satirical content                       | No            |
| `spam`   | Marketing, promotions, mass-shared content      | No            |
| `nvc`    | No verifiable content (triggers sub-flow)       | No            |
| `unsure` | Needs more info, inconclusive search            | No            |
| `pass`   | Skip message (excluded from stats)              | No            |

### Truth Score (Info Category)

Scale of 0-5 for claim veracity:

| Score | Meaning                    | Maps To      |
| ----- | -------------------------- | ------------ |
| 0-1   | False/Mostly false         | `untrue`     |
| 2-3   | Mixed/Partially misleading | `misleading` |
| 4-5   | Mostly true/Accurate       | `accurate`   |

Thresholds: `<1.5` = untrue, `1.5-3.75` = misleading, `>3.75` = accurate

### NVC Sub-flow

For messages without verifiable facts:

- "Is source credible?" → **Yes** = `legitimate`, **Cannot Tell** = `irrelevant`

### Community Note Rating

If message has an AI-generated community note, rate it:

| Rating         | Description                              |
| -------------- | ---------------------------------------- |
| `great`        | Helpful, informative, nothing to nitpick |
| `acceptable`   | Could improve but contains no inaccuracy |
| `unacceptable` | Contains wrong/untrue information        |

Optional: Add comment on response.

### Vote Editing

- Before assessment: Can re-vote to change answer
- After assessment: Read-only, shows consensus results

### Consensus Calculation

Poll assessed when enough votes received. Category determined by >50% majority:

- Different vote thresholds by category type (4-20 votes depending on severity)
- Truth score averaged for info-category polls
- Community note marked `downvoted` if >50% rate as unacceptable

### Accuracy Scoring

After assessment, each vote marked `isCorrect`:

- `true` if vote matches consensus
- `false` if vote differs from consensus
- `null` for messages ending in "unsure"

---

## Programme

### Overview

A 90-day fact-checking challenge with milestones.

### Targets

| Target            | Goal                              |
| ----------------- | --------------------------------- |
| Messages Voted On | 20 (excludes "unsure" and "pass") |
| Voting Accuracy   | 60%                               |
| Messages Reported | 10 (via WhatsApp CheckMate)       |

### Lifecycle

| Day   | Event                                          |
| ----- | ---------------------------------------------- |
| 0     | Programme starts on onboarding completion      |
| 1-60  | Active voting phase                            |
| 60    | Extension notice if targets not met (+30 days) |
| 61-90 | Extended phase (if applicable)                 |
| 90    | Offboarding (if not graduated)                 |

### Graduation (Targets Met)

- Certificate generated
- LinkedIn credential created
- Congratulations message with stats
- Survey link sent
- `programme.status = "completed"`

### Offboarding (Targets Not Met by Day 90)

- Removed from Telegram group chat
- `isActive = false`
- `onboardingStatus = "offboarded"`
- Survey link sent
- `programme.status = "offboarded"`

### Restart Programme

Checkers can restart their programme at any time from the dashboard:

- Current programme marked as `status: "abandoned"` with `endDate` set
- New programme created with fresh targets and `startDate`
- Progress resets to zero
- Available via "Restart Programme" button on dashboard

---

## Leaderboard

### Overview

Monthly ranking of active checkers based on voting performance.

### Ranking Metrics

| Metric   | Description                                        |
| -------- | -------------------------------------------------- |
| # Votes  | Count of votes (excludes "unsure")                 |
| Accuracy | % of votes matching consensus                      |
| Avg Time | Average hours between vote creation and submission |
| Score    | Gamification score combining accuracy + speed      |

### Display

- Top 10 checkers always shown
- If current user outside top 10, shows:
  - Top 10
  - User's position with one above/below for context
- Refreshes monthly (calendar month)

### Score Calculation

Combines:

- **Accuracy weight**: Higher for correct votes
- **Speed bonus**: Faster responses = higher score

---

## Notifications

All notifications are sent via Telegram bot direct message.

### Onboarding Notifications

| Notification           | Trigger               | Buttons                      |
| ---------------------- | --------------------- | ---------------------------- |
| Welcome (new user)     | `/start` command      | None                         |
| Welcome (onboarded)    | `/start` command      | Checker's Portal             |
| Name prompt            | `/onboard` command    | None (force reply)           |
| Phone prompt           | Name entered          | Share contact                |
| OTP sent               | Phone validated       | Get new OTP, Re-enter number |
| OTP verified           | Correct OTP entered   | Quiz completed               |
| Quiz prompt            | OTP verified          | I've finished the quiz       |
| WhatsApp service intro | Quiz completed        | I've explored the service    |
| Telegram group prompt  | WhatsApp acknowledged | I've joined the group        |
| NLB partnership info   | Group joined          | Complete Onboarding          |
| Completion congrats    | Onboarding complete   | Open Portal, View Resources  |

### Vote Notifications

| Notification     | Trigger                  | Buttons                 |
| ---------------- | ------------------------ | ----------------------- |
| New vote request | Poll assigned to checker | Vote 🗳️ (opens MiniApp) |

### Activation/Deactivation Notifications

| Notification           | Trigger                                  | Buttons |
| ---------------------- | ---------------------------------------- | ------- |
| Activation confirmed   | `/activate` command or Reactivate button | None    |
| Deactivation confirmed | `/deactivate` command                    | None    |

### Inactivity Notifications

Cron runs daily at **8:11 PM SGT**.

| Notification        | Trigger                                   | Buttons           |
| ------------------- | ----------------------------------------- | ----------------- |
| 3-day warning       | Daily cron, all inactivity conditions met | None              |
| 10-day deactivation | Daily cron, all inactivity conditions met | Reactivate Now 🚀 |
| Reminder #1         | Alarm, 14 days after deactivation         | Reactivate Now 🚀 |
| Reminder #2         | Alarm, 28 days after Reminder #1          | Reactivate Now 🚀 |

**Inactivity conditions** (all must be true):

1. Has pending votes with at least one overdue (older than threshold)
2. Last vote was more than threshold days ago (or never voted)
3. Onboarded more than threshold days ago
4. Last reactivation was more than threshold days ago (or never reactivated)

### Programme Notifications

Cron runs daily at **8:41 PM SGT**.

| Notification        | Trigger                               | Buttons                           |
| ------------------- | ------------------------------------- | --------------------------------- |
| Extension notice    | Daily cron, Day 60 without completion | None                              |
| Graduation congrats | All targets met                       | View Certificate, Add to LinkedIn |
| Offboarding notice  | Daily cron, Day 90 without completion | None                              |

### Accuracy Notifications

| Notification       | Trigger                               | Buttons          |
| ------------------ | ------------------------------------- | ---------------- |
| Low accuracy nudge | Vote scored, accuracy below threshold | Review Resources |

Sent once per checker when:

- Votes cast >= `ACCURACY_NUDGE_VOTE_THRESHOLD`
- Accuracy < `ACCURACY_NUDGE_THRESHOLD`

### Other Notifications

| Notification         | Trigger                   | Buttons |
| -------------------- | ------------------------- | ------- |
| Resources list       | `/resources` command      | None    |
| Onboarding cancelled | `/stop` during onboarding | None    |

---

## Others

### Bot Commands

| Command       | Description                                |
| ------------- | ------------------------------------------ |
| `/start`      | Welcome message, portal link if onboarded  |
| `/onboard`    | Start/resume onboarding                    |
| `/stop`       | Cancel onboarding (during onboarding only) |
| `/activate`   | Reactivate inactive account                |
| `/deactivate` | Voluntarily deactivate account             |
| `/resources`  | View educational fact-checking resources   |

### Dashboard

**With Active Programme:**

- Progress cards for 3 targets
- Current vs goal display

**Without Active Programme:**

- Start new programme button
- Programme explanation

### My Votes Page

- Search messages by text
- Filter tabs: All, Pending, Voted
- Status badges: Pending, Voted, Completed
- Auto-refresh every 30 seconds

### Inactivity Handling

A checker is considered inactive only if ALL conditions are met:

1. Has pending votes with at least one overdue (older than threshold)
2. Last vote was more than threshold days ago (or never voted)
3. Onboarded more than threshold days ago
4. Last reactivation was more than threshold days ago (or never reactivated)

| Day | Action                                               |
| --- | ---------------------------------------------------- |
| 3   | Warning message ("vote or be deactivated in 7 days") |
| 10  | Deactivation (`isActive = false`)                    |
| 24  | Reminder #1 with reactivate button                   |
| 52  | Reminder #2 (final)                                  |

Note: If there are no pending votes in the system, no inactivity warnings or deactivations are triggered.

### Reactivation

Via `/activate` command or "Reactivate Now" button:

- Sets `isActive = true`
- Updates `lastActivatedDate`
- Cancels pending reminder alarms
- Confirmation message sent

### Take a Break / Resume

Checkers can temporarily pause receiving votes:

- "Take a break" prompts checker to type /deactivate
- "Resume checking" prompts checker to type /activate

### Certificates

On programme completion:

- PDF certificate generated
- LinkedIn verifiable credential
- View/share options in bot message
