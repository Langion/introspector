import * as _ from "lodash";
import { UnificationStrategy } from "./UnificationStrategy";

export class OnlyOriginStrategy<O extends string> extends UnificationStrategy<O> {
    public process() {
        this.unify();
        this.handleSourceWithEqualName();
    }

    private unify() {
        _.forEach(this.introspections, (introspections) =>
            _.forEach(introspections, (introspection) => {
                if (!this.unified[introspection.origin] || introspection.origin === introspection.addedFrom) {
                    this.unified[introspection.origin] = introspection;
                }
            }),
        );
    }

    private handleSourceWithEqualName() {
        _.forEach(this.unified, (introspection) => {
            const byName = _.groupBy(introspection.sources, (s) => s.shape.name);

            _.forEach(byName, (g) => {
                if (g.length <= 1) {
                    return;
                }

                g.forEach((s, i) => {
                    if (i > 0) {
                        const postfix = i + 1;
                        s.shape.name = `${s.shape.name}_${postfix}`;
                    }
                });
            });
        });
    }
}
