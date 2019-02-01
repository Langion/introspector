import * as _ from "lodash";
import * as types from "../../typings";
import { Comparator } from "../Comparator";

export abstract class UnificationStrategy<O extends string> {
    constructor(
        protected unified = {} as Record<O, types.Introspection<O>>,
        protected introspections: Array<Record<O, types.Introspection<O>>>,
        protected comparator: Comparator<O>,
    ) {}

    public abstract process(): void;

    public sort() {
        _.forEach(this.unified, (i) => {
            i.controllers = _.sortBy(i.controllers, (c) => {
                const methods = _.groupBy(c.methods, (m) => m.name);
                const sortedGroup = _.map(methods, (v, name) => ({ name, methods: _.sortBy(v, (m) => m.path) }));
                const sorted = _.sortBy(sortedGroup, (m) => m.name);

                c.methods = sorted.reduce<Array<types.Method<O>>>((all, m) => all.concat(m.methods), []);
                c.interplay = _.sortBy(c.interplay, (m) => m.shape.name);

                return c.name;
            });

            i.sources = _.sortBy(i.sources, (s) => {
                if (s.shape.kind === "Enumeration") {
                    s.shape.values = _.sortBy(s.shape.values, (v) => v.key);
                } else {
                    s.shape.fields = _.sortBy(s.shape.fields, (f) => f.name);
                }

                return s.shape.name;
            });
        });
    }
}
