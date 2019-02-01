import * as langion from "@langion/langion";
import * as _ from "lodash";
import * as types from "../../typings";
import { OriginService } from "../OriginService";
import { Type } from "../Type";
import { Comment } from "./Comment";

export class Interface<O extends string> {
    public shape: types.Interface<O>;
    /**
     * Array of field names that has been parsed
     */
    private addedFields: string[] = [];

    constructor(
        private entity: langion.InterfaceEntity | langion.ClassEntity,
        private type: types.Type<O>,
        private map: Record<string, langion.GenericEntity>,
        private service: OriginService<O>,
    ) {
        this.shape = this.create();
    }

    public parse() {
        _.forEach(this.entity.Variables, (v) => this.shape.variables.push(v.Name));

        this.parseExtends();
        this.parseFields();
        _.forEach(this.entity.Methods, (methods) => methods.forEach((m) => this.parseMethod(m)));

        this.handleGenerics();
    }

    private handleGenerics() {
        const interfazeHasTypeVariables = !_.isEmpty(this.shape.variables);
        const typeHasNoGenerics = _.isEmpty(this.type.generics);

        if (interfazeHasTypeVariables && typeHasNoGenerics) {
            let position = 0;

            _.forEach(
                this.shape.variables,
                (v) =>
                    (this.type.generics[position++] = {
                        position,
                        type: {
                            comment: "",
                            generics: [],
                            isDuplicate: false,
                            kind: types.TypeKind.Void,
                            name: v,
                            origin: this.type.origin,
                        },
                    }),
            );
        }
    }

    private parseFields() {
        if (!this.isClassEntity(this.entity)) {
            return;
        }

        _.forEach(this.entity.Fields, (f) => {
            const shouldAdd = this.service.introspector.adapters.shouldAddField(f, undefined, this.service.origin.name);
            if (!shouldAdd) {
                return;
            }

            const fieldName = this.service.introspector.adapters.extractName(f, undefined, this.service.origin.name);
            const createdField = this.createField(f, fieldName);

            if (createdField.name) {
                const isAlreadyParsed =
                    this.addedFields.indexOf(f.Name) >= 0 || this.addedFields.indexOf(createdField.name) >= 0;

                if (!isAlreadyParsed) {
                    this.addedFields.push(createdField.name);
                    // Name can be changed via JsonProperty,
                    // but at the same time the class could have getter with the field's original name
                    this.addedFields.push(f.Name);

                    this.shape.fields.push(createdField);
                }
            }
        });
    }

    private parseExtends() {
        if (!this.entity.Extends) {
            return;
        }

        if (this.isClassEntity(this.entity)) {
            this.createExtendType(this.entity.Extends);
        } else {
            _.forEach(this.entity.Extends, (e) => this.createExtendType(e));
        }
    }

    private parseMethod(method: langion.MethodEntity) {
        const field = this.createField(method);
        const extractedFromMethod = this.service.introspector.adapters.extractFieldFromMethod(
            method,
            field,
            undefined,
            this.service.origin.name,
        );

        if (extractedFromMethod.name) {
            const hasWithTheSameName = this.addedFields.indexOf(extractedFromMethod.name) >= 0;

            if (!hasWithTheSameName) {
                this.addedFields.push(extractedFromMethod.name);
                this.shape.fields.push(extractedFromMethod);
            }
        }
    }

    private createField(entity: langion.FieldEntity | langion.MethodEntity, name = "") {
        const commentCreator = new Comment(this.service, entity);
        const comment = commentCreator.parse();

        const typeCreator =
            "Returns" in entity
                ? new Type(entity.Returns, this.map, this.service)
                : new Type(entity.Type, this.map, this.service);

        const type = typeCreator.getType();

        const isRequired = this.service.introspector.adapters.isRequired(entity, undefined, this.service.origin.name);

        const field: types.Field<O> = {
            comment,
            type,
            name,
            isDuplicate: false,
            isRequired,
        };

        return field;
    }

    private createExtendType(parent: langion.TypeEntity) {
        const typeCreator = new Type(parent, this.map, this.service);
        const type = typeCreator.getType();

        if (type.kind === types.TypeKind.Entity) {
            this.shape.extends.push(type);
        }
    }

    private create() {
        const commentCreator = new Comment(this.service, this.entity);
        const comment = commentCreator.parse();

        const shape: types.Interface<O> = {
            name: this.entity.Name,
            comment,
            kind: "Interface",
            isDuplicate: false,
            variables: [],
            fields: [],
            extends: [],
        };

        return shape;
    }

    private isClassEntity(entity: langion.Entity): entity is langion.ClassEntity {
        return entity.Kind === langion.Kind.Class;
    }
}
