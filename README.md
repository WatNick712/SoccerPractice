# Soccer Practice Planner

A modern, mobile-friendly web app for planning, organizing, and tracking soccer practice sessions. Built with React, Firebase (Firestore + Hosting), and GitHub Actions for CI/CD.

## Features

- **Calendar View**: Visual monthly calendar with soccer ball icons on dates with sessions. The ball fills up based on how much of the session is planned. Icons load immediately for all sessions in the currently visible month after login or when switching months/teams.
- **Session Planner**: Click a date to plan a session (location, start/end time, drills, notes, etc.).
- **Drill/Exercise Management**:
  - Add, edit, and delete drills with name, description, duration, link, categories (including Water Break), and rank (1–5 stars).
  - Filter drills by name, category, and rank.
  - Assign drills to sessions, add notes, and reorder with drag-and-drop.
  - Adjust drill duration per session instance.
- **Session Templates**:
  - Save any session as a reusable template.
  - Apply templates to any date (templates are scoped to the selected team).
  - Delete templates as needed.
- **Persistent Storage**: All data is saved in Firestore and synced in real time.
- **Mobile-Friendly UI**: Responsive, touch-friendly, and easy to use on any device.
- **Visual Feedback**: Animated buttons, clear modals, and progress indicators.
- **GitHub Actions CI/CD**: Automatic deployment to Firebase Hosting on every push to `main`.

## Major Features (2024-07-01)

- **Firebase Authentication**: Users must sign in with Google to access the app.
- **Team Management**:
  - Create a new team or join an existing team using an invite code.
  - Switch between multiple teams you are a member of.
  - Team name and user info are prominently displayed in the header.
- **Team Member Management**:
  - View all team members in a modal.
  - Team creator can remove members (except themselves).
  - Invite new members by sharing the team invite code (with a copy button and instructions).
  - Team members modal now shows names/emails (not just UIDs) using a Firestore users collection.
- **Sessions and Drills Scoped to Teams**:
  - All sessions and drills are associated with a specific team.
  - Only sessions and drills for the selected team are visible and editable.
- **Sessions Calendar Loading**:
  - Calendar loads and displays soccer ball icons for all sessions in the currently visible month immediately after login or when switching months/teams for performance.
- **UI/UX Improvements**:
  - Team and user info are visually prominent in the header.
  - Team selection, creation, joining, and member management are all modal-based for a smooth workflow.
  - Modals and session details are fully responsive and never overlapped by fixed UI elements (like the bottom bar).

### Typical Workflow
1. Sign in with Google.
2. Create a team or join an existing team using an invite code.
3. Manage team members and share the invite code to add others.
4. Plan sessions and drills for the selected team. All data is scoped to the team.
5. Switch teams at any time to manage other rosters and sessions.
6. See soccer ball icons for all planned sessions in the visible month immediately after login or when changing months.

See the app UI for details on each feature.

## Usage

### For End Users
1. **Open the app** at: [YOUR_FIREBASE_HOSTING_URL](https://your-app-name.web.app)
2. **Click a date** to plan or view a session.
3. **Add drills** via the Drills/Exercises button/modal.
4. **Assign drills** to sessions, reorder, and add notes.
5. **Save sessions as templates** for easy reuse.
6. **See progress** on the calendar with soccer ball icons (icons update for the visible month as you navigate).

### For Developers

#### 1. Clone the repo
```sh
git clone https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
```

#### 2. Install dependencies
```sh
npm install
```

#### 3. Set up Firebase
- Create a Firebase project.
- Add your Firebase config to `src/firebase.js`.
- Make sure Firestore rules allow the access you want.

#### 4. Run locally
```sh
npm start
```

#### 5. Deploy to Firebase Hosting
```sh
npm run build
firebase deploy
```

#### 6. Automatic Deploys (CI/CD)
- Every push to `main` triggers a GitHub Actions workflow that builds and deploys to Firebase Hosting.
- The workflow uses a secret (`SOCCERPRACTICE`) for the Firebase token.

## Customization
- **Categories**: Easily add or remove drill categories in `App.js`.
- **Session/Drill Fields**: Extend the form fields as needed.
- **Styling**: Tweak `App.css` for your club's branding.

## Credits
- Built with [React](https://reactjs.org/), [Firebase](https://firebase.google.com/), [react-calendar](https://github.com/wojtekmaj/react-calendar), and [dnd-kit](https://dndkit.com/).

---

**Enjoy planning your soccer practices!**

## Project Setup

- **Development Environment:**
  - Node.js and npm installed
  - Using Cursor and Command Prompt for development

- **Project Initialization:**
  - Created a new React app using `npx create-react-app soccer-training-app`
  - Project folder: `soccer-training-app`
  - To start the app: `npm start`

## Next Steps

- [ ] Build the calendar UI for selecting days
- [ ] Add forms to enter exercises and number of players
- [ ] Allow flexible drill arrangement
- [ ] Store and reuse previous sessions

---

**Important:**
- No data should be saved locally on the user's device.
- All user information must be stored online (in the cloud), so users can access their data from any device, anywhere with an internet connection.

---

**Update this file as you make progress!**

## Known Issues

- The calendar month/year label (e.g., "June 2025") font size does not increase as expected due to internal library styling. Needs further investigation and fix to allow for larger, more visible header text.
- The soccer ball progress icon on the calendar does not perfectly match the planned/total time ratio. The visual fill may not accurately reflect the session planning progress and needs further refinement for precise feedback.
- For performance, only sessions for the currently visible month are loaded and shown on the calendar. If you want to see icons for other months, navigate to that month and the data will load.

## Responsive Design

This app is fully responsive and works well on all screen sizes, including mobile phones, tablets, and desktop computers. All views and modals automatically adapt to the device being used, ensuring a smooth experience for every user.
