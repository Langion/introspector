import * as _ from "lodash";
import { UnificationStrategy } from "./UnificationStrategy";

export class OnlyOriginStrategy<O extends string> extends UnificationStrategy<O> {
    public process() {
        _.forEach(this.introspections, (introspections) =>
            _.forEach(introspections, (introspection) => {
                if (!this.unified[introspection.origin] || introspection.origin === introspection.addedFrom) {
                    this.unified[introspection.origin] = introspection;
                }
            }),
        );
    }
}
