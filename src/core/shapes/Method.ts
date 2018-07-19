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
    ) {}

    public parse() {
        const rest = this.getRest();

        if (!rest) {
            return;
        }

        const method = this.createMethod(rest);
        this.parseReturns(method);
    }

    private parseReturns(method: types.Method<O>) {
        const returns = this.service.introspector.config.adapters.reduce<langion.TypeEntity[]>(
            (t, a) => a.getMethodReturns(this.entity, t, this.service.introspector.config.adapters),
            [this.entity.Returns],
        );

        const allResponses = returns.map((r) => {
            const typeCreator = new Type(r, this.map, this.service);
            const result = typeCreator.getType();
            return result;
        });

        const responses = _.uniqWith(allResponses, _.isEqual);

        responses.forEach((r) => {
            const isVoid = r.kind === types.TypeKind.Void;
            const hasInGenerics = _.some(r.generics, (g) => g.type.name === r.name);

            if (!isVoid && !hasInGenerics) {
                method.response.push(r);
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

        const name = this.entity.Name;

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

        this.controller.methods.push(method);

        return method;
    }

    private getRest() {
        const rest = this.service.introspector.config.adapters.reduce<types.Rest | null>(
            (b, a) => a.getRest(this.entity, b, this.service.introspector.config.adapters),
            null,
        );

        if (rest) {
            const path = `${this.controller.base}/${rest.path || ""}`;
            rest.path = path.replace("//", "/");
        }

        return rest;
    }
}
