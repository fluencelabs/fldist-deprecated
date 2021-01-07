import Fluence from 'fluence';
import log from 'loglevel';

// NodeJS imports
import {promises as fs} from 'fs';
import {faasDev, faasNetHttps} from './environments';
import {Distributor, getModule, TTL} from './distributor';
import {args} from "./args";
import {seedToPeerId} from "fluence/dist/seed";

export async function addBlueprint(name: string, id: string, deps: string[]): Promise<void> {
    const distributor = new Distributor([]);
    await distributor.uploadBlueprint(faasDev[2], {name, uuid: id, dependencies: deps})
}

export async function createService(id: string, seed?: string): Promise<void> {
    const node = faasDev[2];

    let peerId = undefined;
    if (seed) {
        peerId = await seedToPeerId(seed)
    }
    const client = await Fluence.connect(node.multiaddr, peerId);
    let serviceId = await client.createService(id, node.peerId, TTL)
    console.log("service id: " + serviceId)
}

export async function runAir(path: string, data: Map<string, any>, seed?: string): Promise<void> {
    const distributor = new Distributor([]);

    const fileData = await fs.readFile(path);
    const air = fileData.toString('utf-8');

    await distributor.runAir(faasDev[2], air, data, seed)
}

export async function uploadModule(name: string, path: string): Promise<void> {
    let module = await getModule(name, path)
    const distributor = new Distributor([]);
    await distributor.uploadModule(faasDev[2], module)
}

export async function getModules(peerId?: string): Promise<void> {
    const distributor = new Distributor([]);
    let client = await distributor.makeClient(faasDev[2])
    if (!peerId) {
        peerId = faasDev[2].peerId
    }
    let modules = await client.getAvailableModules(peerId);
    console.log(modules)
}

// SEED OWNER: 7sHe8vxCo4BkdPNPdb8f2T8CJMgTmSvBTmeqtH9QWrar
// pid OWNER 12D3KooWSkpw3d4udWoQqQZsY5BpY7aqprQXwMKYgbNhSDfMbsxw


// SEED USER: G2r9BEsuaBHaDyMxGb2Bxv61PpH6r8UjKT564CdeU4BD
// pid OWNER : 12D3KooWSaSTAV7ftrN8f5UXkB9MYnFtdpAJpgUZbV7r2XpfVsF2
//
// user-list a38a396a-2b3d-4ef5-8b8b-ed448670bcfe
// history d9abbacf-6ee2-49e5-9683-536a5c931fa1

// tsc && node -r esm . run_air -p /home/diemust/git/proto-distributor/script2.clj -d '{"userlist":"02461e23-329c-4fa7-b46a-508524de735a","history":"d9abbacf-6ee2-49e5-9683-536a5c931fa1"}'

/*
1 скрипт:
- добавить юзера
- добавить тетраплет с идентификацией

2 скрипт:
- юзером сделать is_auth
- добавить сообщение
- получить сообщение
 */

export async function distribute(): Promise<void> {
    const distributor = new Distributor(faasNetHttps);
    await distributor.load_modules();
    await distributor
        .distributeServices(
            faasNetHttps[0],
            new Map([
                // ['SQLite 3', [1, 2, 3, 4]],
                // ['User List', [1, 1]],
                // ['Message History', [1, 1, 1]],
                // ['Redis', [5,6,7,8]]
                ['URL Downloader', [4]]
            ]),
        )
        .then((_) => log.warn('finished'));
}

if (typeof process === 'object') {
    Fluence.setLogLevel('warn');
    log.setLevel('warn');

    args()
}
