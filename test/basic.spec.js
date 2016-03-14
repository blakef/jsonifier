'use strict';
require('should');
var jsonifier = require('../dist/jsonifier');

function testObj(js, obj) {
    return js.build().next().value.should.containDeep(obj);
}

describe('varying constructor types', function() {

    it('the simplest case', () => {
        let simple = new jsonifier().add({
            1: 2
        });
        testObj(simple, {1:2});

        let inherit = new jsonifier(simple);
        testObj(inherit, {1:2});

        inherit.add({2:3});
        testObj(inherit, {1:2, 2:3});

    });

    it('namespaces, functions & composite', () => {
        let simple = new jsonifier().add({ 1: 2 });

        // Namespaces
        let dual = new jsonifier(simple, {namespace: 'b'}).add({c: 'd'});
        testObj(dual, {1:2, 'b': {c: 'd'}});

        // Functions
        testObj(new jsonifier().add('a', () => 'success'), {'a': 'success'});

        // Composites
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

});

describe('object creation shortcut notation', function() {

    it('adds generated objects from notation', () => {
        let simple = new jsonifier().add('a.b.c', {e: 'f'});
        testObj(simple, {'a': {'b': {'c': {'e': 'f'}}}});
    });

    it('handles namespaces with notation', () => {
        // Simple objec5
        let ns = new jsonifier({namespace: 'a.b.c'}).add({'d': 'e'});
        testObj(ns, {'a': {'b': {'c': {'d': 'e'}}}});

        // Function which would have to be 'compiled'
        ns = new jsonifier({namespace: 'a.b.c'}).add('d', () => 'e');
        testObj(ns, {'a': {'b': {'c': {'d': 'e'}}}});
    });

});

describe('dynamic content', function() {

    it('handling function and generators', () => {
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

    });

    it('handles composites of functions, gernerators and static values', () => {
        let func = new jsonifier().add({ test: () => 'success' });

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

});

describe('generators and limit work together', function() {
    let test = new jsonifier()
        .add('test', function* test() {
            yield* [1,2];
        })
        .add('foo.man', function* test2() {
            yield* 'abcd';
        })
        ;

    it('runs indefinitely limit is -1', () => {
        let count=0, output;
        for(let x of test.build({limit: -1})) {
            output = x;
            if (++count > 4) break;
        }
        count.should.eql(5);
        output.should.eql({
            'test': undefined,
            'foo': { 'man': undefined }
        });
    });

    it('runs limit # of times', () => {
        let count = 0, output;
        for(let x of test.build({limit:2})) {
            output = x;
            if (++count > 3) break;
        }
        count.should.eql(2);
        output.should.eql({
            'test': 2,
            'foo': { 'man': 'b'}
        });
    });

    it('runs until all generators have completed', () => {
        let count = 0, output;
        for(let x of test.build()) {
            output = x;
            if (++count > 4) break;
        }
        count.should.eql(4);
        output.should.eql({
            'test': undefined,
            'foo': { 'man': 'd'}
        });
    });

    it('runs all inherited generated to completion', () => {
        let a = new jsonifier().add('foo', function* foo() { return 1; });
        let b = new jsonifier(a).add('foobar', function* foobar() { yield* [1,2,3]; });

        let output = [], count = 0;
        for(let x of b.build()) {
            output.push(x);
            if (++count > 3) break;
        }
        count.should.eql(3);
        output.should.have.length(3);

        output[0].should.eql({ foo: 1, foobar: 1 });
        output[1].should.eql({ foo: undefined, foobar: 2 });
        output[2].should.eql({ foo: undefined, foobar: 3 });
    });

});

describe('other more subtle stuff', function() {

    it('enforces inheritance order overwriting', () => {
        let a = new jsonifier().add('a', {b: {c: 'Should not'}, d: 'woot'});
        let b = new jsonifier(a).add('a.b', {c: 'make it through'});
        let c = new jsonifier(b).add('a.b', {c: 'success'});
        testObj(c, {'a': {'b': {'c': 'success'}, 'd': 'woot'}});
    });

    it('has working namespaces', () => {
        // Normal namespace use
        let a = new jsonifier({namespace: 'woot'}).add({'test': 'success'});
        testObj(a, {'woot': {'test': 'success'}});

        // Inheritange
        let b = new jsonifier(a).add('test', {a: 1});
        testObj(b, {'woot': {'test': 'success'}, 'test': {a: 1}});

        // Notation Expansion
        let d = new jsonifier(a, {namespace: 'woot.bob.foo'}).add({1:2});
        testObj(d, { 'woot': { 'test': 'success', 'bob': { 'foo': { '1': 2 } } } });

        // Quirks: undefined namespace as a way to jump to a root attribute if you have to reference namespace
        let c = new jsonifier({namespace: undefined}).add({'a': 'b'});
        testObj(c, {'a': 'b'});
    });

});
