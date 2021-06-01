import { Node } from '@fluencelabs/fluence-network-environment';
import * as PeerId from 'peer-id';

export type Env = 'dev' | 'testnet' | 'local' | 'stage' | 'krasnodar';

export interface Context {
	nodes: Node[];
	relay: Node;
	env: Env;
	ttl: number;
	peerId: PeerId;
	verbose: boolean;
}
