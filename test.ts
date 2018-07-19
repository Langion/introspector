import * as introspector from "./src";

type Origins = "servicea" | "serviceb" | "shared" | "common";

introspect();

function introspect() {
    const origins: Array<introspector.Origin<Origins>> = [
        {
            getLangion: () => Promise.resolve(require("./servicea.json")),
            name: "servicea",
        },
        {
            getLangion: () => Promise.resolve(require("./serviceb.json")),
            name: "serviceb",
        },
    ];

    const config: introspector.IntrospectorConfig<Origins> = {
        origins,
        adapters: [new introspector.SwaggerAdapter(), new introspector.SpringAdapter()],
        getOriginFromModuleName: (p) => {
            const name = p.split(".")[2];

            if (name === ("servicea" as Origins) || name === ("serviceb" as Origins)) {
                return name;
            } else {
                return "common";
            }
        },
    };

    const introspection = introspector.Introspector.build(config);
    return introspection;
}
