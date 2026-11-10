import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { config } from "./config.js";
import { router } from "./routes.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1); // Render fica atrás de um proxy
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(compression());
  app.use(cors({
    origin(origin, cb) {
      // Sem Origin = chamadas servidor-a-servidor / health check do Render.
      if (!origin || config.allowedOrigins.includes(origin)) return cb(null, true);
      cb(null, false);
    },
    methods: ["GET", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"],
    maxAge: 86400,
  }));
  app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: "draft-7", legacyHeaders: false, skip: (req) => req.path === "/health" }));
  app.use(express.json({ limit: "100kb" }));
  app.use(router);
  app.use((_req, res) => res.status(404).json({ error: "Rota não encontrada." }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: "Erro interno do servidor." });
  });
  return app;
}
