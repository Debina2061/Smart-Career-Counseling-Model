import { envConfig } from "./Config/envConfig.js";
import { connectDb } from "./Config/dbConnect.js";
import "./utils/passport.js";
import { app } from "./app.js";
import { pathToFileURL } from "url";

export const startServer = async () => {
  await connectDb();

  const server = app.listen(envConfig.portNumber, () => {
    console.log(`Server running at http://localhost:${envConfig.portNumber}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  });

  return server;
};

const isRunAsScript =
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isRunAsScript) {
  startServer().catch((error) => {
    console.error(`Server failed to start: ${error?.message}`);
    process.exit(1);
  });
}
