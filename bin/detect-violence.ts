#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { DetectViolenceStack } from "../lib/detect-violence-stack";
import { getConfig } from "../lib/config";

const config = getConfig();

const app = new cdk.App();
new DetectViolenceStack(app, "DetectViolenceStack", {
  env: { region: config.AWS_REGION, account: config.AWS_ACCOUNT_ID },
  config,
});
