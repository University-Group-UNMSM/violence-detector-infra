import { EndpointResponse } from "../types";
import { ObjectMapperUtils } from "../utils/ObjectMapperUtils";
import EndpointService from "./EndpointService"; // Asegúrate de importar tu EndpointService

class LstmService {
  private static readonly ENDPOINT_NAME = "endpoint-vgg16-rnn";
  private readonly endpointService: EndpointService;
  private readonly log: Console;

  constructor(endpointService: EndpointService) {
    this.endpointService = endpointService;
    this.log = console;
  }

  public async predict(
    transferValues: number[][][]
  ): Promise<EndpointResponse> {
    // Define el tipo de retorno adecuado
    this.log.info("Started predict(transferValues) method");
    const bytes = ObjectMapperUtils.toBytes(transferValues);
    const endpointResponse = await this.endpointService.getResponse(
      bytes,
      LstmService.ENDPOINT_NAME
    );
    this.log.info("End predict(transferValues) method");
    return endpointResponse;
  }

  public async fakePredict(
    transferValues: number[][][]
  ): Promise<EndpointResponse> {
    this.log.info("Started fakePredict(transferValues) method");

    console.log("Transfer values from LstmService:", transferValues);

    const firstPrediction = Number(Math.random().toFixed(3));
    const secondPrediction = Number((100 - firstPrediction).toFixed(3));

    const predictions: EndpointResponse = {
      predictions: [[firstPrediction, secondPrediction]],
    };

    console.log("Predictions from LstmService:", predictions);
    this.log.info("End fakePredict(transferValues) method");
    return predictions;
  }
}

export default LstmService;
