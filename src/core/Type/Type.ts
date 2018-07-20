import * as langion from "@langion/langion";
import * as _ from "lodash";
import * as types from "../../typings";
import { OriginService } from "../OriginService";
import { Loader } from "./Loader";

export class Type<O extends string> {
    constructor(
        private entity: langion.TypeEntity,
        private map: Record<string, langion.GenericEntity>,
        private service: OriginService<O>,
    ) {}

    public getType(): types.Type<O> {
        const introspection = this.service.elicit(this.entity.Path);

        const parameter = this.getParameter();

        if (parameter) {
            return parameter;
        }

        const type = this.extractType(introspection);

        return type;
    }

    private extractType(introspection: types.Introspection<O>) {
        const kind = this.service.introspector.adapters.getKind(this.entity);
        const name = this.entity.Name;

        const type: types.Type<O> = {
            name,
            kind,
            comment: "",
            generics: [],
            origin: introspection.origin,
            isDuplicate: false,
        };

        this.extractGenerics(type, introspection);

        const loader = new Loader(type, this.entity, this.service, this.map);
        const entity = loader.load();

        if (entity && entity.kind === "Enumeration") {
            type.kind = types.TypeKind.Enumeration;
        }

        return type;
    }

    private extractGenerics(type: types.Type<O>, introspection: types.Introspection<O>) {
        let position = 0;

        _.forEach(this.entity.Generics, (g) => {
            if (g.IsParameter) {
                if (this.map[g.Name]) {
                    const inMap = this.map[g.Name];
                    const typeCreator = new Type(inMap.Type, this.map, this.service);
                    const generic = typeCreator.getType();
                    type.generics[position] = { type: generic, position };
                } else {
                    type.generics[position] = {
                        position,
                        type: {
                            comment: "",
                            generics: [],
                            kind: types.TypeKind.TypeParameter,
                            name: g.Name,
                            origin: introspection.origin,
                            isDuplicate: false,
                        },
                    };
                }
            } else if (g.Wildcard) {
                type.generics[position] = {
                    position,
                    type: {
                        comment: "",
                        generics: [],
                        kind: types.TypeKind.Object,
                        name: g.Name,
                        origin: introspection.origin,
                        isDuplicate: false,
                    },
                };
            } else {
                const typeCreator = new Type(g.Type, this.map, this.service);
                const generic = typeCreator.getType();
                type.generics[position] = { type: generic, position };
            }

            position++;
        });
    }

    private getParameter() {
        if (this.entity.IsParameter) {
            const generic = this.map[this.entity.Name];

            if (!generic) {
                return;
            }

            const typeCreator = new Type(generic.Type, this.map, this.service);
            const type = typeCreator.getType();

            return type;
        }

        return null;
    }
}
