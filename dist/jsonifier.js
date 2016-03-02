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
function walker(src) {
    let fn = arguments.length <= 1 || arguments[1] === undefined ? _.identity : arguments[1];

    function walk(obj) {
        if (_.isArray(obj)) {
            return obj.map(walk);
        } else if (_.isObject(obj) && !_.isFunction(obj)) {
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
let compiler = obj => walker(obj, o => _.isFunction(o) ? o() : o);

/**
 * Converts Generators to Iterators
 * @method
 * @param  {Object} obj Object to be converted
 * @return {Object}
 */
let converter = obj => walker(obj, function convertGen(o) {
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
        srcObj[attrib] = srcObj.hasOwnProperty(attrib) && _.isObject(srcObj[attrib]) ? srcObj[attrib] : {};
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

        this.state = state instanceof JSONifier ? _.cloneDeep(state.state) : {};

        this._current = _.isUndefined(this.options.namespace) ? this.state : createObject(this.state, this.options.namespace, {});
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

        if (_.isString(opt)) {
            opt = { namespace: [opt] };
        }

        if (_.isObject(opt)) {
            let namespace = opt.namespace;
            let nest = opt.nest || true;

            if (!_.isUndefined(namespace)) {
                namespace = _.isArray(opt.namespace) ? opt.namespace : [opt.namespace];
                let known = Object.keys(this.state);
                let unknown = _.difference(namespace, known);
                if (unknown.length > 0) {
                    throw new Error(`Unknown namespace '${ unknown.join(', ') }': ${ known.join(', ') }`);
                }

                state = _.pick(state, namespace);
            }

            if (nest) {
                state = _.assign({}, ..._.values(state));
            }
        }

        let that = this;
        return function* iterableJSONifier() {
            state = converter(state);
            for (let i = 0; i != that.options.limit; i = (i + 1) % Number.MAX_SAFE_INTEGER) {
                yield that.options.compiler(state);
            }
        }();
    }
};
//# sourceMappingURL=data:application/json;base64,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QUFPLElBQVAsQ0E5Qkc7QUErQlAsZUFBTyxVQUFVLGlCQUFWLEdBQThCO0FBQ2pDLG9CQUFRLFVBQVUsS0FBVixDQUFSLENBRGlDO0FBRWpDLGlCQUFJLElBQUksSUFBRSxDQUFGLEVBQUssS0FBSyxLQUFLLE9BQUwsQ0FBYSxLQUFiLEVBQW9CLElBQUksQ0FBQyxJQUFJLENBQUosQ0FBRCxHQUFVLE9BQU8sZ0JBQVAsRUFBeUI7QUFDekUsc0JBQU0sS0FBSyxPQUFMLENBQWEsUUFBYixDQUFzQixLQUF0QixDQUFOLENBRHlFO2FBQTdFO1NBRkcsRUFBUCxDQS9CTztLQUFYO0NBM0VhIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuY29uc3QgXyA9IHJlcXVpcmUoJ2xvZGFzaCcpO1xuXG4vKipcbiAqIFdhbGtzIGFuIG9iamVjdCBhcHBseWluZyBhIGZ1bmN0aW9uIHRvIGxlYWYgbm9kZXNcbiAqXG4gKiBcdElmIG5vIGZ1bmN0aW9uIGlzIGdpdmVuLCB3YWxrIHJldHVybnMgYSBkZWVwIGNvcHkuXG4gKlxuICogQG1ldGhvZCB3YWxrZXJcbiAqIEBwYXJhbSAge09iamVjdH0gICAgIHNyYyAgICAgT2JqZWN0IHRvIHdhbGtcbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSAgIGZuICAgICAgRnVuY3Rpb24gdG8gYXBwbHkgdG8gbGVhZiBub2RlcyBpbiBPYmplY3RcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqL1xuZnVuY3Rpb24gd2Fsa2VyKHNyYywgZm49Xy5pZGVudGl0eSkge1xuICAgIGZ1bmN0aW9uIHdhbGsob2JqKSB7XG4gICAgICAgIGlmIChfLmlzQXJyYXkob2JqKSkge1xuICAgICAgICAgICAgcmV0dXJuIG9iai5tYXAod2Fsayk7XG4gICAgICAgIH0gZWxzZSBpZiAoXy5pc09iamVjdChvYmopICYmICFfLmlzRnVuY3Rpb24ob2JqKSkge1xuICAgICAgICAgICAgbGV0IHJlc3VsdCA9IHt9O1xuICAgICAgICAgICAgT2JqZWN0LmtleXMob2JqKS5mb3JFYWNoKGtleSA9PiByZXN1bHRba2V5XSA9IHdhbGsob2JqW2tleV0pKTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZuKG9iaik7XG4gICAgfVxuICAgIHJldHVybiB3YWxrKHNyYyk7XG59XG5cblxuLyoqXG4gKiBSdW5zIGFsbCBmdW5jdGlvbnMgdG8gcHJvZHVjZSBvYmplY3Qgd2l0aCBsZWFmIG5vZGVzIG9mIHByaW1pdGl2ZXNcbiAqIEBtZXRob2RcbiAqIEBwYXJhbSAge09iamVjdH0gb2JqIE9iamVjdCB0byBiZSBjb252ZXJ0ZWRcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqL1xubGV0IGNvbXBpbGVyID0gKG9iaikgPT4gd2Fsa2VyKG9iaiwgbyA9PiBfLmlzRnVuY3Rpb24obykgPyBvKCkgOiBvKTtcblxuXG4vKipcbiAqIENvbnZlcnRzIEdlbmVyYXRvcnMgdG8gSXRlcmF0b3JzXG4gKiBAbWV0aG9kXG4gKiBAcGFyYW0gIHtPYmplY3R9IG9iaiBPYmplY3QgdG8gYmUgY29udmVydGVkXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKi9cbmxldCBjb252ZXJ0ZXIgPSAob2JqKSA9PiB3YWxrZXIob2JqLCBmdW5jdGlvbiBjb252ZXJ0R2VuKG8pIHtcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKG8pKSB7XG4gICAgICAgIGxldCByZXN1bHQgPSBvKCk7XG4gICAgICAgIGlmIChyZXN1bHQudG9TdHJpbmcoKSA9PT0gJ1tvYmplY3QgR2VuZXJhdG9yXScpIHtcbiAgICAgICAgICAgIG8gPSAoKSA9PiByZXN1bHQubmV4dCgpLnZhbHVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvO1xufSk7XG5cblxuLyoqXG4gKiBFeHRlbmRzIGFuIG9iamVjdCB0byBtYWtlIHN1cmUgaXQgaGFzIGNoaWxkIGF0dHJpYnV0ZXNcbiAqXG4gKiBAbWV0aG9kIGNyZWF0ZU9iamVjdFxuICogQHBhcmFtICB7T2JqZWN0fSAgICAgc3JjT2JqICAgICAgVGhlIHRhcmdldCBvYmplY3RcbiAqIEBwYXJhbSAge1N0cmluZ30gICAgIHJlZiAgICAgICAgIFBlcmlvZCBzZXBhcmF0ZWQgZGVzY3JpcHRpb246XG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcdGEuYi5jID0+IHthOiB7Yjoge2M6IHt9fX19XG4gKiBAcGFyYW0gIHtPYmplY3R9ICAgICBmaW5hbFZhbHVlICBbb3B0aW9uYWxdIGZpbmFsIHZhbHVlIHRvIGFzc2lnbiB0byBsZWFmIG5vZGU6XG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcdGEuYi5jIChmaW5hbCAnZm9vJykgPT4ge2E6IHtiOiB7YzogJ2Zvbyd9fX1cbiAqIEByZXR1cm4ge09iamVjdCBSZWZ9IFRoZSBmaW5hbCBvYmplY3RzICdhLmIuYycgPT4ge2M6IHt9fVxuICovXG5mdW5jdGlvbiBjcmVhdGVPYmplY3Qoc3JjT2JqLCByZWYsIGZpbmFsVmFsdWUpIHtcbiAgICBsZXQgc3RlcHMgPSByZWYuc3BsaXQoJy4nKTtcblxuICAgIHN0ZXBzLmZvckVhY2goKGF0dHJpYiwgaW5kZXgpID0+IHtcbiAgICAgICAgc3JjT2JqW2F0dHJpYl0gPSBzcmNPYmouaGFzT3duUHJvcGVydHkoYXR0cmliKSAmJiBfLmlzT2JqZWN0KHNyY09ialthdHRyaWJdKVxuICAgICAgICAgICAgPyBzcmNPYmpbYXR0cmliXVxuICAgICAgICAgICAgOiB7fVxuICAgICAgICAgICAgO1xuICAgICAgICBpZiAoaW5kZXggPCBzdGVwcy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICBzcmNPYmogPSBzcmNPYmpbYXR0cmliXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChfLmlzT2JqZWN0KGZpbmFsVmFsdWUpICYmICFfLmlzRnVuY3Rpb24oZmluYWxWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICBzcmNPYmogPSBfLmV4dGVuZChzcmNPYmpbYXR0cmliXSB8fCB7fSwgZmluYWxWYWx1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNyY09iaiA9IHNyY09ialthdHRyaWJdID0gZmluYWxWYWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBzcmNPYmo7XG59XG5cblxuLyoqXG4gKiBDYXB0dXJlcyBvYmplY3Qgb2YgSlNPTiBkYXRhIGluIHBhcnRpY3VsYXIgc3RhdGVzXG4gKiBAY2xhc3Mge0pTT05pZmllcn1cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBKU09OaWZpZXIge1xuXG4gICAgLyoqXG4gICAgICogQG1ldGhvZCBjb25zdHJ1Y3RvclxuICAgICAqIEBwYXJhbSAge0pTT05pZmllcn0gICAgICBzdGF0ZSAgIEEgSlNPTmlmaWVyIGluc3RhbmNlIHRvIGluaGVyaXQgcHJvcGVydGllcyBmcm9tXG4gICAgICpcbiAgICAgKiBAcGFyYW0gIHtPYmplY3R9ICAgICAgICAgb3BzICAgICAgICAgICAgIE9wdGlvbmFsIHBhcmFtZXRlcnNcbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd9ICAgICAgICAgb3BzLm5hbWVzcGFjZSAgIFBlcmlvZCBzZXBhcmF0ZWQgbmFtZXNwYWNlOiAnYS5iLmMnID0+IHsnYSc6IHsnYic6ICdjJzp7fX19XG4gICAgICogQHBhcmFtICB7SW50ZWdlcn0gICAgICAgIG9wcy5saW1pdCAgICAgICBMaW1pdCB0aGUgbnVtYmVyIG9mIHJlc3BvbnNlcyBmcm9tIHRoaXMgaW5zdGFuY2UgW2RlZmF1bHQ6IHVubGltaXRlZF1cbiAgICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gICAgICAgb3BzLmNvbXBpbGVyICAgIENoYW5nZSB0aGUgd2F5IGFuIGluc3RhbmNlIGJ1aWxkcyBKU09OIG9iamVjdCB7QGxpbmsgY29tcGlsZXJ9XG4gICAgICogQHJldHVybiB7SlNPTmlmaWVyfVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHN0YXRlLCBvcHMpIHtcbiAgICAgICAgdGhpcy5vcHRpb25zID0ge1xuICAgICAgICAgICAgbmFtZXNwYWNlOiB1bmRlZmluZWQsXG4gICAgICAgICAgICBsaW1pdDogLTEsXG4gICAgICAgICAgICBjb21waWxlcjogY29tcGlsZXJcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoc3RhdGUgaW5zdGFuY2VvZiBKU09OaWZpZXIgJiYgXy5pc09iamVjdChvcHMpKSB7XG4gICAgICAgICAgICBfLmV4dGVuZCh0aGlzLm9wdGlvbnMsIG9wcyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoXy5pc09iamVjdChzdGF0ZSkgJiYgXy5pc1VuZGVmaW5lZChvcHMpKSB7XG4gICAgICAgICAgICBfLmV4dGVuZCh0aGlzLm9wdGlvbnMsIHN0YXRlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuc3RhdGUgPSBzdGF0ZSBpbnN0YW5jZW9mIEpTT05pZmllclxuICAgICAgICAgICAgPyBfLmNsb25lRGVlcChzdGF0ZS5zdGF0ZSlcbiAgICAgICAgICAgIDoge31cbiAgICAgICAgICAgIDtcblxuICAgICAgICB0aGlzLl9jdXJyZW50ID0gXy5pc1VuZGVmaW5lZCh0aGlzLm9wdGlvbnMubmFtZXNwYWNlKVxuICAgICAgICAgICAgPyB0aGlzLnN0YXRlXG4gICAgICAgICAgICA6IGNyZWF0ZU9iamVjdCh0aGlzLnN0YXRlLCB0aGlzLm9wdGlvbnMubmFtZXNwYWNlLCB7fSlcbiAgICAgICAgICAgIDtcbiAgICB9XG5cbiAgICBnZXQgc3RhdGUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGF0ZTtcbiAgICB9XG5cbiAgICBzZXQgc3RhdGUoc3RhdGUpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YXRlID0gc3RhdGU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQWRkcyBhbiBlbmhhbmNlZCAnSlNPTiBvYmplY3QnIHRvIHRoZSBjdXJyZW50IGluc3RhbmNlXG4gICAgICpcbiAgICAgKiBAbWV0aG9kIGFkZFxuICAgICAqIEBwYXJhbSAge1N0cmluZ30gICAgICAgICAgICAgICAgICAgICBtZXRob2QgICAgW29wdGlvbmFsXSBEb3Qgbm90YXRpb246IGUuZy4gJ2EnIG9yICdhLmIuYy5kJ1xuICAgICAqIEBwYXJhbSAge09iamVjdHxGdW5jdGlvbnxHZW5lcmF0b3J9ICBZaWVsZCBzdGF0aWMgZGF0YSAob2JqZWN0LCBzdHJpbmcsIG51bWJlciwgZXRjLi4uKVxuICAgICAqL1xuICAgIGFkZChtZXRob2QsIGdlbmVyYXRvcikge1xuICAgICAgICBpZiAoXy5pc1N0cmluZyhtZXRob2QpKSB7XG4gICAgICAgICAgICBjcmVhdGVPYmplY3QodGhpcy5fY3VycmVudCwgbWV0aG9kLCBnZW5lcmF0b3IpO1xuICAgICAgICAgICAgLy9fLmFzc2lnbldpdGgoZ2VuZXJhdG9yLCBnZW5lcmF0b3IsIGR5bmFtaWNDdXN0b21pc2VyKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoXy5pc1VuZGVmaW5lZChnZW5lcmF0b3IpICYmIF8uaXNPYmplY3QobWV0aG9kKSkge1xuICAgICAgICAgICAgXy5hc3NpZ24odGhpcy5fY3VycmVudCwgbWV0aG9kKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhyb3cgRXJyb3IoJ0lsbGVnYWwgdXNlIG9mIGpzb25pZmllciNhZGQnKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBZaWVsZHMgc3RhdGljIEpTT04gb2JqZWN0cyBmcm9tIGFsbCBpbmhlcml0ZWQgaW5zdGFuY2VzXG4gICAgICogQG1ldGhvZCAgYnVpbGRcbiAgICAgKiBAcGFyYW0gICB7T2JqZWN0fSAgICAgICAgICAgICAgICBuYW1lc3BhY2UgLSBbZGVmYXVsdDogYWxsXSBPbmx5IGJ1aWxkIHRoZXNlIG5hbWVzcGFjZXMgW2FycmF5fHN0cmluZ10uXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmVzdCAtIFtkZWZhdWx0OiB0cnVlXSBrZWVwIG5hbWVzcGFjZXMgaW4gZmluYWwgb2JqZWN0LlxuICAgICAqIEByZXR1cm4gIHtHZW5lcmF0b3J9ICAgICAgICAgICAgIHdoaWNoIHlpZWxkcyBKU09OIG9iamVjdHNcbiAgICAgKi9cbiAgICBidWlsZChvcHQpIHtcbiAgICAgICAgbGV0IHN0YXRlID0gdGhpcy5zdGF0ZTtcblxuICAgICAgICBpZiAoXy5pc1N0cmluZyhvcHQpKSB7XG4gICAgICAgICAgICBvcHQgPSB7IG5hbWVzcGFjZTogW29wdF0gfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChfLmlzT2JqZWN0KG9wdCkpIHtcbiAgICAgICAgICAgIGxldCBuYW1lc3BhY2UgPSBvcHQubmFtZXNwYWNlO1xuICAgICAgICAgICAgbGV0IG5lc3QgPSBvcHQubmVzdCB8fCB0cnVlO1xuXG4gICAgICAgICAgICBpZiAoIV8uaXNVbmRlZmluZWQobmFtZXNwYWNlKSkge1xuICAgICAgICAgICAgICAgIG5hbWVzcGFjZSA9IF8uaXNBcnJheShvcHQubmFtZXNwYWNlKVxuICAgICAgICAgICAgICAgICAgICA/IG9wdC5uYW1lc3BhY2VcbiAgICAgICAgICAgICAgICAgICAgOiBbb3B0Lm5hbWVzcGFjZV1cbiAgICAgICAgICAgICAgICAgICAgO1xuICAgICAgICAgICAgICAgIGxldCBrbm93biA9IE9iamVjdC5rZXlzKHRoaXMuc3RhdGUpO1xuICAgICAgICAgICAgICAgIGxldCB1bmtub3duID0gXy5kaWZmZXJlbmNlKG5hbWVzcGFjZSwga25vd24pO1xuICAgICAgICAgICAgICAgIGlmICh1bmtub3duLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIG5hbWVzcGFjZSAnJHt1bmtub3duLmpvaW4oJywgJyl9JzogJHtrbm93bi5qb2luKCcsICcpfWApO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHN0YXRlID0gXy5waWNrKHN0YXRlLCBuYW1lc3BhY2UpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAobmVzdCkge1xuICAgICAgICAgICAgICAgIHN0YXRlID0gXy5hc3NpZ24oe30sIC4uLl8udmFsdWVzKHN0YXRlKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgdGhhdCA9IHRoaXM7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiogaXRlcmFibGVKU09OaWZpZXIoKSB7XG4gICAgICAgICAgICBzdGF0ZSA9IGNvbnZlcnRlcihzdGF0ZSk7XG4gICAgICAgICAgICBmb3IobGV0IGk9MDsgaSAhPSB0aGF0Lm9wdGlvbnMubGltaXQ7IGkgPSAoaSArIDEpICUgTnVtYmVyLk1BWF9TQUZFX0lOVEVHRVIpIHtcbiAgICAgICAgICAgICAgICB5aWVsZCB0aGF0Lm9wdGlvbnMuY29tcGlsZXIoc3RhdGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KCk7XG4gICAgfVxufTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
