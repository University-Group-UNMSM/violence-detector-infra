import sharp from "sharp";

export class FrameUtils {
  private static readonly SIZE = { width: 224, height: 224 };

  private constructor() {}

  public static async getNdArray(file: Buffer): Promise<Float32Array> {
    // Redimensionar la imagen y convertirla a formato raw (RGB)
    const { data } = await sharp(file)
      .resize(FrameUtils.SIZE.width, FrameUtils.SIZE.height)
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Convertir los datos de la imagen a un arreglo Float32 normalizado (0-1)
    const floatArray = new Float32Array(data.length);
    for (let i = 0; i < data.length; i++) {
      floatArray[i] = data[i] / 255.0;
    }

    return floatArray;
  }
}
