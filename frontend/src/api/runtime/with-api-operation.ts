import type { AxiosRequestConfig } from 'axios';

import type {
  ApiOperationContract,
  ApiOperationMethod,
} from '@/api/operations';

export const withApiOperation = <
  TResponse,
  TRequest,
  TMethod extends ApiOperationMethod,
  TPath extends string,
>(
  operation: ApiOperationContract<TResponse, TRequest, TMethod, TPath>,
  config?: AxiosRequestConfig<TRequest>,
): AxiosRequestConfig<TRequest> => ({
  ...(config ?? {}),
  method: operation.method,
  url: operation.path,
});
