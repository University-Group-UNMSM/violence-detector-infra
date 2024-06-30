import {
  DeleteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  QueryInput,
  UpdateItemCommand,
  UpdateItemCommandInput,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

/**
 * Esta clase sirve para realizar operaciones en DynamoDB
 * @template T Objeto que se almacena en la tabla
 * @template K Primary Key de la tabla (simple o compuesta)
 */
export class DynamoClient<T, K> extends DynamoDBClient {
  private table: string;

  constructor(table: string) {
    super();
    this.table = table;
  }

  /**
   * Método para guardar un objeto en una tabla
   *
   * @param item Objeto que se guardará
   */
  async save(item: T): Promise<void> {
    await this.send(
      new PutItemCommand({
        TableName: this.table,
        Item: marshall(item satisfies T),
      })
    );
  }

  /**
   * Método para obtener un objeto de una tabla
   *
   * @param key Primary key de la tabla (simple o compuesta)
   * @returns
   */
  async findOne(key: K): Promise<T | undefined> {
    const item = (
      await this.send(
        new GetItemCommand({
          TableName: this.table,
          Key: marshall(key satisfies K),
        })
      )
    ).Item;

    console.log("item from dynamo ->", item);

    if (!item) return undefined;

    return unmarshall(item) as T;
  }

  /**
   * Método para actualizar un item dentro de una tabla
   * Si no existe el item se crea uno nuevo
   *
   * @param payload Configuración para actualizar el item
   */
  async upsert(payload: UpdateItemCommandInput): Promise<void> {
    await this.send(
      new UpdateItemCommand({ ...payload, TableName: this.table })
    );
  }

  /**
   * Método para hacer una query a una tabla de dynamo
   *
   * @param payload Configuración para realizar la query
   */
  async query(payload: Partial<QueryInput>): Promise<T | undefined> {
    const records = (
      await this.send(new QueryCommand({ ...payload, TableName: this.table }))
    ).Items;

    if (
      records === undefined ||
      records.length === 0 ||
      records[0] === undefined
    )
      return undefined;

    return unmarshall(records[0]) as T;
  }

  /**
   * Método para eliminar un item de una tabla
   *
   * @param key Primary key del item a eliminar
   */
  async remove(key: K): Promise<void> {
    await this.send(
      new DeleteItemCommand({
        TableName: this.table,
        Key: marshall(key satisfies K),
      })
    );
  }

  async update(payload: Partial<UpdateItemCommandInput>): Promise<void> {
    await this.send(
      new UpdateItemCommand({
        TableName: this.table,
        Key: marshall(payload.Key),
        ...payload,
      })
    );
  }
}
