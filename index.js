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
    function walk(obj) {
        if (_.isObject(obj) && !_.isFunction(obj)) {
            let result = {};
            Object.keys(obj).forEach(key => result[key] = walk(obj[key]));
            return result;
        }
        return fn(obj);
    }
    return walk(src);
}


/**
 * Runs all functions to produce object with leaf nodes of primitives
 * @method
 * @param  {Object} obj Object to be converted
 * @return {Object}
 */
let compiler = (obj) => walker(obj, o => _.isFunction(o) ? o() : o);


/**
 * Converts Generators to Iterators
 * @method
 * @param  {Object} obj Object to be converted
 * @return {Object}
 */
let converter = (obj) => walker(obj, function convertGen(o) {
    if (_.isFunction(o)) {
        let result = o();
        if (result.toString() === '[object Generator]') {
            o = () => result.next().value;
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
     * @param  {Integer}        ops.limit       Limit the number of responses from this instance [default: unlimited]
     * @param  {Function}       ops.compiler    Change the way an instance builds JSON object {@link compiler}
     * @return {JSONifier}
     */
    constructor(state, ops) {
        this.options = {
            namespace: undefined,
            limit: -1,
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
     * @param   {String}    namespace   [optional] Namespace to build, defaults to all.
     * @return  {Generator}             which yields JSON objects
     */
    build(namespace) {
        if (namespace && !_.has(this.state, namespace)) {
            let namespaces = Object.keys(this.state).join(', ');
            throw Error(`Unknown namespace '${namespace}': ${namespaces}`);
        }
        let state = _.isUndefined(namespace)
            ? this.state
            : this.state[namespace]
            ;
        let that = this;
        return function* iterableJSONifier() {
            state = converter(state);
            for(let i=0; i != that.options.limit; i = (i + 1) % Number.MAX_SAFE_INTEGER) {
                yield that.options.compiler(state);
            }
        }();
    }
};
