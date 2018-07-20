import * as langion from "@langion/langion";
import { Field, Rest, TypeKind } from "./introspection";
import { CommentData } from "./Introspector.types";

export interface Adapter {
    queryEntryPoints?: (
        langionDescription: langion.Langion,
        previous: langion.ClassEntity[],
        adapters: Adapter[],
    ) => langion.ClassEntity[];

    loadAdditionalData?: (
        paths: Record<string, langion.Entity>,
        langion: langion.Langion,
        previous: langion.Entity[],
        adapters: Adapter[],
    ) => langion.Entity[];

    isRequired?: (
        entity: langion.FieldEntity | langion.MethodEntity,
        previous: boolean,
        adapters: Adapter[],
    ) => boolean;

    extractFieldFromMethod?: <O extends string>(
        method: langion.MethodEntity,
        field: Field<O>,
        previous: Field<O>,
        adapters: Adapter[],
    ) => Field<O>;

    getKind?: (entity: langion.TypeEntity, previous: TypeKind, adapters: Adapter[]) => TypeKind;

    getBasePath?: (entry: langion.ClassEntity, previous: string, adapters: Adapter[]) => string;

    getRest?: (method: langion.MethodEntity, previous: Rest | null, adapters: Adapter[]) => Rest | null;

    getMethodReturns?: (
        method: langion.MethodEntity,
        previousParsedMethodReturn: langion.TypeEntity[],
        adapters: Adapter[],
    ) => langion.TypeEntity[];

    getEntryName?: <O extends string>(
        entry: langion.ClassEntity,
        origin: O,
        previous: string,
        adapters: Adapter[],
    ) => string;

    getComment?: (withComment: CommentData, previous: string, adapters: Adapter[]) => string;

    shouldAddField?: (field: langion.FieldEntity, previous: boolean, adapters: Adapter[]) => boolean;
}
