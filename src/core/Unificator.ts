import * as _ from "lodash";
import * as types from "../typings";

export class Unificator<O extends string> {
    private unified = {} as Record<O, types.Introspection<O>>;

    constructor(
        private introspections: Array<Record<O, types.Introspection<O>>>,
        private share?: types.SideOrigin<O>,
    ) {}

    public unify() {
        this.merge();
        this.sort();
        this.dedupe();
        this.extractSharedSources();
        this.handleSourcesWithTheSameNameInAllOrigins();
        this.sort();

        return this.unified;
    }

    private extractSharedSources() {
        if (!this.share) {
            return;
        }

        const share = this.share;

        let sources: Array<types.Source<O>> = [];
        _.forEach(this.unified, (i) => (sources = sources = sources.concat(i.sources)));

        const sourceByName = _.groupBy(sources, (s) => s.shape.name);

        _.forEach(sourceByName, (g) => {
            if (g.length <= 1) {
                return;
            }

            const source = g[0];
            const shape = source.shape;
            const areAllEqual = g.every((s) => _.isEqual(shape, s.shape));

            if (!areAllEqual) {
                g.forEach((s) => (s.shape.isDuplicate = true));
                return;
            }

            if (!this.unified[share.origin]) {
                this.unified[share.origin] = {
                    origin: share.origin,
                    controllers: [],
                    sources: [],
                };
            }

            g.forEach((s) => {
                s.usedIn.forEach((u) => {
                    u.origin = share.origin;
                    source.usedIn.push(u);
                });

                _.pull(this.unified[s.origin].sources, s);
            });

            this.unified[share.origin].sources.push(source);
            source.origin = share.origin;
        });
    }

    private handleSourcesWithTheSameNameInAllOrigins() {
        let allSources: Array<types.Source<O>> = [];
        _.forEach(this.unified, (i) => (allSources = allSources.concat(i.sources)));

        const byName = _.groupBy(allSources, (s) => s.shape.name);

        _.forEach(byName, (g) => {
            if (g.length <= 1) {
                return;
            }

            g.forEach((s) => (s.shape.isDuplicate = true));
        });
    }

    private merge() {
        const allOrigins = this.introspections.reduce<string[]>(
            (introspectionKeys, introspection) => introspectionKeys.concat(Object.keys(introspection)),
            [],
        );

        const keys = _.uniq(allOrigins);
        keys.forEach((k) => this.mergeIntrospection(k as O));
    }

    private sort() {
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

    private mergeIntrospection(key: O) {
        this.introspections.forEach((i) => {
            const introspectionHasOrigin = key in i;

            if (!introspectionHasOrigin) {
                return;
            }

            if (!this.unified[key]) {
                this.unified[key] = {
                    controllers: [],
                    origin: key,
                    sources: [],
                };
            }

            const introspection = i[key];

            introspection.controllers.forEach((c) => this.unified[key].controllers.push(c));
            introspection.sources.forEach((s) => this.unified[key].sources.push(s));
        });
    }

    private dedupe() {
        _.forEach(this.unified, (introspection) => {
            this.handleControllersWithEqualShape(introspection);
            this.handleMethodsWithTheSameName(introspection);
            this.handleSourceWithEqualShape(introspection);
            this.handleSourceWithEqualName(introspection);
            this.handleSourceWithEqualNameInOneOrigin(introspection);
        });
    }

    private handleControllersWithEqualShape(introspection: Record<O, types.Introspection<O>>[O]) {
        const groupedSources = _.groupBy(introspection.controllers, (c) => c.name);

        _.forEach(groupedSources, (g) => {
            if (g.length === 1) {
                return;
            }

            for (let i = 1; i < g.length; i++) {
                const toRemove = g[i];
                _.pull(introspection.controllers, toRemove);
            }
        });
    }

    private handleMethodsWithTheSameName(introspection: Record<O, types.Introspection<O>>[O]) {
        introspection.controllers.forEach((c) => {
            const groupedMethods = _.groupBy(c.methods, (s) => s.name);

            _.forEach(groupedMethods, (g) => {
                if (g.length === 1) {
                    return;
                }

                for (let i = 1; i < g.length; i++) {
                    _.pull(c.methods, g[i]);
                }
            });
        });
    }

    private handleSourceWithEqualShape(introspection: Record<O, types.Introspection<O>>[O]) {
        const groupedSources = _.groupBy(introspection.sources, (s) => JSON.stringify(s.shape));

        _.forEach(groupedSources, (g) => {
            if (g.length === 1) {
                return;
            }

            const source = g[0];

            for (let i = 1; i < g.length; i++) {
                const toRemove = g[i];
                source.usedIn = source.usedIn.concat(toRemove.usedIn);
                _.pull(introspection.sources, toRemove);
            }
        });
    }

    private handleSourceWithEqualName(introspection: Record<O, types.Introspection<O>>[O]) {
        const groupedSourcesByName = _.groupBy(introspection.sources, (s) => s.shape.name);

        _.forEach(groupedSourcesByName, (g) => {
            if (g.length === 1) {
                return;
            }

            g.forEach((source) => {
                if (introspection.origin !== source.addedFrom) {
                    _.pull(introspection.sources, source);
                    source.origin = source.addedFrom;

                    if (!this.unified[introspection.origin]) {
                        this.unified[introspection.origin] = {
                            origin: introspection.origin,
                            controllers: [],
                            sources: [],
                        };
                    }

                    source.origin = introspection.origin;
                    source.usedIn.forEach((u) => (u.origin = introspection.origin));
                    this.unified[introspection.origin].sources.push(source);
                }
            });
        });
    }

    private handleSourceWithEqualNameInOneOrigin(introspection: Record<O, types.Introspection<O>>[O]) {
        const groupedSourcesByName = _.groupBy(introspection.sources, (s) => s.shape.name);

        _.forEach(groupedSourcesByName, (g) => {
            if (g.length === 1) {
                return;
            }

            for (let i = 1; i < g.length; i++) {
                const source = g[i];
                source.shape.name = `${source.shape.name}${i + 1}`;
                source.usedIn.forEach((u) => (u.name = source.shape.name));
            }
        });
    }
}
