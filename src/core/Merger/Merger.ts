import * as _ from "lodash";
import * as types from "../../typings";

export class Merger<O extends string> {
    constructor(
        private introspections: Record<O, types.Introspection<O>>,
        private config: types.IntrospectorConfig<O>,
    ) {}

    public make() {
        const grouped = this.getGroups();
        this.share(grouped);
        return this.introspections;
    }

    private share(grouped: Record<string, Array<types.Source<O>>>) {
        _.values(grouped).forEach((g) => {
            if (g.length > 1) {
                const shape = g[0].shape;
                const areAllEqual = g.every((s) => _.isEqual(shape, s.shape));

                if (areAllEqual) {
                    this.init();

                    this.introspections[this.config.share!.origin].sources[shape.name] = {
                        origin: this.config.share!.origin,
                        shape,
                        usedIn: [],
                    };

                    const source = this.introspections[this.config.share!.origin].sources[shape.name];

                    g.forEach((s) => {
                        s.usedIn.forEach((u) => {
                            u.origin = this.config.share!.origin;
                            source.usedIn.push(u);
                        });

                        delete this.introspections[s.origin].sources[s.shape.name];
                    });
                } else {
                    g.forEach((s) => (s.shape.isDuplicate = true));
                }
            }
        });
    }

    private init() {
        if (!this.introspections[this.config.share!.origin]) {
            this.introspections[this.config.share!.origin] = {
                controllers: {},
                origin: this.config.share!.origin,
                sources: {},
            };
        }
    }

    private getGroups() {
        const bySource: Record<string, Array<types.Source<O>>> = {};

        _.forEach(this.introspections, (i: types.Introspection<O>) => {
            _.forEach(i.sources, (s) => {
                if (!bySource[s.shape.name]) {
                    bySource[s.shape.name] = [];
                }

                bySource[s.shape.name].push(s);
            });
        });

        return bySource;
    }
}
