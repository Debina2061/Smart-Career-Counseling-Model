import mongoose from "mongoose";

const loginVerifySchema = new mongoose.Schema({
    email : String,
    token : String,
    purpose: {
        type: String,
        enum: ["verify", "reset"],
        default: "verify"
    },
    expiredAt: {
        type: Date,
        default: () => Date.now() + 5 * 60 * 1000, // 5 min
        expires: 0
    }
});

const LoginVerify = mongoose.model("LoginVerify",loginVerifySchema);
export {LoginVerify};
