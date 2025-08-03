import dotenv from "dotenv" ;
dotenv.config();

import { receiveMessageFromSQS } from "./aws.js" ;

async function pollSQS() {
    while (true) {
        await receiveMessageFromSQS() ;

        await new Promise(resolve => setTimeout(resolve, 5000)) ;
    }
}

pollSQS() ;