import * as langion from "@langion/langion";

export interface SideOrigin<O extends string> {
    origin: O;
    name: string;
}

export interface IntrospectorConfig<O extends string> {
    origins: Array<Origin<O>>;
    parseJavaBeans: boolean;
    getOriginFromModuleName: (path: string) => O;
    share?: SideOrigin<O>;
}

export interface Origin<O extends string> {
    name: O;
    getLangion: () => langion.Langion;
}

export type RequestMethods = "get" | "post" | "put" | "delete";
