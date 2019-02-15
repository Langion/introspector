import * as _ from "lodash";
import * as types from "../../typings";
import { Comparator } from "../Comparator";
import { OnlyOriginStrategy } from "./OnlyOriginStrategy";
import { PostfixStrategy } from "./PostfixStrategy";

export class Unificator<O extends string> {
    private unified = {} as Record<O, types.Introspection<O>>;

    constructor(
        private introspections: Array<Record<O, types.Introspection<O>>>,
        private comparator: Comparator<O>,
        private unification?: types.UnificationStrategy,
    ) {}

    public unify() {
        const unification = this.getUnificationStrategy();
        unification.process();

        this.handleSourcesIfTheyDeletedFromAnotherOrigin();
        this.addOrigins();
        this.handleSourcesWithTheSameNameInAllOrigins();

        unification.sort();

        return this.unified;
    }

    private getUnificationStrategy() {
        switch (this.unification) {
            case "Postfix":
                return new PostfixStrategy(
                    this.unified,
                    this.introspections,
                    this.comparator,
                );
            case "OnlyOrigin":
            default:
                return new OnlyOriginStrategy(
                    this.unified,
                    this.introspections,
                    this.comparator,
                );
        }
    }

    private addOrigins() {
        let allSources: Array<types.Source<O>> = [];
        _.forEach(
            this.unified,
            (i) => (allSources = allSources = allSources.concat(i.sources)),
        );

        allSources.forEach((s) => {
            if (s.origin === s.addedFrom) {
                return;
            }

            const comment = `@addedFrom ${s.addedFrom}`;

            if (s.shape.comment) {
                s.shape.comment += `\n${comment}`;
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

        _.forEach(this.unified, (i) => {
            i.sources.forEach((s) => this.processSource(hash, s));
            i.controllers.forEach((c) => {
                c.interplay.forEach((int) =>
                    this.processSource(hash, int, c.addedFrom),
                );

                c.methods.forEach((m) => {
                    this.processType(hash, m.params, c.addedFrom);
                    this.processType(hash, m.query, c.addedFrom);
                    m.payload.forEach((p) =>
                        this.processType(hash, p, c.addedFrom),
                    );
                    m.response.forEach((p) =>
                        this.processType(hash, p, c.addedFrom),
                    );
                });
            });
        });
    }

    private processSource(
        hash: Record<O, Record<string, types.Source<O>>>,
        s: types.Source<O>,
        addedFrom?: O,
    ) {
        if (s.shape.kind !== "Interface") {
            return;
        }

        const addedFromOrigin = addedFrom || s.addedFrom;
        s.shape.fields.forEach((f) =>
            this.processType(hash, f.type, addedFromOrigin),
        );
        s.shape.extends.forEach((e) =>
            this.processType(hash, e, addedFromOrigin),
        );
    }

    private processType(
        hash: Record<O, Record<string, types.Source<O>>>,
        type: types.Type<O>,
        addedFrom: O,
    ) {
        type.generics.forEach((g) => this.processType(hash, g.type, addedFrom));

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
                if (
                    introspection.addedFrom === addedFrom &&
                    introspection.origin === type.origin
                ) {
                    const sourceThatWasDeleted = introspection.sources.find(
                        (s) => s.shape.name === type.name,
                    );

                    if (sourceThatWasDeleted) {
                        this.unified[type.origin].sources.push(
                            sourceThatWasDeleted,
                        );
                        hash[type.origin][type.name] = sourceThatWasDeleted;
                        this.processSource(
                            hash,
                            sourceThatWasDeleted,
                            addedFrom,
                        );
                    }
                }
            }),
        );
    }

    private handleSourcesWithTheSameNameInAllOrigins() {
        let allSources: Array<types.Source<O>> = [];
        _.forEach(
            this.unified,
            (i) => (allSources = allSources = allSources.concat(i.sources)),
        );
        const byName = _.groupBy(allSources, (s) => s.shape.name);

        _.forEach(byName, (g) => {
            if (g.length <= 1) {
                return;
            }

            g.forEach((s) => (s.shape.isDuplicate = true));
        });
    }
}
