import * as langion from "@langion/langion";
import * as _ from "lodash";
import * as types from "../../typings";
import { Comment } from "./Comment";

export interface EnumerationData<O extends string> {
    entity: langion.EnumEntity;
    introspection: types.Introspection<O>;
    usedIn: types.Type<O>;
}

export class Enumeration<O extends string> {
    constructor(private data: EnumerationData<O>) {}

    public create() {
        const name = this.data.entity.Name;

        if (!this.data.introspection.sources[name]) {
            const comment = Comment.create({ entity: this.data.entity });
            const values: Record<string, string> = {};

            _.forEach(this.data.entity.Items, (item) => {
                const num = parseFloat(item);
                const isNumber = !isNaN(num);
                let key = item;

                if (isNumber) {
                    key = `E${item}`;
                }

                values[key] = item;
            });

            const shape: types.Enumeration = {
                name,
                comment,
                kind: "Enumeration",
                values,
                isDuplicate: false,
            };

            this.data.introspection.sources[name] = {
                shape,
                origin: this.data.introspection.origin,
                usedIn: [this.data.usedIn],
            };
        }
    }
}
