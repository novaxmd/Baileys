import { Boom } from '@hapi/boom'
import type { Contact } from './Contact'

export enum SyncState {
	Connecting,
	AwaitingInitialSync,
	Syncing,
	Online
}

export type WAConnectionState = 'open' | 'connecting' | 'close'

export type ConnectionState = {
	connection: WAConnectionState

	lastDisconnect?: {
		error: Boom | Error | undefined
		date: Date
	}
	isNewLogin?: boolean
	qr?: string
	receivedPendingNotifications?: boolean
	legacy?: {
		phoneConnected: boolean
		user?: Contact
	}
	isOnline?: boolean
}
