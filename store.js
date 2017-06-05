

module.exports = function (read, write) {

  var store = {}, dirty = {}, reading = {}, writing = false

  //this writes only once at a time.
  //at least, we want it to write at most once per file.
  //or maybe if it's written recently then wait.
  //anyway, this is good enough for now.

  function apply_write (key, value, err) {
    var _reading = reading[key]
    reading[key] = null
    while(_reading && _reading.length)
      _reading.shift()(err, value)
    _write()
  }

  function _write () {
    if(writing) return
    var d = 0
    for(var k in dirty) {
      if(dirty[k]) {
        dirty[k] = false
        writing = true
        return write(k, store[k], function (err) {
          writing = false
          _write()
        })
      }
      d++
    }
    //clear to do list
    if(d) dirty = {}
  }

  function has (key) {
    return store[key] !== undefined
  }

  return {
    has: has,
    ensure: function (key, cb) {
      if(has(key)) cb()
      else if(reading[key])
        reading[key].push(cb)
      else {
        var cbs = reading[key] = [cb]
        read(key, function (err, value) {
          //unusual, but incase someone overwrites the value
          //while we are reading. see apply_write
          if(cbs !== reading[key]) return

          apply_write(key, store[key] = value, err)
        })
      }

    },
    get: function (key) {
      return store[key]
    },
    //if set is called during a read,
    //cb the readers immediately, and cancel the current read.
    set: function (key, value) {
      store[key] = value
      //not urgent, but save this if we are not doing anything.
      dirty[key] = true
      apply_write(key, value)
    }
  }
}

