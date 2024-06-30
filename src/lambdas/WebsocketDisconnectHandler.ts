import {
  APIGatewayProxyResultV2,
  APIGatewayProxyWebsocketEventV2,
} from "aws-lambda";
import { Response } from "../common/utils/Response";
import { DynamoClient } from "../common/utils/Dynamo";
import { ConnectionItem } from "../common/types";

const connectionsTableClient = new DynamoClient<
  ConnectionItem,
  { connectionId: string }
>(process.env.CONNECTIONS_TABLE_NAME!);

export const handler = async (
  event: APIGatewayProxyWebsocketEventV2
): Promise<APIGatewayProxyResultV2> => {
  console.log("event", JSON.stringify(event));
  const {
    requestContext: { connectionId, routeKey },
  } = event;

  console.log("disconnect route key" + routeKey);
  await connectionsTableClient.remove({ connectionId: connectionId });

  return Response.success({});
};
