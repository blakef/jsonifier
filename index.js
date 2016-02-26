'use strict';
const _ = require('lodash');

/**
 * Converts object to only contain static data
 *
 * 	Our state data either has static leaf values or functions which yield static
 * 	values.  This converst the entire object to only contain static data (subject
 * 	to users creating functions which _only_ yield static output)
 *
 * @method compiler
 * @param  {Object} obj Typically jsonifier state object
 * @return {Object}
 */
function compiler(obj) {
    if (_.isFunction(obj)) {
        return obj();
    } else if (_.isObject(obj)) {
        let result = {};
        Object.keys(obj).forEach(key => result[key] = compiler(obj[key]));
        return result;
    }
    return obj;
}


/**
 * Converts generators to functions which yield next value
 *
 * 	See [_.assignWith](https://lodash.com/docs#assignInWith)
 */
function dynamicCustomiser(objValue, srcValue) {
    if (_.isFunction(srcValue)) {
        let result = srcValue();
        if (result.toString() === '[object Generator]') {
            srcValue = () => result.next().value;
        }
    }
    return srcValue;
}


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
            srcObj = srcObj[attrib] = finalValue;
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

        this._state = state instanceof JSONifier
            ? _.cloneDeep(state._state)
            : {}
            ;

        this._current = _.isUndefined(this.options.namespace)
            ? this._state
            : createObject(this._state, this.options.namespace, {})
            ;
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
            createObject(this._current, method, _.assignWith(generator, generator, dynamicCustomiser));
            return this;
        }

        if (_.isUndefined(generator) && _.isObject(method)) {
            _.assignWith(this._current, method, dynamicCustomiser);
            return this;
        }

        throw Error('Illegal use of jsonifier#add');
    }

    /**
     * Yields static JSON objects from all inherited instances
     * @method build
     * @return {Generator}  which yields JSON objects
     */
    build() {
        let that = this;
        return function* iterableJSONifier() {
            for(let i=0; i != that.options.limit; i = (i + 1) % Number.MAX_SAFE_INTEGER) {
                yield that.options.compiler(that._state);
            }
        }();
    }
};
