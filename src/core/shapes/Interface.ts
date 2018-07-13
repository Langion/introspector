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
    private names: Record<string, boolean> = {};

    constructor(private data: InterfaceData<O>) {}

    public create() {
        const name = this.data.entity.Name;
        const shape = this.getInterface(name);

        _.forEach(this.data.entity.Variables, (v) => (shape.variables[v.Name] = v.Name));

        this.parseFields(shape);
        this.parseMethod(shape);
        this.parseExtends(shape);

        this.addToIntrospection(shape);
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
                const jsonName = m.Annotations.JsonProperty.Items.value.Content.trim();
                let field = _.find(shape.fields, (f) => f.name === jsonName);

                if (!field && !this.names[jsonName]) {
                    const comment = Comment.create({
                        entity: m,
                        annotations: m.Annotations,
                    });

                    const type = Type.create({
                        entity: m.Returns,
                        map: this.data.map,
                        introspector: this.data.introspector,
                        service: this.data.service,
                    });

                    const isRequired = this.isRequired(m);

                    field = {
                        comment,
                        isRequired,
                        isDuplicate: false,
                        name: jsonName,
                        type,
                    };

                    this.names[jsonName] = true;
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
            const fieldName = f.Name.trim();
            const createdField = this.createField(f, fieldName);

            if (createdField) {
                const field = _.find(shape.fields, (fi) => fi.name === createdField.name);

                if (!field && !this.names[createdField.name]) {
                    this.names[createdField.name] = true;
                    this.names[fieldName] = true;
                    shape.fields[createdField.name] = createdField;
                }
            }
        });
    }

    private createField(field: langion.FieldEntity, fieldName: string) {
        const comment = Comment.create({
            entity: field,
            annotations: field.Annotations,
        });

        const type = Type.create({
            entity: field.Type,
            map: this.data.map,
            introspector: this.data.introspector,
            service: this.data.service,
        });

        const isRequired = this.isRequired(field);

        const result: types.Field<O> = {
            comment,
            type,
            isRequired,
            name: fieldName,
            isDuplicate: false,
        };

        if ("JsonProperty" in field.Annotations) {
            result.name = field.Annotations.JsonProperty.Items.value.Content.trim();
        }

        if (!result.name) {
            return null;
        }

        return result;
    }

    private getInterface(name: string) {
        const comment = Comment.create({
            entity: this.data.entity,
            annotations: this.data.entity.Annotations,
        });

        const shape: types.Interface<O> = {
            name,
            comment,
            kind: "Interface",
            isDuplicate: false,
            variables: {},
            fields: {},
            extends: {},
        };

        if (this.data.introspection.sources[name]) {
            this.data.introspection.sources[name].shape.name = name;
            this.data.introspection.sources[name].shape.comment = comment;
            return this.data.introspection.sources[name].shape as types.Interface<O>;
        }

        return shape;
    }

    private addToIntrospection(shape: types.Interface<O>) {
        const addedFrom = this.data.service.getOrigin();

        const source: types.Source<O> = {
            origin: this.data.introspection.origin,
            usedIn: [this.data.usedIn],
            addedFrom,
            shape,
        };

        if (this.data.introspection.sources[shape.name]) {
            const alreadyAddedSource = this.data.introspection.sources[shape.name];

            if (_.isEqual(alreadyAddedSource.shape, source.shape)) {
                alreadyAddedSource.usedIn.push(this.data.usedIn);
            } else {
                this.handleSameSourceName(alreadyAddedSource, source);
            }
        } else {
            this.data.introspection.sources[shape.name] = source;
        }
    }

    private handleSameSourceName(alreadyAddedSource: types.Source<O>, sourceWantToAdd: types.Source<O>) {
        const currentServiceParsing = this.data.service.getOrigin();

        if (alreadyAddedSource.addedFrom === currentServiceParsing) {
            // tslint:disable-next-line:no-console
            console.error(
                "There are two interfaces with the same name but with different shape in one origin.",
                "The first one is used.",
                alreadyAddedSource,
                sourceWantToAdd,
            );
        } else {
            if (sourceWantToAdd.origin === currentServiceParsing) {
                this.data.introspection.sources[alreadyAddedSource.shape.name] = sourceWantToAdd;
                const addedFromIntrospection = this.data.introspector.getIntrospection(alreadyAddedSource.addedFrom);
                addedFromIntrospection.sources[alreadyAddedSource.shape.name] = alreadyAddedSource;
                alreadyAddedSource.origin = alreadyAddedSource.addedFrom;
            }
        }
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

        const finalName = _.lowerFirst(result.name);

        return finalName;
    }

    private parseAccessor(name: string, accessor: langion.MethodEntity, shape: types.Interface<O>) {
        if (shape.fields[name]) {
            return;
        }

        if (!accessor.Modifier.Items.Public) {
            return;
        }

        const field = this.createField(
            {
                Annotations: accessor.Annotations,
                Canonical: accessor.Canonical,
                Comment: accessor.Comment,
                Kind: accessor.Kind,
                Modifiers: accessor.Modifier,
                Name: name,
                Path: accessor.Path,
                Type: accessor.Returns,
            },
            name,
        );

        if (field && !this.names[field.name]) {
            this.names[field.name] = true;
            shape.fields[field.name] = field;
        }
    }

    private isClassEntity(entity: langion.Entity): entity is langion.ClassEntity {
        return entity.Kind === langion.Kind.Class;
    }

    private isRequired(entity: langion.FieldEntity | langion.MethodEntity) {
        let result = false;

        if ("NotNull" in entity.Annotations) {
            result = true;
        } else if ("Column" in entity.Annotations) {
            result = !!entity.Annotations.Column.Items.nullable.Content;
        }

        return result;
    }
}
