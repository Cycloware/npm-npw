export declare const enum EGlobalParams {
    cd = "cd",
}
export declare type TGlobalOptions = {
    [P in EGlobalParams.cd]: string;
};
