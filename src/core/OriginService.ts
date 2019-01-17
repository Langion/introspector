import * as langion from "@langion/langion";
import * as _ from "lodash";
import { Introspector } from "../Introspector";
import * as types from "../typings";
import { Entry } from "./shapes/Entry";
import { Type } from "./Type";

export class OriginService<O extends string> {
    private processedEntities: Array<types.ProcessedEntity<O>> = [];
    private paths: Record<string, langion.Entity> = {};
    private introspections = {} as Record<O, types.Introspection<O>>;

    constructor(public origin: types.Origin<O>, public introspector: Introspector<O>) {}

    public async parse() {
        const langionDescription = await this.origin.getLangion();

        this.fillPaths(langionDescription.Modules);
        let entryPoints = this.introspector.adapters.queryEntryPoints(langionDescription);
        entryPoints = _.uniq(entryPoints);

        entryPoints.forEach((e) => this.parseEntryPoint(e));

        this.loadAdditionalEntities(langionDescription);

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
            this.introspections[origin] = { origin, addedFrom: this.origin.name, controllers: [], sources: [] };
        }

        return this.introspections[origin];
    }

    private fillPaths(packages: { [key: string]: langion.ModuleEntity }) {
        _.values(packages).forEach((p) => {
            _.values(p.Exports).forEach((e) => (this.paths[e.Path] = e));
            this.fillPaths(p.Modules);
        });
    }

    private parseEntryPoint(entry: langion.ClassEntity) {
        const result = new Entry(entry, this);
        result.parse();
    }

    private loadAdditionalEntities(langionDescription: langion.Langion) {
        const entities = this.introspector.adapters.loadAdditionalData(this.paths, langionDescription);

        entities.forEach((e) => {
            const type = new Type(
                {
                    ...e,
                    IsArray: false,
                    IsParameter: false,
                    Generics: {},
                },
                {},
                this,
            );

            type.getType();
        });
    }
}
