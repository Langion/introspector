import * as _ from "lodash";
import * as types from "../../typings";
import { UnificationStrategy } from "./UnificationStrategy";

export class PostfixStrategy<O extends string> extends UnificationStrategy<O> {
    public process() {
        this.merge();
        this.sort();
        this.dedupe();
    }

    private merge() {
        const allOrigins = this.introspections.reduce<string[]>(
            (introspectionKeys, introspection) =>
                introspectionKeys.concat(Object.keys(introspection)),
            [],
        );

        const keys = _.uniq(allOrigins);
        keys.forEach((k) => this.mergeIntrospection(k as O));
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

            introspection.controllers.forEach((c) =>
                this.unified[key].controllers.push(c),
            );
            introspection.sources.forEach((s) =>
                this.unified[key].sources.push(s),
            );
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

    private handleControllersWithEqualShape(
        introspection: Record<O, types.Introspection<O>>[O],
    ) {
        const groupedSources = _.groupBy(
            introspection.controllers,
            (c) => c.name,
        );

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

    private handleMethodsWithTheSameName(
        introspection: Record<O, types.Introspection<O>>[O],
    ) {
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

    private handleSourceWithEqualShape(
        introspection: Record<O, types.Introspection<O>>[O],
    ) {
        let allSources: Array<types.Source<O>> = [];
        _.forEach(
            this.unified,
            (i) => (allSources = allSources = allSources.concat(i.sources)),
        );
        const groupedSources = _.groupBy(
            introspection.sources,
            (s) => s.shape.name,
        );

        _.forEach(groupedSources, (g) => {
            if (g.length === 1) {
                return;
            }

            const removed: Array<types.Source<O>> = [];

            for (const a of g) {
                for (const b of g) {
                    if (a !== b) {
                        const compare = this.comparator.isEqual(
                            a,
                            b,
                            allSources,
                        );

                        if (compare.isEqual) {
                            const shouldRemoveB =
                                compare.a.addedFrom === introspection.origin;
                            const toRemove = shouldRemoveB
                                ? compare.b
                                : compare.a;
                            const toStay =
                                toRemove === compare.b ? compare.a : compare.b;

                            const isAlreadyRemoved = removed.some(
                                (r) => r === toRemove,
                            );

                            if (!isAlreadyRemoved) {
                                toStay.usedIn = toStay.usedIn.concat(
                                    toRemove.usedIn,
                                );
                                _.pull(introspection.sources, toRemove);
                                removed.push(toRemove);
                            }
                        }
                    }
                }
            }
        });
    }

    private handleSourceWithEqualName(
        introspection: Record<O, types.Introspection<O>>[O],
    ) {
        const groupedSourcesByName = _.groupBy(
            introspection.sources,
            (s) => s.shape.name,
        );

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
                    source.usedIn.forEach(
                        (u) => (u.origin = introspection.origin),
                    );
                    this.unified[introspection.origin].sources.push(source);
                }
            });
        });
    }

    private handleSourceWithEqualNameInOneOrigin(
        introspection: Record<O, types.Introspection<O>>[O],
    ) {
        const groupedSourcesByName = _.groupBy(
            introspection.sources,
            (s) => s.shape.name,
        );

        _.forEach(groupedSourcesByName, (g) => {
            if (g.length === 1) {
                return;
            }

            g.sort((s) => (s.addedFrom === introspection.origin ? 0 : 1));

            g.forEach((s) => {
                s.shape.name =
                    s.addedFrom === introspection.origin
                        ? s.shape.name
                        : `${s.shape.name}__${s.addedFrom}`;

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
