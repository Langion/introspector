import * as langion from "@langion/langion";
import * as types from "../typings";

export class AdapterInvoker<O extends string> implements types.Adapter<O> {
    constructor(private adapters: Array<types.Adapter<O>>) {}

    public queryEntryPoints(langionDescription: langion.Langion, initial: langion.ClassEntity[] = [], origin: O) {
        const result = this.adapters.reduce(
            (p, a) => (a.queryEntryPoints ? a.queryEntryPoints(langionDescription, p, origin, this.adapters) : p),
            initial,
        );

        return result;
    }

    public loadAdditionalData(
        paths: Record<string, langion.Entity>,
        langionEntity: langion.Langion,
        initial: langion.Entity[] = [],
        origin: O,
    ) {
        const result = this.adapters.reduce(
            (p, a) => (a.loadAdditionalData ? a.loadAdditionalData(paths, langionEntity, p, origin, this.adapters) : p),
            initial,
        );

        return result;
    }

    public getKind(entity: langion.TypeEntity, initial = types.TypeKind.Void, origin: O) {
        const result = this.adapters.reduce(
            (p, a) => (a.getKind ? a.getKind(entity, p, origin, this.adapters) : p),
            initial,
        );

        return result;
    }

    public getRest(entity: langion.MethodEntity, initial: types.Rest | null = null, origin: O) {
        const result = this.adapters.reduce(
            (p, a) => (a.getRest ? a.getRest(entity, p, origin, this.adapters) : p),
            initial,
        );

        return result;
    }

    public getMethodReturns(entity: langion.MethodEntity, initial: langion.TypeEntity[] = [], origin: O) {
        const result = this.adapters.reduce(
            (p, a) => (a.getMethodReturns ? a.getMethodReturns(entity, p, origin, this.adapters) : p),
            initial,
        );

        return result;
    }

    public hasParamsInPath(method: types.Method<O>, initial = false, origin: O) {
        const result = this.adapters.reduce(
            (p, a) => (a.hasParamsInPath ? a.hasParamsInPath(method, p, origin, this.adapters) : p),
            initial,
        );

        return result;
    }

    public getParamsFromStringPath(method: types.Method<O>, initial: string[] = [], origin: O) {
        const result = this.adapters.reduce(
            (p, a) => (a.getParamsFromStringPath ? a.getParamsFromStringPath(method, p, origin, this.adapters) : p),
            initial,
        );

        return result;
    }

    public getMethodPayload(
        argument: langion.ArgumentEntity,
        type: types.Type<O>,
        initial: Array<types.Type<O>> = [],
        origin: O,
    ) {
        const result = this.adapters.reduce(
            (p, a) => (a.getMethodPayload ? a.getMethodPayload(argument, type, p, origin, this.adapters) : p),
            initial,
        );

        return result;
    }

    public getQueryFields(
        argument: langion.ArgumentEntity,
        type: types.Type<O>,
        comment: string,
        initial: Array<types.Field<O>> = [],
        origin: O,
    ) {
        const result = this.adapters.reduce(
            (p, a) => (a.getQueryFields ? a.getQueryFields(argument, type, comment, p, origin, this.adapters) : p),
            initial,
        );

        return result;
    }

    public getParamsFields(
        argument: langion.ArgumentEntity,
        type: types.Type<O>,
        comment: string,
        paramsInPath: string[],
        currentParam: number,
        initial: Array<types.Field<O>> = [],
        origin: O,
    ) {
        const result = this.adapters.reduce(
            (p, a) =>
                a.getParamsFields
                    ? a.getParamsFields(argument, type, comment, paramsInPath, currentParam, p, origin, this.adapters)
                    : p,
            initial,
        );

        return result;
    }

    public extractName(field: langion.FieldEntity, initial = "", origin: O) {
        const result = this.adapters.reduce(
            (p, a) => (a.extractName ? a.extractName(field, p, origin, this.adapters) : p),
            initial,
        );

        return result;
    }

    public extractFieldFromMethod(method: langion.MethodEntity, field: types.Field<O>, initial = field, origin: O) {
        const result = this.adapters.reduce(
            (p, a) =>
                a.extractFieldFromMethod ? a.extractFieldFromMethod(method, field, p, origin, this.adapters) : p,
            initial,
        );

        return result;
    }

    public isRequired(entity: langion.MethodEntity | langion.FieldEntity, initial = false, origin: O) {
        const result = this.adapters.reduce(
            (p, a) => (a.isRequired ? a.isRequired(entity, p, origin, this.adapters) : p),
            initial,
        );

        return result;
    }

    public getBasePath(entry: langion.ClassEntity, initial = "", origin: O) {
        const result = this.adapters.reduce(
            (p, a) => (a.getBasePath ? a.getBasePath(entry, p, origin, this.adapters) : p),
            initial,
        );

        return result;
    }

    public getEntryName(entry: langion.ClassEntity, initial = "", origin: O) {
        const result = this.adapters.reduce(
            (p, a) => (a.getEntryName ? a.getEntryName(entry, p, origin, this.adapters) : p),
            initial,
        );

        return result;
    }

    public getComment(data: types.CommentData, initial = "", origin: O) {
        const result = this.adapters.reduce(
            (p, a) => (a.getComment ? a.getComment(data, p, origin, this.adapters) : p),
            initial,
        );

        return result;
    }

    public shouldAddField(field: langion.FieldEntity, initial = false, origin: O) {
        const result = this.adapters.reduce(
            (p, a) => (a.shouldAddField ? a.shouldAddField(field, p, origin, this.adapters) : p),
            initial,
        );

        return result;
    }
}
