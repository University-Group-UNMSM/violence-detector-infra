import {
  InvokeEndpointCommand,
  SageMakerRuntimeClient,
} from "@aws-sdk/client-sagemaker-runtime";
import { ObjectMapperUtils } from "../utils/ObjectMapperUtils";
import { EndpointResponse } from "../types";

class EndpointService {
  private readonly sageMakerRuntimeClient: SageMakerRuntimeClient;

  constructor() {
    this.sageMakerRuntimeClient = new SageMakerRuntimeClient({});
  }

  public async getResponse(
    bytes: Buffer,
    endpointName: string
  ): Promise<EndpointResponse> {
    // Define el tipo de retorno adecuado
    const response = await this.sageMakerRuntimeClient.send(
      new InvokeEndpointCommand({
        EndpointName: endpointName,
        ContentType: "application/json",
        Body: bytes,
      })
    );
    const endpointResponseStr = response.Body?.toString() || "";
    return ObjectMapperUtils.toObject(endpointResponseStr);
  }
}

export default EndpointService;
