import { RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { ConfigProps } from "./config";
import { PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import {
  CfnDomain,
  CfnNotebookInstance,
  CfnUserProfile,
} from "aws-cdk-lib/aws-sagemaker";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { LayerVersion, Runtime } from "aws-cdk-lib/aws-lambda";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { CorsHttpMethod, HttpApi } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpMethod } from "aws-cdk-lib/aws-events";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";

type DetectViolenceStackProps = StackProps & {
  config: Readonly<ConfigProps>;
};

export class DetectViolenceStack extends Stack {
  constructor(scope: Construct, id: string, props: DetectViolenceStackProps) {
    super(scope, id, props);

    const { config } = props;

    // Bucket para subir los modelos de machine learning
    const bucketModels = new Bucket(this, "BucketModels", {
      bucketName: "py-sm-si",
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Creamos el role para tener full accesso a sagemaker
    const roleSageMakerExecution = new Role(this, "RoleSageMakerExecution", {
      assumedBy: new ServicePrincipal("sagemaker.amazonaws.com"),
      managedPolicies: [
        {
          managedPolicyArn: "arn:aws:iam::aws:policy/AmazonSageMakerFullAccess",
        },
      ],
    });

    // Le damos permisos al role para acceder al bucket
    roleSageMakerExecution.addToPolicy(
      new PolicyStatement({
        actions: ["s3:GetObject", "s3:PutObject", "s3:ListBucket"],
        resources: [bucketModels.bucketArn, `${bucketModels.bucketArn}/*`],
      })
    );

    const opencvLayer = LayerVersion.fromLayerVersionArn(
      this,
      "OpenCVLayer",
      config.OPENCV_LAMBDA_LAYER_ARN
    );

    const makePredictionHandler = new NodejsFunction(
      this,
      "MakePredictionHandler",
      {
        memorySize: 256,
        runtime: Runtime.NODEJS_20_X,
        bundling: {
          sourceMap: true,
          nodeModules: ["@u4/opencv4nodejs"],
          externalModules: ["aws-sdk", "nock", "mock-aws-s3"],
          loader: {
            ".html": "file",
          },
        },
        layers: [opencvLayer],
        logRetention: RetentionDays.ONE_MONTH,
        entry: "src/lambdas/MakePredictionHandler.ts",
        functionName: "make-prediction-lambda-function",
      }
    );

    const httpApi = new HttpApi(this, "HttpApi", {
      apiName: "detect-violence-http-api",
      createDefaultStage: true,
      corsPreflight: {
        allowOrigins: ["*"],
        allowMethods: [CorsHttpMethod.ANY],
        allowHeaders: ["*"],
      },
    });

    httpApi.addRoutes({
      path: "/detect",
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration(
        "MakePredictionHandlerIntegration",
        makePredictionHandler
      ),
    });
  }
}
