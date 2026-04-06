import { Router } from "express";
const authRouter = Router();
import passport from "passport";
import { generateToken } from "../utils/generateToken.js";
import { SignUp,SignOut,LoginRequest,loginVerify, profile, ChangePassword, verifyEmailForgetPassword, ForgetPassword, updateProfile, resendOtp, deleteAccount } from "../Controller/auth.controller.js";
import { ErrorHandler } from "../utils/errorHandler.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import {uploadImage} from "../middleware/multer.js";

/* Oauth Authentication routes */
authRouter.get("/github",passport.authenticate("github",{session:false}))
authRouter.get("/github/callback",passport.authenticate("github",{failureRedirect:"/login",session:false}),(req,res)=>{
    const token = generateToken(req?.user,res);
    return res.json({message:"Login Successfully"});
});
authRouter.get("/google",passport.authenticate("google",{
    scope:["openid","profile","email"],
    session:false}))
authRouter.get("/google/callback",passport.authenticate("google",{failureRedirect:"/login",session:false}),(req,res)=>{
    return res.json({message:"login using google oauth"});
});
/* Local Authentication Routes */
authRouter.route("/sign-up").post(ErrorHandler(SignUp));
authRouter.route("/sign-out").post(ErrorHandler(SignOut));
authRouter.route("/profile").get(authenticateToken,ErrorHandler(profile)).patch(authenticateToken,uploadImage.single("imgName"),ErrorHandler(updateProfile));
authRouter.route("/verify-token").post(ErrorHandler(loginVerify));
authRouter.route("/login").post(ErrorHandler(LoginRequest))
authRouter.route("/change-password").post(authenticateToken,ErrorHandler(ChangePassword))
authRouter.route("/verify-email").post(ErrorHandler(verifyEmailForgetPassword));
authRouter.route("/set-newpassword").post(ErrorHandler(ForgetPassword));
authRouter.route("/resend-otp").post(ErrorHandler(resendOtp));
authRouter.route("/delete-account").delete(authenticateToken, ErrorHandler(deleteAccount));



export {authRouter};