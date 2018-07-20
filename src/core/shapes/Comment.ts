import * as types from "../../typings";
import { OriginService } from "../OriginService";

export class Comment<O extends string> {
    constructor(private service: OriginService<O>, private data: types.CommentData) {}

    public parse() {
        const comment = this.service.introspector.adapters.getComment(this.data);
        const withoutCommentSigns = this.removeCommentSigns(comment);
        const oneLine = this.removeLineBreaks(withoutCommentSigns);

        return oneLine;
    }

    private removeCommentSigns(comment: string) {
        const startOfMultiline = /\/\*\*?/gim;
        const endOfMultiline = /\*\//gim;
        const lineSign = /^\*/gim;
        const oneLine = /^\/\//gim;

        const removers = [startOfMultiline, endOfMultiline, lineSign, oneLine];

        const lines = comment.split("\n");

        const withoutCommentSigns = lines.map((l) => {
            const result = removers.reduce((line, regexp) => line.trim().replace(regexp, ""), l);
            return result;
        });

        return withoutCommentSigns;
    }

    private removeLineBreaks(comment: string[]) {
        const anySpace = /\s/g;
        const line = comment.join("");
        const oneSpace = line.replace(anySpace, " ");
        return oneSpace;
    }
}
