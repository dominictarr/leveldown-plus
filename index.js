var _live = require('pull-level/live')
var Live = require('pull-live')
var EventEmitter = require('events')
var ltgt = require('ltgt')
var pull = require('pull-stream')

function id (e) { return e }

function encodeKey (key, a, b) {
  return (
    a && a.keyEncoding ? a.keyEncoding.encode(key)
  : b && b.keyEncoding ? b.keyEncoding.encode(key)
  :                      key
  )
}
function encodeValue (value, a, b) {
  return (
    a && a.valueEncoding ? a.valueEncoding.encode(value)
  : b && b.valueEncoding ? b.valueEncoding.encode(value)
  :                        value
  )
}
function decodeKey (key, a, b) {
  return (
    a && a.keyEncoding ? a.keyEncoding.decode(key)
  : b && b.keyEncoding ? b.keyEncoding.decode(key)
  :                      key
  )
}
function decodeValue (value, a, b) {
  return (
    a && a.valueEncoding ? a.valueEncoding.decode(value)
  : b && b.valueEncoding ? b.valueEncoding.decode(value)
  :                        value
  )
}

module.exports = function (db, options) {
  function streamOptions (opts) {

    opts = opts || {}
    var _opts = {}
    for(var k in opts)
      _opts[k] = opts[k]
    opts = _opts
    opts.keys   = opts.keys  !== false
    opts.values = opts.value !== false
    opts.highWaterMark = 128
    //limit: undefined breaks leveldown!
    opts.limit = opts.limit >= 0 ? opts.limit : -1

    var keyCodec   = opts.keyEncoding   || options.keyEncoding || {}
    var valueCodec = opts.valueEncoding || options.valueEncoding || {}

    ltgt.toLtgt(opts, opts, keyCodec.encode || id)

    if(keyCodec)   opts.keyAsBuffer   = keyCodec.buffer === true
    if(valueCodec) opts.valueAsBuffer = valueCodec.buffer === true

    return opts
  }

  function read (opts) {
    opts = streamOptions(opts)
    var iterator = db.iterator(opts)
    return function (abort, cb) {
      if(abort)
        iterator.end(function () { cb(true) })
      else
        iterator.next(function (err, key, value) {
          if(key == null)
            return iterator.end(function () { cb(true) })
          if(opts.keys)
            key = decodeKey(key, opts, options)
          if(opts.values)
            value = decodeValue(value, opts, options)
          cb(null, opts.keys && opts.values ? {key: key, value: value} : opts.keys ? key : value)
        })
    }
  }

  function live (opts) {
    opts = streamOptions(opts)
    return pull(
      _live(emitter, opts),
      pull.map(function (op) {
        var key = op.key, value = op.value
        if(opts.keys != null) key = decodeKey(key, opts, options)
        if(opts.values != null) value = decodeValue(value, opts, options)
        return opts.keys && opts.values ? {key: key, value: value} : opts.keys ? key : value
      })
    )
  }

  var emitter = new EventEmitter()
  emitter.open = function (cb) {
    db.open(cb)
  }
  emitter.close = function (cb) {
    db.close(cb)
  }
  emitter.batch = function (ops, cb) {
    var _ops = ops.map(function (op) {
      return {
        key:   encodeKey(op.key, op, options),
        value: encodeValue(op.value, op, options),
        type:  op.type
      }
    })
    db.batch(_ops, function (err) {
      if(err) console.error(err)
      emitter.emit('batch', _ops)
      cb(err, ops)
    })
  }

  emitter.post = function (opts, each) {
    function onBatch (ops) {
      for(var i = 0; i < ops.length; i++)
        if(ltgt.contains(opts, ops[i].key)) each(ops[i])
    }
    emitter.on('batch', onBatch)
    return function () {
      emitter.removeListener('batch', onBatch)
    }
  }

  emitter.stream = Live(read, live)

  emitter.get = function (key, opts, cb) {
    if(!cb) cb = opts, opts = opts
    if('function' !== typeof cb) throw new Error('cb must be funciton')
    db.get(encodeKey(key, opts, options), function (err, value) {
      if(err) cb(err)
      else cb(null, decodeValue(value, opts, options))
    })
  }

  return emitter
}

