import * as langion from "@langion/langion";
import * as jp from "jsonpath";
import * as _ from "lodash";
import { Introspector } from "../../Introspector";
import * as types from "../../typings";
import { Controller } from "../shapes/Controller";

export interface ServiceData<O extends string> {
    origin: types.Origin<O>;
    introspector: Introspector<O>;
}

export class Service<O extends string> {
    private paths: Record<string, langion.Entity> = {};

    constructor(private data: ServiceData<O>) {}

    public create() {
        this.fillPaths(this.data.origin.langion.Modules);
        const controllers = this.queryRestControllers(this.data.origin.langion);
        controllers.forEach((c) => this.parseController(c));
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
