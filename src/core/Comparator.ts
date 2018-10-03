import * as _ from "lodash";
import * as types from "../typings";

interface Proceeded<O extends string> {
    a: types.Source<O>;
    b: types.Source<O>;
    isEqual: boolean;
}

export class Comparator<O extends string> {
    private processed: Array<Proceeded<O>> = [];

    public isEqual(a: types.Source<O>, b: types.Source<O>, sources: Array<types.Source<O>>): Proceeded<O> {
        let result = this.processed.find((p) => (p.a === a && p.b === b) || (p.a === b && p.b === a));

        if (result) {
            return result;
        }

        result = { a, b, isEqual: _.isEqual(a.shape, b.shape) };

        this.processed.push(result);

        if (!result.isEqual) {
            return result;
        }

        if (a.shape.kind === "Interface" && b.shape.kind === "Interface") {
            const bFields = _.keyBy(b.shape.fields, (f) => f.name);

            const areFieldsEqual = a.shape.fields.every((af) => {
                const bf = bFields[af.name];

                if (!bf) {
                    return false;
                }

                const areFieldTypesEqual = this.compareTypes(af.type, a.addedFrom, bf.type, b.addedFrom, sources);

                return areFieldTypesEqual;
            });

            if (!areFieldsEqual) {
                result.isEqual = false;
            } else {
                const byParent = _.keyBy(b.shape.extends, (f) => f.name);

                const areParentsEqual = a.shape.extends.every((e) => {
                    const parentFromB = byParent[e.name];

                    if (!parentFromB) {
                        return false;
                    }

                    const first = _.find(sources, (p) => p.origin === e.origin);
                    const second = _.find(sources, (p) => p.origin === parentFromB.origin);

                    if (first && second) {
                        const areParentTypesEqual = this.isEqual(first, second, sources);

                        if (!areParentTypesEqual) {
                            return false;
                        }
                    } else {
                        return false;
                    }

                    return true;
                });

                if (!areParentsEqual) {
                    result.isEqual = false;
                }
            }
        }

        return result;
    }

    private compareTypes(
        a: types.Type<O>,
        aAddedFrom: O,
        b: types.Type<O>,
        bAddedFrom: O,
        sources: Array<types.Source<O>>,
    ) {
        const baseCompare = _.isEqual(a, b);

        if (!baseCompare) {
            return false;
        }

        const sourcesByName = sources.filter((s) => s.shape.name === a.name);

        if (!sourcesByName.length) {
            const comparedAsPrimitives = baseCompare;
            return comparedAsPrimitives;
        }

        const aSource = _.find(sourcesByName, (p) => p.addedFrom === aAddedFrom && p.origin === a.origin);
        const bSource = _.find(sourcesByName, (p) => p.addedFrom === bAddedFrom && p.origin === b.origin);

        if (!aSource || !bSource) {
            return false;
        }

        const areShapesEqual = this.isEqual(aSource, bSource, sourcesByName);
        const areGenericsEqual = a.generics.every((ag, i) =>
            this.compareTypes(ag.type, aAddedFrom, b.generics[i].type, bAddedFrom, sourcesByName),
        );

        const result = areShapesEqual.isEqual && areGenericsEqual;
        return result;
    }
}
