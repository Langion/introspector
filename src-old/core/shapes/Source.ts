import * as langion from "@langion/langion";
import { Introspector } from "../../Introspector";
import * as types from "../../typings";
import { Service } from "../Service";
import { Enumeration } from "./Enumeration";
import { Interface } from "./Interface";

export interface SourceData<O extends string> {
    type: langion.TypeEntity;
    map: Record<string, langion.GenericEntity>;
    introspection: types.Introspection<O>;
    introspector: Introspector<O>;
    service: Service<O>;
    usedIn: types.Type<O>;
}

export class Source<O extends string> {
    constructor(private data: SourceData<O>) {}

    public create() {
        const entity = this.data.service.getEntity(this.data.type.Path);

        if (!entity) {
            console.error(`Cannot load "${this.data.type.Path}"`);
            return;
        }

        const processed = this.data.introspector.processedEntities.find((e) => e === entity);
        if (processed) {
            if (this.data.introspection.sources[processed.Name]) {
                this.data.introspection.sources[processed.Name].usedIn.push(this.data.usedIn);
            } else {
                const addedFrom = this.data.service.getOrigin();
                const kind = processed.Kind === langion.Kind.Enum ? "Enumeration" : "Interface";

                this.data.introspection.sources[processed.Name] = {
                    origin: this.data.introspection.origin,
                    usedIn: [this.data.usedIn],
                    addedFrom,
                    shape:
                        kind === "Enumeration"
                            ? {
                                  kind,
                                  comment: "",
                                  isDuplicate: false,
                                  name: processed.Name,
                                  values: {},
                              }
                            : {
                                  kind,
                                  name: processed.Name,
                                  comment: "",
                                  extends: {},
                                  fields: {},
                                  isDuplicate: false,
                                  variables: {},
                              },
                };
            }

            return;
        }

        this.data.introspector.processedEntities.push(entity);

        switch (entity.Kind) {
            case langion.Kind.Class:
            case langion.Kind.Interface:
                this.createInterface(entity);
                break;
            case langion.Kind.Enum:
                this.crateEnumeration(entity);
                break;
            default:
                throw new Error(`Unknown kind ${entity.Kind}`);
        }
    }

    private crateEnumeration(entity: langion.Entity) {
        const enumeration = new Enumeration({
            entity: entity as langion.EnumEntity,
            introspection: this.data.introspection,
            usedIn: this.data.usedIn,
            service: this.data.service,
        });

        enumeration.create();
    }

    private createInterface(entity: langion.Entity) {
        const clazz = entity as langion.ClassEntity;

        const interfaze = new Interface({
            entity: clazz,
            map: this.data.map,
            introspection: this.data.introspection,
            introspector: this.data.introspector,
            usedIn: this.data.usedIn,
            service: this.data.service,
        });

        interfaze.create();
    }
}
