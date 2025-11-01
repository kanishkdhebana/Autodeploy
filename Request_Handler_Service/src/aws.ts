import {
  GetObjectCommand,
  type GetObjectCommandOutput,
  S3Client,
} from "@aws-sdk/client-s3";

function getS3Client() {
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Missing AWS credentials or region in environment variables.",
    );
  }

  return new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export async function getFile(fileName: string) {
  const s3 = getS3Client();
  const bucketName = process.env.AWS_BUCKET_NAME;

  if (!bucketName) {
    throw new Error("Aws bucket name is missing from environment vairables");
  }

  const params = {
    Bucket: bucketName,
    Key: fileName,
  };

  const contents: GetObjectCommandOutput = await s3.send(
    new GetObjectCommand(params),
  );
  return contents;
}
