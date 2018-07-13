import * as langion from "@langion/langion";
import * as _ from "lodash";
import * as types from "../../typings";
import { Service } from "../Service";
import { Comment } from "./Comment";

export interface EnumerationData<O extends string> {
    entity: langion.EnumEntity;
    introspection: types.Introspection<O>;
    usedIn: types.Type<O>;
    service: Service<O>;
}

export class Enumeration<O extends string> {
    constructor(private data: EnumerationData<O>) {}

    public create() {
        const enumeration = this.getEnumeration();

        _.forEach(this.data.entity.Items, (value, key) => {
            const num = parseFloat(key);
            const isNumber = !isNaN(num);

            if (isNumber) {
                key = `E${value}`;
            }

            enumeration.values[key] = { key, value };
        });
    }

    private getEnumeration() {
        const name = this.data.entity.Name;
        const comment = Comment.create({ entity: this.data.entity });

        const shape: types.Enumeration = {
            name,
            comment,
            kind: "Enumeration",
            values: {},
            isDuplicate: false,
        };

        if (this.data.introspection.sources[shape.name]) {
            this.data.introspection.sources[shape.name].shape.name = name;
            this.data.introspection.sources[shape.name].shape.comment = comment;
            this.data.introspection.sources[shape.name].usedIn.push(this.data.usedIn);
            return this.data.introspection.sources[shape.name].shape as types.Enumeration;
        } else {
            const addedFrom = this.data.service.getOrigin();

            this.data.introspection.sources[shape.name] = {
                shape,
                addedFrom,
                origin: this.data.introspection.origin,
                usedIn: [this.data.usedIn],
            };

            return shape;
        }
    }
}
