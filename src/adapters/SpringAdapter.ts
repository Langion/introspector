import * as langion from "@langion/langion";
import { Adapter } from "../core/Adapter";

export class SpringAdapter extends Adapter {
    public queryEntryPoints(langionDescription: langion.Langion, entryPoints: langion.ClassEntity[]) {
        const query = "$..Exports[?(@.Annotations.RestController != null || @.Annotations.Controller != null)]";
        const controllers: langion.ClassEntity[] = this.jp.query(langionDescription, query);
        const result = entryPoints.concat(controllers);
        return result;
    }

    public getBasePath(entry: langion.ClassEntity) {
        let base = "/";

        if ("RequestMapping" in entry.Annotations) {
            base = entry.Annotations.RequestMapping.Items.value.Content[0];
        }

        return base;
    }
}
