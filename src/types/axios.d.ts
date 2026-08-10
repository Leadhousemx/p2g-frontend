import "axios";

declare module "axios" {
  export interface AxiosRequestConfig {
    _skipRefresh?: boolean;
    _authRetry?: boolean;
    _csrfRetry?: boolean;
  }
}
