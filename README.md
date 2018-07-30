#  Introspector

This lib parses [Langion](https://github.com/Langion/langion) format in order to create smaller description about types and [REST](https://en.wikipedia.org/wiki/Representational_state_transfer) methods.

## Config
### IntrospectorConfig\<O extends string\>

|Key|Type|Comment
|--|--|--|
|origins|Array<Origin\<O\>>|Array of services from Langion
|getOriginFromModuleName|(path:  string) =>  O|Path is a module path, i.e. `com.app.myname.appname` and the result of this function must be the origin name
|adapters|Adapter[]|Array of adapters that will be used to parse Langion
|share?|SideOrigin\<O\>|If this property is set, introspector will try to find equal types among origins and extract them in to separate origin

## Origin\<O extends string\>

|Key|Type|Comment
|--|--|--|
|name|O|Name of the origin, for example in `com.app.myname.appname` name can be `appname`
|getLangion|() =>  Promise<langion.Langion>|This function should return Promise with Langion JSON description

## SideOrigin\<O extends string\>

|Key|Type|Comment
|--|--|--|
|origin|O|Origin that will be extracted as Shared
|origin|string|Name of the origin
