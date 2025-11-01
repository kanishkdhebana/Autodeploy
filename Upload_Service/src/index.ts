import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import express from "express";
import cors from "cors";
import { simpleGit, type SimpleGit } from "simple-git";
import { generate } from "./utils.js";
import type { JobStatus } from "./utils.js";
import { fileURLToPath } from "url";
import { getAllFiles } from "./file.js";
import { uploadFile, pushToSQS } from "./aws.js";

const app = express();
app.use(cors());
app.use(express.json());

const git: SimpleGit = simpleGit();
const jobStatuses: Record<string, JobStatus> = {};

const updateJobStatus = (jobId: string, status: JobStatus["status"]) => {
  const currentStatus = jobStatuses[jobId] || { status: "pending" };
  currentStatus.status = status;
  jobStatuses[jobId] = currentStatus;
};

const getJobStatus = (jobId: string) => {
  return jobStatuses[jobId] || { status: "unknown" };
};

const GITHUB_URL_REGEX =
  /^https:\/\/github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)(\.git)?$/;

const validateRepoUrl = (repoUrl: string): boolean => {
  if (!repoUrl || typeof repoUrl !== "string") {
    return false;
  }

  return GITHUB_URL_REGEX.test(repoUrl);
};

app.use((req, res, next) => {
  console.log("Incoming Content-Type:", req.headers["content-type"]);
  next();
});

app.get("/", (req, res) => {
  res.send("Hello from Express + ES Modules + TypeScript!");
});

app.get("/status/:jobId", (req, res) => {
  const { jobId } = req.params;
  const status = getJobStatus(jobId);
  res.json(status);
});

app.post("/deploy", async (req, res) => {
  const repoUrl = req.body.repoUrl;

  if (!repoUrl) {
    return res.status(400).json({
      error: "Missing repoUrl in request body",
    });
  }

  if (!validateRepoUrl(repoUrl)) {
    return res.status(400).json({
      error:
        "Invalid or unsupported repo URL. Only HTTPS Github URLs are allowed for public repositories.",
    });
  }

  const id = generate();
  updateJobStatus(id, "pending");

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const outputDir = path.resolve(__dirname, "output", id);

  fs.mkdirSync(outputDir, { recursive: true });

  try {
    updateJobStatus(id, "cloning");
    console.log(`cloning ${repoUrl} into ${outputDir}...`);
    await git.clone(repoUrl, outputDir);

    const files = getAllFiles(outputDir);

    await Promise.all(
      files.map(async (file) => {
        await uploadFile(file.slice(__dirname.length + 1), file);
      }),
    );

    updateJobStatus(id, "uploaded");
    pushToSQS(id);
    updateJobStatus(id, "queued");

    res.status(200).json({
      message: "Repository cloned successfully.",
    });
  } catch (err: any) {
    updateJobStatus(id, "failed");
    console.error("Error cloning repo:", err.message);

    res.status(500).json({
      error: "Failed to clone repo.",
    });
  } finally {
    fs.rm(outputDir, { recursive: true, force: true }, (err) => {
      if (err) {
        console.error(`Failed to clean up temp directory for job ${id}`, err);
      } else {
        console.log(`Cleaned up temp directory for job ${id}`);
      }
    });
  }
});

app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
