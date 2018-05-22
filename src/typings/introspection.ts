import * as introspector from "./Introspector.types";

export interface Introspection<O extends string> {
    origin: O;
    sources: Record<string, Source<O>>;
    controllers: Record<string, Controller<O>>;
}

export interface Source<O extends string> {
    shape: Interface<O> | Enumeration;
    origin: O;
    usedIn: Array<Type<O>>;
}

export interface Interface<O extends string> extends Shape {
    kind: "Interface";
    variables: Record<string, string>;
    extends: Record<string, Type<O>>;
    fields: Record<string, Field<O>>;
}

export interface Field<O extends string> extends Shape {
    name: string;
    type: Type<O>;
}
export interface Generic<O extends string> extends Type<O> {
    position: number;
}

export interface Type<O extends string> extends Shape {
    generics: Record<string, Generic<O>>;
    kind: TypeKind;
    origin: O;
}

export interface Enumeration extends Shape {
    kind: "Enumeration";
    values: Record<string, string>;
}

export interface Controller<O extends string> extends Shape {
    interplay: Record<string, Source<O>>;
    methods: Record<string, Method<O>>;
    origin: O;
    base: string;
}

export interface Method<O extends string> extends Rest, Shape {
    controller: Controller<O>;
    params: Type<O>;
    query: Type<O>;
    response: Record<string, Type<O>>;
    payload: Record<string, Type<O>>;
}

export interface Shape {
    name: string;
    comment: string;
    isDuplicate: boolean;
}

export enum TypeKind {
    Entity = "Entity",
    Enumeration = "Enumeration",
    Object = "Object",
    List = "List",
    Void = "Void",
    Number = "Number",
    String = "String",
    Boolean = "Boolean",
    Date = "Date",
    Map = "Map",
    TypeParameter = "TypeParameter",
}

export interface Rest {
    request: introspector.RequestMethods;
    path: string;
}
