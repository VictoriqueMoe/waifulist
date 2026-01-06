import type { IImportEngine, ImportType } from "./engines/IImportEngine";
import * as engines from "./engines/impl";

const engineList: IImportEngine[] = Object.values(engines);

export function getImportEngine(type: ImportType): IImportEngine | null {
    for (const engine of engineList) {
        if (engine.canHandle(type)) {
            return engine;
        }
    }
    return null;
}
