import * as langion from "@langion/langion";
import * as _ from "lodash";
import { Introspector } from "../../Introspector";
import * as types from "../../typings";
import { Service } from "../Service";
import { Type } from "../Type";
import { Comment } from "./Comment";

export interface MethodData<O extends string> {
    entity: langion.MethodEntity;
    map: Record<string, langion.GenericEntity>;
    controller: types.Controller<O>;
    introspector: Introspector<O>;
    service: Service<O>;
}

export class Method<O extends string> {
    constructor(private data: MethodData<O>) {}

    public create() {
        const rest = this.getRestAnnotation();

        if (!rest) {
            return;
        }

        const method = this.getMethod();

        method.path = rest.path;
        method.request = rest.request;

        this.parseReturns(method);
        this.parseInputData(method);
    }

    private parseReturns(method: types.Method<O>) {
        const returns = Type.create({
            entity: this.data.entity.Returns,
            map: this.data.map,
            introspector: this.data.introspector,
            service: this.data.service,
        });

        method.response[returns.name] = returns;

        if ("ApiOperation" in this.data.entity.Annotations) {
            const anotherReturn = Type.create({
                entity: this.data.entity.Annotations.ApiOperation.Items.response.Type,
                introspector: this.data.introspector,
                map: this.data.map,
                service: this.data.service,
            });

            const isVoid = anotherReturn.kind === types.TypeKind.Void;
            const hasInGenerics = _.some(returns.generics, (g) => g.name === anotherReturn.name);

            if (returns.name !== anotherReturn.name && !isVoid && !hasInGenerics) {
                method.response[anotherReturn.name] = anotherReturn;
            }
        }
    }

    private parseInputData(method: types.Method<O>) {
        const hasParamsInPath = /[{}]/gm;

        if (!hasParamsInPath.test(method.path)) {
            return;
        }

        const methodName = method.name[0].toUpperCase() + method.name.slice(1);

        const query = this.createQueryInterface(methodName);
        const params = this.createParamsInterface(methodName);

        const paramsInPath = this.getParamsFromStringPath(method);
        this.extractData(method, query, paramsInPath, params);

        this.fillQuerySource(query, method);
        this.fillParamsSource(params, method);
    }

    private fillQuerySource(query: types.Interface<O>, method: types.Method<O>) {
        if (!_.isEmpty(query.fields)) {
            const source: types.Source<O> = {
                shape: query,
                usedIn: [],
                origin: this.data.controller.origin,
            };

            method.controller.interplay[source.shape.name] = source;

            method.query = {
                generics: {},
                comment: "",
                isDuplicate: false,
                kind: types.TypeKind.Entity,
                origin: this.data.controller.origin,
                name: source.shape.name,
            };

            source.usedIn.push(method.query);
        }
    }

    private fillParamsSource(params: types.Interface<O>, method: types.Method<O>) {
        if (!_.isEmpty(params.fields)) {
            const source: types.Source<O> = {
                origin: this.data.controller.origin,
                shape: params,
                usedIn: [],
            };

            method.controller.interplay[source.shape.name] = source;

            method.params = {
                isDuplicate: false,
                kind: types.TypeKind.Entity,
                origin: this.data.controller.origin,
                generics: {},
                comment: "",
                name: source.shape.name,
            };

            source.usedIn.push(method.query);
        }
    }

    private extractData(
        method: types.Method<O>,
        query: types.Interface<O>,
        paramsInPath: string[],
        params: types.Interface<O>,
    ) {
        let currentParam = 0;

        _.forEach(this.data.entity.Arguments, (a) => {
            const type = Type.create({
                entity: a.Type,
                map: this.data.map,
                introspector: this.data.introspector,
                service: this.data.service,
            });
            let field: types.Field<O> | null = null;

            if ("RequestBody" in a.Annotations) {
                method.payload[type.name] = type;
            } else if ("RequestParam" in a.Annotations) {
                const fieldName = a.Annotations.RequestParam.Items.value.Content || a.Name;
                field = { name: fieldName, type, isDuplicate: false, comment: "" };
                query.fields[field.name] = field;
            } else if ("PathVariable" in a.Annotations) {
                let pathName: string = a.Annotations.PathVariable.Items.value.Content || a.Name;

                if (pathName.match(/arg\d+/)) {
                    pathName = paramsInPath[currentParam];
                }

                field = { name: pathName, type, isDuplicate: false, comment: "" };
                params.fields[field.name] = field;
                currentParam++;
            }

            if (field) {
                field.comment = Comment.create({ entity: a, annotations: a.Annotations });
            }
        });

        this.extractDirectlyFromPath(paramsInPath, params);
    }

    private extractDirectlyFromPath(paramsInPath: string[], params: types.Interface<O>) {
        paramsInPath.forEach((p) => {
            let field = _.find(params.fields, (f) => f.name === p);

            if (!field) {
                const type: types.Type<O> = {
                    name: "string",
                    comment: "",
                    generics: {},
                    isDuplicate: false,

                    kind: types.TypeKind.String,
                    origin: this.data.controller.origin,
                };

                field = { name: p, isDuplicate: false, type, comment: "" };
                params.fields[field.name] = field;
            }
        });
    }

    private getParamsFromStringPath(method: types.Method<O>) {
        let result: string[] = [];
        const params = method.path.match(/\{(\w+)\}/g);

        if (params) {
            result = params.map((a) => a.replace(/[{}]/g, ""));
        }

        return result;
    }

    private createQueryInterface(methodName: string) {
        const query: types.Interface<O> = {
            name: `${methodName}Query`,
            comment: "",
            extends: {},
            fields: {},
            isDuplicate: false,
            variables: {},
            kind: "Interface",
        };

        return query;
    }

    private createParamsInterface(methodName: string) {
        const params: types.Interface<O> = {
            name: `${methodName}Params`,
            comment: "",
            extends: {},
            fields: {},
            isDuplicate: false,
            variables: {},
            kind: "Interface",
        };

        return params;
    }

    private getMethod() {
        const name = this.data.entity.Name;

        if (!this.data.controller.methods[name]) {
            const comment = Comment.create({ entity: this.data.entity, annotations: this.data.entity.Annotations });

            const params: types.Type<O> = {
                name: "void",
                comment: "",
                generics: {},
                kind: types.TypeKind.Void,
                origin: this.data.controller.origin,
                isDuplicate: false,
            };

            const query: types.Type<O> = {
                name: "void",
                comment: "",
                generics: {},
                kind: types.TypeKind.Void,
                origin: this.data.controller.origin,
                isDuplicate: false,
            };

            this.data.controller.methods[name] = {
                name,
                params,
                query,
                comment,
                controller: this.data.controller,
                request: "get",
                isDuplicate: false,
                path: "",
                response: {},
                payload: {},
            };
        }

        return this.data.controller.methods[name];
    }

    private getRestAnnotation(): types.Rest | null {
        let restPath = "";
        let request: types.RequestMethods | null = null;

        if ("RequestMapping" in this.data.entity.Annotations) {
            restPath = this.data.entity.Annotations.RequestMapping.Items.value.Content[0];
            request = _.lowerCase(this.data.entity.Annotations.RequestMapping.Items.method.Content[0]) as any;

            if (!request) {
                request = "get";
            }
        }

        if ("GetMapping" in this.data.entity.Annotations) {
            restPath = this.data.entity.Annotations.GetMapping.Items.value.Content[0];
            request = "get";
        }

        if ("PostMapping" in this.data.entity.Annotations) {
            restPath = this.data.entity.Annotations.PostMapping.Items.value.Content[0];
            request = "post";
        }

        if ("PutMapping" in this.data.entity.Annotations) {
            restPath = this.data.entity.Annotations.PutMapping.Items.value.Content[0];
            request = "put";
        }

        if ("DeleteMapping" in this.data.entity.Annotations) {
            restPath = this.data.entity.Annotations.DeleteMapping.Items.value.Content[0];
            request = "delete";
        }

        if (!request) {
            return null;
        }

        let path = `${this.data.controller.base}/${restPath || ""}`;
        path = path.replace("//", "/");

        return {
            path,
            request,
        };
    }
}
