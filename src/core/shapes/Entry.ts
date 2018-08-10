import * as langion from "@langion/langion";
import * as _ from "lodash";
import * as types from "../../typings";
import { OriginService } from "../OriginService";
import { Comment } from "./Comment";
import { Method } from "./Method";

export class Entry<O extends string> {
    constructor(private entry: langion.ClassEntity, private service: OriginService<O>) {}

    public parse() {
        const introspection = this.service.elicit(this.entry.Path);

        const controller = this.createController(introspection);
        introspection.controllers.push(controller);

        this.parseController(this.entry, controller, {});
    }

    private parseController(
        entity: langion.ClassEntity | langion.InterfaceEntity,
        controller: types.Controller<O>,
        generics: Record<string, langion.GenericEntity>,
    ) {
        const map = this.getGenericsMap(entity, generics);

        _.forEach(entity.Methods, (m) => this.parseMethod(m, map, controller));

        const parents = this.getParents(entity);
        parents.forEach((p) => this.parseParent(p, controller, generics));
    }

    private parseMethod(
        entities: langion.MethodEntity[],
        map: Record<string, langion.GenericEntity>,
        controller: types.Controller<O>,
    ) {
        entities.forEach((e, i) => {
            const methodParser = new Method(e, map, controller, this.service, i);
            const endpoint = methodParser.parse();

            if (!endpoint) {
                return;
            }

            const hasMethodWithTheSameName = controller.methods.some((m) => m.name === endpoint.method.name);

            if (!hasMethodWithTheSameName) {
                controller.methods.push(endpoint.method);

                if (endpoint.params) {
                    controller.interplay.push(endpoint.params);
                }

                if (endpoint.query) {
                    controller.interplay.push(endpoint.query);
                }
            }
        });
    }

    private parseParent(
        type: langion.TypeEntity,
        controller: types.Controller<O>,
        generics: Record<string, langion.GenericEntity>,
    ) {
        const parent = this.service.getEntity(type.Path) as langion.ClassEntity | langion.InterfaceEntity;
        const sorted = _.sortBy(type.Generics, (g) => g.Position);

        // Когда в качестве дженерика выступает TypeParam, но ему нужно установить новый порядок
        const replaceIfTypeVariableIsGeneric = sorted.map(
            (g) => (generics[g.Name] ? { ...generics[g.Name], Position: g.Position } : g),
        );

        const variables = _.sortBy(parent.Variables, (v) => v.Position).map((v) => v.Name);
        const map: Record<string, langion.GenericEntity> = _.zipObject(variables, replaceIfTypeVariableIsGeneric);
        this.parseController(parent, controller, map);
    }

    private getParents(entity: langion.ClassEntity | langion.InterfaceEntity) {
        const parents: langion.TypeEntity[] = [];

        if (entity.Kind === langion.Kind.Class) {
            const clazz = entity as langion.ClassEntity;

            if (clazz.Extends) {
                parents.push(clazz.Extends);
            }

            _.values(clazz.Implements).forEach((i) => parents.push(i));
        } else if (entity.Kind === langion.Kind.Interface) {
            const interfaze = entity as langion.InterfaceEntity;
            _.values(interfaze.Extends).forEach((i) => parents.push(i));
        }

        return parents;
    }

    private getGenericsMap(
        entity: langion.ClassEntity | langion.InterfaceEntity,
        generics: Record<string, langion.GenericEntity>,
    ) {
        const variables = _.sortBy(entity.Variables, (v) => v.Position).map((v) => v.Name);
        const map: Record<string, langion.GenericEntity> = {};
        _.forEach(generics, (g) => (map[variables[g.Position]] = g.IsParameter ? generics[g.Name] : g));
        return map;
    }

    private createController(introspection: types.Introspection<O>) {
        const base = this.service.introspector.adapters.getBasePath(this.entry);
        const name = this.service.introspector.adapters.getEntryName(this.entry, this.service.origin.name);

        const commentParser = new Comment(this.service, this.entry);
        const comment = commentParser.parse();

        const controller: types.Controller<O> = {
            base,
            comment,
            name,
            origin: introspection.origin,
            interplay: [],
            isDuplicate: false,
            methods: [],
        };

        return controller;
    }
}
