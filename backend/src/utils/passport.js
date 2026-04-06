import { Strategy as GitHubStrategy } from "passport-github";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { envConfig } from "../Config/envConfig.js";
import passport from "passport";
import { User } from "../Model/user.model.js";

passport.use(
  new GitHubStrategy(
    {
      clientID: envConfig.githubClinet,
      clientSecret: envConfig.githubSecretClient,
      callbackURL: `${envConfig.backendUrl}/auth/github/callback`,
    },
    async function (accessToken, refreshToken, profile, done) {
      let user;
      user = await User.findOne({
        providerId: profile?.id,
        name: profile?.displayName,
      });
      if (!user) {
        user = await User.create({
          name: profile?._json?.name,
          email: profile?._json?.email,
          authProvider: "github",
          providerId: profile?._json?.id,
          avatarUrl: profile?._json?.avatar_url,
        });
      }
      return done(null, user);
    },
  ),
);
passport.use(
  new GoogleStrategy(
    {
      clientID: envConfig.googleClinet,
      clientSecret: envConfig.googleSecretClient,
      callbackURL: `${envConfig.backendUrl}/auth/google/callback`,
    },
    async function (accessToken, refreshToken, profile, done) {
      // Google profile received
      var user;
      user = await User.findOne({
        email: profile?._json.email,
      });
      // Database lookup completed
      if (!user) {
        user = await User.create({
          name: profile?._json?.name,
          email: profile?._json?.email,
          authProvider: "google",
          providerId: profile?._json?.id,
          avatarUrl: profile?._json?.avatar_url,
        });
      }
      return done(null, user);
    },
  ),
);
