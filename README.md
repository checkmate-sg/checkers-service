# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/4e552da1-c019-47f6-92c6-6ee86119fc9c

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/4e552da1-c019-47f6-92c6-6ee86119fc9c) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- NextJS
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- MongoDB

## After real data is integrated change scripts in package.json to this

"scripts": {
"dev": "next dev",
"build": "next build",
"start": "next start",
"lint": "next lint"
},

## Updates

- MongoDB is connected, both dashboard and my-votes page are using dynamic data
- upon first launch seed will populate mongoDB with dummy data
- New Updates (working): Viewing of individual votes, submission of votes, webhook to listen in on new submissions (submit via postman). Refer to details below on how to submit submissions via webhook (take note picture submission not supported at the moment)
- Currently: seed.ts is in charge of finalising votes based on majority of votes. FInalisation of votes done upon launch for every vote submitted 24hrs and above in db. Seed.ts is also incharge of updating individual users dashboard details, (acccuracy etc etc)
- LeaderBoard not updated, still using static data
- Things to work on: nextAuth, connecting to telegram bot

## Using Postman

- Select the Body tab (right next to Headers).
- Choose raw.
- In the dropdown to the right of Text, select JSON.
- Follow the submissions below

POST http://localhost:3000/api/votes/webhook

Example body for submission:
{
"content": "🚨 Fake news spreading again!",
"sender": "External Source"
}

Expected response:
{
"message": "Vote submitted successfully",
"id": "66abcdef123..."
}
