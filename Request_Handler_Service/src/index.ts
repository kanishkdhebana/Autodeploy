import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { Readable } from "stream";
import { getFile } from "./aws.js";

const app = express();

app.get("/*", async (req, res) => {
  const host = req.hostname;
  const id = host.split(".")[0];
  const filePath = req.path;

  try {
    const contents = await getFile(`build/${id}${filePath}`);

    console.log("done");

    const type = filePath.endsWith("html")
      ? "text/html"
      : filePath.endsWith("css")
        ? "text/css"
        : "application/javascript";

    res.set("Content-Type", type);

    if (contents.Body && contents.Body instanceof Readable) {
      Readable.from(contents.Body).pipe(res);
    } else {
      res.send(contents.Body);
    }
  } catch (error) {
    console.error("Error fetching file from S3:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(3001);

// x.vercel.com/index.css
