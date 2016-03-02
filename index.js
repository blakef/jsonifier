'use strict';
const _ = require('lodash');

/**
 * Walks an object applying a function to leaf nodes
 *
 * 	If no function is given, walk returns a deep copy.
 *
 * @method walker
 * @param  {Object}     src     Object to walk
 * @param  {Function}   fn      Function to apply to leaf nodes in Object
 * @return {Object}
 */
function walker(src, fn=_.identity) {
    function walk(obj, parent, key) {
        if (_.isArray(obj)) {
            return obj.map((o, i) => walk(o, obj, i));
        } else if (_.isObject(obj) && !_.isFunction(obj)) {
            let result = {};
            Object.keys(obj).forEach(k => result[k] = walk(obj[k], obj, k));
            return result;
        }
        return fn(obj, parent, key);
    }
    return walk(src, null, null);
}


/**
 * Runs all functions to produce object with leaf nodes of primitives
 * @method
 * @param  {Object} obj Object to be converted
 * @return {Object}
 */
let compiler = (obj, itersWaiting) => walker(obj, (o, parent, key) => {
    if (!_.isFunction(o)) {
        return o;
    }
    let result = o();
    // Hack to figure out if we're getting the result of an iterator
    if (Object.keys(result).length === 2 && _.has(result, 'value', 'done')) {
        if (result.done) {
            itersWaiting.total--;
            // Stop iterator being called
            parent[key] = undefined;
        }
        return result.value;
    }
    return result;
});


/**
 * Converts Generators to Iterators
 * @method
 * @param  {Object} obj Object to be converted
 * @return {Object}
 */
let converter = (obj, itersFound) => walker(obj, function convertGen(o) {
    if (_.isFunction(o)) {
        let result = o();
        if (result.toString() === '[object Generator]') {
            itersFound.total++;
            return () => result.next();
        }
    }
    return o;
});


/**
 * Extends an object to make sure it has child attributes
 *
 * @method createObject
 * @param  {Object}     srcObj      The target object
 * @param  {String}     ref         Period separated description:
 *                                  	a.b.c => {a: {b: {c: {}}}}
 * @param  {Object}     finalValue  [optional] final value to assign to leaf node:
 *                                  	a.b.c (final 'foo') => {a: {b: {c: 'foo'}}}
 * @return {Object Ref} The final objects 'a.b.c' => {c: {}}
 */
function createObject(srcObj, ref, finalValue) {
    let steps = ref.split('.');

    steps.forEach((attrib, index) => {
        srcObj[attrib] = srcObj.hasOwnProperty(attrib) && _.isObject(srcObj[attrib])
            ? srcObj[attrib]
            : {}
            ;
        if (index < steps.length - 1) {
            srcObj = srcObj[attrib];
        } else {
            if (_.isObject(finalValue) && !_.isFunction(finalValue)) {
                srcObj = _.extend(srcObj[attrib] || {}, finalValue);
            } else {
                srcObj = srcObj[attrib] = finalValue;
            }
        }
    });
    return srcObj;
}


/**
 * Captures object of JSON data in particular states
 * @class {JSONifier}
 */
module.exports = class JSONifier {

    /**
     * @method constructor
     * @param  {JSONifier}      state   A JSONifier instance to inherit properties from
     *
     * @param  {Object}         ops             Optional parameters
     * @param  {String}         ops.namespace   Period separated namespace: 'a.b.c' => {'a': {'b': 'c':{}}}
     * @param  {Function}       ops.compiler    Change the way an instance builds JSON object {@link compiler}
     * @return {JSONifier}
     */
    constructor(state, ops) {
        this.options = {
            namespace: undefined,
            limit: undefined,
            compiler: compiler
        };

        if (state instanceof JSONifier && _.isObject(ops)) {
            _.extend(this.options, ops);
        }

        if (_.isObject(state) && _.isUndefined(ops)) {
            _.extend(this.options, state);
        }

        this.state = state instanceof JSONifier
            ? _.cloneDeep(state.state)
            : {}
            ;

        this._current = _.isUndefined(this.options.namespace)
            ? this.state
            : createObject(this.state, this.options.namespace, {})
            ;
    }

    get state() {
        return this._state;
    }

    set state(state) {
        return this._state = state;
    }

    /**
     * Adds an enhanced 'JSON object' to the current instance
     *
     * @method add
     * @param  {String}                     method    [optional] Dot notation: e.g. 'a' or 'a.b.c.d'
     * @param  {Object|Function|Generator}  Yield static data (object, string, number, etc...)
     */
    add(method, generator) {
        if (_.isString(method)) {
            createObject(this._current, method, generator);
            //_.assignWith(generator, generator, dynamicCustomiser)
            return this;
        }

        if (_.isUndefined(generator) && _.isObject(method)) {
            _.assign(this._current, method);
            return this;
        }

        throw Error('Illegal use of jsonifier#add');
    }

    /**
     * Yields static JSON objects from all inherited instances
     * @method  build
     * @param   {Object}                namespace - [default: all] Only build these namespaces [array|string].
     *                                  nest - [default: true] keep namespaces in final object.
     * @return  {Generator}             which yields JSON objects
     */
    build(opt) {
        let state = this.state;
        let limit = this.options.limit;

        if (_.isString(opt)) {
            opt = {
                namespace: [opt],
                nest: false
            };
        }

        if (_.isObject(opt)) {
            let namespace = opt.namespace;
            let nest = _.isUndefined(opt.nest)
                ? true
                : opt.nest
                ;
            limit = opt.limit;

            if (!_.isUndefined(namespace)) {
                namespace = _.isArray(opt.namespace)
                    ? opt.namespace
                    : [opt.namespace]
                    ;
                let known = Object.keys(this.state);
                let unknown = _.difference(namespace, known);
                if (unknown.length > 0) {
                    throw new Error(`Unknown namespace '${unknown.join(', ')}': ${known.join(', ')}`);
                }

                state = _.pick(state, namespace);
            }

            if (!nest) {
                state = _.assign({}, ..._.values(state));
            }
        }


        let that = this;
        return function* iterableJSONifier() {
            // We use an object here so we can pass an iter count by reference to compiler & converter
            let iters = { total: 0 };
            state = converter(state, iters);

            if (_.isUndefined(limit) && iters.total > 0) {
                /*eslint no-constant-condition:0 */
                while(true) {
                    let result = that.options.compiler(state, iters);
                    if (iters.total > 0) {
                        yield result;
                    } else {
                        return;
                    }
                }
            } else {
                for(let i=0; i != limit; i = (i + 1) % Number.MAX_SAFE_INTEGER) {
                    // Doesn't matter if that.__iters underflows, wont affect loop
                    yield that.options.compiler(state, iters);
                }
            }
        }();
    }
};
