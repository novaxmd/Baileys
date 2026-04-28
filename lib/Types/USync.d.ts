import type { BinaryNode } from '../WABinary.js';
import { USyncUser } from '../WAUSync.js';
export interface USyncQueryProtocol {
    name: string;
    getQueryElement: () => BinaryNode;
    getUserElement: (user: USyncUser) => BinaryNode | null;
    parser: (data: BinaryNode) => unknown;
}
//# sourceMappingURL=USync.d.ts.map