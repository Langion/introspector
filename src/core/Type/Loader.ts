import * as langion from "@langion/langion";
import * as types from "../../typings";
import { OriginService } from "../OriginService";
import { Enumeration } from "../shapes/Enumeration";
import { Interface } from "../shapes/Interface";

export class Loader<O extends string> {
    constructor(
        private type: types.Type<O>,
        private entity: langion.TypeEntity,
        private service: OriginService<O>,
        private map: Record<string, langion.GenericEntity>,
    ) {}

    public load() {
        if (this.type.kind !== types.TypeKind.Entity) {
            return;
        }

        const entity = this.service.getEntity(this.entity.Path);

        if (!entity) {
            console.error(`Cannot load "${this.entity.Path}"`);
            return;
        }

        switch (entity.Kind) {
            case langion.Kind.Class:
            case langion.Kind.Interface:
                return this.createInterface(entity as langion.ClassEntity | langion.InterfaceEntity);
            case langion.Kind.Enum:
                return this.createEnumeration(entity as langion.EnumEntity);
            default:
                throw new Error(`Unknown kind ${entity.Kind}`);
        }
    }

    private createInterface(entity: langion.ClassEntity | langion.InterfaceEntity) {
        const introspection = this.service.elicit(this.entity.Path);
        const interfaze = new Interface(entity, this.type, this.map, this.service);

        const source: types.Source<O> = {
            origin: introspection.origin,
            shape: interfaze.shape,
            usedIn: [this.type],
        };

        const parsed = this.service.startParsing(entity, source);

        if (parsed) {
            parsed.source.usedIn.push(this.type);
            return parsed.source.shape;
        } else {
            introspection.sources.push(source);
            interfaze.parse();
            return interfaze.shape;
        }
    }

    private createEnumeration(entity: langion.EnumEntity) {
        const introspection = this.service.elicit(this.entity.Path);
        const enumeration = new Enumeration(entity, this.service);

        const source: types.Source<O> = {
            origin: introspection.origin,
            shape: enumeration.shape,
            usedIn: [this.type],
        };

        const parsed = this.service.startParsing(entity, source);

        if (parsed) {
            parsed.source.usedIn.push(this.type);
            return parsed.source.shape;
        } else {
            introspection.sources.push(source);
            enumeration.parse();
            return enumeration.shape;
        }
    }
}
