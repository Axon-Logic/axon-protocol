import express from "express";
import agentsRouter from "./routes/agents.js";
import vaultsRouter from "./routes/vaults.js";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok", service: "axon-api" }));
app.use("/agents", agentsRouter);
app.use("/vaults", vaultsRouter);

export default app;
