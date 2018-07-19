import * as langion from "@langion/langion";
import * as _ from "lodash";
import * as types from "../../typings";
import { OriginService } from "../OriginService";
import { Comment } from "./Comment";

export class Enumeration<O extends string> {
    public shape: types.Enumeration;

    constructor(private entity: langion.EnumEntity, private service: OriginService<O>) {
        this.shape = this.create();
    }

    public parse() {
        _.forEach(this.entity.Items, (value, key) => {
            const num = parseFloat(key);
            const isNumber = !isNaN(num);

            if (isNumber) {
                key = `E${value}`;
            }

            this.shape.values.push({ key, value });
        });
    }

    private create() {
        const commentCreator = new Comment(this.service, this.entity);
        const comment = commentCreator.parse();

        const shape: types.Enumeration = {
            name: this.entity.Name,
            comment,
            kind: "Enumeration",
            values: [],
            isDuplicate: false,
        };

        return shape;
    }
}
