import * as langion from "@langion/langion";

export interface CommentData {
    entity: langion.Entity;
    annotations?: Record<string, langion.AnnotationEntity>;
}

export class Comment {
    public static create(data: CommentData) {
        const comment = new Comment(data);
        const result = comment.parse();
        return result;
    }

    private constructor(private data: CommentData) {}

    public parse() {
        const comment = this.extractComment();
        const withoutCommentSigns = this.removeCommentSigns(comment);
        const oneLine = this.removeLineBreaks(withoutCommentSigns);

        return oneLine;
    }

    private extractComment() {
        let comment = this.data.entity.Comment || "";

        if (!this.data.annotations) {
            return comment;
        }

        if ("ApiOperation" in this.data.annotations) {
            comment = this.data.annotations.ApiOperation.Items.value.Content;

            if (this.data.annotations.ApiOperation.Items.notes.Content) {
                comment += `\n${this.data.annotations.ApiOperation.Items.notes.Content}`;
            }
        } else if ("ApiParam" in this.data.annotations) {
            comment = this.data.annotations.ApiParam.Items.value.Content;
        }

        return comment;
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
