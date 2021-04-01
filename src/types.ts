import { Node } from '@fluencelabs/fluence-network-environment';

export type Env = 'dev' | 'testnet' | 'local';

export interface Context {
	nodes: Node[];
	relay: Node;
	env: Env;
	ttl: number;
	seed: string;
}
