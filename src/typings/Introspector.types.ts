import * as langion from "@langion/langion";
import { Adapter } from "./Adapter";
import { Method, Source } from "./introspection";

/** If we have several entities with the same name in one origin that was added from another origins */

export type UnificationStrategy =
    /** We make deep compare and if the entities are diffirent we add postfix with addedFrom origin name */
    | "Postfix"
    /** We add only origins where added from equals origin */
    | "OnlyOrigin";

export interface IntrospectorConfig<O extends string> {
    origins: Array<Origin<O>>;
    getOriginFromModuleName: (path: string) => O;
    adapters: Array<Adapter<O>>;
    unification?: UnificationStrategy;
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
