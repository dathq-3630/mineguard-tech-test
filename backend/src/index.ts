import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { documentsRouter } from "./routes/documents.ts";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/documents", documentsRouter);

const port = Number(process.env.PORT || 3001);
app.listen(port, () => console.log(`API listening on :${port}`));
