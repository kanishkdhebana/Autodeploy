import dotenv from "dotenv";
dotenv.config();

import {
  receiveMessageFromSQS,
  downloadAllFilesFromS3,
  copyFinalBuildToS3,
} from "./aws.js";
import { buildProject } from "./util.js";

async function main() {
  while (true) {
    const ids = await receiveMessageFromSQS();

    if (ids.length > 0) {
      for (const id of ids) {
        console.log(`Downloading ID: ${id}`);
        await downloadAllFilesFromS3(`output/${id}`);
      }

      console.log("Building project...");

      for (const id of ids) {
        console.log(`Processing ID: ${id}`);
        await buildProject(id);
      }

      console.log("Copying final build to S3...");

      for (const id of ids) {
        console.log(`Processing ID: ${id}`);
        await copyFinalBuildToS3(id);
      }
    } else {
      console.log("No messages received. Waiting...");
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

main();
