import { type InvokeEndpointCommandInputType } from "@aws-sdk/client-sagemaker-runtime"; // Asegúrate de importar el cliente adecuado de AWS SDK

export class EndpointUtils {
  private static readonly CONTENT_TYPE = "application/json";

  private constructor() {}

  public static toInvokeEndpointRequest(
    bytes: Buffer,
    endpointName: string
  ): InvokeEndpointCommandInputType {
    return {
      EndpointName: endpointName,
      ContentType: EndpointUtils.CONTENT_TYPE,
      Body: bytes,
    };
  }
}
