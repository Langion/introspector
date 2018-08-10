import * as langion from "@langion/langion";
import * as _ from "lodash";
import * as types from "../../typings";
import { OriginService } from "../OriginService";
import { Type } from "../Type";
import { Comment } from "./Comment";

export class Method<O extends string> {
    constructor(
        private entity: langion.MethodEntity,
        private map: Record<string, langion.GenericEntity>,
        private controller: types.Controller<O>,
        private service: OriginService<O>,
        private index: number,
    ) {}

    public parse() {
        const rest = this.service.introspector.adapters.getRest(this.entity);

        if (!rest) {
            return;
        }

        const path = `${this.controller.base}/${rest.path || ""}`;
        rest.path = path.replace("//", "/");

        const method = this.createMethod(rest);

        if (!method) {
            return;
        }

        const result: types.RestMethod<O> = { method };

        this.parseReturns(method);
        this.parseInputData(method, result);

        return result;
    }

    private parseReturns(method: types.Method<O>) {
        const returns = this.service.introspector.adapters.getMethodReturns(this.entity, [this.entity.Returns]);

        const allResponses = returns.map((r) => {
            const typeCreator = new Type(r, this.map, this.service);
            const result = typeCreator.getType();
            return result;
        });

        const responses = _.uniqWith(allResponses, _.isEqual);

        responses.forEach((r) => {
            const isVoid = r.kind === types.TypeKind.Void;

            if (!isVoid) {
                method.response.push(r);
            }
        });
    }

    private parseInputData(method: types.Method<O>, result: types.RestMethod<O>) {
        const methodName = method.name[0].toUpperCase() + method.name.slice(1);

        const query: types.Interface<O> = {
            name: `${methodName}Query`,
            comment: "",
            extends: [],
            fields: [],
            isDuplicate: false,
            variables: [],
            kind: "Interface",
        };

        const params: types.Interface<O> = {
            name: `${methodName}Params`,
            comment: "",
            extends: [],
            fields: [],
            isDuplicate: false,
            variables: [],
            kind: "Interface",
        };

        const paramsInPath = this.service.introspector.adapters.getParamsFromStringPath(method);
        this.extractData(method, query, paramsInPath, params);

        result.query = this.fillQuerySource(query, method);
        result.params = this.fillParamsSource(params, method);

        const hasParamsInPath = this.service.introspector.adapters.hasParamsInPath(method);
        const hasParamsNotInPath = !hasParamsInPath && params.fields.length > 0;

        if (hasParamsNotInPath) {
            const onlyOneParam = params.fields[0];
            method.path = `${method.path}/{${onlyOneParam.name}}`;
        }

        method.path = method.path.replace(/\/\//, "/");
    }

    private fillQuerySource(query: types.Interface<O>, method: types.Method<O>) {
        if (!_.isEmpty(query.fields)) {
            const source: types.Source<O> = {
                shape: query,
                usedIn: [],
                origin: this.controller.origin,
                addedFrom: this.controller.origin,
            };

            method.query = {
                generics: [],
                comment: "",
                isDuplicate: false,
                kind: types.TypeKind.Entity,
                origin: this.controller.origin,
                name: source.shape.name,
            };

            source.usedIn.push(method.query);

            return source;
        }

        return;
    }

    private fillParamsSource(params: types.Interface<O>, method: types.Method<O>) {
        if (!_.isEmpty(params.fields)) {
            const source: types.Source<O> = {
                origin: this.controller.origin,
                addedFrom: this.controller.origin,
                shape: params,
                usedIn: [],
            };

            method.params = {
                isDuplicate: false,
                kind: types.TypeKind.Entity,
                origin: this.controller.origin,
                generics: [],
                comment: "",
                name: source.shape.name,
            };

            source.usedIn.push(method.params);

            return source;
        }

        return;
    }

    private extractData(
        method: types.Method<O>,
        query: types.Interface<O>,
        paramsInPath: string[],
        params: types.Interface<O>,
    ) {
        let currentParam = 0;

        _.forEach(this.entity.Arguments, (a) => {
            const typeCreator = new Type(a.Type, this.map, this.service);
            const type = typeCreator.getType();
            const commentCreator = new Comment(this.service, a);
            const comment = commentCreator.parse() || "";

            const methodPayload = this.service.introspector.adapters.getMethodPayload(a, type);
            method.payload = method.payload.concat(methodPayload);

            const methodQuery = this.service.introspector.adapters.getQueryFields(a, type, comment);
            query.fields = query.fields.concat(methodQuery);

            const methodParams = this.service.introspector.adapters.getParamsFields(
                a,
                type,
                comment,
                paramsInPath,
                currentParam,
            );

            if (methodParams.length) {
                params.fields = params.fields.concat(methodParams);
                currentParam++;
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
                    generics: [],
                    isDuplicate: false,

                    kind: types.TypeKind.String,
                    origin: this.controller.origin,
                };

                field = { name: p, isDuplicate: false, isRequired: true, type, comment: "" };
                params.fields.push(field);
            }
        });
    }

    private createMethod(rest: types.Rest) {
        const params: types.Type<O> = {
            name: "void",
            comment: "",
            generics: [],
            kind: types.TypeKind.Void,
            origin: this.controller.origin,
            isDuplicate: false,
        };

        const query: types.Type<O> = {
            name: "void",
            comment: "",
            generics: [],
            kind: types.TypeKind.Void,
            origin: this.controller.origin,
            isDuplicate: false,
        };

        const hasOverloading = this.index > 1;

        const name = hasOverloading ? `${this.entity.Name}${this.index}` : this.entity.Name;

        const commentParser = new Comment(this.service, this.entity);
        const comment = commentParser.parse();

        const method: types.Method<O> = {
            name,
            params,
            query,
            comment,
            request: rest.request,
            path: rest.path,
            controller: this.controller,
            isDuplicate: false,
            response: [],
            payload: [],
        };

        return method;
    }
}
