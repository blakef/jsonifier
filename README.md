# What?
Dynamically generates JSON output from templates

# Example

```javascript
const jsonifier = require('jsonifier');

let base = new jsonifier()
    .add('a.b.c', {
       'bob': () => 'woot'
    })
    ;
console.log(base.build().next());
```

Outputs:

```json
{
    "a": {
        "b": {
            "c": {
                "bob": "woot"
            },
        }
    }
}
```

## Inherit

Build more complicated output

```javascript
let child = new jsonifier(base)
    .add('a.b', {
        'd': function *() {
            yield* 'What could this possibly do?';
        }
    })
    .add({
        a: {
            f: 'foo'
        }
    })
    ;
let gen = child.build();
console.log(gen.next());
console.log(gen.next());
```

Outputs:

```json
{
    "a": {
        "b": {
            "d": "W"
        }
    }
}
{
    "a": {
        "b": {
            "d": "h"
        }
    }
}
```

Remembering that order does matter.

```javascript
let clean = new jsonifier(child)
    .add({
        a: 'wooter',
        f: 'funk town'
    })
    ;
```

Outputs:

```json
{
    "a": "wooter",
    "b": "funk town"
}
```

## Namespaces

```javascript
let ns = new jsonifier(clean, { namespace: 'woot'})
    .add({
        a: 1,
        b: 2
    })
    ;
console.log(ns.build().next());
```

Outputs:

```json
{
    "a": "wooter",
    "b": "funk town",
    "woot": {
        "a": 1,
        "b": 2
    }
}
```
