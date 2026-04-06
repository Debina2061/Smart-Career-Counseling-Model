import jwt from "jsonwebtoken";
import { envConfig } from "../Config/envConfig.js";
import { User } from "../Model/user.model.js";

const extractTokenFromCookies = (req) => {
  const token = req.cookies?.jwt;
  return token || null;
};

const extractTokenFromHeader = (req) => {
  const authHeader = req.headers?.authorization;
  if (!authHeader) return null;
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : authHeader;
  return token || null;
};

export const authenticateToken = async (req, res, next) => {
  const token = extractTokenFromCookies(req) || extractTokenFromHeader(req) || req.query?.token || null;
  if (!token) {
    return res.status(401).json({
      message: "Access Denied. No token provided",
    });
  }
  try {
    const decoded = jwt.verify(token, envConfig?.jwtSecretToken);
    const user = await User.findOne({ _id: decoded?._id }).select("-password");
    if (!user) {
      return res.status(401).json({ message: "Invalid Token" });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({
      message: "Invalid token",
    });
  }
};
