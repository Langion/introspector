import * as types from "../typings";

export class Unificator<O extends string> {
    private unified = {} as Record<O, types.Introspection<O>> ;

    constructor(
        private introspections: Array<Record<O, types.Introspection<O>>>,
        private share?: types.SideOrigin<O>,
    ) {}

    public unify() {
        this.introspections;
        this.share;
        return this.unified;
    }
}
