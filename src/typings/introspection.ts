export interface Introspection<O extends string> {
    origin: O;
    sources: Array<Source<O>>;
    controllers: Array<Controller<O>>;
}

export interface Source<O extends string> {
    origin: O;
    usedIn: Array<Type<O>>;
    shape: Interface<O> | Enumeration;
}

export interface Interface<O extends string> extends Shape {
    kind: "Interface";
    variables: string[];
    extends: Array<Type<O>>;
    fields: Array<Field<O>>;
}

export interface Field<O extends string> extends Shape {
    name: string;
    type: Type<O>;
    isRequired: boolean;
}
export interface Generic<O extends string> {
    position: number;
    type: Type<O>;
}

export interface Type<O extends string> extends Shape {
    generics: Array<Generic<O>>;
    kind: TypeKind;
    origin: O;
}

export interface EnumValue {
    key: string;
    value: string;
}

export interface Enumeration extends Shape {
    kind: "Enumeration";
    values: EnumValue[];
}

export interface Controller<O extends string> extends Shape {
    interplay: Array<Source<O>>;
    methods: Array<Method<O>>;
    origin: O;
    base: string;
}

export interface Method<O extends string> extends Rest, Shape {
    controller: Controller<O>;
    params: Type<O>;
    query: Type<O>;
    response: Array<Type<O>>;
    payload: Array<Type<O>>;
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
    request: RequestMethods;
    path: string;
}

export type RequestMethods = "get" | "post" | "put" | "delete";
