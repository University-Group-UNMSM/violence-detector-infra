import { EndpointResponse } from "../types";

export class ObjectMapperUtils {
  private constructor() {}

  public static toBytes(value: any): Buffer {
    return Buffer.from(JSON.stringify(value));
  }

  public static toObject(objectStr: string): EndpointResponse {
    return JSON.parse(objectStr) as EndpointResponse;
  }
}
