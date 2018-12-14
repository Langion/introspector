import * as langion from "@langion/langion";
import * as _ from "lodash";
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
            // tslint:disable-next-line:no-console
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
        const result = this.createSource(interfaze, introspection, entity);
        return result;
    }

    private createEnumeration(entity: langion.EnumEntity) {
        const introspection = this.service.elicit(this.entity.Path);
        const enumeration = new Enumeration(entity, this.service);
        const result = this.createSource(enumeration, introspection, entity);
        return result;
    }

    private createSource(
        creator: Interface<O> | Enumeration<O>,
        introspection: types.Introspection<O>,
        entity: langion.InterfaceEntity | langion.ClassEntity | langion.EnumEntity,
    ) {
        const source: types.Source<O> = {
            origin: introspection.origin,
            addedFrom: this.service.origin.name,
            shape: creator.shape,
            usedIn: [this.type],
        };

        if (!source.shape.name) {
            return;
        }

        const parsed = this.service.startParsing(entity, source);

        if (parsed) {
            parsed.source.usedIn.push(this.type);
            parsed.source.usedIn.forEach((u) => (u.name = parsed.source.shape.name));
            return parsed.source.shape;
        }

        const uniqName = this.getNewName(entity, source, introspection);
        introspection.sources.push(source);

        if (uniqName === source.shape.name) {
            creator.parse();
            return source.shape;
        }

        const alreadyAdded = _.find(introspection.sources, (s) => s.shape.name === source.shape.name);

        if (alreadyAdded) {
            const compare = this.service.introspector.comparator.isEqual(source, alreadyAdded, introspection.sources);

            if (compare.isEqual) {
                alreadyAdded.usedIn.push(this.type);
                alreadyAdded.usedIn.forEach((u) => (u.name = alreadyAdded.shape.name));
                _.pull(introspection.sources, source);
                return alreadyAdded.shape;
            } else {
                source.shape.name = uniqName;
                source.usedIn.forEach((u) => (u.name = source.shape.name));
            }
        }

        creator.parse();

        return source.shape;
    }

    private getNewName(
        entity: langion.InterfaceEntity | langion.ClassEntity | langion.EnumEntity,
        source: types.Source<O>,
        introspection: types.Introspection<O>,
    ) {
        const parts = entity.Path.split(".");
        const pathPartsWithoutSourceName = parts.slice(0, parts.length - 1);

        const uniqName = this.getUniqName(source.shape.name, pathPartsWithoutSourceName, introspection, false);

        return uniqName;
    }

    private getUniqName(
        name: string,
        parts: string[],
        introspection: types.Introspection<O>,
        prefixHasBeenAdded: boolean,
    ): string {
        const hasName = introspection.sources.some((s) => s.shape.name === name);

        if (!hasName) {
            return name;
        }

        if (!prefixHasBeenAdded) {
            name += "_";
        }

        if (parts.length === 0) {
            name += name;
        } else {
            const lastPathPart = parts[parts.length - 1];
            name += _.upperFirst(lastPathPart);
        }

        const path = parts.slice(0, parts.length - 1);
        const uniq = this.getUniqName(name, path, introspection, true);
        return uniq;
    }
}
