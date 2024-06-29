import { FrameUtils } from "../utils/FrameUtils";
import { NDArrayUtils } from "../utils/NdArrayUtils";
import EndpointService from "./EndpointService";

class CnnService {
  private static readonly ENDPOINT_NAME = "endpoint-vgg16";
  private readonly endpointService: EndpointService;

  constructor() {
    this.endpointService = new EndpointService();
  }

  public async predict(frames: Buffer[]): Promise<number[][]> {
    console.log("Started predict(frames) method");
    const transferValues = await this.getTransferValues(frames);
    console.log("End predict(frames) method");
    return transferValues;
  }

  public async fakePredict(frames: Buffer[]): Promise<number[][]> {
    console.log("Started fakePredict(frames) method");
    const transferValuesPromises = frames.map((frame) =>
      this.fakeToTransferValue(frame)
    );
    const transferValues = await Promise.all(transferValuesPromises);

    console.log("Predictions from CnnService:", transferValues);
    console.log("End fakePredict(frames) method");
    return transferValues;
  }

  private async getTransferValues(frames: Buffer[]): Promise<number[][]> {
    const transferValuesPromises = frames.map((frame) =>
      this.toTransferValue(frame)
    );
    const transferValues = await Promise.all(transferValuesPromises);
    return transferValues;
  }

  private async toTransferValue(file: Buffer): Promise<number[]> {
    const ndArray = await FrameUtils.getNdArray(file);
    const array = NDArrayUtils.toArray(ndArray);
    const bytes = Buffer.from(JSON.stringify(array));
    const endpointResponse = await this.endpointService.getResponse(
      bytes,
      CnnService.ENDPOINT_NAME
    );
    return endpointResponse.predictions[0];
  }

  private async fakeToTransferValue(file: Buffer): Promise<number[]> {
    const ndArray = await FrameUtils.getNdArray(file);
    const array = NDArrayUtils.toArray(ndArray);
    return array[0][0][0];
  }
}

export default CnnService;
