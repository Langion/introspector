import * as langion from "@langion/langion";
import * as jp from "jsonpath";
import * as _ from "lodash";
import * as types from "../typings";

export class SpringAdapter implements types.Adapter {
    public queryEntryPoints(langionDescription: langion.Langion, entryPoints: langion.ClassEntity[]) {
        const query =
            "$..Exports[?(@.Annotations.RestController != null" +
            "|| @.Annotations.Controller != null" +
            "|| @.Annotations.Service != null)]";

        const controllers: langion.ClassEntity[] = jp.query(langionDescription, query);
        const result = entryPoints.concat(controllers);
        return result;
    }

    public getBasePath(entry: langion.ClassEntity) {
        let base = "/";

        if ("RequestMapping" in entry.Annotations) {
            base = entry.Annotations.RequestMapping.Items.value.Content[0];
        }

        return base;
    }

    public isRequired(entity: langion.FieldEntity | langion.MethodEntity) {
        let result = false;

        if ("Id" in entity.Annotations) {
            result = true;
        } else if ("NotNull" in entity.Annotations) {
            result = true;
        } else if ("Column" in entity.Annotations) {
            result = !!entity.Annotations.Column.Items.nullable.Content;
        }

        return result;
    }

    public hasParamsInPath<O extends string>(method: types.Method<O>) {
        const hasParamsInPath = /[{}]/gm;
        const result = hasParamsInPath.test(method.path);
        return result;
    }

    public getParamsFromStringPath<O extends string>(method: types.Method<O>, previous: string[]) {
        let result = previous;

        const params = method.path.match(/\{(\w+)\}/g);

        if (params) {
            const normalized = params.map((a) => a.replace(/[{}]/g, ""));
            result = result.concat(normalized);
        }

        return result;
    }

    public getMethodPayload<O extends string>(
        argument: langion.ArgumentEntity,
        type: types.Type<O>,
        previous: Array<types.Type<O>>,
    ) {
        let result = previous;

        if ("RequestBody" in argument.Annotations) {
            result = result.concat(type);
        }
        return result;
    }

    public getQueryFields<O extends string>(
        argument: langion.ArgumentEntity,
        type: types.Type<O>,
        comment: string,
        previous: Array<types.Field<O>>,
    ) {
        let result = previous;

        if ("RequestParam" in argument.Annotations) {
            const fieldName = argument.Annotations.RequestParam.Items.value.Content || argument.Name;
            const field: types.Field<O> = { name: fieldName, type, isDuplicate: false, isRequired: false, comment };
            result = result.concat([field]);
        }

        return result;
    }

    public getParamsFields?<O extends string>(
        argument: langion.ArgumentEntity,
        type: types.Type<O>,
        comment: string,
        paramsInPath: string[],
        currentParam: number,
        previous: Array<types.Field<O>>,
    ) {
        let result = previous;

        if ("PathVariable" in argument.Annotations) {
            let pathName: string = argument.Annotations.PathVariable.Items.value.Content || argument.Name;

            if (pathName.match(/arg\d+/)) {
                pathName = paramsInPath[currentParam];
            }

            const field: types.Field<O> = { name: pathName, type, isDuplicate: false, isRequired: true, comment };
            result = result.concat([field]);
        }

        return result;
    }

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

            if (finalName.found) {
                const result = _.lowerFirst(finalName.name);
                return { ...field, name: result };
            }
        }

        return field;
    }

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

    public getRest(method: langion.MethodEntity): types.Rest | null {
        let path = "";
        let request: types.RequestMethod | null = null;

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

    public shouldAddField(field: langion.FieldEntity) {
        const result = !!field.Modifiers.Items.Public;
        return result;
    }
}
