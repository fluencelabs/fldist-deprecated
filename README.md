# Fluence service distributor
Can distribute modules, blueprints and create services.

## Running
```shell
npm i
npm run run 
```

## Help to get all commands
```shell
npm run cli --help
```

Air scripts examples is in `scripts_examples` direcotory

## Distribute basic services to Fluence network

From console you can call
```shell
npm run cli distribute
```



In browser, open console, and call `await distribute()`;

## Changing configuration
Take a look at function `distribute` at the bottom of `index.ts`:
```typescript
export async function distribute() {
	Fluence.setLogLevel('warn');
	const nodes = faasNetHttps;
	const distributor = new Distributor(nodes);
	await distributor.distributeServices(nodes[0], new Map([
		['SQLite 3', [1, 2, 3, 4]],
		['User List', [1, 2, 3, 4]],
		['Message History', [1, 2, 3, 4]],
	])).then(_ => console.log('finished'));
}
```

It calls `distributor.distributeServices`, passing service distribution:
- Create service `SQLite 3` on nodes with indexes 1, 2, 3 and 4. 
- Create service `User List` on nodes with indexes 1, 2, 3 and 4. 
- Create service `Message History` on nodes with indexes 1, 2, 3 and 4.

You can change distribution as you wish, and add new blueprints at the top of `index.ts`.
