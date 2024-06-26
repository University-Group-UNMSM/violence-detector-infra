import * as tf from "@tensorflow/tfjs-node";
import * as cv from "@u4/opencv4nodejs";

export class FrameUtils {
  private static readonly SIZE = new cv.Size(224, 224);

  private constructor() {}

  public static async getNdArray(file: Buffer): Promise<tf.Tensor> {
    const fileBuffer = Buffer.from(file.buffer); // Convert the ArrayBuffer to a Buffer
    const mat = cv.imdecode(fileBuffer);

    const rgbImg = mat.cvtColor(cv.COLOR_BGR2RGB);
    const resizedImg = rgbImg.resize(
      FrameUtils.SIZE.height,
      FrameUtils.SIZE.width,
      0,
      0,
      cv.INTER_CUBIC
    );

    const data = resizedImg.getDataAsArray().flat();
    const tensor = tf.tensor(
      new Float32Array(data),
      [1, FrameUtils.SIZE.height, FrameUtils.SIZE.width, 3],
      "float32"
    );
    return tensor.div(255.0);
  }
}
