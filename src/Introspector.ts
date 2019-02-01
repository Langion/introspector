import { AdapterInvoker } from "./core/AdapterInvoker";
import { OriginService } from "./core/OriginService";
import { Comparator, Unificator } from "./core/Unificator";
import * as types from "./typings";

export class Introspector<O extends string> {
    public static async build<O extends string>(config: types.IntrospectorConfig<O>) {
        const introspector = new Introspector(config);
        const result = await introspector.introspect();
        return result;
    }

    public comparator = new Comparator<O>();
    public adapters = new AdapterInvoker<O>(this.config.adapters);

    private constructor(public config: types.IntrospectorConfig<O>) {}

    private async introspect() {
        const parsers = this.config.origins.map((o) => this.parseOrigin(o));
        const introspections = await Promise.all(parsers);

        const unified = this.unify(introspections);
        return unified;
    }

    private unify(introspections: Array<Record<O, types.Introspection<O>>>) {
        const unificator = new Unificator(introspections, this.comparator, this.config.unification);
        const unified = unificator.unify();
        return unified;
    }

    private async parseOrigin(origin: types.Origin<O>) {
        const service: OriginService<O> = new OriginService(origin, this);
        const introspection = await service.parse();
        return introspection;
    }
}
