import * as langion from "@langion/langion";
import * as types from "../typings";

export class SwaggerAdapter implements types.Adapter {
    public getMethodReturns(method: langion.MethodEntity, previousParsedMethodReturn: langion.TypeEntity[]) {
        let result: langion.TypeEntity[] = [];

        if ("ApiOperation" in method.Annotations) {
            const type = method.Annotations.ApiOperation.Items.response.Type;

            if (!type) {
                return previousParsedMethodReturn;
            }

            const searchSimilarTypes = (t: langion.TypeEntity) => {
                const hasSomething = t.Name.indexOf(type.Name) >= 0 || type.Name.indexOf(t.Name) >= 0;
                const generics = Object.keys(t.Generics);

                if (hasSomething) {
                    return true;
                } else if (generics.length) {
                    const fromGeneric = generics.some((k) => searchSimilarTypes(t.Generics[k].Type));
                    return fromGeneric;
                }

                return false;
            };

            const hasSmthInReturns = previousParsedMethodReturn.some(searchSimilarTypes);

            if (!hasSmthInReturns) {
                result.push(type);
            }
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
        } else if ("ApiModelProperty" in withComment.Annotations) {
            comment = withComment.Annotations.ApiModelProperty.Items.notes.Content;
        }

        return comment;
    }
}
