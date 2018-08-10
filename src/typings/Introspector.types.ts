import * as langion from "@langion/langion";
import { Adapter } from "./Adapter";
import { Method, Source } from "./introspection";

export interface SideOrigin<O extends string> {
    origin: O;
    name: string;
}

export interface IntrospectorConfig<O extends string> {
    origins: Array<Origin<O>>;
    getOriginFromModuleName: (path: string) => O;
    share?: SideOrigin<O>;
    adapters: Adapter[];
}

export interface Origin<O extends string> {
    name: O;
    getLangion: () => Promise<langion.Langion>;
}

export interface CommentData {
    Annotations?: Record<string, langion.AnnotationEntity>;
    Comment?: string;
}

export interface ProcessedEntity<O extends string> {
    entity: langion.Entity;
    source: Source<O>;
}

export interface RestMethod<O extends string> {
    method: Method<O>;
    params?: Source<O>;
    query?: Source<O>;
}
