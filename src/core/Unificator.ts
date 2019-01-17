import * as _ from "lodash";
import * as types from "../typings";
import {Comparator} from "./Comparator";

export class Unificator<O extends string> {
    private unified = {} as Record<O, types.Introspection<O>>;

    constructor(
        private introspections: Array<Record<O, types.Introspection<O>>>,
        private comparator: Comparator<O>,
        private unification?: types.UnificationStrategy,
    ) {}

    public unify() {
        this.sort();
        this.startUnification();
        this.handleSourcesIfTheyDeletedFromAnotherOrigin();
        this.addOrigins();

        return this.unified;
    }

    private startUnification() {
        switch (this.unification) {
            case "Postfix":
                this.processPostfixStrategy();
                break;
            case "OnlyOrigin":
            default:
                this.processOnlyOriginStrategy();
        }
    }

    private processOnlyOriginStrategy() {
        _.forEach(this.introspections, (introspections) =>
            _.forEach(introspections, (introspection) => {
                if (!this.unified[introspection.origin] || introspection.origin === introspection.addedFrom) {
                    this.unified[introspection.origin] = introspection;
                }
            }),
        );
    }

    private processPostfixStrategy() {
        this.merge();
        this.sort();
        this.dedupe();
        this.handleSourcesWithTheSameNameInAllOrigins();
    }

    private addOrigins() {
        let allSources: Array<types.Source<O>> = [];
        _.forEach(this.unified, (i) => (allSources = allSources = allSources.concat(i.sources)));

        allSources.forEach((s) => {
            if (s.origin === s.addedFrom) {
                return;
            }

            const comment = `@Origin ${s.origin}`;

            if (s.shape.comment) {
                if (s.shape.comment.indexOf(comment) < 0) {
                    s.shape.comment += `\n${comment}`;
                }
            } else {
                s.shape.comment = comment;
            }
        });
    }

    private handleSourcesIfTheyDeletedFromAnotherOrigin() {
        const hash = {} as Record<O, Record<string, types.Source<O>>>;

        _.forEach(this.unified, (i) => {
            if (!hash[i.origin]) {
                hash[i.origin] = {};
            }

            i.sources.forEach((s) => (hash[i.origin][s.shape.name] = s));
        });

        const processSource = (s: types.Source<O>, addedFrom?: O) => {
            if (s.shape.kind !== "Interface") {
                return;
            }

            const addedFromOrigin = addedFrom || s.addedFrom;
            s.shape.fields.forEach((f) => processType(f.type, addedFromOrigin));
            s.shape.extends.forEach((e) => processType(e, addedFromOrigin));
        };

        const processType = (type: types.Type<O>, addedFrom: O) => {
            type.generics.forEach((g) => processType(g.type, addedFrom));

            if (
                hash[type.origin][type.name] ||
                type.kind === types.TypeKind.Boolean ||
                type.kind === types.TypeKind.Date ||
                type.kind === types.TypeKind.Number ||
                type.kind === types.TypeKind.String ||
                type.kind === types.TypeKind.TypeParameter ||
                type.kind === types.TypeKind.Void
            ) {
                return;
            }

            _.forEach(this.introspections, (introspections) =>
                _.forEach(introspections, (introspection) => {
                    if (introspection.addedFrom === addedFrom && introspection.origin === type.origin) {
                        const sourceThatWasDeleted = introspection.sources.find((s) => s.shape.name === type.name);

                        if (sourceThatWasDeleted) {
                            this.unified[type.origin].sources.push(sourceThatWasDeleted);
                            hash[type.origin][type.name] = sourceThatWasDeleted;
                            processSource(sourceThatWasDeleted, addedFrom);
                        }
                    }
                }),
            );
        };

        _.forEach(this.unified, (i) => {
            i.sources.forEach((s) => processSource(s));
            i.controllers.forEach((c) => {
                c.interplay.forEach((int) => processSource(int, c.addedFrom));

                c.methods.forEach((m) => {
                    processType(m.params, c.addedFrom);
                    processType(m.query, c.addedFrom);
                    m.payload.forEach((p) => processType(p, c.addedFrom));
                    m.response.forEach((p) => processType(p, c.addedFrom));
                });
            });
        });
    }

    private handleSourcesWithTheSameNameInAllOrigins() {
        let allSources: Array<types.Source<O>> = [];
        _.forEach(this.unified, (i) => (allSources = allSources = allSources.concat(i.sources)));
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
                const sortedGroup = _.map(methods, (v, name) => ({name, methods: _.sortBy(v, (m) => m.path)}));
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
                    addedFrom: key,
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
        let allSources: Array<types.Source<O>> = [];
        _.forEach(this.unified, (i) => (allSources = allSources = allSources.concat(i.sources)));
        const groupedSources = _.groupBy(introspection.sources, (s) => s.shape.name);

        _.forEach(groupedSources, (g) => {
            if (g.length === 1) {
                return;
            }

            const removed: Array<types.Source<O>> = [];

            for (const a of g) {
                for (const b of g) {
                    if (a !== b) {
                        const compare = this.comparator.isEqual(a, b, allSources);

                        if (compare.isEqual) {
                            const shouldRemoveB = compare.a.addedFrom === introspection.origin;
                            const toRemove = shouldRemoveB ? compare.b : compare.a;
                            const toStay = toRemove === compare.b ? compare.a : compare.b;

                            const isAlreadyRemoved = removed.some((r) => r === toRemove);

                            if (!isAlreadyRemoved) {
                                toStay.usedIn = toStay.usedIn.concat(toRemove.usedIn);
                                _.pull(introspection.sources, toRemove);
                                removed.push(toRemove);
                            }
                        }
                    }
                }
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
                            addedFrom: introspection.origin,
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

            g.sort((s) => (s.addedFrom === introspection.origin ? 0 : 1));

            g.forEach((s) => {
                s.shape.name = s.addedFrom === introspection.origin ? s.shape.name : `${s.shape.name}__${s.addedFrom}`;

                s.usedIn.forEach((u) => (u.name = s.shape.name));

                const comment = `@From ${s.addedFrom}`;

                if (s.shape.comment) {
                    s.shape.comment += `\n${comment}`;
                } else {
                    s.shape.comment = comment;
                }
            });
        });
    }
}
