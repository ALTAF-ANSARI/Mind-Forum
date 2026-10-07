# 🧠 MindForum

[![Node.js](https://img.shields.io/badge/Node.js-v18+-68a063?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-5.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas%20%2F%20Mongoose-47a248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-v4.8-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)
[![Hugging Face](https://img.shields.io/badge/Hugging%20Face-Qwen%202.5--7B-ffd21e?style=for-the-badge&logo=huggingface&logoColor=black)](https://huggingface.co/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg?style=for-the-badge)](https://opensource.org/licenses/ISC)

> **MindForum** is an intellectual discussion and knowledge-sharing platform combining community-driven Q&A, topic-based exploration spaces, real-time peer messaging, dynamic reach analytics, and an integrated AI editorial intelligence assistant powered by Hugging Face.

---

## 📑 Table of Contents

- [Executive Summary](#-executive-summary)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Repository Structure](#-repository-structure)
- [API Reference](#-api-reference)
  - [Authentication & Sessions](#1-authentication--sessions)
  - [User Profiles & Social Graph](#2-user-profiles--social-graph)
  - [Questions & Answers](#3-questions--answers)
  - [Topic Spaces](#4-topic-spaces)
  - [Direct Messaging & Real-Time Events](#5-direct-messaging--real-time-events)
  - [Notifications Engine](#6-notifications-engine)
  - [AI Editorial Assistant](#7-ai-editorial-assistant)
  - [Creative Stories & Chapters](#8-creative-stories--chapters)
- [Database Schema Models](#-database-schema-models)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running the Application](#running-the-application)
- [Security & Production Notes](#-security--production-notes)
- [Contributing & License](#-contributing--license)

---

## 💡 Executive Summary

MindForum bridges the gap between structured question-and-answer communities (like Quora or Stack Exchange) and modern intellectual salons. It empowers students, researchers, and creators to:

1. **Inquire & Deliberate:** Post questions, write formatted answers, attach media, upvote/downvote content, and search inquiries across curated spaces.
2. **Engage in Real Time:** Chat directly with other members through low-latency Socket.IO bi-directional websockets with automated in-app notifications.
3. **Explore Knowledge Spaces:** Organize discussions into domains like *Psychology, Philosophy, Technology, Science, and Business*, tracking top contributors per space.
4. **Leverage AI Assistance:** Consult an on-demand editorial AI assistant (`Qwen/Qwen2.5-7B-Instruct` via Hugging Face Inference API) capable of synthesizing forum context and providing deep narrative answers.
5. **Publish Creative Narratives:** Author multi-chapter stories with AI-assisted first-chapter generation, likes/dislikes, and reading metrics.

---

## 🚀 Key Features

### 🔐 Secure Authentication & Access Control
- Custom JWT-based stateless authentication stored in secure, `httpOnly` cookies with 7-day expiration.
- Password hashing using `bcryptjs` with auto-salted rounds before Mongoose persistence.
- Session-aware route guards (`auth` and `optionalAuth`) protecting private views while allowing public exploratory browsing.
- Production-ready cookie configuration (`sameSite: "none"` and `secure: true` on HTTPS deployments like Render).

### ❓ Community Q&A & Intellectual Discussions
- **Rich Inquiries:** Post questions categorized by topic spaces with optional image or video media uploads.
- **Vote Consensus:** Upvote and downvote mechanics with mutual cancellation preventing double-voting.
- **Answer Threads:** Answer questions with rich text and multimedia; question authors receive real-time notification alerts.
- **Discovery & Sorting:** Sort questions dynamically by `latest`, `trending` (highest views), or `top` (most upvoted), backed by regex-powered search.
- **Cascade Deletion:** Deleting a question automatically purges all related answer records.

### 🏛️ Topic Spaces & Contributor Analytics
- Curated spaces: **Psychology, Philosophy, Technology, Science, Business, and General**.
- Live aggregation computes total questions and member activity in real-time.
- Automated ranking identifies top contributing scholars and members per space.

### 💬 Real-Time Direct Messaging (Socket.IO)
- Private 1-on-1 chat rooms between users with conversation history persistence (`Chat` and `Message` models).
- Instant delivery via WebSocket events (`joinChat`, `sendMessage`, `receiveMessage`).
- REST fallback endpoints (`POST /api/chat/:chatId/messages/reply`) for quick replies and flexible integrations.
- Instant in-app notification dispatch when receiving a new message.

### 🤖 Hugging Face AI Editorial Intelligence
- Native integration with Hugging Face Inference API utilizing `Qwen/Qwen2.5-7B-Instruct`.
- Context-aware system prompting that incorporates recent platform activity into query responses.
- Persistent multi-turn chat sessions saved to MongoDB (`AIChat` model) for seamless dialogue continuation.
- AI story generator creating complete story drafts with structured title and chapter separation.

### 👤 User Profiles & Social Graph
- Editable profile bio, scholarly title, credentials, and custom interests tags.
- Direct avatar image upload handled through `multer` disk storage.
- Follower and following graph with real-time follow alerts.
- Reach metrics calculating cumulative view engagement across questions and stories.

### 🔔 Notification Pipeline
- Centralized notification dispatcher tracking upvotes, answers, follows, and direct messages.
- Batch mark-as-read, single mark-as-read, and browser push notification delivery flags.

---

## 🏛️ System Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                 Client Browser (HTML5 / ES6)                 │
│  - Single/Multi-page static views served directly by Express│
│  - Socket.IO client for live messaging events               │
│  - Fetch API with automatic httpOnly Cookie transmission    │
└───────────────────────────────┬─────────────────────────────┘
                                │ HTTP / WS
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                 Node.js / Express 5.x Server                │
│  ├── Static Middleware (Frontend files & /uploads storage)  │
│  ├── JWT Cookie Parser & Auth Gateways                      │
│  ├── Multer File Storage Engine (Disk storage)              │
│  ├── REST API Route Handlers                                │
│  └── Socket.IO Connection & Room Dispatcher                 │
└───────────────────────────────┬─────────────────────────────┘
                                │
        ┌───────────────────────┴───────────────────────┐
        ▼                                               ▼
┌───────────────────────────────┐     ┌───────────────────────────────┐
│        MongoDB Atlas          │     │     Hugging Face API          │
│  - Users & Social Graph       │     │  - Model: Qwen2.5-7B-Instruct │
│  - Questions & Answers        │     │  - Editorial Assistant        │
│  - Spaces Aggregation         │     │  - AI Story Generation        │
│  - Chats & Messages           │     └───────────────────────────────┘
│  - Stories & Chapters         │
│  - Notifications & AI Chats   │
└───────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Domain | Technology | Description |
|---|---|---|
| **Runtime** | [Node.js](https://nodejs.org/) (v18+) | JavaScript runtime with native ES Modules (`"type": "module"`) |
| **Backend Framework** | [Express.js](https://expressjs.com/) (v5.x) | Web application server hosting both API and static UI |
| **Database** | [MongoDB Atlas](https://www.mongodb.com/atlas) | Cloud NoSQL database |
| **ODM** | [Mongoose](https://mongoosejs.com/) (v9.x) | Object data modeling, schema validation, and lifecycle hooks |
| **Real-Time Protocol** | [Socket.IO](https://socket.io/) (v4.x) | Full-duplex WebSocket connection for real-time messaging |
| **AI Inference** | [@huggingface/inference](https://huggingface.co/docs/huggingface.js/inference/README) | Hugging Face cloud inference running `Qwen/Qwen2.5-7B-Instruct` |
| **Authentication** | [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) + [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | JWT issued over `httpOnly` cookies with salted password hashing |
| **File Storage** | [Multer](https://github.com/expressjs/multer) | Multipart file handling storing avatars and attachments locally |
| **Frontend UI** | HTML5, CSS3, Vanilla JavaScript | Responsive styling, dark/light theme toggle, zero external JS build overhead |
| **Typography & Icons** | Google Fonts + Font Awesome | `Outfit`, `Newsreader` font families and Font Awesome 6 icons |

---

## 📁 Repository Structure

```text
MindForum/
├── Backend/
│   ├── config/
│   │   └── dbConnect.js             # Mongoose connection with timeout handling
│   ├── models/
│   │   ├── aiChatModel.js           # Multi-turn AI chat conversation schema
│   │   ├── answerModel.js           # Question answers and upvote schema
│   │   ├── chatModel.js             # 1-on-1 messaging thread schema
│   │   ├── messageModel.js          # Individual message record schema
│   │   ├── notificationModel.js     # Notification alerts schema (upvotes, answers, etc.)
│   │   ├── questionModel.js         # Community questions, views, and spaces schema
│   │   ├── spaceModel.js            # Topic space categorization schema
│   │   ├── storyChapterModel.js     # Multi-chapter content schema
│   │   ├── storyModel.js            # Creative narratives and genre schema
│   │   └── userModel.js             # User identity, bcrypt hooks, and social graph
│   ├── uploads/                     # Local disk destination for user media uploads
│   ├── checkUsers.js                # Database user inspection utility
│   ├── package.json                 # Backend dependencies and scripts
│   ├── seedStories.js               # Sample data seeder for stories
│   └── server.js                    # Server bootstrap, middleware, routes, Socket.IO
│
├── Frontend/                        # Client-side views, styles, and scripts
│   ├── ai-assistant.html            # AI Editorial Chat interface
│   ├── ai-assistant.css / .js       # Styles and client logic for AI chat
│   ├── home.html                    # Main feed (questions, trending sort, ask modal)
│   ├── home.css / .js               # Feed styling, space filtering, dynamic rendering
│   ├── question.html / .js          # Single question view, answers, and reply form
│   ├── spaces.html / .js            # Topic spaces salon and top contributors
│   ├── messages.html / .css / .js   # 1-on-1 real-time direct chat UI
│   ├── notifications.html / .css/.js# Notification center and read status triggers
│   ├── profile.html / .css / .js    # Profile page, stats, follow toggle, photo upload
│   ├── login.html / .css / .js      # Authentication login view
│   ├── signup.html / .css / .js     # Account registration view
│   ├── create-story.html / .js      # Creative story publisher & AI generation form
│   ├── read-story.html / .js        # Story reader and chapter viewer
│   └── [genre].html                 # Dedicated genre views (philosophy, science, etc.)
│
├── .gitignore                       # Git exclusion rules (.env, uploads/, node_modules/)
└── README.md                        # Project documentation
```

---

## 🔌 API Reference

### 1. Authentication & Sessions

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/signup` | Public | Create new user account with `name`, `email`, `password`. |
| `POST` | `/login` | Public | Authenticate user; returns `httpOnly` JWT session cookie. |
| `GET` | `/logout` | Public | Clears session cookie and redirects to `/login`. |

### 2. User Profiles & Social Graph

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/user/me` | Bearer/Cookie | Get authenticated user data (excluding password). |
| `PATCH` | `/api/user/profile` | Bearer/Cookie | Update `bio`, `title`, and `interests` (comma-separated or array). |
| `POST` | `/api/user/upload-profile-pic`| Bearer/Cookie | Upload new avatar (`multipart/form-data`, field: `profilePic`). |
| `GET` | `/api/user/public/:id` | Public | Fetch public profile with populated followers and following. |
| `POST` | `/api/user/follow/:id` | Bearer/Cookie | Toggle follow/unfollow status; dispatches follow notification. |
| `GET` | `/api/user/stats/:id` | Public | Return counts for questions, answers, total views reach, and followers. |
| `GET` | `/api/user/:id/questions` | Public | Get all questions created by a specific user with answer counts. |
| `GET` | `/api/user/:id/answers` | Public | Get all answers authored by a specific user. |
| `GET` | `/api/users/search?q={query}` | Bearer/Cookie | Search users by name for initiating new chats (min 2 chars). |

### 3. Questions & Answers

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/questions` | Optional | Retrieve questions. Filters: `?space=Name`, `?search=term`, `?userId=id`, `?sort=trending\|top`. |
| `GET` | `/api/questions/:id` | Optional | Get single question details (increments views count for non-author). |
| `POST` | `/api/questions` | Bearer/Cookie | Create question (`content`, `spaces`, optional `media` file upload). |
| `POST` | `/api/questions/:id/upvote` | Bearer/Cookie | Toggle upvote on question (notifies author). |
| `POST` | `/api/questions/:id/downvote`| Bearer/Cookie | Toggle downvote on question. |
| `DELETE`| `/api/questions/:id` | Bearer/Cookie | Delete question and all its associated answers (author only). |
| `GET` | `/api/questions/:id/answers` | Optional | Get all answers for a specific question. |
| `POST` | `/api/questions/:id/answers` | Bearer/Cookie | Post an answer with optional media attachment (`media`). |
| `POST` | `/api/answers/:id/upvote` | Bearer/Cookie | Toggle upvote on a specific answer. |

### 4. Topic Spaces

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/spaces` | Optional | Fetch all curated spaces with live question counts and estimated members. |
| `GET` | `/api/spaces/:name/contributors` | Optional | Get the most active users/contributors for a specific space. |

### 5. Direct Messaging & Real-Time Events

#### REST Endpoints
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/chat/initiate` | Bearer/Cookie | Find or start a 1-on-1 chat room with `recipientId`. |
| `GET` | `/api/chat` | Bearer/Cookie | Get all active conversation threads for current user. |
| `GET` | `/api/chat/:chatId/messages`| Bearer/Cookie | Get message history for a specific chat room. |
| `POST` | `/api/chat/:chatId/messages/reply` | Bearer/Cookie | Post message via HTTP; notifies recipient and emits to Socket room. |

#### Socket.IO Event Schema
- **Client to Server:**
  - `joinChat(chatId)`: Joins the socket room for the conversation.
  - `sendMessage({ chatId, senderId, text })`: Stores message, updates thread timestamp, dispatches notification, and broadcasts.
- **Server to Client:**
  - `receiveMessage(messageObject)`: Broadcasted to everyone in room `chatId` when a new message arrives.

### 6. Notifications Engine

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/notifications` | Bearer/Cookie | Fetch latest 30 notifications for the current user. |
| `PATCH` | `/api/notifications/:id/read` | Bearer/Cookie | Mark individual notification as read. |
| `PATCH` | `/api/notifications/read-all` | Bearer/Cookie | Mark all unread notifications as read. |
| `PATCH` | `/api/notifications/browser-notified` | Bearer/Cookie | Update browser push delivery state (`ids: string[]`). |

### 7. AI Editorial Assistant

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/ai/history` | Bearer/Cookie | Fetch saved AI consultation threads for authenticated user. |
| `POST` | `/api/ai/ask` | Bearer/Cookie | Generate AI response via Hugging Face (`prompt`, optional `chatId`). |

### 8. Creative Stories & Chapters

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/stories` | Bearer/Cookie | Create story with metadata and cover image (`coverImage` upload). |
| `GET` | `/api/stories` | Bearer/Cookie | List stories (`?genre=Genre`, `?author=userId`). |
| `GET` | `/api/stories/:id` | Bearer/Cookie | Get story details and increment views. |
| `DELETE`| `/api/stories/:id` | Bearer/Cookie | Delete story and associated chapters (author only). |
| `POST` | `/api/stories/:id/chapters` | Bearer/Cookie | Add a chapter to an existing story. |
| `GET` | `/api/stories/:id/chapters` | Bearer/Cookie | Retrieve all chapters for a story. |
| `POST` | `/api/stories/generate` | Bearer/Cookie | Generate story title & chapter 1 with AI (`prompt`, `genre`). |
| `POST` | `/api/stories/:id/like` | Bearer/Cookie | Toggle like reaction on story. |
| `POST` | `/api/stories/:id/dislike` | Bearer/Cookie | Toggle dislike reaction on story. |

---

## 🗄️ Database Schema Models

The system is backed by MongoDB with the following Mongoose models:

1. **User (`userModel.js`)**: Name, unique lowercase email, bcrypt-hashed password, avatar URL, bio, interests array, scholarly title, verified status, follower/following object references.
2. **Question (`questionModel.js`)**: Author reference, content text, media URL, media type (`text`, `image`, `video`), space categorization, view counter, arrays of user IDs for upvotes and downvotes.
3. **Answer (`answerModel.js`)**: Author reference, question reference, content, media URL and type, upvotes array.
4. **Chat & Message (`chatModel.js`, `messageModel.js`)**: Participants array, last message reference; individual messages linked to `chatId` with sender reference and text.
5. **Notification (`notificationModel.js`)**: Recipient and sender references, type (`answer`, `upvote`, `follow`, `message`), optional target ID (`questionId`, `chatId`), read flag, and browser notification state.
6. **AIChat (`aiChatModel.js`)**: User reference, title, and conversation messages array (`role: "user" | "assistant"`, content, timestamp).
7. **Story & StoryChapter (`storyModel.js`, `storyChapterModel.js`)**: Narrative metadata, genre, tags, cover image, likes/dislikes, views, and associated chapter records.

---

## 🏁 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (Version 18.x or later recommended)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster URI (or local MongoDB daemon)
- [Hugging Face](https://huggingface.co/) User Access Token (Free tier or Pro with access to Inference API)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ALTAF-ANSARI/Mind-Forum.git
   cd Mind-Forum/MindForum
   ```

2. **Install Backend Dependencies:**
   ```bash
   cd Backend
   npm install
   ```

### Environment Variables

Create a `.env` file in the `Backend/` directory:

```bash
# In MindForum/Backend/.env
DATABASEURL=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
JWT_SECRET=your_secure_random_jwt_secret_key_here
HF_API_KEY=hf_your_hugging_face_access_token_here
PORT=3000
NODE_ENV=development
```

#### Environment Variables Breakdown:
- `DATABASEURL` *(or `MONGODB_URI`)*: MongoDB Atlas connection URI.
- `JWT_SECRET`: Secret key used to sign and verify user session tokens.
- `HF_API_KEY`: Hugging Face API key required for the AI Assistant and Story Generator.
- `PORT`: (Optional) Port number for Express server (defaults to `3000`).
- `NODE_ENV`: Set to `development` for local testing; set to `production` on platforms like Render or Railway.

> **Security Warning:** Never commit your `.env` file or actual API keys to GitHub. The `.gitignore` file is configured to exclude `Backend/.env`.

### Running the Application

1. **Start the server:**
   ```bash
   npm start
   ```
   *(Or run directly with `node server.js`)*

2. **Access the application:**
   Open your browser and navigate to:
   ```text
   http://localhost:3000
   ```
   The Express server serves both the static frontend and the API routes from a single unified port. If you are not logged in, you will be automatically redirected to `http://localhost:3000/login`.

---

## 🔒 Security & Production Notes

- **HTTP-Only Cookies:** Tokens are delivered through `httpOnly` cookies, preventing client-side JavaScript access and mitigating Cross-Site Scripting (XSS) token theft.
- **Environment-Aware Cookies:** In production (`NODE_ENV=production`), cookies are set with `secure: true` (requiring HTTPS) and `sameSite: "none"` to allow proper cross-origin credential passing when hosted behind reverse proxies.
- **Input Validation & Sanitization:** Emails are normalized to lowercase and trimmed; passwords are validated and hashed using bcrypt before persistence.
- **Resource Ownership Authorization:** Destructive operations (such as `DELETE /api/questions/:id` and `DELETE /api/stories/:id`) enforce ownership checks, ensuring only resource authors can perform deletions.
- **Media Upload Isolation:** Files are saved using timestamped randomized names inside `Backend/uploads/` with extension preservation, preventing path traversal and name collisions.

---

## 👥 Contributing & License

Contributions, issues, and feature requests are welcome!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Distributed under the **ISC License**. See `package.json` for details.
