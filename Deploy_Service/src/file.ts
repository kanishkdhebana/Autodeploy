import fs from "fs" ;
import path from "path";

export const getAllFiles = (folderPath: string, allFiles: string[] = []): string[] => {
    const entries = fs.readdirSync(folderPath, { withFileTypes: true }) ;

    for (const entry of entries) {
        const fullPath = path.join(folderPath, entry.name) ;

        if (entry.isDirectory()) {
            getAllFiles(fullPath, allFiles) ;

        } else if (entry.isFile()) {
            allFiles.push(fullPath) ;
        }
    }

    return allFiles ;
} ;