# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/4e552da1-c019-47f6-92c6-6ee86119fc9c

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/4e552da1-c019-47f6-92c6-6ee86119fc9c) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
#Step 0: Pre-requisites
Following steps assume that the following are installed in local device: Node.js, Git and MongoDB
This application runs on telegram context

# Step 1: Clone the repository using the project's Git URL and install dependencies.
Open a new terminal and run the following commands:
git clone https://github.com/checkmate-sg/checkers-service
cd checkers-webapp
npm install

# Step 2: Set Up MongoDB Atlas
Visit MongoDB Atlas and create an account.
Create a free shared cluster.
Create a database named checkmate.
Go to Database Access, create a user with read/write permissions.
In Network Access, allow IP access from 0.0.0.0/0.
Copy the connection string from the Connect tab (cluster -> connect -> drivers -> copy the uri)
It should look like: mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
Modify it to include the DB name: mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/checkmate?retryWrites=true&w=majority
Last step is to ensure your application points to the correct collection within the cluster

# Step 3: Create .env.local in the Root Directory
Before proceeding, take note we have yet to deploy the project to vercel and telegram bot has yet to be created, hence the values which require the vercel link telegram biot token, leave it as shown first.
Paste in the following with your actual values:
MONGODB_URI=<The URI link from the step above>
NEXTAUTH_SECRET=<your_generated_secret> (refer to link at bottom of this step to geenrate a secret)
NEXTAUTH_URL=<your vercel link>
TELEGRAM_BOT_TOKEN=<your_telegram_bot_token from botfather above>
TELEGRAM_WEBHOOK_URL=<your vercel link>/api/telegram/webhook
Url to generate NextAuth secret: https://generate-secret.vercel.app/32

# Step 4: Deploy on Vercel
Go to vercel.com and sign up/login
Create new project (Add new -> project -> git repo)
During setup, add the same 5 environment variables from .env.local under Project Settings > Environment Variables.
For NEXTAUTH_URL and TELEGRAM_WEBHOOK_URL, remember to replace it with the actual vercel url. You can leave TELEGRAM_BOT_TOKEN out first until next step.

# Step 5: Create Telegram Bot via BotFather
Search bot father on telegram
Send /newapp and follow the instructions to create a bot.
Set bot menu button (/mybots -> click the created bot -> Bot Settings -> Menu Button -> Edit menu Button URL -> paste vercel link)
Save the bot token (in bot father type /mybots -> click the bot you created -> API token)
Edit TELEGRAM_BOT_TOKEN on .env.local and add/edit it on vercel environment settings
Redeploy vercel application
Alternative deployment of bot is using the command /newbot instead.

# Step 6: Seed and test database connection
Open a new terminal (ensure in correct folder checkers-webapp) and run the following command: npm run dev
Check your atlas mongodb collection to ensure database is seeded with dummy data
Stop local deployment (ctrl c in terminal)
Test MongoDB connection, in terminal run: node test-db.cjs
Check output of test file in terminal. Ensure database name is checkmate and not test. In the event database name is wrong look at step 3 and ensure MONGODB_URI in environment variables includes the DB name

Expexted response:
🚀 Starting MongoDB test...

🔗 Connecting to MongoDB...
✅ Connected successfully!

📊 Database name: checkmate

📁 Available collections:
  - checkers
  - votes

🔍 "checkers" collection exists: ✅ Yes
🔍 "votes" collection exists: ✅ Yes
📈 Total documents in "checkers": 3
📈 Total documents in "votes": 5

✅ Test completed.

# Step 7:  Set Up Telegram Webhook
Run the following command in terminal to setup telegram web hook: npm run setup-webhook

#Step 8: Using the miniapp
/start will kick start onboarding process. To upload new queries for voting, refer to postman section below
```

## What technologies are used for this project?

This project is built with:

- NextJS
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- MongoDB
- NextAuthV5
- Telegram miniapp/bot

## Using Postman

- Select the Body tab (right next to Headers).
- Choose raw.
- In the dropdown to the right of Text, select JSON.
- Follow the submissions below

POST <replace this vercel url>/api/votes/webhook

Example body for submission:
{
"content" : "Postman test 3.0",
"sender" : "John Smith",
"screenshot":
"https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300"
}

Expected response:
{
"message": "Vote submitted successfully",
"id": "66abcdef123..."
}

## Moving Forward

- Dashboard messages sent is using checkers num referred, may not be the actual number of whatsapp messages sent (check with big boss BW to know which variable to look at)
- Voting logic. As of now, there is no conclusive time or way that voting ends. The seed file checks evry 24hrs and concludes voting based on majority vote but seed only works when you manually deploy it on VS terminal. Hence there is no conclusive voting period. Any new postings will not conclude.
- Voting page also shows all pass and present votes, it does not remove votes that have been concluded or completed.
- Telegram bot does not alert user that there is no query
- Onboarding whatsapp bot link is not an actual link.
- Onboarding does not check if user has completed quiz, does not verify otp. In the code file, everything the current bot does for onboarding that this new bot cannot do, is being commented out.
- Most of the variables stored for a checker is not being used in current logic except those present in the seeded checkers.
- Leaderboard score calculation does not follow current checkers webapp rules.
- Integration with AI responses, whatsapp messages. Api to receive this messages is exposed via the postman link
