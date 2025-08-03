import dotenv from "dotenv";
dotenv.config();

import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from "@aws-sdk/client-sqs";

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

async function receiveMessageFromSQS() {
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
            for (const message of data.Messages) {
                console.log("Received Message: ", message.Body) ;

                const messageId = message.MessageId ;
                const messageBody = message.Body ;

                if (message.ReceiptHandle) {
                    await deleteMessageFromQueue(message.ReceiptHandle) ;
                } else {
                    console.warn("Message is missing ReceiptHandle, cannot delete from queue.");
                }
            }
        } else {
            console.log("No message Received") ;
        }
    } catch (error) {
        console.error("Error receiving message from sqs.", error) ;
    }
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

async function pollSQS() {
    while (true) {
        await receiveMessageFromSQS() ;

        await new Promise(resolve => setTimeout(resolve, 5000)) ;
    }
}

pollSQS() ;