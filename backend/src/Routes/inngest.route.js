import { serve } from "inngest/express";
import { inngest } from "../services/inngest/client.js";
import { AiResponse } from "../services/inngest/functions/function.js";

export const inngestHandler = serve({
  client: inngest,
  functions: [AiResponse],
});
