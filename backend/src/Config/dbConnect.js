import mongoose from "mongoose";
import { envConfig } from "./envConfig.js";

export const connectDb = async () => {
    try {
        if (!envConfig.mongoUrl) {
            throw new Error("DB_URL is missing");
        }

        await mongoose.connect(envConfig.mongoUrl, {
            serverSelectionTimeoutMS: 10000
        });

        console.log("Database connected");
    } catch (error) {
        console.error(`Error at Database connection:${error?.message}`);
        throw error;
    }
};