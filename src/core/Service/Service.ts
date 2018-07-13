import * as langion from "@langion/langion";
import * as jp from "jsonpath";
import * as _ from "lodash";
import { Introspector } from "../../Introspector";
import * as types from "../../typings";
import { Controller } from "../shapes/Controller";
import { Type } from "../Type";

export interface ServiceData<O extends string> {
    origin: types.Origin<O>;
    introspector: Introspector<O>;
}

export class Service<O extends string> {
    private paths: Record<string, langion.Entity> = {};

    constructor(private data: ServiceData<O>) {}

    public create() {
        const langionJson = this.data.origin.getLangion();
        this.fillPaths(langionJson.Modules);
        const controllers = this.queryRestControllers(langionJson);
        controllers.forEach((c) => this.parseController(c));
        this.loadAllEnums();
        this.loadAllDto(langionJson);
    }

    public getEntity(path: string) {
        const entity = this.paths[path];
        return entity;
    }

    public getOrigin() {
        return this.data.origin.name;
    }

    private parseController(entity: langion.ClassEntity) {
        const controller = new Controller({ entity, introspector: this.data.introspector, service: this });
        controller.create();
    }

    private loadAllEnums() {
        Object.keys(this.paths).forEach((key) => {
            const entity = this.paths[key];

            if (entity.Kind === langion.Kind.Enum) {
                Type.create({
                    entity: {
                        ...entity,
                        IsArray: false,
                        IsParameter: false,
                        Generics: {},
                    },
                    introspector: this.data.introspector,
                    map: {},
                    service: this,
                });
            }
        });
    }

    private loadAllDto(langionData: langion.Langion) {
        const origin = this.data.origin.name.toLowerCase();
        const modules: langion.ModuleEntity[] = jp.query(langionData, `$..Modules["${origin}"]["Modules"]["dto"]`);

        modules.forEach((m) =>
            _.forEach(m.Exports, (e) => {
                const entity = this.paths[e.Path];

                Type.create({
                    entity: {
                        ...entity,
                        IsArray: false,
                        IsParameter: false,
                        Generics: {},
                    },
                    introspector: this.data.introspector,
                    map: {},
                    service: this,
                });
            }),
        );
    }

    private queryRestControllers(langionData: langion.Langion): langion.ClassEntity[] {
        const query = "$..Exports[?(@.Annotations.RestController != null || @.Annotations.Controller != null)]";
        const controllers: langion.ClassEntity[] = jp.query(langionData, query) as any;
        return controllers;
    }

    private fillPaths(packages: { [key: string]: langion.ModuleEntity }) {
        _.values(packages).forEach((p) => {
            _.values(p.Exports).forEach((e) => (this.paths[e.Path] = e));
            this.fillPaths(p.Modules);
        });
    }
}
