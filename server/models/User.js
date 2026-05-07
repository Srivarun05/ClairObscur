import mongoose from "mongoose";

const userSchema = mongoose.Schema({
    username: {
        type: String,
        required: [true, "Username is required"],
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: [true, "Password is required"],
        minlength: 6
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user' 
    },
    profilePic: {
        type: String,
        default: "" 
    },
    profileVisibility: {
        type: String,
        enum: ["public", "private"],
        default: "public"
    },
    accountStatus: {
        type: String,
        enum: ["active", "blocked"],
        default: "active"
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    lastSeen: {
        type: Date,
        default: null
    }
}, { timestamps: true });

const User = mongoose.model("User", userSchema);
export default User;
