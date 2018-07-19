import * as langion from '@langion/langion';
import * as jsonPath from 'jsonpath';
import * as _ from 'lodash';
import * as types from '../typings';

export class Adapter {
    protected jp = jsonPath;

    public queryEntryPoints(
        langionDescription: langion.Langion,
        entryPoints: langion.ClassEntity[],
        adapters: Adapter[]
    ): langion.ClassEntity[];
    public queryEntryPoints(): langion.ClassEntity[] {
        return [];
    }

    public isRequired(
        entity: langion.FieldEntity | langion.MethodEntity,
        previousParsedRequired: boolean,
        adapters: Adapter[]
    ): boolean;
    public isRequired(entity: langion.FieldEntity | langion.MethodEntity) {
        let result = false;

        if ('Id' in entity.Annotations) {
            result = true;
        } else if ('NotNull' in entity.Annotations) {
            result = true;
        } else if ("Column" in entity.Annotations) {
            result = !!entity.Annotations.Column.Items.nullable.Content;
        }

        return result;
    }

    public extractFieldFromMethod<O extends string>(
        method: langion.MethodEntity,
        field: types.Field<O>,
        previousParsedMethod: types.Field<O>,
        adapters: Adapter[]
    ): types.Field<O>;
    public extractFieldFromMethod<O extends string>(method: langion.MethodEntity, field: types.Field<O>) {
        if ("JsonProperty" in method.Annotations) {
            const name = method.Annotations.JsonProperty.Items.value.Content.trim();
            return { ...field, name };
        }

        if (method.Modifier.Items.Public) {
            const accessors = [/^get/, /^is/];

            const finalName = accessors.reduce(
                (acc, value) => {
                    if (acc.found) {
                        return acc;
                    }

                    if (value.test(acc.name)) {
                        const name = method.Name.replace(value, "");
                        return { name, found: true };
                    } else {
                        return acc;
                    }
                },
                { name: method.Name, found: false },
            );

            const result = _.lowerFirst(finalName.name);
            return { ...field, name: result };
        }

        return field;
    }

    public getKind(entity: langion.TypeEntity, previousParsedKind: string, adapters: Adapter[]): types.TypeKind;
    public getKind(entity: langion.TypeEntity) {
        if (entity.Path.match(/boolean/)) {
            return types.TypeKind.Boolean;
        }

        if (entity.Path.match(/Date/) || entity.Path.match(/LocalDateTime/)) {
            return types.TypeKind.Date;
        }

        if (
            entity.IsArray ||
            entity.Path.match(/java\.util\.List/) ||
            entity.Path.match(/java\.util\.Collection/) ||
            entity.Path.match(/java\.util\.Set/)
        ) {
            return types.TypeKind.List;
        }

        if (entity.Path.match(/java\.util\.Map/)) {
            return types.TypeKind.Map;
        }

        if (entity.Path.match(/number/)) {
            return types.TypeKind.Number;
        }

        if (entity.Path.match(/string/) || entity.Path.match(/char/)) {
            return types.TypeKind.String;
        }

        if (entity.IsParameter) {
            return types.TypeKind.TypeParameter;
        }

        if (entity.Name.toLocaleLowerCase() === "void") {
            return types.TypeKind.Void;
        }

        if (entity.Path.match(/java/) || entity.Path.match(/\$/)) {
            return types.TypeKind.Object;
        }

        return types.TypeKind.Entity;
    }

    public getBasePath(entry: langion.ClassEntity, previousParsedPath: string, adapters: Adapter[]): string;
    public getBasePath() {
        return "/";
    }

    public getRest(
        method: langion.MethodEntity,
        previousParsedRest: types.Rest | null,
        adapters: Adapter[],
    ): types.Rest | null;
    public getRest(method: langion.MethodEntity): types.Rest | null {
        let path = "";
        let request: types.RequestMethods | null = null;

        if ("RequestMapping" in method.Annotations) {
            path = method.Annotations.RequestMapping.Items.value.Content[0];
            request = _.lowerCase(method.Annotations.RequestMapping.Items.method.Content[0]) as any;

            if (!request) {
                request = "get";
            }
        }

        if ("GetMapping" in method.Annotations) {
            path = method.Annotations.GetMapping.Items.value.Content[0];
            request = "get";
        }

        if ("PostMapping" in method.Annotations) {
            path = method.Annotations.PostMapping.Items.value.Content[0];
            request = "post";
        }

        if ("PutMapping" in method.Annotations) {
            path = method.Annotations.PutMapping.Items.value.Content[0];
            request = "put";
        }

        if ("DeleteMapping" in method.Annotations) {
            path = method.Annotations.DeleteMapping.Items.value.Content[0];
            request = "delete";
        }

        if (request) {
            return { path, request };
        } else {
            return null;
        }
    }

    public getMethodReturns(
        method: langion.MethodEntity,
        previousParsedMethodReturn: langion.TypeEntity[],
        adapters: Adapter[],
    ): langion.TypeEntity[];
    public getMethodReturns(method: langion.MethodEntity, previousParsedMethodReturn: langion.TypeEntity[]) {
        let result: langion.TypeEntity[] = [];

        if ("ApiOperation" in method.Annotations) {
            result.push(method.Annotations.ApiOperation.Items.response.Type);
        }

        result = previousParsedMethodReturn.concat(result)          ;

        return result;
    }

    public getEntryName<O extends string>(
        entry: langion.ClassEntity,
        origin: O,
        previousParsedEntryName: string,
        adapters: Adapter[],
    ): string;
    public getEntryName<O extends string>(entry: langion.ClassEntity, origin: O) {
        let name = entry.Name;

        // Remove controller word from name
        const controllerPosition = name.toLowerCase().indexOf("controller");

        if (controllerPosition >= 0) {
            name = name.slice(0, controllerPosition);
        }

        // Remove origin name but only if it's not equal to origin.
        // i.e. we have MyController and the origin is My.
        // after all this slicing we would got empty string
        if (_.lowerCase(name) !== _.lowerCase(origin)) {
            const originPosition = name.toLowerCase().indexOf(origin.toLowerCase());

            if (originPosition === 0) {
                const nameWithoutOrigin = name.slice(origin.length);
                const correctName = /[_A-Za-z][_0-9A-Za-z]*/;

                if (correctName.test(nameWithoutOrigin)) {
                    name = nameWithoutOrigin;
                }
            }
        }

        return name;
    }

    public getComment(withComment: types.CommentData, previousParsedComment: string, adapters: Adapter[]): string;
    public getComment(withComment: types.CommentData) {
        let comment = withComment.Comment || "";

        if (!withComment.Annotations) {
            return comment;
        }

        if ("ApiOperation" in withComment.Annotations) {
            comment = withComment.Annotations.ApiOperation.Items.value.Content;

            if (withComment.Annotations.ApiOperation.Items.notes.Content) {
                comment += `\n${withComment.Annotations.ApiOperation.Items.notes.Content}`;
            }
        } else if ("ApiParam" in withComment.Annotations) {
            comment = withComment.Annotations.ApiParam.Items.value.Content;
        }

        return comment;
    }
}
