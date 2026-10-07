import express from "express"
import dbConnect from './config/dbConnect.js'
import path from "path"
import jwt from "jsonwebtoken"
import cookieParser from "cookie-parser"
import User from "./models/userModel.js"
import Story from "./models/storyModel.js"
import StoryChapter from "./models/storyChapterModel.js"
import Notification from "./models/notificationModel.js"
import AIChat from "./models/aiChatModel.js"
import Chat from "./models/chatModel.js"
import Message from "./models/messageModel.js"
import Question from "./models/questionModel.js"
import Answer from "./models/answerModel.js"
import Space from "./models/spaceModel.js"
import http from "http"
import { Server } from "socket.io"
import { HfInference } from "@huggingface/inference"
import { fileURLToPath } from "url"
import multer from "multer"
import fs from "fs"
import dotenv from "dotenv"
dotenv.config()


const hf = new HfInference(process.env.HF_API_KEY);
const HF_MODEL = "Qwen/Qwen2.5-7B-Instruct";
const app = express()
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const frontendPath = path.join(__dirname,"..","Frontend")

app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(cookieParser())

dbConnect()


app.use(express.static(frontendPath))

// Create uploads directory if it doesn't exist
const uploadsPath = path.join(__dirname, "uploads")
if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath)
}
app.use("/uploads", express.static(uploadsPath))

// --- Multer Config ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
console.log("Using local disk for media storage.");
const upload = multer({ storage })


async function auth(req, res, next) {
    const token = req.cookies.token;

    if (!token) {
        if (req.path.startsWith("/api") || req.baseUrl.startsWith("/api")) {
            return res.status(401).json({ message: "Authentication required" });
        }
        return res.redirect("/login");
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.clearCookie("token");
        if (req.path.startsWith("/api") || req.baseUrl.startsWith("/api")) {
            return res.status(401).json({ message: "Invalid session" });
        }
        res.redirect("/login");
    }
}

async function optionalAuth(req, res, next) {
    const token = req.cookies.token;
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
        } catch (err) {
            // Ignored for optional
        }
    }
    next();
}




app.get("/",(req,res)=>{
    res.redirect("/login")
})

app.get("/login",(req,res)=>{
    res.sendFile(path.join(frontendPath,"login.html"))
})

app.get("/signup",(req,res)=>{
    res.sendFile(path.join(frontendPath,"signup.html"))
})

app.post("/signup", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.send("User already exists");
        }

        // Create new user
        const newUser = new User({ name, email, password });
        await newUser.save();

        res.send("Signup Successful");
    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).send("Registration failed: " + error.message);
    }
});


app.get("/home",auth,(req,res)=>{
    res.sendFile(path.join(frontendPath,"home.html"))
})

app.get("/question",auth,(req,res)=>{
    res.sendFile(path.join(frontendPath,"question.html"))
})

app.get("/questions",auth,(req,res)=>{
    res.sendFile(path.join(frontendPath,"home.html"))
})

app.get("/spaces",auth,(req,res)=>{
    res.sendFile(path.join(frontendPath,"spaces.html"))
})

app.get("/philosophy",auth,(req,res)=>{
    res.sendFile(path.join(frontendPath,"spaces.html"))
})

app.get("/psychology",auth,(req,res)=>{
    res.sendFile(path.join(frontendPath,"spaces.html"))
})

app.get("/technology",auth,(req,res)=>{
    res.sendFile(path.join(frontendPath,"spaces.html"))
})

app.get("/science",auth,(req,res)=>{
    res.sendFile(path.join(frontendPath,"spaces.html"))
})

app.get("/business",auth,(req,res)=>{
    res.sendFile(path.join(frontendPath,"spaces.html"))
})

app.get("/ai-assistant",auth,(req,res)=>{
    res.sendFile(path.join(frontendPath,"ai-assistant.html"))
})

app.get("/messages",auth,(req,res)=>{
    res.sendFile(path.join(frontendPath,"messages.html"))
})

app.get("/profile",auth,(req,res)=>{
    res.sendFile(path.join(frontendPath,"profile.html"))
})

app.get("/notifications",auth,(req,res)=>{
    res.sendFile(path.join(frontendPath,"notifications.html"))
})



app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Basic validation
        if (!email || !password) {
            return res.status(400).send("Email and password are required");
        }

        // Find user by email
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            return res.status(401).send("Invalid Email or Password");
        }

        // Validate password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).send("Invalid Email or Password");
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        // Send token in cookie
        // secure:true only works over HTTPS — disable on local dev
        const isProduction = process.env.NODE_ENV === "production";
        res.cookie("token", token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
        });

        res.send("Login Successful");
    } catch (error) {
        console.error("Login error:", error.message, error.stack);
        res.status(500).send("Login failed: " + error.message);
    }
});


app.get("/logout", (req, res) => {
    res.clearCookie("token");
    res.redirect("/login");
});

// User API Routes
app.get("/api/user/me", auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: "Error fetching user" });
    }
});

app.post("/api/user/upload-profile-pic", auth, upload.single("profilePic"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const profilePicUrl = `/uploads/${req.file.filename}`;
        
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { profilePic: profilePicUrl },
            { new: true }
        );

        res.json({ 
            message: "Profile picture updated successfully", 
            profilePic: profilePicUrl 
        });
    } catch (error) {
        console.error("Profile upload error:", error);
        res.status(500).json({ message: "Failed to upload profile picture" });
    }
});

app.get("/api/ai/history", auth, async (req, res) => {
    try {
        const chats = await AIChat.find({ user: req.user.id }).sort({ updatedAt: -1 });
        res.json(chats);
    } catch (error) {
        res.status(500).json({ message: "Error fetching chat history" });
    }
});

app.post("/api/ai/ask", auth, async (req, res) => {
    try {
        const { prompt, chatId } = req.body;
        
        // Fetch context from the forum
        const recentStories = await Story.find()
            .populate("author", "name")
            .sort({ createdAt: -1 })
            .limit(10);
            
        const context = recentStories.map(s => 
            `Genre: ${s.genre}, Story Title: ${s.title}, Author: ${s.author.name}`
        ).join("\n");

        const systemPrompt = `You are Tellora AI, an elite Editorial Intelligence designed for the Tellora story-sharing platform.
        Your purpose is to provide deep, analytical, and highly intellectual responses about stories and narratives.
        Structure your responses to be engaging, professional, and insightful. 
        Context from recent platform stories:
        ${context}`;

        console.log("Generating AI response with Hugging Face (Qwen)...");
        const response = await hf.chatCompletion({
            model: HF_MODEL,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ],
            max_tokens: 800,
            temperature: 0.7,
            top_p: 0.95
        });
        
        const responseText = response.choices[0].message.content;
        console.log("AI response generated.");

        // Update or create chat history
        let chat;
        if (chatId) {
            chat = await AIChat.findById(chatId);
            chat.messages.push({ role: "user", content: prompt });
            chat.messages.push({ role: "assistant", content: responseText });
            await chat.save();
        } else {
            chat = new AIChat({
                user: req.user.id,
                title: prompt.substring(0, 30) + "...",
                messages: [
                    { role: "user", content: prompt },
                    { role: "assistant", content: responseText }
                ]
            });
            await chat.save();
        }

        res.json({ response: responseText, chatId: chat._id });
    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ message: "AI Assistant failed to respond" });
    }
});

// Duplicate route removed — handled at line 205

app.patch("/api/user/profile", auth, async (req, res) => {
    try {
        const { bio, interests, title } = req.body;
        
        // Convert comma-separated string to array if necessary
        const interestsArray = Array.isArray(interests) 
            ? interests 
            : (interests ? interests.split(",").map(i => i.trim()) : []);

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { bio, interests: interestsArray, title },
            { new: true }
        ).select("-password");

        res.json(updatedUser);
    } catch (error) {
        console.error("Profile update error:", error);
        res.status(500).json({ message: "Update failed" });
    }
});

// GET Public Profile
app.get("/api/user/public/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select("-password -email")
            .populate("followers", "name profilePic")
            .populate("following", "name profilePic");
            
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: "Error fetching profile" });
    }
});

// Follow/Unfollow Toggle
app.post("/api/user/follow/:id", auth, async (req, res) => {
    try {
        const userToFollow = await User.findById(req.params.id);
        const currentUser = await User.findById(req.user.id);

        if (!userToFollow) return res.status(404).json({ message: "User not found" });
        if (req.params.id === req.user.id) return res.status(400).json({ message: "You cannot follow yourself" });

        const isFollowing = currentUser.following.includes(req.params.id);

        if (isFollowing) {
            // Unfollow
            currentUser.following = currentUser.following.filter(id => id.toString() !== req.params.id);
            userToFollow.followers = userToFollow.followers.filter(id => id.toString() !== req.user.id);
        } else {
            // Follow
            currentUser.following.push(req.params.id);
            userToFollow.followers.push(req.user.id);
        }

        await currentUser.save();
        await userToFollow.save();

        // Create Notification (only if following)
        if (!isFollowing) {
            const notification = new Notification({
                recipient: req.params.id,
                sender: req.user.id,
                type: "follow",
                message: `${currentUser.name} followed you.`
            });
            await notification.save();
        }

        res.json({ isFollowing: !isFollowing, followersCount: userToFollow.followers.length });
    } catch (error) {
        res.status(500).json({ message: "Follow action failed" });
    }
});

// User Stats (Questions & Answers count + Reach + Followers)
app.get("/api/user/stats/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        const qCount = await Question.countDocuments({ user: req.params.id });
        const aCount = await Answer.countDocuments({ user: req.params.id });
        const sCount = await Story.countDocuments({ author: req.params.id });
        const cCount = await StoryChapter.countDocuments({ story: { $in: await Story.find({author: req.params.id}).distinct('_id') } });
        
        // Sum of all views for user's questions & stories
        const userQuestions = await Question.find({ user: req.params.id });
        const qViews = userQuestions.reduce((acc, q) => acc + (q.views || 0), 0);
        const stories = await Story.find({ author: req.params.id });
        const sViews = stories.reduce((acc, s) => acc + (s.views || 0), 0);
        const totalReach = qViews + sViews;

        res.json({ 
            questions: qCount > 0 ? qCount : sCount,
            answers: aCount > 0 ? aCount : cCount, 
            totalReach,
            followersCount: user.followers ? user.followers.length : 0,
            followingCount: user.following ? user.following.length : 0
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching stats" });
    }
});

// --- Notification API ---

// Get User Notifications
app.get("/api/notifications", auth, async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user.id })
            .populate("sender", "name profilePic title")
            .populate("questionId", "content")
            .sort({ createdAt: -1 })
            .limit(30);
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: "Error fetching notifications" });
    }
});

// Mark Notification as Read
app.patch("/api/notifications/:id/read", auth, async (req, res) => {
    try {
        await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
        res.json({ message: "Marked as read" });
    } catch (error) {
        res.status(500).json({ message: "Error updating notification" });
    }
});

// Mark All as Read
app.patch("/api/notifications/read-all", auth, async (req, res) => {
    try {
        await Notification.updateMany({ recipient: req.user.id, isRead: false }, { isRead: true });
        res.json({ message: "All marked as read" });
    } catch (error) {
        res.status(500).json({ message: "Error updating notifications" });
    }
});

// Mark as Browser Notified
app.patch("/api/notifications/browser-notified", auth, async (req, res) => {
    try {
        const { ids } = req.body;
        await Notification.updateMany({ _id: { $in: ids } }, { isBrowserNotified: true });
        res.json({ message: "Updated browser notification state" });
    } catch (error) {
        res.status(500).json({ message: "Error updating notifications" });
    }
});

// Get User Questions (Dynamic from MongoDB)
app.get("/api/user/:id/questions", async (req, res) => {
    try {
        const questions = await Question.find({ user: req.params.id })
            .populate("user", "name profilePic title isVerified")
            .sort({ createdAt: -1 });
        if (questions && questions.length > 0) {
            const questionIds = questions.map(q => q._id);
            const answerCounts = await Answer.aggregate([
                { $match: { question: { $in: questionIds } } },
                { $group: { _id: "$question", count: { $sum: 1 } } }
            ]);
            const countsMap = {};
            answerCounts.forEach(ac => { countsMap[ac._id.toString()] = ac.count; });
            const enriched = questions.map(q => {
                const obj = q.toObject();
                obj.answersCount = countsMap[q._id.toString()] || 0;
                return obj;
            });
            return res.json(enriched);
        }
        // Fallback to stories if user only has stories
        const stories = await Story.find({ author: req.params.id })
            .populate("author", "name profilePic title")
            .sort({ createdAt: -1 });
        res.json(stories);
    } catch (error) {
        res.status(500).json({ message: "Error fetching user questions" });
    }
});

// Get User Answers (Dynamic from MongoDB)
app.get("/api/user/:id/answers", async (req, res) => {
    try {
        const answers = await Answer.find({ user: req.params.id })
            .populate("user", "name profilePic title isVerified")
            .populate({
                path: "question",
                populate: { path: "user", select: "name profilePic title" }
            })
            .sort({ createdAt: -1 });
        res.json(answers);
    } catch (error) {
        res.status(500).json({ message: "Error fetching user answers" });
    }
});

// --- Questions & Answers API ---

// GET all questions with filters
app.get("/api/questions", optionalAuth, async (req, res) => {
    try {
        const filter = {};
        if (req.query.space && req.query.space !== "All" && req.query.space !== "Home") {
            filter.spaces = { $regex: new RegExp(`^${req.query.space}$`, "i") };
        }
        if (req.query.search) {
            filter.content = { $regex: req.query.search, $options: "i" };
        }
        if (req.query.userId) {
            filter.user = req.query.userId;
        }

        let sortOption = { createdAt: -1 };
        if (req.query.sort === "trending") {
            sortOption = { views: -1, createdAt: -1 };
        } else if (req.query.sort === "top") {
            sortOption = { "upvotes.length": -1, createdAt: -1 };
        }

        const questions = await Question.find(filter)
            .populate("user", "name profilePic title isVerified")
            .sort(sortOption);

        const questionIds = questions.map(q => q._id);
        const answerCounts = await Answer.aggregate([
            { $match: { question: { $in: questionIds } } },
            { $group: { _id: "$question", count: { $sum: 1 } } }
        ]);
        const countsMap = {};
        answerCounts.forEach(ac => { countsMap[ac._id.toString()] = ac.count; });

        const enriched = questions.map(q => {
            const obj = q.toObject();
            obj.answersCount = countsMap[q._id.toString()] || 0;
            return obj;
        });

        res.json(enriched);
    } catch (error) {
        console.error("Error fetching questions:", error);
        res.status(500).json({ message: "Error fetching questions" });
    }
});

// GET single question by ID
app.get("/api/questions/:id", optionalAuth, async (req, res) => {
    try {
        const question = await Question.findById(req.params.id)
            .populate("user", "name profilePic title isVerified");
        if (!question) return res.status(404).json({ message: "Question not found" });

        // Increment views if viewer is not the author
        if (question.user && question.user._id.toString() !== req.user.id) {
            question.views = (question.views || 0) + 1;
            await question.save();
        }

        const answersCount = await Answer.countDocuments({ question: question._id });
        const obj = question.toObject();
        obj.answersCount = answersCount;

        res.json(obj);
    } catch (error) {
        res.status(500).json({ message: "Error fetching question" });
    }
});

// POST new question
app.post("/api/questions", auth, upload.single("media"), async (req, res) => {
    try {
        const { content, spaces } = req.body;
        if (!content || !content.trim()) {
            return res.status(400).json({ message: "Content is required" });
        }

        let mediaUrl = "";
        let mediaType = "text";
        if (req.file) {
            mediaUrl = `/uploads/${req.file.filename}`;
            const ext = path.extname(req.file.originalname).toLowerCase();
            if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)) {
                mediaType = "image";
            } else if ([".mp4", ".mov", ".avi", ".mkv"].includes(ext)) {
                mediaType = "video";
            }
        }

        const newQuestion = new Question({
            user: req.user.id,
            content: content.trim(),
            spaces: spaces || "General",
            mediaUrl,
            mediaType
        });
        await newQuestion.save();
        await newQuestion.populate("user", "name profilePic title isVerified");

        res.status(201).json(newQuestion);
    } catch (error) {
        console.error("Error creating question:", error);
        res.status(500).json({ message: "Failed to create question" });
    }
});

// Upvote question
app.post("/api/questions/:id/upvote", auth, async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);
        if (!question) return res.status(404).json({ message: "Question not found" });
        const userId = req.user.id;

        const upvoteIdx = question.upvotes.indexOf(userId);
        const downvoteIdx = question.downvotes ? question.downvotes.indexOf(userId) : -1;

        if (upvoteIdx > -1) {
            question.upvotes.splice(upvoteIdx, 1);
        } else {
            question.upvotes.push(userId);
            if (downvoteIdx > -1) question.downvotes.splice(downvoteIdx, 1);
            
            // Notify author if not own question
            if (question.user.toString() !== userId) {
                const sender = await User.findById(userId);
                const notification = new Notification({
                    recipient: question.user,
                    sender: userId,
                    type: "upvote",
                    questionId: question._id,
                    message: `${sender?.name || 'Someone'} upvoted your question: "${question.content.substring(0, 35)}..."`
                });
                await notification.save();
            }
        }
        await question.save();
        res.json({ upvotesCount: question.upvotes.length, downvotesCount: question.downvotes?.length || 0, isUpvoted: question.upvotes.includes(userId) });
    } catch (error) {
        res.status(500).json({ message: "Upvote failed" });
    }
});

// Downvote question
app.post("/api/questions/:id/downvote", auth, async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);
        if (!question) return res.status(404).json({ message: "Question not found" });
        const userId = req.user.id;

        if (!question.downvotes) question.downvotes = [];
        const downvoteIdx = question.downvotes.indexOf(userId);
        const upvoteIdx = question.upvotes.indexOf(userId);

        if (downvoteIdx > -1) {
            question.downvotes.splice(downvoteIdx, 1);
        } else {
            question.downvotes.push(userId);
            if (upvoteIdx > -1) question.upvotes.splice(upvoteIdx, 1);
        }
        await question.save();
        res.json({ upvotesCount: question.upvotes.length, downvotesCount: question.downvotes.length, isDownvoted: question.downvotes.includes(userId) });
    } catch (error) {
        res.status(500).json({ message: "Downvote failed" });
    }
});

// DELETE question
app.delete("/api/questions/:id", auth, async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);
        if (!question) return res.status(404).json({ message: "Question not found" });
        if (question.user.toString() !== req.user.id) {
            return res.status(403).json({ message: "Not authorized to delete this question" });
        }
        await Answer.deleteMany({ question: req.params.id });
        await Question.findByIdAndDelete(req.params.id);
        res.json({ message: "Question and associated answers deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Failed to delete question" });
    }
});

// GET answers for a question
app.get("/api/questions/:id/answers", optionalAuth, async (req, res) => {
    try {
        const answers = await Answer.find({ question: req.params.id })
            .populate("user", "name profilePic title isVerified")
            .sort({ createdAt: -1 });
        res.json(answers);
    } catch (error) {
        res.status(500).json({ message: "Error fetching answers" });
    }
});

// POST answer to question
app.post("/api/questions/:id/answers", auth, upload.single("media"), async (req, res) => {
    try {
        const { content } = req.body;
        if (!content || !content.trim()) {
            return res.status(400).json({ message: "Answer content is required" });
        }

        let mediaUrl = "";
        let mediaType = "text";
        if (req.file) {
            mediaUrl = `/uploads/${req.file.filename}`;
            const ext = path.extname(req.file.originalname).toLowerCase();
            if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)) {
                mediaType = "image";
            } else if ([".mp4", ".mov", ".avi", ".mkv"].includes(ext)) {
                mediaType = "video";
            }
        }

        const newAnswer = new Answer({
            user: req.user.id,
            question: req.params.id,
            content: content.trim(),
            mediaUrl,
            mediaType
        });
        await newAnswer.save();
        await newAnswer.populate("user", "name profilePic title isVerified");

        // Notify question author
        const question = await Question.findById(req.params.id);
        if (question && question.user.toString() !== req.user.id) {
            const sender = await User.findById(req.user.id);
            const notification = new Notification({
                recipient: question.user,
                sender: req.user.id,
                type: "answer",
                questionId: question._id,
                answerId: newAnswer._id,
                message: `${sender?.name || 'Someone'} answered your question: "${question.content.substring(0, 35)}..."`
            });
            await notification.save();
        }

        res.status(201).json(newAnswer);
    } catch (error) {
        console.error("Error creating answer:", error);
        res.status(500).json({ message: "Failed to post answer" });
    }
});

// Upvote answer
app.post("/api/answers/:id/upvote", auth, async (req, res) => {
    try {
        const answer = await Answer.findById(req.params.id);
        if (!answer) return res.status(404).json({ message: "Answer not found" });
        const userId = req.user.id;

        const upvoteIdx = answer.upvotes.indexOf(userId);
        if (upvoteIdx > -1) {
            answer.upvotes.splice(upvoteIdx, 1);
        } else {
            answer.upvotes.push(userId);
        }
        await answer.save();
        res.json({ upvotesCount: answer.upvotes.length, isUpvoted: answer.upvotes.includes(userId) });
    } catch (error) {
        res.status(500).json({ message: "Upvote failed" });
    }
});

// --- Spaces API ---
app.get("/api/spaces", optionalAuth, async (req, res) => {
    try {
        const predefined = [
            { name: "Psychology", description: "Exploring cognitive functions, human behavior, neurobiology, and mental paradigms.", icon: "fas fa-brain" },
            { name: "Philosophy", description: "Deep inquiry into ethics, epistemology, existentialism, and ancient wisdom.", icon: "fas fa-book-open" },
            { name: "Technology", description: "The frontier of innovation. AI, systems engineering, software, and digital society.", icon: "fas fa-microchip" },
            { name: "Science", description: "Empirical discoveries, quantum mechanics, physics, and cosmological research.", icon: "fas fa-atom" },
            { name: "Business", description: "Macroeconomics, venture strategy, intellectual leadership, and market philosophy.", icon: "fas fa-briefcase" },
            { name: "General", description: "Open discussions on diverse topics across the intellectual salon.", icon: "fas fa-compass" }
        ];

        const counts = await Question.aggregate([
            { $group: { _id: "$spaces", count: { $sum: 1 } } }
        ]);
        const countsMap = {};
        counts.forEach(c => { if (c._id) countsMap[c._id.toLowerCase()] = c.count; });

        const result = predefined.map(s => ({
            ...s,
            questionCount: countsMap[s.name.toLowerCase()] || 0,
            membersCount: Math.max(12, (countsMap[s.name.toLowerCase()] || 1) * 8 + 42)
        }));

        res.json(result);
    } catch (error) {
        res.status(500).json({ message: "Error fetching spaces" });
    }
});

// GET space top contributors
app.get("/api/spaces/:name/contributors", optionalAuth, async (req, res) => {
    try {
        const spaceName = req.params.name;
        const questionsInSpace = await Question.find({ 
            spaces: { $regex: new RegExp(`^${spaceName}$`, "i") } 
        }).distinct("user");

        const contributors = await User.find({ _id: { $in: questionsInSpace } })
            .select("name profilePic title")
            .limit(5);

        if (contributors.length < 3) {
            const moreUsers = await User.find({ _id: { $nin: questionsInSpace } })
                .select("name profilePic title")
                .limit(4 - contributors.length);
            contributors.push(...moreUsers);
        }

        res.json(contributors);
    } catch (error) {
        res.status(500).json({ message: "Error fetching space contributors" });
    }
});

// Search Users (for New Chat modal)
app.get("/api/users/search", auth, async (req, res) => {
    try {
        const q = (req.query.q || "").trim();
        if (q.length < 2) return res.json([]);
        const users = await User.find({
            name: { $regex: q, $options: "i" },
            _id: { $ne: req.user.id }
        }).select("name profilePic title").limit(10);
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: "Search failed" });
    }
});

// --- Story & Chapter API ---

app.post("/api/stories", auth, upload.single("coverImage"), async (req, res) => {
    try {
        const { title, description, genre, tags, content } = req.body;
        let coverImageUrl = "";

        if (req.file) {
            coverImageUrl = req.file.path.startsWith("http") ? req.file.path : `/uploads/${req.file.filename}`;
        }

        const newStory = new Story({
            author: req.user.id,
            title,
            description,
            genre: genre || "Other",
            tags: tags ? tags.split(",").map(t => t.trim()) : [],
            coverImage: coverImageUrl,
            status: "published"
        });

        await newStory.save();

        // If the user wrote story content manually, save it as Chapter 1
        if (content && content.trim()) {
            const newChapter = new StoryChapter({
                story: newStory._id,
                chapterNumber: 1,
                title: "Chapter 1",
                content: content.trim(),
                isPublished: true
            });
            await newChapter.save();
            newStory.chapters.push(newChapter._id);
            await newStory.save();
        }

        res.status(201).json(newStory);
    } catch (error) {
        console.error("Story creation error:", error);
        res.status(500).json({ message: "Failed to create story" });
    }
});

app.get("/api/stories", auth, async (req, res) => {
    try {
        const filter = {};
        if (req.query.genre) filter.genre = req.query.genre;
        if (req.query.author) filter.author = req.query.author;
        const stories = await Story.find(filter)
            .populate("author", "name profilePic")
            .sort({ createdAt: -1 });


        res.json(stories);
    } catch (error) {
        res.status(500).json({ message: "Error fetching stories" });
    }
});

app.get("/api/stories/:id", auth, async (req, res) => {
    try {
        const story = await Story.findById(req.params.id).populate("author", "name profilePic");
        if (!story) return res.status(404).json({ message: "Story not found" });

        // Increment views if viewer is not author
        if (story.author._id.toString() !== req.user.id) {
            story.views = (story.views || 0) + 1;
            await story.save();
        }

        res.json(story);
    } catch (error) {
        res.status(500).json({ message: "Error fetching story" });
    }
});

app.delete("/api/stories/:id", auth, async (req, res) => {
    try {
        const story = await Story.findById(req.params.id);
        if (!story) return res.status(404).json({ message: "Story not found" });

        // Check ownership
        if (story.author.toString() !== req.user.id) {
            return res.status(403).json({ message: "Not authorized to delete this story" });
        }

        // Delete associated chapters
        await StoryChapter.deleteMany({ story: req.params.id });

        await Story.findByIdAndDelete(req.params.id);

        res.json({ message: "Story deleted successfully" });
    } catch (error) {
        console.error("Delete error:", error);
        res.status(500).json({ message: "Failed to delete story" });
    }
});

app.post("/api/stories/:id/chapters", auth, async (req, res) => {
    try {
        const { title, content } = req.body;
        const storyId = req.params.id;

        const story = await Story.findById(storyId);
        if (!story) return res.status(404).json({ message: "Story not found" });

        if (story.author.toString() !== req.user.id) {
            return res.status(403).json({ message: "Not authorized to add chapters to this story" });
        }

        const chapterCount = await StoryChapter.countDocuments({ story: storyId });

        const newChapter = new StoryChapter({
            story: storyId,
            chapterNumber: chapterCount + 1,
            title,
            content,
            isPublished: true
        });

        await newChapter.save();
        
        story.chapters.push(newChapter._id);
        await story.save();

        res.status(201).json(newChapter);
    } catch (error) {
        console.error("Chapter creation error:", error);
        res.status(500).json({ message: "Failed to create chapter" });
    }
});

app.get("/api/stories/:id/chapters", auth, async (req, res) => {
    try {
        const chapters = await StoryChapter.find({ story: req.params.id }).sort({ chapterNumber: 1 });
        res.json(chapters);
    } catch (error) {
        res.status(500).json({ message: "Error fetching chapters" });
    }
});

app.post("/api/stories/generate", auth, async (req, res) => {
    try {
        const { prompt, genre } = req.body;

        const systemPrompt = `You are a professional story writer. Write the first chapter of a ${genre} story. 
        Format: Title ||| Chapter Content. 
        Only return the title, the separator '|||', and the story text.`;

        console.log(`Generating story with Hugging Face (${HF_MODEL})...`);
        const response = await hf.chatCompletion({
            model: HF_MODEL,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ],
            max_tokens: 1500,
            temperature: 0.8,
            top_p: 0.95
        });
        
        const responseText = response.choices[0].message.content;
        console.log("Story generated.");

        const parts = responseText.split('|||');
        const title = parts[0] ? parts[0].trim() : "Generated Story";
        const content = parts[1] ? parts[1].trim() : responseText;

        const newStory = new Story({
            author: req.user.id,
            title: title.replace(/"/g, ''), // clean title
            description: `An AI generated ${genre} story.`,
            genre: genre || "Other",
            status: "published"
        });
        await newStory.save();

        const newChapter = new StoryChapter({
            story: newStory._id,
            chapterNumber: 1,
            title: "Chapter 1",
            content: content,
            isPublished: true
        });
        await newChapter.save();

        newStory.chapters.push(newChapter._id);
        await newStory.save();

        res.json({ story: newStory, chapter: newChapter });
    } catch (error) {
        console.error("Story Generation Error:", error);
        if (error.httpResponse) {
            try {
                const errorData = await error.httpResponse.json();
                console.error("HF Error Details:", JSON.stringify(errorData, null, 2));
            } catch (e) {}
        }
        res.status(500).json({ message: "Failed to generate story" });
    }
});

app.post("/api/stories/:id/like", auth, async (req, res) => {
    try {
        const story = await Story.findById(req.params.id);
        if (!story) return res.status(404).json({ message: "Story not found" });

        const userId = req.user.id;
        const likedIndex = story.likes.indexOf(userId);
        const dislikedIndex = story.dislikes.indexOf(userId);

        if (likedIndex > -1) {
            story.likes.splice(likedIndex, 1); // Unlike
        } else {
            story.likes.push(userId); // Like
            if (dislikedIndex > -1) story.dislikes.splice(dislikedIndex, 1); // Remove dislike if exists
        }

        await story.save();
        res.json({ likes: story.likes.length, dislikes: story.dislikes.length });
    } catch (error) {
        res.status(500).json({ message: "Error toggling like" });
    }
});

app.post("/api/stories/:id/dislike", auth, async (req, res) => {
    try {
        const story = await Story.findById(req.params.id);
        if (!story) return res.status(404).json({ message: "Story not found" });

        const userId = req.user.id;
        const likedIndex = story.likes.indexOf(userId);
        const dislikedIndex = story.dislikes.indexOf(userId);

        if (dislikedIndex > -1) {
            story.dislikes.splice(dislikedIndex, 1); // Remove dislike
        } else {
            story.dislikes.push(userId); // Dislike
            if (likedIndex > -1) story.likes.splice(likedIndex, 1); // Remove like if exists
        }

        await story.save();
        res.json({ likes: story.likes.length, dislikes: story.dislikes.length });
    } catch (error) {
        res.status(500).json({ message: "Error toggling dislike" });
    }
});

// --- Direct Messaging API ---
app.post("/api/chat/initiate", auth, async (req, res) => {
    try {
        const { recipientId } = req.body;
        const currentUserId = req.user.id;

        let chat = await Chat.findOne({
            participants: { $all: [currentUserId, recipientId] }
        });

        if (!chat) {
            chat = new Chat({ participants: [currentUserId, recipientId] });
            await chat.save();
        }

        res.json(chat);
    } catch (error) {
        console.error("Initiate chat error:", error);
        res.status(500).json({ message: "Failed to initiate chat" });
    }
});

app.get("/api/chat", auth, async (req, res) => {
    try {
        const chats = await Chat.find({ participants: { $in: [req.user.id] } })
            .populate("participants", "name profilePic title")
            .populate("lastMessage")
            .sort({ updatedAt: -1 });
        res.json(chats);
    } catch (error) {
        res.status(500).json({ message: "Failed to load chats" });
    }
});

app.get("/api/chat/:chatId/messages", auth, async (req, res) => {
    try {
        const messages = await Message.find({ chatId: req.params.chatId })
            .populate("sender", "name profilePic")
            .sort({ createdAt: 1 });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: "Failed to load messages" });
    }
});

// Quick Reply POST endpoint
app.post("/api/chat/:chatId/messages/reply", auth, async (req, res) => {
    try {
        const { text } = req.body;
        const chatId = req.params.chatId;
        const senderId = req.user.id;

        const newMessage = new Message({
            chatId,
            sender: senderId,
            text
        });
        await newMessage.save();

        const chat = await Chat.findByIdAndUpdate(chatId, { 
            lastMessage: newMessage._id 
        }, { 
            timestamps: { updatedAt: true } 
        });

        const recipientId = chat.participants.find(p => p.toString() !== senderId.toString());
        if (recipientId) {
            const notification = new Notification({
                recipient: recipientId,
                sender: senderId,
                type: "message",
                chatId: chatId,
                message: `New message: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`
            });
            await notification.save();
        }

        await newMessage.populate("sender", "name profilePic");
        io.to(chatId).emit("receiveMessage", newMessage);
        
        res.json(newMessage);
    } catch (error) {
        console.error("Reply error:", error);
        res.status(500).json({ message: "Failed to send reply" });
    }
});

// --- Socket.IO Chat Setup ---
io.on("connection", (socket) => {
    socket.on("joinChat", (chatId) => {
        socket.join(chatId);
    });

    socket.on("sendMessage", async (data) => {
        try {
            const { chatId, senderId, text } = data;
            
            const newMessage = new Message({
                chatId,
                sender: senderId,
                text
            });
            await newMessage.save();

            const chat = await Chat.findByIdAndUpdate(chatId, { 
                lastMessage: newMessage._id 
            }, { 
                timestamps: { updatedAt: true } 
            });

            // Notification
            const recipientId = chat.participants.find(p => p.toString() !== senderId.toString());
            if (recipientId) {
                const notification = new Notification({
                    recipient: recipientId,
                    sender: senderId,
                    type: "message",
                    chatId: chatId,
                    message: `New message: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`
                });
                await notification.save();
            }

            await newMessage.populate("sender", "name profilePic");
            io.to(chatId).emit("receiveMessage", newMessage);
        } catch (error) {
            console.error("Socket error:", error);
        }
    });
});


// ✅ Correct for Render
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
