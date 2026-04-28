import { proto } from '../../WAProto/index.js';
import type { AuthenticationCreds, SignalCreds, SocketConfig } from '../Types.js';
import { type BinaryNode } from '../WABinary.js';
export declare const generateLoginNode: (userJid: string, config: SocketConfig) => proto.IClientPayload;
export declare const generateRegistrationNode: ({ registrationId, signedPreKey, signedIdentityKey }: SignalCreds, config: SocketConfig) => proto.ClientPayload;
export declare const configureSuccessfulPairing: (stanza: BinaryNode, { advSecretKey, signedIdentityKey, signalIdentities }: Pick<AuthenticationCreds, "advSecretKey" | "signedIdentityKey" | "signalIdentities">) => {
    creds: Partial<AuthenticationCreds>;
    reply: BinaryNode;
};
export declare const encodeSignedDeviceIdentity: (account: proto.IADVSignedDeviceIdentity, includeSignatureKey: boolean) => any;
//# sourceMappingURL=validate-connection.d.ts.map