import cors from "cors";
import express from "express";
import morgan from "morgan";
import { createRouter } from "./routes/index.js";

export function createApp({ repository, config }) {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan(process.env.NODE_ENV === "test" ? "silent" : "combined"));
  app.use("/api", createRouter({ repository, config }));

  app.use((error, _request, response, _next) => {
    console.error(error);
    response.status(error.statusCode || 500).json({
      error: {
        message: error.publicMessage || "Inventory API request failed",
        details: process.env.NODE_ENV === "production" ? undefined : error.message
      }
    });
  });

  return app;
}
