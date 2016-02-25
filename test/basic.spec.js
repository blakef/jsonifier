'use strict';
var jsonifier = require('../dist/jsonifier');

function testObj(js, obj) {
    return js.build().next().value.should.containDeep(obj);
}

describe('simple use cases', function() {

    it('handles simple objects', () => {
        let simple = new jsonifier().add({
            1: 2
        });
        testObj(simple, {1:2});

        let inherit = new jsonifier(simple);
        testObj(inherit, {1:2});

        inherit.add({2:3});
        testObj(inherit, {1:2, 2:3});
    });

    it('handles deep object generation', () => {
        let simple = new jsonifier().add('a.b.c', {e: 'f'});

        testObj(simple, {'a': {'b': {'c': {'e': 'f'}}}});
    });

});
