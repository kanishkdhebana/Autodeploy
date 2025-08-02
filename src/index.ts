import express from "express";
import cors from "cors";

const app = express();
app.use(cors());

app.get("/", (req, res) => {
  res.send("Hello from Express + ES Modules + TypeScript!");
});

app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
