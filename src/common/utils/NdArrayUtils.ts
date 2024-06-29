export class NDArrayUtils {
  private static readonly X = 224;
  private static readonly Y = 224;
  private static readonly Z = 3;

  private constructor() {}

  public static toArray(ndArray: Float32Array): number[][][][] {
    const array: number[][][][] = Array.from({ length: 1 }, () =>
      Array.from({ length: NDArrayUtils.X }, () =>
        Array.from({ length: NDArrayUtils.Y }, () =>
          Array.from({ length: NDArrayUtils.Z }, () => 0)
        )
      )
    );

    let n = 0;
    for (let x = 0; x < NDArrayUtils.X; x++) {
      for (let y = 0; y < NDArrayUtils.Y; y++) {
        for (let z = 0; z < NDArrayUtils.Z; z++) {
          array[0][x][y][z] = ndArray[n++];
        }
      }
    }
    return array;
  }
}
