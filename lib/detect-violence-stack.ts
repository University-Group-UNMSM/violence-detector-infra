import { Duration, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
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
import {
  NodejsFunction,
  NodejsFunctionProps,
} from "aws-cdk-lib/aws-lambda-nodejs";
import { LayerVersion, Runtime } from "aws-cdk-lib/aws-lambda";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import {
  CorsHttpMethod,
  HttpApi,
  WebSocketApi,
  WebSocketStage,
} from "aws-cdk-lib/aws-apigatewayv2";
import { HttpMethod } from "aws-cdk-lib/aws-events";
import {
  HttpLambdaIntegration,
  WebSocketLambdaIntegration,
} from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { AttributeType, Table } from "aws-cdk-lib/aws-dynamodb";
import path from "path";

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

    const bucketFrames = new Bucket(this, "BucketFrames", {
      bucketName: "detect-violence-frames-bucket",
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Tabla para guardar las conexiones de los usuarios
    const connectionsTable = new Table(this, "ConnectionsTable", {
      partitionKey: {
        name: "connectionId",
        type: AttributeType.STRING,
      },
      tableName: "detect-violence-connections-table",
      timeToLiveAttribute: "ttl",
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

    const domainModel = new CfnDomain(this, "DomainModel", {
      authMode: "IAM",
      defaultUserSettings: {
        executionRole: roleSageMakerExecution.roleArn,
      },
      vpcId: config.AWS_DEFAULT_VPC_ID,
      subnetIds: [
        "subnet-032831b424fa02b48",
        "subnet-03f45b11eda9e15f6",
        "subnet-03231bccd6547ee37",
        "subnet-0481899388170035b",
        "subnet-056178594ba65c31f",
        "subnet-06eb838e5e12de85e",
      ],
      domainName: "domain-detect-violence",
    });

    // Agregamos un perfil de usuario
    new CfnUserProfile(this, "UserProfileDomain", {
      domainId: domainModel.ref,
      userProfileName: "user-profile-detect-violence",
    });

    // Creamos la instancia de notebook
    new CfnNotebookInstance(this, "NotebookInstance", {
      instanceType: "ml.t3.2xlarge",
      roleArn: roleSageMakerExecution.roleArn,
      platformIdentifier: "notebook-al2-v1",
    });

    // Le damos permisos al role para acceder al bucket
    roleSageMakerExecution.addToPolicy(
      new PolicyStatement({
        actions: ["s3:GetObject", "s3:PutObject", "s3:ListBucket"],
        resources: [bucketModels.bucketArn, `${bucketModels.bucketArn}/*`],
      })
    );

    // Creamos la layer de sharp para el manipulado de imagenes
    const sharpLayer = LayerVersion.fromLayerVersionArn(
      this,
      "OpenCVLayer",
      config.SHARP_LAMBDA_LAYER_ARN
    );

    const defaultLambdaProps: NodejsFunctionProps = {
      memorySize: 256,
      runtime: Runtime.NODEJS_20_X,
      bundling: {
        sourceMap: true,
      },
      logRetention: RetentionDays.ONE_MONTH,
      environment: {
        CONNECTIONS_TABLE_NAME: connectionsTable.tableName,
      },
    };

    // Lambda para la detección
    const makePredictionHandler = new NodejsFunction(
      this,
      "MakePredictionHandler",
      {
        ...defaultLambdaProps,
        memorySize: 1024,
        bundling: {
          sourceMap: true,
          externalModules: ["sharp"],
        },
        layers: [sharpLayer],
        timeout: Duration.seconds(30),
        entry: "src/lambdas/MakePredictionHandler.ts",
        functionName: "make-prediction-lambda-function",
      }
    );

    // Agregando policy para invocar el endpoint de sagemaker
    makePredictionHandler.addToRolePolicy(
      new PolicyStatement({
        actions: ["sagemaker:InvokeEndpoint"],
        resources: [
          `arn:aws:sagemaker:${config.AWS_REGION}:${config.AWS_ACCOUNT_ID}:endpoint/*`,
        ],
      })
    );

    // Http api para la detección
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

    const websocketConnectHandler = new NodejsFunction(
      this,
      "WebsocketConnectHandler",
      {
        ...defaultLambdaProps,
        functionName: "detect-violence-websocket-connect-lambda",
        entry: path.resolve("src/lambdas/WebsocketConnectHandler.ts"),
      }
    );

    const websocketDisconnectHandler = new NodejsFunction(
      this,
      "WebsocketDisconnectHandler",
      {
        ...defaultLambdaProps,
        functionName: "detect-violence-websocket-disconnect-lambda",
        entry: path.resolve("src/lambdas/WebsocketDisconnectHandler.ts"),
      }
    );

    // websocket api para la detección en tiempo real
    const websocketApi = new WebSocketApi(this, "WebSocketApi", {
      apiName: "detect-violence-websocket-api",
      connectRouteOptions: {
        integration: new WebSocketLambdaIntegration(
          "WebsocketConnectHandlerIntegration",
          websocketConnectHandler
        ),
      },
      disconnectRouteOptions: {
        integration: new WebSocketLambdaIntegration(
          "WebsocketDisconnectHandlerIntegration",
          websocketDisconnectHandler
        ),
      },
    });

    //Adding websocket stage
    const websocketStage = new WebSocketStage(this, "WebSocketStage", {
      webSocketApi: websocketApi,
      stageName: "v1",
      autoDeploy: true,
    });

    const websocketMakePredictionHandler = new NodejsFunction(
      this,
      "WebsocketMakePredictionHandler",
      {
        ...defaultLambdaProps,
        environment: {
          ...defaultLambdaProps.environment,
          WEBSOCKET_API_ENDPOINT: `https://${websocketApi.apiId}.execute-api.${config.AWS_REGION}.amazonaws.com/${websocketStage.stageName}`,
        },
        memorySize: 1024,
        layers: [sharpLayer],
        timeout: Duration.seconds(60),
        functionName: "detect-violence-websocket-make-prediction-lambda",
        entry: path.resolve("src/lambdas/RealTimePrediction.ts"),
      }
    );

    websocketMakePredictionHandler.addToRolePolicy(
      new PolicyStatement({
        actions: ["sagemaker:InvokeEndpoint"],
        resources: [
          `arn:aws:sagemaker:${config.AWS_REGION}:${config.AWS_ACCOUNT_ID}:endpoint/*`,
        ],
      })
    );

    const websocketHandler = new NodejsFunction(this, "WebsocketHandler", {
      ...defaultLambdaProps,
      environment: {
        ...defaultLambdaProps.environment,
        REALTIME_PREDICTION_FUNCTION_NAME:
          websocketMakePredictionHandler.functionName,
        FRAMES_BUCKET_NAME: bucketFrames.bucketName,
      },
      functionName: "detect-violence-websocket-handler-lambda",
      entry: path.resolve("src/lambdas/WebsocketHandler.ts"),
    });

    websocketApi.addRoute("detect", {
      integration: new WebSocketLambdaIntegration(
        "RealTimeMakePredictionHandlerIntegration",
        websocketHandler
      ),
    });

    connectionsTable.grantReadWriteData(websocketConnectHandler);
    connectionsTable.grantReadWriteData(websocketDisconnectHandler);
    websocketMakePredictionHandler.grantInvoke(websocketHandler);
    bucketFrames.grantReadWrite(websocketMakePredictionHandler);
    websocketApi.grantManageConnections(websocketMakePredictionHandler);
  }
}
