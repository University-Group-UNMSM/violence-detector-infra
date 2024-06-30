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

  console.log("connect route key: " + routeKey);
  await connectionsTableClient.save({
    connectionId: connectionId,
    ttl: new Date().getTime() / 1000 + 3600, // remove the connection after 1 hour
  });

  return Response.success({});
};
