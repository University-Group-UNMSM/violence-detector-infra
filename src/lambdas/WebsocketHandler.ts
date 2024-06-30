import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import {
  APIGatewayProxyResultV2,
  APIGatewayProxyWebsocketEventV2,
} from "aws-lambda";
import { MakePredictionEvent, WebsocketBody } from "../common/types";
import { Response } from "../common/utils/Response";

const lambdaClient = new LambdaClient({});

export const handler = async (
  event: APIGatewayProxyWebsocketEventV2
): Promise<APIGatewayProxyResultV2> => {
  console.log("event", JSON.stringify(event));

  const {
    body,
    requestContext: { connectionId },
  } = event;

  const { framesUrl } = JSON.parse(body!) as WebsocketBody;

  try {
    await lambdaClient.send(
      new InvokeCommand({
        FunctionName: process.env.REALTIME_PREDICTION_FUNCTION_NAME!,
        InvocationType: "Event",
        Payload: JSON.stringify({
          connectionId,
          framesUrl,
        } satisfies MakePredictionEvent),
      })
    );

    return Response.success({});
  } catch (error) {
    return Response.badRequest(error);
  }
};
