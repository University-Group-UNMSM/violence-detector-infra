export type EndpointResponse = {
  predictions: number[][];
};

export type ConnectionItem = {
  connectionId: string;
  ttl: number;
};

export type MakePredictionEvent = {
  connectionId: string;
  framesUrl: string;
};

export type WebsocketBody = {
  action: string;
  framesUrl: string;
};
