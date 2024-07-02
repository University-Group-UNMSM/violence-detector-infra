import { EndpointResponse } from "../types";

export class ObjectMapperUtils {
  private constructor() {}

  public static toBytes(value: any): Buffer {
    console.log("ObjectMapperUtils.toBytes() - value:", value);
    return Buffer.from(JSON.stringify(value));
  }

  public static toObject(objectStr: string): EndpointResponse {
    console.log("ObjectMapperUtils.toObject() - objectStr:", objectStr);
    return JSON.parse(objectStr) as EndpointResponse;
  }
}
