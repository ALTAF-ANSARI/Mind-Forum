import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config()

const dbConnect = async () => {
    try {
        const uri = process.env.DATABASEURL || process.env.MONGODB_URI;
        if (!uri || uri === "undefined") {
            throw new Error("Neither DATABASEURL nor MONGODB_URI is defined in the environment variables.");
        }
        
        console.log("Attempting to connect to MongoDB...");
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 15000, // Wait 15s for server selection
            socketTimeoutMS: 45000,         // Close sockets after 45s of inactivity
        });
        
        console.log("✅ Database Connected Successfully");
    } catch (err) {
        console.error("❌ Database connection failed:", err.message);
        console.error("Please ensure your IP is whitelisted in MongoDB Atlas and your connection string is correct.");
    }
}

export default dbConnect
