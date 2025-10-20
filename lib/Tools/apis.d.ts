import { AxiosInstance, AxiosRequestConfig } from "axios"

export declare function createClient(
    baseURL: string,
    headers?: Record<string, string>
): AxiosInstance

export interface SafeApiClient {
    get<T = any>(
        path: string,
        params?: Record<string, any>,
        config?: AxiosRequestConfig
    ): Promise<T>
    post<T = any>(
        path: string,
        data?: any,
        config?: AxiosRequestConfig
    ): Promise<T>
    request<T = any>(config: AxiosRequestConfig): Promise<T>
}

export declare function makeClient(client: AxiosInstance): SafeApiClient

declare function apis(
    baseURL: string,
    apiKey?: string | null
): SafeApiClient

export = apis