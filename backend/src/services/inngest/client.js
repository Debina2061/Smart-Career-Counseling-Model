import { Inngest } from "inngest";
import { envConfig } from "../../Config/envConfig.js";

export const inngest = new Inngest({
  id: "ats-inngest-file",
  eventKey: envConfig.inngestEventKey || undefined,
});
