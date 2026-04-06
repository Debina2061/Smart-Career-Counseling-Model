import mongoose from "mongoose";

const profileSchema = new mongoose.Schema({
    userId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    age:{
        type:Number,
        max: 100,
        min: 1,
        required: false
    },
    gender:{
        type:String,
        enum:["male","female","other"],
        default:"male"
    },
    educationLevel:{
        type:String,
        enum:["secondary","bachelor","master","phd"]
    },
    skills:{
        type: [String],
        null: true,
        default:null
    },
    interest:{
        type: [String],
        default:null
    },
    experience:{
        type:[Object],
        default:null
    }
});

const Profile = mongoose.model("Profile",profileSchema);
export {Profile};