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
        let limit = this.options.limit;

        if (_.isString(opt)) {
            opt = {
                namespace: [opt],
                nest: false
            };
        }

        if (_.isObject(opt)) {
            let namespace = opt.namespace;
            let nest = _.isUndefined(opt.nest) ? true : opt.nest;
            limit = opt.limit;

            if (!_.isUndefined(namespace)) {
                namespace = _.isArray(opt.namespace) ? opt.namespace : [opt.namespace];
                let known = Object.keys(this.state);
                let unknown = _.difference(namespace, known);
                if (unknown.length > 0) {
                    throw new Error(`Unknown namespace '${ unknown.join(', ') }': ${ known.join(', ') }`);
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
                while (true) {
                    let result = that.options.compiler(state, iters);
                    if (iters.total > 0) {
                        yield result;
                    } else {
                        return;
                    }
                }
            } else {
                for (let i = 0; i != limit; i = (i + 1) % Number.MAX_SAFE_INTEGER) {
                    // Doesn't matter if that.__iters underflows, wont affect loop
                    yield that.options.compiler(state, iters);
                }
            }
        }();
    }
};
//# sourceMappingURL=data:application/json;base64,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U0FBUyxLQUFLLE9BQUwsQ0FBYSxRQUFiLENBQXNCLEtBQXRCLEVBQTZCLEtBQTdCLENBQVQsQ0FESTtBQUVSLHdCQUFJLE1BQU0sS0FBTixHQUFjLENBQWQsRUFBaUI7QUFDakIsOEJBQU0sTUFBTixDQURpQjtxQkFBckIsTUFFTztBQUNILCtCQURHO3FCQUZQO2lCQUZKO2FBRkosTUFVTztBQUNILHFCQUFJLElBQUksSUFBRSxDQUFGLEVBQUssS0FBSyxLQUFMLEVBQVksSUFBSSxDQUFDLElBQUksQ0FBSixDQUFELEdBQVUsT0FBTyxnQkFBUCxFQUF5Qjs7QUFFNUQsMEJBQU0sS0FBSyxPQUFMLENBQWEsUUFBYixDQUFzQixLQUF0QixFQUE2QixLQUE3QixDQUFOLENBRjREO2lCQUFoRTthQVhKO1NBTEcsRUFBUCxDQXhDTztLQUFYO0NBMUVhIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuY29uc3QgXyA9IHJlcXVpcmUoJ2xvZGFzaCcpO1xuXG4vKipcbiAqIFdhbGtzIGFuIG9iamVjdCBhcHBseWluZyBhIGZ1bmN0aW9uIHRvIGxlYWYgbm9kZXNcbiAqXG4gKiBcdElmIG5vIGZ1bmN0aW9uIGlzIGdpdmVuLCB3YWxrIHJldHVybnMgYSBkZWVwIGNvcHkuXG4gKlxuICogQG1ldGhvZCB3YWxrZXJcbiAqIEBwYXJhbSAge09iamVjdH0gICAgIHNyYyAgICAgT2JqZWN0IHRvIHdhbGtcbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSAgIGZuICAgICAgRnVuY3Rpb24gdG8gYXBwbHkgdG8gbGVhZiBub2RlcyBpbiBPYmplY3RcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqL1xuZnVuY3Rpb24gd2Fsa2VyKHNyYywgZm49Xy5pZGVudGl0eSkge1xuICAgIGZ1bmN0aW9uIHdhbGsob2JqLCBwYXJlbnQsIGtleSkge1xuICAgICAgICBpZiAoXy5pc0FycmF5KG9iaikpIHtcbiAgICAgICAgICAgIHJldHVybiBvYmoubWFwKChvLCBpKSA9PiB3YWxrKG8sIG9iaiwgaSkpO1xuICAgICAgICB9IGVsc2UgaWYgKF8uaXNPYmplY3Qob2JqKSAmJiAhXy5pc0Z1bmN0aW9uKG9iaikpIHtcbiAgICAgICAgICAgIGxldCByZXN1bHQgPSB7fTtcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKG9iaikuZm9yRWFjaChrID0+IHJlc3VsdFtrXSA9IHdhbGsob2JqW2tdLCBvYmosIGspKTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZuKG9iaiwgcGFyZW50LCBrZXkpO1xuICAgIH1cbiAgICByZXR1cm4gd2FsayhzcmMsIG51bGwsIG51bGwpO1xufVxuXG5cbi8qKlxuICogUnVucyBhbGwgZnVuY3Rpb25zIHRvIHByb2R1Y2Ugb2JqZWN0IHdpdGggbGVhZiBub2RlcyBvZiBwcmltaXRpdmVzXG4gKiBAbWV0aG9kXG4gKiBAcGFyYW0gIHtPYmplY3R9IG9iaiBPYmplY3QgdG8gYmUgY29udmVydGVkXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKi9cbmxldCBjb21waWxlciA9IChvYmosIGl0ZXJzV2FpdGluZykgPT4gd2Fsa2VyKG9iaiwgKG8sIHBhcmVudCwga2V5KSA9PiB7XG4gICAgaWYgKCFfLmlzRnVuY3Rpb24obykpIHtcbiAgICAgICAgcmV0dXJuIG87XG4gICAgfVxuICAgIGxldCByZXN1bHQgPSBvKCk7XG4gICAgLy8gSGFjayB0byBmaWd1cmUgb3V0IGlmIHdlJ3JlIGdldHRpbmcgdGhlIHJlc3VsdCBvZiBhbiBpdGVyYXRvclxuICAgIGlmIChPYmplY3Qua2V5cyhyZXN1bHQpLmxlbmd0aCA9PT0gMiAmJiBfLmhhcyhyZXN1bHQsICd2YWx1ZScsICdkb25lJykpIHtcbiAgICAgICAgaWYgKHJlc3VsdC5kb25lKSB7XG4gICAgICAgICAgICBpdGVyc1dhaXRpbmcudG90YWwtLTtcbiAgICAgICAgICAgIC8vIFN0b3AgaXRlcmF0b3IgYmVpbmcgY2FsbGVkXG4gICAgICAgICAgICBwYXJlbnRba2V5XSA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0LnZhbHVlO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufSk7XG5cblxuLyoqXG4gKiBDb252ZXJ0cyBHZW5lcmF0b3JzIHRvIEl0ZXJhdG9yc1xuICogQG1ldGhvZFxuICogQHBhcmFtICB7T2JqZWN0fSBvYmogT2JqZWN0IHRvIGJlIGNvbnZlcnRlZFxuICogQHJldHVybiB7T2JqZWN0fVxuICovXG5sZXQgY29udmVydGVyID0gKG9iaiwgaXRlcnNGb3VuZCkgPT4gd2Fsa2VyKG9iaiwgZnVuY3Rpb24gY29udmVydEdlbihvKSB7XG4gICAgaWYgKF8uaXNGdW5jdGlvbihvKSkge1xuICAgICAgICBsZXQgcmVzdWx0ID0gbygpO1xuICAgICAgICBpZiAocmVzdWx0LnRvU3RyaW5nKCkgPT09ICdbb2JqZWN0IEdlbmVyYXRvcl0nKSB7XG4gICAgICAgICAgICBpdGVyc0ZvdW5kLnRvdGFsKys7XG4gICAgICAgICAgICByZXR1cm4gKCkgPT4gcmVzdWx0Lm5leHQoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbztcbn0pO1xuXG5cbi8qKlxuICogRXh0ZW5kcyBhbiBvYmplY3QgdG8gbWFrZSBzdXJlIGl0IGhhcyBjaGlsZCBhdHRyaWJ1dGVzXG4gKlxuICogQG1ldGhvZCBjcmVhdGVPYmplY3RcbiAqIEBwYXJhbSAge09iamVjdH0gICAgIHNyY09iaiAgICAgIFRoZSB0YXJnZXQgb2JqZWN0XG4gKiBAcGFyYW0gIHtTdHJpbmd9ICAgICByZWYgICAgICAgICBQZXJpb2Qgc2VwYXJhdGVkIGRlc2NyaXB0aW9uOlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXHRhLmIuYyA9PiB7YToge2I6IHtjOiB7fX19fVxuICogQHBhcmFtICB7T2JqZWN0fSAgICAgZmluYWxWYWx1ZSAgW29wdGlvbmFsXSBmaW5hbCB2YWx1ZSB0byBhc3NpZ24gdG8gbGVhZiBub2RlOlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXHRhLmIuYyAoZmluYWwgJ2ZvbycpID0+IHthOiB7Yjoge2M6ICdmb28nfX19XG4gKiBAcmV0dXJuIHtPYmplY3QgUmVmfSBUaGUgZmluYWwgb2JqZWN0cyAnYS5iLmMnID0+IHtjOiB7fX1cbiAqL1xuZnVuY3Rpb24gY3JlYXRlT2JqZWN0KHNyY09iaiwgcmVmLCBmaW5hbFZhbHVlKSB7XG4gICAgbGV0IHN0ZXBzID0gcmVmLnNwbGl0KCcuJyk7XG5cbiAgICBzdGVwcy5mb3JFYWNoKChhdHRyaWIsIGluZGV4KSA9PiB7XG4gICAgICAgIHNyY09ialthdHRyaWJdID0gc3JjT2JqLmhhc093blByb3BlcnR5KGF0dHJpYikgJiYgXy5pc09iamVjdChzcmNPYmpbYXR0cmliXSlcbiAgICAgICAgICAgID8gc3JjT2JqW2F0dHJpYl1cbiAgICAgICAgICAgIDoge31cbiAgICAgICAgICAgIDtcbiAgICAgICAgaWYgKGluZGV4IDwgc3RlcHMubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgc3JjT2JqID0gc3JjT2JqW2F0dHJpYl07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoXy5pc09iamVjdChmaW5hbFZhbHVlKSAmJiAhXy5pc0Z1bmN0aW9uKGZpbmFsVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgc3JjT2JqID0gXy5leHRlbmQoc3JjT2JqW2F0dHJpYl0gfHwge30sIGZpbmFsVmFsdWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzcmNPYmogPSBzcmNPYmpbYXR0cmliXSA9IGZpbmFsVmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gc3JjT2JqO1xufVxuXG5cbi8qKlxuICogQ2FwdHVyZXMgb2JqZWN0IG9mIEpTT04gZGF0YSBpbiBwYXJ0aWN1bGFyIHN0YXRlc1xuICogQGNsYXNzIHtKU09OaWZpZXJ9XG4gKi9cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgSlNPTmlmaWVyIHtcblxuICAgIC8qKlxuICAgICAqIEBtZXRob2QgY29uc3RydWN0b3JcbiAgICAgKiBAcGFyYW0gIHtKU09OaWZpZXJ9ICAgICAgc3RhdGUgICBBIEpTT05pZmllciBpbnN0YW5jZSB0byBpbmhlcml0IHByb3BlcnRpZXMgZnJvbVxuICAgICAqXG4gICAgICogQHBhcmFtICB7T2JqZWN0fSAgICAgICAgIG9wcyAgICAgICAgICAgICBPcHRpb25hbCBwYXJhbWV0ZXJzXG4gICAgICogQHBhcmFtICB7U3RyaW5nfSAgICAgICAgIG9wcy5uYW1lc3BhY2UgICBQZXJpb2Qgc2VwYXJhdGVkIG5hbWVzcGFjZTogJ2EuYi5jJyA9PiB7J2EnOiB7J2InOiAnYyc6e319fVxuICAgICAqIEBwYXJhbSAge0Z1bmN0aW9ufSAgICAgICBvcHMuY29tcGlsZXIgICAgQ2hhbmdlIHRoZSB3YXkgYW4gaW5zdGFuY2UgYnVpbGRzIEpTT04gb2JqZWN0IHtAbGluayBjb21waWxlcn1cbiAgICAgKiBAcmV0dXJuIHtKU09OaWZpZXJ9XG4gICAgICovXG4gICAgY29uc3RydWN0b3Ioc3RhdGUsIG9wcykge1xuICAgICAgICB0aGlzLm9wdGlvbnMgPSB7XG4gICAgICAgICAgICBuYW1lc3BhY2U6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIGxpbWl0OiB1bmRlZmluZWQsXG4gICAgICAgICAgICBjb21waWxlcjogY29tcGlsZXJcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoc3RhdGUgaW5zdGFuY2VvZiBKU09OaWZpZXIgJiYgXy5pc09iamVjdChvcHMpKSB7XG4gICAgICAgICAgICBfLmV4dGVuZCh0aGlzLm9wdGlvbnMsIG9wcyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoXy5pc09iamVjdChzdGF0ZSkgJiYgXy5pc1VuZGVmaW5lZChvcHMpKSB7XG4gICAgICAgICAgICBfLmV4dGVuZCh0aGlzLm9wdGlvbnMsIHN0YXRlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuc3RhdGUgPSBzdGF0ZSBpbnN0YW5jZW9mIEpTT05pZmllclxuICAgICAgICAgICAgPyBfLmNsb25lRGVlcChzdGF0ZS5zdGF0ZSlcbiAgICAgICAgICAgIDoge31cbiAgICAgICAgICAgIDtcblxuICAgICAgICB0aGlzLl9jdXJyZW50ID0gXy5pc1VuZGVmaW5lZCh0aGlzLm9wdGlvbnMubmFtZXNwYWNlKVxuICAgICAgICAgICAgPyB0aGlzLnN0YXRlXG4gICAgICAgICAgICA6IGNyZWF0ZU9iamVjdCh0aGlzLnN0YXRlLCB0aGlzLm9wdGlvbnMubmFtZXNwYWNlLCB7fSlcbiAgICAgICAgICAgIDtcbiAgICB9XG5cbiAgICBnZXQgc3RhdGUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGF0ZTtcbiAgICB9XG5cbiAgICBzZXQgc3RhdGUoc3RhdGUpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YXRlID0gc3RhdGU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQWRkcyBhbiBlbmhhbmNlZCAnSlNPTiBvYmplY3QnIHRvIHRoZSBjdXJyZW50IGluc3RhbmNlXG4gICAgICpcbiAgICAgKiBAbWV0aG9kIGFkZFxuICAgICAqIEBwYXJhbSAge1N0cmluZ30gICAgICAgICAgICAgICAgICAgICBtZXRob2QgICAgW29wdGlvbmFsXSBEb3Qgbm90YXRpb246IGUuZy4gJ2EnIG9yICdhLmIuYy5kJ1xuICAgICAqIEBwYXJhbSAge09iamVjdHxGdW5jdGlvbnxHZW5lcmF0b3J9ICBZaWVsZCBzdGF0aWMgZGF0YSAob2JqZWN0LCBzdHJpbmcsIG51bWJlciwgZXRjLi4uKVxuICAgICAqL1xuICAgIGFkZChtZXRob2QsIGdlbmVyYXRvcikge1xuICAgICAgICBpZiAoXy5pc1N0cmluZyhtZXRob2QpKSB7XG4gICAgICAgICAgICBjcmVhdGVPYmplY3QodGhpcy5fY3VycmVudCwgbWV0aG9kLCBnZW5lcmF0b3IpO1xuICAgICAgICAgICAgLy9fLmFzc2lnbldpdGgoZ2VuZXJhdG9yLCBnZW5lcmF0b3IsIGR5bmFtaWNDdXN0b21pc2VyKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoXy5pc1VuZGVmaW5lZChnZW5lcmF0b3IpICYmIF8uaXNPYmplY3QobWV0aG9kKSkge1xuICAgICAgICAgICAgXy5hc3NpZ24odGhpcy5fY3VycmVudCwgbWV0aG9kKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhyb3cgRXJyb3IoJ0lsbGVnYWwgdXNlIG9mIGpzb25pZmllciNhZGQnKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBZaWVsZHMgc3RhdGljIEpTT04gb2JqZWN0cyBmcm9tIGFsbCBpbmhlcml0ZWQgaW5zdGFuY2VzXG4gICAgICogQG1ldGhvZCAgYnVpbGRcbiAgICAgKiBAcGFyYW0gICB7T2JqZWN0fSAgICAgICAgICAgICAgICBuYW1lc3BhY2UgLSBbZGVmYXVsdDogYWxsXSBPbmx5IGJ1aWxkIHRoZXNlIG5hbWVzcGFjZXMgW2FycmF5fHN0cmluZ10uXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmVzdCAtIFtkZWZhdWx0OiB0cnVlXSBrZWVwIG5hbWVzcGFjZXMgaW4gZmluYWwgb2JqZWN0LlxuICAgICAqIEByZXR1cm4gIHtHZW5lcmF0b3J9ICAgICAgICAgICAgIHdoaWNoIHlpZWxkcyBKU09OIG9iamVjdHNcbiAgICAgKi9cbiAgICBidWlsZChvcHQpIHtcbiAgICAgICAgbGV0IHN0YXRlID0gdGhpcy5zdGF0ZTtcbiAgICAgICAgbGV0IGxpbWl0ID0gdGhpcy5vcHRpb25zLmxpbWl0O1xuXG4gICAgICAgIGlmIChfLmlzU3RyaW5nKG9wdCkpIHtcbiAgICAgICAgICAgIG9wdCA9IHtcbiAgICAgICAgICAgICAgICBuYW1lc3BhY2U6IFtvcHRdLFxuICAgICAgICAgICAgICAgIG5lc3Q6IGZhbHNlXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKF8uaXNPYmplY3Qob3B0KSkge1xuICAgICAgICAgICAgbGV0IG5hbWVzcGFjZSA9IG9wdC5uYW1lc3BhY2U7XG4gICAgICAgICAgICBsZXQgbmVzdCA9IF8uaXNVbmRlZmluZWQob3B0Lm5lc3QpXG4gICAgICAgICAgICAgICAgPyB0cnVlXG4gICAgICAgICAgICAgICAgOiBvcHQubmVzdFxuICAgICAgICAgICAgICAgIDtcbiAgICAgICAgICAgIGxpbWl0ID0gb3B0LmxpbWl0O1xuXG4gICAgICAgICAgICBpZiAoIV8uaXNVbmRlZmluZWQobmFtZXNwYWNlKSkge1xuICAgICAgICAgICAgICAgIG5hbWVzcGFjZSA9IF8uaXNBcnJheShvcHQubmFtZXNwYWNlKVxuICAgICAgICAgICAgICAgICAgICA/IG9wdC5uYW1lc3BhY2VcbiAgICAgICAgICAgICAgICAgICAgOiBbb3B0Lm5hbWVzcGFjZV1cbiAgICAgICAgICAgICAgICAgICAgO1xuICAgICAgICAgICAgICAgIGxldCBrbm93biA9IE9iamVjdC5rZXlzKHRoaXMuc3RhdGUpO1xuICAgICAgICAgICAgICAgIGxldCB1bmtub3duID0gXy5kaWZmZXJlbmNlKG5hbWVzcGFjZSwga25vd24pO1xuICAgICAgICAgICAgICAgIGlmICh1bmtub3duLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIG5hbWVzcGFjZSAnJHt1bmtub3duLmpvaW4oJywgJyl9JzogJHtrbm93bi5qb2luKCcsICcpfWApO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHN0YXRlID0gXy5waWNrKHN0YXRlLCBuYW1lc3BhY2UpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIW5lc3QpIHtcbiAgICAgICAgICAgICAgICBzdGF0ZSA9IF8uYXNzaWduKHt9LCAuLi5fLnZhbHVlcyhzdGF0ZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cblxuICAgICAgICBsZXQgdGhhdCA9IHRoaXM7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiogaXRlcmFibGVKU09OaWZpZXIoKSB7XG4gICAgICAgICAgICAvLyBXZSB1c2UgYW4gb2JqZWN0IGhlcmUgc28gd2UgY2FuIHBhc3MgYW4gaXRlciBjb3VudCBieSByZWZlcmVuY2UgdG8gY29tcGlsZXIgJiBjb252ZXJ0ZXJcbiAgICAgICAgICAgIGxldCBpdGVycyA9IHsgdG90YWw6IDAgfTtcbiAgICAgICAgICAgIHN0YXRlID0gY29udmVydGVyKHN0YXRlLCBpdGVycyk7XG5cbiAgICAgICAgICAgIGlmIChfLmlzVW5kZWZpbmVkKGxpbWl0KSAmJiBpdGVycy50b3RhbCA+IDApIHtcbiAgICAgICAgICAgICAgICAvKmVzbGludCBuby1jb25zdGFudC1jb25kaXRpb246MCAqL1xuICAgICAgICAgICAgICAgIHdoaWxlKHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHJlc3VsdCA9IHRoYXQub3B0aW9ucy5jb21waWxlcihzdGF0ZSwgaXRlcnMpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXRlcnMudG90YWwgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB5aWVsZCByZXN1bHQ7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZvcihsZXQgaT0wOyBpICE9IGxpbWl0OyBpID0gKGkgKyAxKSAlIE51bWJlci5NQVhfU0FGRV9JTlRFR0VSKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIERvZXNuJ3QgbWF0dGVyIGlmIHRoYXQuX19pdGVycyB1bmRlcmZsb3dzLCB3b250IGFmZmVjdCBsb29wXG4gICAgICAgICAgICAgICAgICAgIHlpZWxkIHRoYXQub3B0aW9ucy5jb21waWxlcihzdGF0ZSwgaXRlcnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSgpO1xuICAgIH1cbn07XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
