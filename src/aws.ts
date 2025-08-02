import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import fs from "fs" ;

export function getS3Client() {
    const region = process.env.AWS_REGION ;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID ;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY ;
    

    if (!region || !accessKeyId || !secretAccessKey) {
        throw new Error("Missing AWS credentials or region in environment variables.") ;
    }

    return new S3Client({
        region,
        credentials: {
            accessKeyId,
            secretAccessKey
        }
    }) ;
}


export const uploadFile = async (fileName: string, localFilePath: string) => {
    const bucketName = process.env.AWS_BUCKET_NAME ;
    if (!bucketName) throw new Error("Missing BUCKET_NAME") ;

    try {
        const s3 = getS3Client() ;
        const fileContent = fs.readFileSync(localFilePath) ;

        const command = new PutObjectCommand({
            Bucket: bucketName, 
            Key: fileName,
            Body: fileContent,
        }) ;

        const response = await s3.send(command) ;
        console.log("Uploded file successfully.") ;
        return response ;
    
    } catch (error) {
        console.error(`Error uploading ${fileName} to s3.`, error) ;
        throw error ;
    }
    
}