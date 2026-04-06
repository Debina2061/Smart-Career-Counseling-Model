import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name:{
        type: String,
        required: true,
    },
    email:{
        type: String,
        required: true,
        unique: true,
        // match: "/^(?=.{1,254}$)(?=.{1,64}@)[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}|\[(?:IPv6:)?[^\]]+\])$/"
    },
    password:{
        type: String
    },
    Role:{
        type: String,
        enum: ["student","admin"],
        default: "student"
    },
    avatarUrl:{
        type: String,
        none: true
    },
    authProvider:{
        type: String,
        enum : ["local","github","google"]
    },
    providerId:{
        type: String
    },
    DateCreated:{
        type: Date,
        default: Date.now()
    },
    isVerified : {
        type : Boolean,
        default: false
    }
});

const User = mongoose.model("User",userSchema);
export {User};