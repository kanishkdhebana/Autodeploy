import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from "@aws-sdk/client-sqs";
import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, ObjectLockEnabled } from "@aws-sdk/client-s3";
import type { GetObjectCommandOutput } from "@aws-sdk/client-s3";
import fs from "fs" ;
import path from "path" ;
import stream from "stream" ;
import { promisify } from "util";
import { fileURLToPath } from "url";
import { getAllFiles } from "./file.js";

function getSQSClient() {
    const region = process.env.AWS_REGION ;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID ;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY ;
    

    if (!region || !accessKeyId || !secretAccessKey) {
        throw new Error("Missing AWS credentials or region in environment variables.") ;
    }

    return new SQSClient({
        region,
        credentials: {
            accessKeyId,
            secretAccessKey
        }
    }) ;
}

function getS3Client() {
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

async function deleteMessageFromQueue(receiptHandle: string) {
    const sqs = getSQSClient() ;
    const queueUrl = process.env.AWS_SQS_QUEUE_URL ;

    if (!queueUrl) {
        throw new Error("SQS queue URL is missing from env variables.") ;
    }

    const params = {
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle
    } ;

    try {
        await sqs.send(new DeleteMessageCommand(params)) ;
        console.log("Message deleted from queue") ; 

    } catch (error) {
        console.error("Error deleting message from sqs.") ;
    }
}


export async function receiveMessageFromSQS() {
    const sqs = getSQSClient() ;
    const queueUrl = process.env.AWS_SQS_QUEUE_URL ;

    if (!queueUrl) {
        throw new Error("SQS queue URL is missing from env variables.") ;
    }

    const params = {
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20,
    } ;

    try {
        const data = await sqs.send(new ReceiveMessageCommand(params)) ;

        if (data.Messages && data.Messages.length > 0) {
            const ids = [] ;

            for (const message of data.Messages) {
                console.log("Received Message: ", message.Body) ;

                const messageId = message.MessageId ;
                const messageBody = message.Body ;

                if (messageBody) {
                    const { id } = JSON.parse(messageBody) ;
                    ids.push(id) ;
                }

                if (message.ReceiptHandle) {
                    // await deleteMessageFromQueue(message.ReceiptHandle) ;
                } else {
                    console.warn("Message is missing ReceiptHandle, cannot delete from queue.") ;
                }
            }

            return ids ;

        } else {
            console.log("No message Received") ;
            return [] ;
        }
    } catch (error) {
        console.error("Error receiving message from sqs.", error) ;
        throw error ;
    }
}


async function listObjectsFromS3(prefix: string) {
    const s3 = getS3Client() ;
    const bucketName = process.env.AWS_BUCKET_NAME ;

    if (!bucketName) {
        throw new Error("Aws bucket name is missing from environment vairables") ;
    }

    const params = {
        Bucket: bucketName,
        Prefix: prefix,
    }

    try {
        const data = await s3.send(new ListObjectsV2Command(params)) ;
        return data || [] ;

    } catch (error) {
        console.error("Error listing objects from S3", error) ;
        throw error ;
    }
}

async function downloadFileFromS3(fileName: string, localDir: string) {
    const s3 = getS3Client() ;
    const bucketName = process.env.AWS_BUCKET_NAME ;

    if (!bucketName) {
        throw new Error("Aws bucket name is missing from environment vairables") ;
    }
    
    const localFilePath = path.join(localDir, fileName) ;

    const params = {
        Bucket: bucketName,
        Key: fileName
    } ;

    try {
        const data: GetObjectCommandOutput = await s3.send(new GetObjectCommand(params)) ;
        const dir = path.dirname(localFilePath) ;

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, {recursive: true}) ;
        }

        const writer = fs.createWriteStream(localFilePath) ;

        if (data.Body) {
            (data.Body as NodeJS.ReadableStream).pipe(writer) ;

        } else {
            throw new Error("S3 GetObject response Body is undefined.");
        }

        await new Promise<void>((resolve, reject) => {
            writer.on("finish", () => resolve()) ;
            writer.on("error", () => reject()) ;
        }) ;

    } catch (error) {
        console.error(`Error downloading ${fileName}`, error);
        throw error;
    }
}


export async function downloadAllFilesFromS3(s3Path: string) {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const localPath = path.join(__dirname, "") ;

    const result = await listObjectsFromS3(s3Path) ;
    const files = result.Contents || [];

    try {
        for (const file of files) {
            const fileName = file.Key ;

            if (fileName) {
                const localFilePath = path.join(localPath, path.basename(fileName)) ;
                const dir = path.dirname(localFilePath);
                
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true }) ;
                }

                try {
                    await downloadFileFromS3(fileName, localPath) ; 

                } catch (err) {
                    console.error(`Failed to download ${fileName}:`, err) ; 
                }
            }          
        }

        console.log(`Downloaded ${files.length} files from s3`) ;

    } catch (error) {
         console.error("Error during download", error) ;
    }
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
        return response ;
    
    } catch (error) {
        console.error(`Error uploading ${fileName} to s3.`, error) ;
        throw error ;
    }
    
}


export async function copyFinalBuildToS3(id: string, buildFolder = "build") {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const outputDir = path.join(__dirname, `output/${id}/${buildFolder}`) ;
    
    try {
        const files = getAllFiles(outputDir) ;

        await Promise.all(
            files.map(file => {
                const relativeKey = path.relative(outputDir, file) ;
                const s3Key = path.join('build', id, relativeKey); 

                return uploadFile(s3Key, file) ;
            })
        );

        console.log(`Uploaded ${files.length} files for ID: ${id}`);

    } catch (error) {
         console.error("Error during upload", error) ;
         throw error ;
    }
}



