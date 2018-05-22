import * as langion from "@langion/langion";
import * as _ from "lodash";
import { Introspector } from "../../Introspector";
import * as types from "../../typings";
import { Service } from "../Service";
import { Comment } from "./Comment";
import { Method } from "./Method";

export interface ControllerData<O extends string> {
    entity: langion.ClassEntity;
    introspector: Introspector<O>;
    service: Service<O>;
}

export class Controller<O extends string> {
    constructor(private data: ControllerData<O>) {}

    public create() {
        const introspection = this.data.introspector.elicit(this.data.entity.Path);
        const controller = this.getController(introspection);
        this.parseController(this.data.entity, controller, {});
    }

    private parseController(
        entity: langion.ClassEntity | langion.InterfaceEntity,
        controller: types.Controller<O>,
        generics: Record<string, langion.GenericEntity>,
    ) {
        const map = this.getGenericsMap(entity, generics);

        const parents = this.getParents(entity);
        parents.forEach((p) => this.parseParent(p, controller, generics));

        const methods = _.values(entity.Methods);
        methods.forEach((m) => this.parseMethod(m, map, controller));
    }

    private parseParent(
        type: langion.TypeEntity,
        controller: types.Controller<O>,
        generics: Record<string, langion.GenericEntity>,
    ) {
        const parent = this.data.service.getEntity(type.Path) as langion.ClassEntity | langion.InterfaceEntity;
        const sorted = _.sortBy(type.Generics, (g) => g.Position);

        // Когда в качестве дженерика выступает TypeParam, но ему нужно установить новый порядок
        const replaceIfTypeVariableIsGeneric = sorted.map(
            (g) => (generics[g.Name] ? { ...generics[g.Name], Position: g.Position } : g),
        );

        const variables = _.sortBy(parent.Variables, (v) => v.Position).map((v) => v.Name);
        const map: Record<string, langion.GenericEntity> = _.zipObject(variables, replaceIfTypeVariableIsGeneric);
        this.parseController(parent, controller, map);
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

    private parseMethod(
        entity: langion.MethodEntity,
        map: Record<string, langion.GenericEntity>,
        controller: types.Controller<O>,
    ) {
        const method = new Method({
            introspector: this.data.introspector,
            entity,
            map,
            controller,
            service: this.data.service,
        });

        method.create();
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

    private getBasePath() {
        let base = "/";

        if ("RequestMapping" in this.data.entity.Annotations) {
            base = this.data.entity.Annotations.RequestMapping.Items.value.Content[0];
        }

        return base;
    }

    private getController(introspection: types.Introspection<O>) {
        let name = this.data.entity.Name;

        // Remove controller word from name
        const controllerPosition = name.toLowerCase().indexOf("controller");

        if (controllerPosition >= 0) {
            name = name.slice(0, controllerPosition);
        }

        // Remove origin name but only if it's not equal to origin.
        // i.e. we have MyController and the origin is My.
        // after all this slicing we would got empty string
        if (_.lowerCase(name) !== _.lowerCase(introspection.origin)) {
            const originPosition = name.toLowerCase().indexOf(introspection.origin.toLowerCase());

            if (originPosition >= 0) {
                const nameWithoutOrigin = name.slice(introspection.origin.length);
                const correctName = /[_A-Za-z][_0-9A-Za-z]*/;

                if (correctName.test(nameWithoutOrigin)) {
                    name = nameWithoutOrigin;
                }

            }
        }

        if (introspection.controllers[name]) {
            name = this.data.entity.Name + _.upperFirst(introspection.origin);
        }

        const base = this.getBasePath();
        const comment = Comment.create({ entity: this.data.entity, annotations: this.data.entity.Annotations });

        if (!introspection.controllers[name]) {
            introspection.controllers[name] = {
                name,
                base,
                comment,
                isDuplicate: false,
                interplay: {},
                methods: {},
                origin: introspection.origin,
            };
        }

        return introspection.controllers[name];
    }
}
