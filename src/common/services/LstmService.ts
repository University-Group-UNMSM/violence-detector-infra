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

  public async predict(transferValues: number[][][]): Promise<any> {
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
}

export default LstmService;
