# jsonifier

> Dynamically generates JSON output from templates.

[![Build Status](https://travis-ci.org/blakef/jsonifier.svg?branch=master)](https://travis-ci.org/blakef/jsonifier)
[![Coverage Status](https://coveralls.io/repos/github/blakef/jsonifier/badge.svg?branch=master)](https://coveralls.io/github/blakef/jsonifier?branch=master)

[![Build Status](https://travis-ci.org/blakef/jsonifier.svg?branch=develop)](https://travis-ci.org/blakef/jsonifier)
[![Coverage Status](https://coveralls.io/repos/github/blakef/jsonifier/badge.svg?branch=develop)](https://coveralls.io/github/blakef/jsonifier?branch=develop)

## Installation

`npm install --save-dev jsonifier`

## Usage

```javascript
const jsonifier = require('jsonifier');

let base = new jsonifier().add('a.b.c', {
       'bob': () => 'woot',
       'countdown': function* count() {
            for(let i=4; i > 0; i--) {
                yield i;
            }
       }
    });

let child = new jsonifier(base, {namespace: 'data'}).add({
        'sample_gen': function* sample() {
            let cycle = ['start', 'middle', 'end'];
            while(true) {
                yield* cycle;
            }
        },
        'normal': {
            1: ['a', 'b'],
            2: 'ok'
        }
    });
```

Calling `jsonifier#build` returns a generator
```javascript
// This creates a generator

> console.log(base.next().value);

    { a: { b: { c: { bob: 'woot', countdown: 4 } } } }

> let max = 4;
> for (let data of child.build()) {
>   console.log(data);
>   if (--max <= 0) break;
> }

    { a: { b: { c: { bob: 'woot', countdown: 4 } } },
      data:
       { sample_gen: 'start',
         normal: { '1': { '0': 'a', '1': 'b' }, '2': 'ok' } } }
    { a: { b: { c: { bob: 'woot', countdown: 3 } } },
      data:
       { sample_gen: 'middle',
         normal: { '1': { '0': 'a', '1': 'b' }, '2': 'ok' } } }
    { a: { b: { c: { bob: 'woot', countdown: 2 } } },
      data:
       { sample_gen: 'end',
         normal: { '1': { '0': 'a', '1': 'b' }, '2': 'ok' } } }
    { a: { b: { c: { bob: 'woot', countdown: 1 } } },
      data:
       { sample_gen: 'start',
         normal: { '1': { '0': 'a', '1': 'b' }, '2': 'ok' } } }
```

## Features

### Inheritance

Concisely define data structures (useful for generating test data)

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
    });

let gen = child.build();

> console.log(gen.next().value);
> console.log(gen.next().value);
> console.log(gen.next().value);

    { "a": { "b": { "d": "W" } } }
    { "a": { "b": { "d": "h" } } }
    { "a": { "b": { "d": "a" } } }
```

### Respects order of addition

```javascript
// Using child defined above
let clean = new jsonifier(child)
    .add({
        a: 'wooter',
        f: 'funk town'
    });

> console.log(gen.next().value);

    { "a": { "b": { "d": "a" } } }

> console.log(clean.next().value);

    { "a": "wooter", "b": "funk town" }
```

### Namespaces

```javascript
let ns = new jsonifier(clean, { namespace: 'woot'})
    .add({
        a: 1,
        b: 2
    });

> console.log(ns.build().next());

    {
        "a": "wooter", "b": "funk town",
        "woot": {
            "a": 1,
            "b": 2
        }
    }
```
