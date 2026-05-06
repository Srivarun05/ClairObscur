import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({
    reporter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    reported: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["open", "accepted", "declined"],
        default: "open"
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    reviewedAt: {
        type: Date
    }
}, { timestamps: true });

export default mongoose.model("Report", reportSchema);
