# leveldown-plus

lighter wrapper around leveldown: adds encodings and pull-streams.

I wanted to see if this would be faster that levelup,
which now has several layers of api. tl;dr streams are faster
(mainly because of pull-streams) but other apis don't change.
This had improved some [flumeview-level](https://github.com/flumedb/flumeview-level) benchmarks,
but made no difference to [bench-ssb](https://github.com/ssbc/bench-ssb)

## api: LevelDownPlus(leveldown, opts) => db

return a leveldown-plus database, given a leveldown instance
and options object with `keyEncoding, valueEncoding`.

### open (cb)

open the database ready for reading

### batch (ops, cb)

write a batch. (levelup style) there are no other write methods.

### get (key, opts?, cb)

get a value for the given key.

### post (range, listener) => remove

calls listener when there is a write within range (which is `gt, lt, gte, lte` range)

### stream (opts)

returns pull stream, use `gt, lt, gte, lte` ranges,
and [pull-level](https://github.com/pull-stream/pull-level) options `limit,reverse,live,old`,
and `keyEncoding, valueEncoding`

## License

MIT

