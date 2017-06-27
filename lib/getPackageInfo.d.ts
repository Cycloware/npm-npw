import 'colors';
export declare function getPackageInfo(packagePath: string): Promise<{
    result: 'success';
    packageInfo: any;
} | {
    result: 'not-found' | 'error';
    err: any;
    message: string;
}>;
