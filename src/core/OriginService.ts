import * as langion from "@langion/langion";
import * as _ from "lodash";
import { Introspector } from "../Introspector";
import * as types from "../typings";
import { Entry } from "./shapes/Entry";

export class OriginService<O extends string> {
    private processedEntities: Array<types.ProcessedEntity<O>> = [];
    private paths: Record<string, langion.Entity> = {};
    private introspections = {} as Record<O, types.Introspection<O>>;

    constructor(public origin: types.Origin<O>, public introspector: Introspector<O>) {}

    public async parse() {
        const langionDescription = await this.origin.getLangion();

        this.fillPaths(langionDescription.Modules);
        const entryPoints = this.getEntryPoints(langionDescription);
        entryPoints.forEach((e) => this.parseEntryPoint(e));

        return this.introspections;
    }

    public elicit(path: string): types.Introspection<O> {
        const origin = this.introspector.config.getOriginFromModuleName(path);
        const introspection = this.getIntrospection(origin);
        return introspection;
    }

    public getEntity(path: string) {
        const entity = this.paths[path];
        return entity;
    }

    public startParsing(entity: langion.Entity, source: types.Source<O>) {
        const parsed = _.find(this.processedEntities, (e) => e.entity === entity);

        if (!parsed) {
            this.processedEntities.push({ entity, source });
        }

        return parsed;
    }

    private getIntrospection(origin: O) {
        if (!this.introspections[origin]) {
            this.introspections[origin] = { origin, controllers: [], sources: [] };
        }

        return this.introspections[origin];
    }

    private fillPaths(packages: { [key: string]: langion.ModuleEntity }) {
        _.values(packages).forEach((p) => {
            _.values(p.Exports).forEach((e) => (this.paths[e.Path] = e));
            this.fillPaths(p.Modules);
        });
    }

    private getEntryPoints(langionDescription: langion.Langion) {
        let entryPoints = this.introspector.config.adapters.reduce<langion.ClassEntity[]>(
            (e, a) => a.queryEntryPoints(langionDescription, e, this.introspector.config.adapters),
            [],
        );

        entryPoints = _.uniq(entryPoints);
        return entryPoints;
    }

    private parseEntryPoint(entry: langion.ClassEntity) {
        const result = new Entry(entry, this);
        result.parse();
    }
}
