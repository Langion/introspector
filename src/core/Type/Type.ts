import * as langion from "@langion/langion";
import * as _ from "lodash";
import { Introspector } from "../../Introspector";
import * as types from "../../typings";
import { Service } from "../Service";
import { Loader } from "./Loader";

export interface TypeProps<O extends string> {
    entity: langion.TypeEntity;
    map: Record<string, langion.GenericEntity>;
    introspector: Introspector<O>;
    service: Service<O>;
}
export class Type<O extends string> {
    public static create<O extends string>(data: TypeProps<O>) {
        const type = new Type(data);
        const result = type.getType();
        return result;
    }

    private constructor(private data: TypeProps<O>) {}

    private getType(): types.Type<O> {
        const introspection = this.data.introspector.elicit(this.data.entity.Path);

        const parameter = this.getParameter();

        if (parameter) {
            return parameter;
        }

        const type = this.extractType(introspection);

        return type;
    }

    private extractType(introspection: types.Introspection<O>) {
        const kind = this.getKind();
        const name = this.data.entity.Name;

        const type: types.Type<O> = {
            name,
            kind,
            comment: "",
            generics: {},
            origin: introspection.origin,
            isDuplicate: false,
        };

        this.extractGenerics(type, introspection);

        const entity = Loader.load({
            type,
            entity: this.data.entity,
            introspector: this.data.introspector,
            map: this.data.map,
            service: this.data.service,
        });

        if (entity && entity.kind === "Enumeration") {
            type.kind = types.TypeKind.Enumeration;
        }

        return type;
    }

    private extractGenerics(type: types.Type<O>, introspection: types.Introspection<O>) {
        let position = 0;

        _.forEach(this.data.entity.Generics, (g) => {
            if (g.IsParameter) {
                if (this.data.map[g.Name]) {
                    const inMap = this.data.map[g.Name];

                    const generic = Type.create({
                        entity: inMap.Type,
                        map: this.data.map,
                        introspector: this.data.introspector,
                        service: this.data.service,
                    });

                    type.generics[position] = { ...generic, position };
                } else {
                    type.generics[position] = {
                        comment: "",
                        generics: {},
                        position,
                        kind: types.TypeKind.TypeParameter,
                        name: g.Name,
                        origin: introspection.origin,
                        isDuplicate: false,
                    };
                }
            } else if (g.Wildcard) {
                type.generics[position] = {
                    comment: "",
                    generics: {},
                    position,
                    kind: types.TypeKind.Object,
                    name: g.Name,
                    origin: introspection.origin,
                    isDuplicate: false,
                };
            } else {
                const generic = Type.create({
                    entity: g.Type,
                    map: this.data.map,
                    introspector: this.data.introspector,
                    service: this.data.service,
                });

                type.generics[position] = { ...generic, position };
            }

            position++;
        });
    }

    private getParameter() {
        if (this.data.entity.IsParameter) {
            const generic = this.data.map[this.data.entity.Name];

            if (!generic) {
                return;
            }

            const type = Type.create({
                entity: generic.Type,
                map: this.data.map,
                introspector: this.data.introspector,
                service: this.data.service,
            });

            return type;
        }

        return null;
    }

    private getKind() {
        if (this.data.entity.Path.match(/boolean/)) {
            return types.TypeKind.Boolean;
        }

        if (this.data.entity.Path.match(/Date/) || this.data.entity.Path.match(/LocalDateTime/)) {
            return types.TypeKind.Date;
        }

        if (
            this.data.entity.IsArray ||
            this.data.entity.Path.match(/java\.util\.List/) ||
            this.data.entity.Path.match(/java\.util\.Collection/) ||
            this.data.entity.Path.match(/java\.util\.Set/)
        ) {
            return types.TypeKind.List;
        }

        if (this.data.entity.Path.match(/java\.util\.Map/)) {
            return types.TypeKind.Map;
        }

        if (this.data.entity.Path.match(/number/)) {
            return types.TypeKind.Number;
        }

        if (this.data.entity.Path.match(/string/) || this.data.entity.Path.match(/char/)) {
            return types.TypeKind.String;
        }

        if (this.data.entity.IsParameter) {
            return types.TypeKind.TypeParameter;
        }

        if (this.data.entity.Name.toLocaleLowerCase() === "void") {
            return types.TypeKind.Void;
        }

        if (
            this.data.entity.Path.match(/java/) ||
            this.data.entity.Path.match(/\$/)
        ) {
            return types.TypeKind.Object;
        }

        return types.TypeKind.Entity;
    }
}
