type FT<T> = { value: T; default?: T }
type WithDef<T> = FT<T> & { default: T }
type WithoutDef<T> = Omit<FT<T>, 'default'>

const a: WithDef<number> = { value: 1, default: 2 }
const b: WithoutDef<number> = { value: 1 }

type Check1 = WithDef<number> extends { default: any } ? true : false
// expected true

type Check2 = WithoutDef<number> extends { default: any } ? true : false
// expected ??? false maybe
