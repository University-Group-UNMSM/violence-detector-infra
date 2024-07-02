import { APIGatewayProxyResultV2 } from "aws-lambda";
import Busboy from "busboy";
import { PassThrough } from "stream";
import { Response } from "../common/utils/Response";
import CnnService from "../common/services/CnnService";
import LstmService from "../common/services/LstmService";
import EndpointService from "../common/services/EndpointService";
import { MakePredictionEvent } from "../common/types";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import {
  ApiGatewayManagementApi,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";

const s3Client = new S3Client({});

const apiGwManagementApi = new ApiGatewayManagementApi({
  endpoint: process.env.WEBSOCKET_API_ENDPOINT!,
});

export const handler = async (
  event: MakePredictionEvent
): Promise<APIGatewayProxyResultV2> => {
  try {
    console.log("event :", event);
    console.log("Started detect() method");
    const frames = (await getFramesFromS3(event.framesUrl)).map((frame) => {
      console.log(frame);
      const uri = frame.replace(/^data:image\/\w+;base64,/, "");
      console.log(uri);
      return Buffer.from(uri!, "base64");
    });

    // Obtener los valores de transferencia del modelo CNN
    const cnnService = new CnnService();
    const transferValues: number[][] = await cnnService.predict(frames);
    console.log("Frames:", frames.length);

    // Predecir usando el modelo LSTM
    const lstmService = new LstmService(new EndpointService());
    const predictions = await lstmService.predict([transferValues]);
    const results = predictions.predictions[0];
    console.log("Predictions:", results);

    console.log("End detect() method");
    await sendNotification(results);

    await apiGwManagementApi.send(
      new PostToConnectionCommand({
        ConnectionId: event.connectionId,
        Data: JSON.stringify(results),
      })
    );

    return Response.success({
      statusCode: 200,
      body: JSON.stringify(results),
    });
  } catch (error) {
    console.log("Error in detect() method", error);
    return Response.serverError("Internal server error");
  }
};

const sendNotification = async (results: number[]) => {
  if (results[0] > results[1]) {
    console.log("Sending SMS notifications");
  }
};

const getFramesFromS3 = async (url: string): Promise<string[]> => {
  const urlParts = new URL(url);
  const Bucket = urlParts.hostname.split(".")[0];
  const Key = urlParts.pathname.substring(1);

  const params = { Bucket, Key };

  const data = await s3Client.send(new GetObjectCommand(params));
  const response = await data.Body?.transformToString("utf-8");
  const frames = JSON.parse(response!) as string[];
  return frames;
};
