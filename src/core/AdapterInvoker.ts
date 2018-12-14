import * as langion from "@langion/langion";
import * as types from "../typings";

export class AdapterInvoker implements types.Adapter {
    constructor(private adapters: types.Adapter[]) {}

    public queryEntryPoints(langionDescription: langion.Langion, initial: langion.ClassEntity[] = []) {
        const result = this.adapters.reduce(
            (p, a) => (a.queryEntryPoints ? a.queryEntryPoints(langionDescription, p, this.adapters) : p),
            initial,
        );

        return result;
    }

    public loadAdditionalData(
        paths: Record<string, langion.Entity>,
        langionEntity: langion.Langion,
        initial: langion.Entity[] = [],
    ) {
        const result = this.adapters.reduce(
            (p, a) => (a.loadAdditionalData ? a.loadAdditionalData(paths, langionEntity, p, this.adapters) : p),
            initial,
        );

        return result;
    }

    public getKind(entity: langion.TypeEntity, initial = types.TypeKind.Void) {
        const result = this.adapters.reduce((p, a) => (a.getKind ? a.getKind(entity, p, this.adapters) : p), initial);
        return result;
    }

    public getRest(entity: langion.MethodEntity, initial: types.Rest | null = null) {
        const result = this.adapters.reduce((p, a) => (a.getRest ? a.getRest(entity, p, this.adapters) : p), initial);
        return result;
    }

    public getMethodReturns(entity: langion.MethodEntity, initial: langion.TypeEntity[] = []) {
        const result = this.adapters.reduce(
            (p, a) => (a.getMethodReturns ? a.getMethodReturns(entity, p, this.adapters) : p),
            initial,
        );

        return result;
    }

    public hasParamsInPath<O extends string>(method: types.Method<O>, initial = false) {
        const result = this.adapters.reduce(
            (p, a) => (a.hasParamsInPath ? a.hasParamsInPath(method, p, this.adapters) : p),
            initial,
        );

        return result;
    }

    public getParamsFromStringPath<O extends string>(method: types.Method<O>, initial: string[] = []) {
        const result = this.adapters.reduce(
            (p, a) => (a.getParamsFromStringPath ? a.getParamsFromStringPath(method, p, this.adapters) : p),
            initial,
        );

        return result;
    }

    public getMethodPayload<O extends string>(
        argument: langion.ArgumentEntity,
        type: types.Type<O>,
        initial: Array<types.Type<O>> = [],
    ) {
        const result = this.adapters.reduce(
            (p, a) => (a.getMethodPayload ? a.getMethodPayload(argument, type, p, this.adapters) : p),
            initial,
        );

        return result;
    }

    public getQueryFields<O extends string>(
        argument: langion.ArgumentEntity,
        type: types.Type<O>,
        comment: string,
        initial: Array<types.Field<O>> = [],
    ) {
        const result = this.adapters.reduce(
            (p, a) => (a.getQueryFields ? a.getQueryFields(argument, type, comment, p, this.adapters) : p),
            initial,
        );

        return result;
    }

    public getParamsFields<O extends string>(
        argument: langion.ArgumentEntity,
        type: types.Type<O>,
        comment: string,
        paramsInPath: string[],
        currentParam: number,
        initial: Array<types.Field<O>> = [],
    ) {
        const result = this.adapters.reduce(
            (p, a) =>
                a.getParamsFields
                    ? a.getParamsFields(argument, type, comment, paramsInPath, currentParam, p, this.adapters)
                    : p,
            initial,
        );

        return result;
    }

    public extractName(field: langion.FieldEntity, initial = "") {
        const result = this.adapters.reduce(
            (p, a) => (a.extractName ? a.extractName(field, p, this.adapters) : p),
            initial,
        );

        return result;
    }

    public extractFieldFromMethod<O extends string>(method: langion.MethodEntity, field: types.Field<O>) {
        const result = this.adapters.reduce(
            (p, a) => (a.extractFieldFromMethod ? a.extractFieldFromMethod(method, field, p, this.adapters) : p),
            field,
        );

        return result;
    }

    public isRequired(entity: langion.MethodEntity | langion.FieldEntity, initial = false) {
        const result = this.adapters.reduce(
            (p, a) => (a.isRequired ? a.isRequired(entity, p, this.adapters) : p),
            initial,
        );

        return result;
    }

    public getBasePath(entry: langion.ClassEntity, initial = "") {
        const result = this.adapters.reduce(
            (p, a) => (a.getBasePath ? a.getBasePath(entry, p, this.adapters) : p),
            initial,
        );

        return result;
    }

    public getEntryName<O extends string>(entry: langion.ClassEntity, origin: O, initial = "") {
        const result = this.adapters.reduce(
            (p, a) => (a.getEntryName ? a.getEntryName(entry, origin, p, this.adapters) : p),
            initial,
        );

        return result;
    }

    public getComment(data: types.CommentData, initial = "") {
        const result = this.adapters.reduce(
            (p, a) => (a.getComment ? a.getComment(data, p, this.adapters) : p),
            initial,
        );

        return result;
    }

    public shouldAddField(field: langion.FieldEntity, initial = false) {
        const result = this.adapters.reduce(
            (p, a) => (a.shouldAddField ? a.shouldAddField(field, p, this.adapters) : p),
            initial,
        );

        return result;
    }
}
