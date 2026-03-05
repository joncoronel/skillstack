import { registerRoutes } from "better-convex/auth/http";
import { httpRouter } from "convex/server";
import { getAuth } from "./generated/auth";

const http = httpRouter();

registerRoutes(http, getAuth, {
  cors: {
    allowedOrigins: [process.env.SITE_URL!],
  },
});

export default http;
