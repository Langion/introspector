import * as langion from "@langion/langion";
import { Field, Method, Rest, Type, TypeKind } from "./introspection";
import { CommentData } from "./Introspector.types";

export interface Adapter<O extends string> {
    queryEntryPoints?: (
        langionDescription: langion.Langion,
        previous: langion.ClassEntity[],
        origin: O,
        adapters: Array<Adapter<O>>,
    ) => langion.ClassEntity[];

    loadAdditionalData?: (
        paths: Record<string, langion.Entity>,
        langion: langion.Langion,
        previous: langion.Entity[],
        origin: O,
        adapters: Array<Adapter<O>>,
    ) => langion.Entity[];

    isRequired?: (
        entity: langion.FieldEntity | langion.MethodEntity,
        previous: boolean,
        origin: O,
        adapters: Array<Adapter<O>>,
    ) => boolean;

    hasParamsInPath?: (method: Method<O>, previous: boolean, origin: O, adapters: Array<Adapter<O>>) => boolean;

    getParamsFromStringPath?: (
        method: Method<O>,
        previous: string[],
        origin: O,
        adapters: Array<Adapter<O>>,
    ) => string[];

    getMethodPayload?: (
        argument: langion.ArgumentEntity,
        type: Type<O>,
        previous: Array<Type<O>>,
        origin: O,
        adapters: Array<Adapter<O>>,
    ) => Array<Type<O>>;

    getQueryFields?: (
        argument: langion.ArgumentEntity,
        type: Type<O>,
        comment: string,
        previous: Array<Field<O>>,
        origin: O,
        adapters: Array<Adapter<O>>,
    ) => Array<Field<O>>;

    getParamsFields?: (
        argument: langion.ArgumentEntity,
        type: Type<O>,
        comment: string,
        paramsInPath: string[],
        currentParam: number,
        previous: Array<Field<O>>,
        origin: O,
        adapters: Array<Adapter<O>>,
    ) => Array<Field<O>>;

    extractName?: (field: langion.FieldEntity, previous: string, origin: O, adapters: Array<Adapter<O>>) => string;

    extractFieldFromMethod?: (
        method: langion.MethodEntity,
        field: Field<O>,
        previous: Field<O>,
        origin: O,
        adapters: Array<Adapter<O>>,
    ) => Field<O>;

    getKind?: (entity: langion.TypeEntity, previous: TypeKind, origin: O, adapters: Array<Adapter<O>>) => TypeKind;

    getBasePath?: (entry: langion.ClassEntity, previous: string, origin: O, adapters: Array<Adapter<O>>) => string;

    getRest?: (
        method: langion.MethodEntity,
        previous: Rest | null,
        origin: O,
        adapters: Array<Adapter<O>>,
    ) => Rest | null;

    getMethodReturns?: (
        method: langion.MethodEntity,
        previousParsedMethodReturn: langion.TypeEntity[],
        origin: O,
        adapters: Array<Adapter<O>>,
    ) => langion.TypeEntity[];

    getEntryName?: (entry: langion.ClassEntity, previous: string, origin: O, adapters: Array<Adapter<O>>) => string;

    getComment?: (withComment: CommentData, previous: string, origin: O, adapters: Array<Adapter<O>>) => string;

    shouldAddField?: (field: langion.FieldEntity, previous: boolean, origin: O, adapters: Array<Adapter<O>>) => boolean;
}
