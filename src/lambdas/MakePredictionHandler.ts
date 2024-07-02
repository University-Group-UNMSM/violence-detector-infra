import {
  APIGatewayProxyHandlerV2,
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import Busboy from "busboy";
import { PassThrough } from "stream";
import { Response } from "../common/utils/Response";
import CnnService from "../common/services/CnnService";
import LstmService from "../common/services/LstmService";
import EndpointService from "../common/services/EndpointService";

export const handler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  console.log("Started detect() method");
  console.log("Event:", event);

  const contentType =
    event.headers["content-type"] ?? event.headers["Content-Type"];

  console.log("Content-Type:", contentType);

  if (!contentType?.startsWith("multipart/form-data")) {
    return Response.serverError(
      "Invalid content-type, expecting multipart/form-data"
    );
  }

  const busboy = Busboy({ headers: { "content-type": contentType } });
  const frames: Buffer[] = [];

  return new Promise((resolve, reject) => {
    busboy.on("file", (name, file, info) => {
      const buffers: Buffer[] = [];
      file
        .on("data", (data) => {
          buffers.push(data);
        })
        .on("end", () => {
          frames.push(Buffer.concat(buffers));
        });
    });

    busboy.on("finish", async () => {
      try {
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

        resolve({
          statusCode: 200,
          body: JSON.stringify(results),
        });
      } catch (error) {
        console.error("Error in detect() method", error);

        reject(new Error("Internal server error"));
      }
    });

    busboy.on("error", (error) => {
      console.error("Error parsing form data", error);
      reject(new Error("Error parsing form data"));
    });

    const passthrough = new PassThrough();
    passthrough.end(Buffer.from(event.body!, "base64"));
    passthrough.pipe(busboy);
  });
};

const sendNotification = async (results: number[]) => {
  if (results[0] > results[1]) {
    console.log("Sending SMS notifications");
  }
};
