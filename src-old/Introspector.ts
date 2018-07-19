import * as langion from "@langion/langion";
import { Merger } from "./core/Merger";
import { Service } from "./core/Service";
import * as types from "./typings";

export class Introspector<O extends string> {
    public static build<O extends string>(config: types.IntrospectorConfig<O>) {
        const introspector = new Introspector(config);
        const result = introspector.build();
        return result;
    }

    public processedEntities: langion.Entity[] = [];
    private introspections = {} as Record<O, types.Introspection<O>>;

    private constructor(public config: types.IntrospectorConfig<O>) {}

    public elicit(path: string): types.Introspection<O> {
        const origin = this.config.getOriginFromModuleName(path);
        const introspection = this.getIntrospection(origin);
        return introspection;
    }

    public getIntrospection(origin: O) {
        if (!this.introspections[origin]) {
            this.introspections[origin] = { origin, controllers: {}, sources: {} };
        }

        return this.introspections[origin];
    }

    private build() {
        this.config.origins.forEach((o) => this.parseOrigin(o));

        this.merge();

        return this.introspections;
    }

    private merge() {
        if (!this.config.share) {
            return;
        }

        const merger = new Merger(this.introspections, this.config);
        this.introspections = merger.make();
    }

    private parseOrigin(origin: types.Origin<O>) {
        const service = new Service({ origin, introspector: this });
        service.create();
    }
}
