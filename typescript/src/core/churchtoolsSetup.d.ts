export class ChurchToolsClient {
    constructor(baseUrl: string, token: string);

    setCookieJar(
        wrapper: (client: any) => any,
        jar: any
    ): void;

    getAllPages(path: string): Promise<any[]>;
    get(path: string): Promise<any>;
}

export { axiosCookieJarSupport, tough };