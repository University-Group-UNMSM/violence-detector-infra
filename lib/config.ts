import * as dotenv from "dotenv";
import path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

export type ConfigProps = {
  AWS_REGION: string;
  AWS_ACCOUNT_ID: string;
  AWS_DEFAULT_VPC_ID: string;
  OPENCV_LAMBDA_LAYER_ARN: string;
};

export const getConfig = (): ConfigProps => {
  return {
    AWS_REGION: process.env.AWS_REGION ?? "us-east-1",
    AWS_ACCOUNT_ID: process.env.AWS_ACCOUNT_ID ?? "",
    AWS_DEFAULT_VPC_ID: process.env.AWS_DEFAULT_VPC_ID ?? "",
    OPENCV_LAMBDA_LAYER_ARN: process.env.OPENCV_LAMBDA_LAYER_ARN!,
  };
};
