import * as langion from "@langion/langion";
import * as types from "../typings";

export class SwaggerAdapter implements types.Adapter {
    public getMethodReturns(method: langion.MethodEntity, previousParsedMethodReturn: langion.TypeEntity[]) {
        let result: langion.TypeEntity[] = [];

        if ("ApiOperation" in method.Annotations) {
            result.push(method.Annotations.ApiOperation.Items.response.Type);
        }

        result = previousParsedMethodReturn.concat(result);

        return result;
    }

    public getComment(withComment: types.CommentData) {
        let comment = withComment.Comment || "";

        if (!withComment.Annotations) {
            return comment;
        }

        if ("ApiOperation" in withComment.Annotations) {
            comment = withComment.Annotations.ApiOperation.Items.value.Content;

            if (withComment.Annotations.ApiOperation.Items.notes.Content) {
                comment += `\n${withComment.Annotations.ApiOperation.Items.notes.Content}`;
            }
        } else if ("ApiParam" in withComment.Annotations) {
            comment = withComment.Annotations.ApiParam.Items.value.Content;
        }

        return comment;
    }
}
