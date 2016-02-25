'use strict';
require('should');
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

        let dual = new jsonifier(simple, {namespace: 'b'}).add({c: 'd'});
        testObj(dual, {1:2, 'b': {c: 'd'}});

        testObj(new jsonifier().add('a', () => 'success'), {'a': 'success'});

        testObj(new jsonifier().add('a', {
            'b': [
                {'c': () => 'd'},
                2,
                3
            ]
        }), {'a': {'b': [{'c': 'd'},2,3]}});
    });

    it('catches strange constructor arguments', () => {
        (function() {
            new jsonifier().add(1);
        }).should.throw(/Illegal/);
    });

    it('handles deep object generation', () => {
        let simple = new jsonifier().add('a.b.c', {e: 'f'});

        testObj(simple, {'a': {'b': {'c': {'e': 'f'}}}});
    });

    it('handles dynamic content', () => {
        // Functions
        let func = new jsonifier().add({
            test: () => 'success'
        });
        testObj(func, {'test': 'success'});

        // Generators
        let gen = new jsonifier().add({
            test: function* woot() {
                yield* ['a', 'b', 'c'];
            }
        });

        let test = gen.build();
        test.next().value.should.containDeep({'test': 'a'});
        test.next().value.should.containDeep({'test': 'b'});
        test.next().value.should.containDeep({'test': 'c'});
        test.next().value.should.containDeep({'test': undefined});

        // Other
        let mega = new jsonifier(func).add('foo.bar', {
            a: 'woot',
            bob: function* bob() {
                yield* [1,2];
            }
        }).build();

        mega.next().value.should.containDeep({
            test: 'success',
            foo: {
                bar: {
                    a: 'woot',
                    bob: 1
                }
            }
        });
        mega.next().value.should.containDeep({
            test: 'success',
            foo: {
                bar: {
                    a: 'woot',
                    bob: 2
                }
            }
        });
        mega.next().value.should.containDeep({
            test: 'success',
            foo: {
                bar: {
                    a: 'woot',
                    bob: undefined
                }
            }
        });
    });

    it('enforces inheritance order', () => {
        let a = new jsonifier().add('a', {b: {c: 'Should not'}, d: 'woot'});
        let b = new jsonifier(a).add('a.b', {c: 'make it through'});
        let c = new jsonifier(b).add('a.b', {c: 'success'});
        testObj(c, {'a': {'b': {'c': 'success'}, 'd': 'woot'}});
    });

    it('has functional namespaces', () => {
        // Normal namespace use
        let a = new jsonifier({namespace: 'woot'}).add({'test': 'success'});
        testObj(a, {'woot': {'test': 'success'}});

        // Inheritange
        let b = new jsonifier(a).add('test', {a: 1});
        testObj(b, {'woot': {'test': 'success'}, 'test': {a: 1}});
    });

});
