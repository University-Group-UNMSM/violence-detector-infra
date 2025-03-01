import { APIGatewayProxyResultV2 } from "aws-lambda";

export class Response {
  public static success<T>(data: T) {
    return this.generalResponse(200, data);
  }

  public static badRequest<T>(error: T) {
    return this.generalResponse(400, { error });
  }

  public static serverError<T>(error: T) {
    return this.generalResponse(500, { error });
  }

  private static generalResponse<T>(
    statusCode: number,
    data: T
  ): APIGatewayProxyResultV2 {
    return {
      isBase64Encoded: false,
      statusCode,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(data),
    };
  }
}
