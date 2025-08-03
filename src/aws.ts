import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { SendMessageBatchCommand, SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import fs from "fs" ;

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


export async function pushToSQS(id: string) {
    const sqs = getSQSClient() ;
    const queueUrl = process.env.AWS_SQS_QUEUE_URL

    if (!queueUrl) {
        throw new Error("SQS queue url is missing in env variables.") ;
    }

    const messageParams = {
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify({ id }),
        MessageGroupId: "repoUploadGroup", 
        MessageDeduplicationId: id,
    };

    const command = new SendMessageCommand(messageParams) ;
    try {
        const response = await sqs.send(command) ;
        console.log(`Sent message to sqs with id: ${id}`) ;
        return response ;

    } catch (error) {
        console.error("Error sending message to sqs: ", error) ;
        throw error ;
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
        console.log("Uploded file successfully.") ;
        return response ;
    
    } catch (error) {
        console.error(`Error uploading ${fileName} to s3.`, error) ;
        throw error ;
    }
    
}