import * as langion from "@langion/langion";
import * as _ from "lodash";
import { Introspector } from "../../Introspector";
import * as types from "../../typings";
import { Service } from "../Service";
import { Type } from "../Type";
import { Comment } from "./Comment";

export interface InterfaceData<O extends string> {
    entity: langion.InterfaceEntity | langion.ClassEntity;
    map: Record<string, langion.GenericEntity>;
    introspection: types.Introspection<O>;
    introspector: Introspector<O>;
    usedIn: types.Type<O>;
    service: Service<O>;
}

export class Interface<O extends string> {
    constructor(private data: InterfaceData<O>) {}

    public create() {
        const name = this.data.entity.Name;

        if (this.data.introspection.sources[name]) {
            this.data.introspection.sources[name].usedIn.push(this.data.usedIn);
            return;
        }

        const interfaze = this.getInterface(name);
        const shape = interfaze.shape as types.Interface<O>;

        _.forEach(this.data.entity.Variables, (v) => (shape.variables[v.Name] = v.Name));

        this.parseFields(shape);
        this.parseMethod(shape);
        this.parseExtends(shape);
    }

    private parseExtends(shape: types.Interface<O>) {
        if (!this.data.entity.Extends) {
            return;
        }

        if (this.isClassEntity(this.data.entity)) {
            this.createExtendType(shape, this.data.entity.Extends);
        } else {
            _.forEach(this.data.entity.Extends, (e) => this.createExtendType(shape, e));
        }
    }

    private createExtendType(shape: types.Interface<O>, parent: langion.TypeEntity) {
        const type = Type.create({
            entity: parent,
            map: this.data.map,
            introspector: this.data.introspector,
            service: this.data.service,
        });

        if (type.kind === types.TypeKind.Entity) {
            shape.extends[type.name] = type;
        }
    }

    private parseMethod(shape: types.Interface<O>) {
        _.forEach(this.data.entity.Methods, (m) => {
            if ("JsonProperty" in m.Annotations) {
                const jsonName = m.Annotations.JsonProperty.Items.value.Content;
                let field = _.find(shape.fields, (f) => f.name === jsonName);

                if (!field) {
                    const comment = Comment.create({ entity: m, annotations: m.Annotations });

                    const type = Type.create({
                        entity: m.Returns,
                        map: this.data.map,
                        introspector: this.data.introspector,
                        service: this.data.service,
                    });

                    field = {
                        comment,
                        isDuplicate: false,
                        name: jsonName,
                        type,
                    };

                    shape.fields[field.name] = field;
                }
            }
        });

        if (this.data.introspector.config.parseJavaBeans) {
            this.parseJavaBeans(shape);
        }
    }

    private parseFields(shape: types.Interface<O>) {
        if (!this.isClassEntity(this.data.entity)) {
            return;
        }

        _.forEach(this.data.entity.Fields, (f) => {
            const createdField = this.createField(f);

            if (createdField) {
                const field = _.find(shape.fields, (fi) => fi.name === createdField.name);

                if (!field) {
                    shape.fields[createdField.name] = createdField;
                }
            }
        });
    }

    private createField(field: langion.FieldEntity) {
        const comment = Comment.create({ entity: field, annotations: field.Annotations });

        const type = Type.create({
            entity: field.Type,
            map: this.data.map,
            introspector: this.data.introspector,
            service: this.data.service,
        });

        const result: types.Field<O> = {
            comment,
            type,
            name: field.Name,
            isDuplicate: false,
        };

        if ("JsonProperty" in field.Annotations) {
            result.name = field.Annotations.JsonProperty.Items.value.Content;
        }

        if (!result.name) {
            return null;
        }

        return result;
    }

    private getInterface(name: string) {
        const comment = Comment.create({ entity: this.data.entity, annotations: this.data.entity.Annotations });

        const shape: types.Interface<O> = {
            name,
            comment,
            kind: "Interface",
            isDuplicate: false,
            variables: {},
            fields: {},
            extends: {},
        };

        this.data.introspection.sources[name] = {
            origin: this.data.introspection.origin,
            usedIn: [this.data.usedIn],
            shape,
        };

        return this.data.introspection.sources[name];
    }

    private parseJavaBeans(shape: types.Interface<O>) {
        const accessors = [/^get/, /^is/];
        const methods = _.filter(this.data.entity.Methods, (m) => accessors.some((a) => a.test(m.Name)));

        methods.forEach((m) => {
            const name = this.getJavaBeanName(accessors, m.Name);
            this.parseAccessor(name, m, shape);
        });
    }

    private getJavaBeanName(accessors: RegExp[], what: string) {
        const result = accessors.reduce(
            (acc, value) => {
                if (acc.found) {
                    return acc;
                }

                if (value.test(acc.name)) {
                    const name = what.replace(value, "");
                    return { name, found: true };
                } else {
                    return acc;
                }
            },
            { name: what, found: false },
        );

        const name = _.lowerFirst(result.name);

        return name;
    }

    private parseAccessor(name: string, accessor: langion.MethodEntity, shape: types.Interface<O>) {
        if (shape.fields[name]) {
            return;
        }

        if (!accessor.Modifier.Items.Public) {
            return;
        }

        const field = this.createField({
            Annotations: accessor.Annotations,
            Canonical: accessor.Canonical,
            Comment: accessor.Comment,
            Kind: accessor.Kind,
            Modifiers: accessor.Modifier,
            Name: name,
            Path: accessor.Path,
            Type: accessor.Returns,
        });

        if (field) {
            shape.fields[name] = field;
        }
    }

    private isClassEntity(entity: langion.Entity): entity is langion.ClassEntity {
        return entity.Kind === langion.Kind.Class;
    }
}
