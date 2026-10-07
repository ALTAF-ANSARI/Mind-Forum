import mongoose from "mongoose";

const storySchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: "",
        trim: true
    },
    genre: {
        type: String,
        enum: ["Adventure", "Mystery", "Romance", "Fantasy", "Science Fiction", "Horror", "Thriller", "Historical Fiction", "Literary Fiction", "Other"],
        default: "Other"
    },
    tags: [{
        type: String,
        trim: true
    }],
    coverImage: {
        type: String,
        default: ""
    },
    chapters: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "StoryChapter"
    }],
    views: {
        type: Number,
        default: 0
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    dislikes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    readingTime: {
        type: Number,
        default: 0 // in minutes
    },
    status: {
        type: String,
        enum: ["draft", "published", "completed"],
        default: "draft"
    },
    isCompleted: {
        type: Boolean,
        default: false
    },
    series: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "StorySeries",
        default: null
    },
    seriesOrder: {
        type: Number,
        default: null
    },
    reviews: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Review"
    }],
    averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    totalReviews: {
        type: Number,
        default: 0
    },
    publishedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

const Story = mongoose.model("Story", storySchema);

export default Story;
