import type { AuthenticationCreds, CacheStore, SignalKeyStore, SignalKeyStoreWithTransaction, TransactionCapabilityOptions } from '../Types';
import type { ILogger } from './logger';
export declare function makeCacheableSignalKeyStore(store: SignalKeyStore, logger?: ILogger, _cache?: CacheStore): SignalKeyStore;
export declare const addTransactionCapability: (state: SignalKeyStore, logger: ILogger, { maxCommitRetries, delayBetweenTriesMs }: TransactionCapabilityOptions) => SignalKeyStoreWithTransaction;
export declare const initAuthCreds: () => AuthenticationCreds;
//# sourceMappingURL=auth-utils.d.ts.map