import * as langion from "@langion/langion";
import * as _ from "lodash";
import { Introspector } from "../../Introspector";
import * as types from "../../typings";
import { Service } from "../Service";
import { Source } from "../shapes/Source";

export interface LoaderProps<O extends string> {
    type: types.Type<O>;
    entity: langion.TypeEntity;
    introspector: Introspector<O>;
    service: Service<O>;
    map: Record<string, langion.GenericEntity>;
}

export class Loader<O extends string> {
    public static load<O extends string>(data: LoaderProps<O>) {
        const loader = new Loader(data);
        const shape = loader.loadType();
        return shape;
    }

    private constructor(private data: LoaderProps<O>) {}

    private loadType() {
        const conditions = [this.data.type.kind === types.TypeKind.Entity];
        const shouldLoad = conditions.every((c) => c);

        if (!shouldLoad) {
            return;
        }

        const introspection = this.data.introspector.elicit(this.data.entity.Path);

        const name = this.data.type.name;

        const source = new Source({
            type: this.data.entity,
            introspection,
            introspector: this.data.introspector,
            map: this.data.map,
            service: this.data.service,
            usedIn: this.data.type,
        });

        source.create();

        const shape = this.loadInterface(introspection, name);

        return shape;
    }

    private loadInterface(introspection: types.Introspection<O>, name: string) {
        const source = introspection.sources[name];

        if (!source) {
            return;
        }

        const shape = source.shape;

        if (shape.kind === "Interface") {
            const interfazeHasTypeVariables = !_.isEmpty(shape.variables);
            const typeHasNoGenerics = _.isEmpty(this.data.type.generics);

            if (interfazeHasTypeVariables && typeHasNoGenerics) {
                let position = 0;

                _.forEach(
                    shape.variables,
                    (v) =>
                        (this.data.type.generics[++position] = {
                            position,
                            comment: "",
                            generics: {},
                            isDuplicate: false,
                            kind: types.TypeKind.Void,
                            name: v,
                            origin: this.data.type.origin,
                        }),
                );
            }
        }

        return shape;
    }
}
