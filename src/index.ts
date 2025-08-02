import dotenv from "dotenv";
dotenv.config();

import express from "express" ;
import cors from "cors" ;
import { simpleGit, type SimpleGit, CleanOptions } from 'simple-git' ;
import path from "path" ;
import { generate } from "./utils.js" ;
import { fileURLToPath } from "url";
import { getAllFiles } from "./file.js";
import { uploadFile } from "./aws.js";

const app = express() ; 
app.use(cors());
app.use(express.json()) ;

const git: SimpleGit = simpleGit() ;

app.get("/", (req, res) => {
    res.send("Hello from Express + ES Modules + TypeScript!") ;
}) ;

app.post("/deploy", async (req, res) => {
    const repoUrl = req.body.repoUrl ;

    if (!repoUrl) {
        return res.status(400).json({
            error: "Missing repoUrl in request body"
        }) ;
    }

    const id = generate() ;

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const outputDir = path.resolve(__dirname, "output", id) ;

    try {
        console.log(`cloning ${repoUrl} into ${outputDir}...`) ;
        await git.clone(repoUrl, outputDir) ;

        const files = getAllFiles(outputDir) ;

        files.forEach(async file => {
            await uploadFile(file.slice(__dirname.length + 1), file) ;
        }) ;

        res.status(200).json({
            message: "Repository cloned successfully."
        }) ;
        
    } catch (err: any) {
        console.error("Error cloning repo:", err.message) ;
        res.status(500).json({
            error: "Failed to clone repo."
        }) ;
    }
}) ;

app.listen(3000, () => {
    console.log("Server running at http://localhost:3000") ;
}) ;
