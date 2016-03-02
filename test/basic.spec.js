'use strict';
require('should');
var jsonifier = require('../dist/jsonifier');

function testObj(js, obj) {
    return js.build().next().value.should.eql(obj);
}

describe('varying constructor types', function() {

    it('inherits correctly', () => {
        let a = new jsonifier({namespace: 'a'}).add({1:2});
        testObj(a, {'a':{1:2}});
        let b = new jsonifier(a, {namespace: 'a'}).add({2:3});
        testObj(b, {'a':{1:2, 2:3}});
        let c = new jsonifier(b, {namespace: 'a'}).add({3:4});
        testObj(c, {'a':{1:2, 2:3, 3:4}});
        let d = new jsonifier(c, {namespace: 'a'}).add({4:5});
        testObj(d, {'a':{1:2, 2:3, 3:4, 4:5}});
    });

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

    it('with namespaces, functions & composite', () => {
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
        ns = new jsonifier({namespace: 'a.b.c'}).add('d', () => 'compiled');
        testObj(ns, {'a': {'b': {'c': {'d': 'compiled'}}}});
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

    it('handles arrays', () => {
        let a = new jsonifier().add({a: [{b: () => 'c'}]});
        a.build().next().value['a'].should.be.Array();
    });

});

describe('inheriting and overloading', function() {

    it('should handle overloading state getter / setters', () => {
        class Foobar extends jsonifier {
            get state() {
                return this._foobar;
            }

            set state(foobar) {
                return this._foobar = foobar;
            }
        }
        let a = new jsonifier().add({a: 1});
        let b = new Foobar(a).add({b:2});
        testObj(b, {'a':1, 'b':2});
    });

    //
    // WIP: This isn't working, revisit
    //
    /*
    it('should allow us to completely rework a jsonifier', () => {
        class Foobar extends jsonifier {
            constructor(state, ops) {
                super(state, ops);
                this.__state = {};

                // Use old path for inheritance
                this.path = this.path || '/';
                this.state = this.__tmp;
                // Use new path for all that follows
                this.path = ops
                    ? ops.path || '/'
                    : '/'
                    ;
                console.log(this.path);
            }

            get current() {
                return this.path
                    ? this.__state[this.path]
                    : this.__tmp
                    ;
            }

            set current(s) {
                return this.path
                    ? this.__state[this.path] = s
                    : this.__tmp = s
                    ;
            }

            build(path) {
                this.path = path || '/';
                return super.build();
            }
        }

        let a = new Foobar().add({1:2});
        console.log(a.__state);
        let b = new Foobar(a, {path: '/b'}).add({2:3});
        console.log(b.__state);

        testObj(b, {1:2, 2:3});
        console.log(b.build('/b').next());
        b.build('/b').next().value.should.eql({1:2, 2:3});
    });
    */

});

describe('building', function() {

    it('builds for namespaces', () => {
        // Should be the same output
        let a = new jsonifier({namespace: 'ns1'}).add({'testing': 'ns1'});
        testObj(a, {'ns1': {'testing': 'ns1'}});
        a.build('ns1').next().value.should.eql({'testing': 'ns1'});

        // Namespace specific builds generate different values on
        // inherited namespaces
        let b = new jsonifier(a, {namespace: 'ns2'}).add({'testing': 'ns2'});
        b.build('ns1').next().value.should.eql({'testing': 'ns1'});
        b.build('ns2').next().value.should.eql({'testing': 'ns2'});
        testObj(b, {'ns1': {'testing': 'ns1'}, 'ns2': {'testing': 'ns2'}});
    });

    it('support build optional arguments', () => {
        let a = new jsonifier({namespace: 'ns1'}).add({'testing': 'ns1'});
        let b = new jsonifier(a, {namespace: 'ns2'}).add({'testing': 'ns2'});
        let c = new jsonifier(b, {namespace: 'ns3'}).add({'outlier': 'here'});

        c.build({nest: true}).next().value.should.eql({'testing': 'ns2', 'outlier': 'here'});
        c.build({nest: false}).next().value.should.eql({'testing': 'ns2', 'outlier': 'here'});

        b.build({namespace: 'ns2'}).next().value.should.eql({'testing': 'ns2'});
        b.build({namespace: 'ns2', nest: false}).next().value.should.eql({'testing': 'ns2'});
    });

    it('create iterators when build() called', () => {
        let a = new jsonifier().add('a', function* foo() { yield* [1,2]; });

        let b = a.build();
        b.next().value.should.eql({'a': 1});
        b.next().value.should.eql({'a': 2});
        b.next().value.should.eql({'a': undefined});

        // This should generate the exact same output
        let c = a.build();
        c.next().value.should.eql({'a': 1});
        c.next().value.should.eql({'a': 2});
        c.next().value.should.eql({'a': undefined});
    });

    it('throws error if building unknown namespace', () => {
        (function() {
            new jsonifier().build({namespace: 'What is this?'});
        }).should.throw(/Unknown namespace/);
    });

    it('throws error if building using old namespace method', () => {
        (function() {
            new jsonifier().build('What is this?');
        }).should.throw(/Unknown namespace/);
    });
});
