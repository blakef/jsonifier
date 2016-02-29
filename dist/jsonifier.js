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

// compile Run all functions
let compiler = obj => walker(obj, o => _.isFunction(o) ? o() : o);

// Convert Generators to Iterators
let converter = obj => walker(obj, function convertGen(o) {
    if (_.isFunction(o)) {
        let result = o();
        if (result.toString() === '[object Generator]') {
            o = () => result.next().value;
        }
    }
    return o;
});

function walker(src) {
    let fn = arguments.length <= 1 || arguments[1] === undefined ? _.identity : arguments[1];

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
     * @param   {String}    namespace   [optional] Namespace to build, defaults to all.
     * @return  {Generator}             which yields JSON objects
     */
    build(namespace) {
        if (namespace && !_.has(this.state, namespace)) {
            let namespaces = Object.keys(this.state).join(', ');
            throw Error(`Unknown namespace '${ namespace }': ${ namespaces }`);
        }
        let state = _.isUndefined(namespace) ? this.state : this.state[namespace];
        let that = this;
        return function* iterableJSONifier() {
            state = converter(state);
            for (let i = 0; i != that.options.limit; i = (i + 1) % Number.MAX_SAFE_INTEGER) {
                yield that.options.compiler(state);
            }
        }();
    }
};
//# sourceMappingURL=data:application/json;base64,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QUFELEVBQStCO0FBQzVDLGdCQUFJLGFBQWEsT0FBTyxJQUFQLENBQVksS0FBSyxLQUFMLENBQVosQ0FBd0IsSUFBeEIsQ0FBNkIsSUFBN0IsQ0FBYixDQUR3QztBQUU1QyxrQkFBTSxNQUFNLENBQUMsbUJBQUQsR0FBc0IsU0FBdEIsRUFBZ0MsR0FBaEMsR0FBcUMsVUFBckMsRUFBZ0QsQ0FBdEQsQ0FBTixDQUY0QztTQUFoRDtBQUlBLFlBQUksUUFBUSxFQUFFLFdBQUYsQ0FBYyxTQUFkLElBQ04sS0FBSyxLQUFMLEdBQ0EsS0FBSyxLQUFMLENBQVcsU0FBWCxDQUZNLENBTEM7QUFTYixZQUFJLE9BQU8sSUFBUCxDQVRTO0FBVWIsZUFBTyxVQUFVLGlCQUFWLEdBQThCO0FBQ2pDLG9CQUFRLFVBQVUsS0FBVixDQUFSLENBRGlDO0FBRWpDLGlCQUFJLElBQUksSUFBRSxDQUFGLEVBQUssS0FBSyxLQUFLLE9BQUwsQ0FBYSxLQUFiLEVBQW9CLElBQUksQ0FBQyxJQUFJLENBQUosQ0FBRCxHQUFVLE9BQU8sZ0JBQVAsRUFBeUI7QUFDekUsc0JBQU0sS0FBSyxPQUFMLENBQWEsUUFBYixDQUFzQixLQUF0QixDQUFOLENBRHlFO2FBQTdFO1NBRkcsRUFBUCxDQVZhO0tBQWpCO0NBMUVhIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuY29uc3QgXyA9IHJlcXVpcmUoJ2xvZGFzaCcpO1xuXG4vKipcbiAqIENvbnZlcnRzIG9iamVjdCB0byBvbmx5IGNvbnRhaW4gc3RhdGljIGRhdGFcbiAqXG4gKiBcdE91ciBzdGF0ZSBkYXRhIGVpdGhlciBoYXMgc3RhdGljIGxlYWYgdmFsdWVzIG9yIGZ1bmN0aW9ucyB3aGljaCB5aWVsZCBzdGF0aWNcbiAqIFx0dmFsdWVzLiAgVGhpcyBjb252ZXJzdCB0aGUgZW50aXJlIG9iamVjdCB0byBvbmx5IGNvbnRhaW4gc3RhdGljIGRhdGEgKHN1YmplY3RcbiAqIFx0dG8gdXNlcnMgY3JlYXRpbmcgZnVuY3Rpb25zIHdoaWNoIF9vbmx5XyB5aWVsZCBzdGF0aWMgb3V0cHV0KVxuICpcbiAqIEBtZXRob2QgY29tcGlsZXJcbiAqIEBwYXJhbSAge09iamVjdH0gb2JqIFR5cGljYWxseSBqc29uaWZpZXIgc3RhdGUgb2JqZWN0XG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKi9cblxuLy8gY29tcGlsZSBSdW4gYWxsIGZ1bmN0aW9uc1xubGV0IGNvbXBpbGVyID0gKG9iaikgPT4gd2Fsa2VyKG9iaiwgbyA9PiBfLmlzRnVuY3Rpb24obykgPyBvKCkgOiBvKTtcblxuLy8gQ29udmVydCBHZW5lcmF0b3JzIHRvIEl0ZXJhdG9yc1xubGV0IGNvbnZlcnRlciA9IChvYmopID0+IHdhbGtlcihvYmosIGZ1bmN0aW9uIGNvbnZlcnRHZW4obykge1xuICAgIGlmIChfLmlzRnVuY3Rpb24obykpIHtcbiAgICAgICAgbGV0IHJlc3VsdCA9IG8oKTtcbiAgICAgICAgaWYgKHJlc3VsdC50b1N0cmluZygpID09PSAnW29iamVjdCBHZW5lcmF0b3JdJykge1xuICAgICAgICAgICAgbyA9ICgpID0+IHJlc3VsdC5uZXh0KCkudmFsdWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG87XG59KTtcblxuXG5mdW5jdGlvbiB3YWxrZXIoc3JjLCBmbj1fLmlkZW50aXR5KSB7XG4gICAgZnVuY3Rpb24gd2FsayhvYmopIHtcbiAgICAgICAgaWYgKF8uaXNPYmplY3Qob2JqKSAmJiAhXy5pc0Z1bmN0aW9uKG9iaikpIHtcbiAgICAgICAgICAgIGxldCByZXN1bHQgPSB7fTtcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKG9iaikuZm9yRWFjaChrZXkgPT4gcmVzdWx0W2tleV0gPSB3YWxrKG9ialtrZXldKSk7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmbihvYmopO1xuICAgIH1cbiAgICByZXR1cm4gd2FsayhzcmMpO1xufVxuXG5cbi8qKlxuICogRXh0ZW5kcyBhbiBvYmplY3QgdG8gbWFrZSBzdXJlIGl0IGhhcyBjaGlsZCBhdHRyaWJ1dGVzXG4gKlxuICogQG1ldGhvZCBjcmVhdGVPYmplY3RcbiAqIEBwYXJhbSAge09iamVjdH0gICAgIHNyY09iaiAgICAgIFRoZSB0YXJnZXQgb2JqZWN0XG4gKiBAcGFyYW0gIHtTdHJpbmd9ICAgICByZWYgICAgICAgICBQZXJpb2Qgc2VwYXJhdGVkIGRlc2NyaXB0aW9uOlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXHRhLmIuYyA9PiB7YToge2I6IHtjOiB7fX19fVxuICogQHBhcmFtICB7T2JqZWN0fSAgICAgZmluYWxWYWx1ZSAgW29wdGlvbmFsXSBmaW5hbCB2YWx1ZSB0byBhc3NpZ24gdG8gbGVhZiBub2RlOlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXHRhLmIuYyAoZmluYWwgJ2ZvbycpID0+IHthOiB7Yjoge2M6ICdmb28nfX19XG4gKiBAcmV0dXJuIHtPYmplY3QgUmVmfSBUaGUgZmluYWwgb2JqZWN0cyAnYS5iLmMnID0+IHtjOiB7fX1cbiAqL1xuZnVuY3Rpb24gY3JlYXRlT2JqZWN0KHNyY09iaiwgcmVmLCBmaW5hbFZhbHVlKSB7XG4gICAgbGV0IHN0ZXBzID0gcmVmLnNwbGl0KCcuJyk7XG5cbiAgICBzdGVwcy5mb3JFYWNoKChhdHRyaWIsIGluZGV4KSA9PiB7XG4gICAgICAgIHNyY09ialthdHRyaWJdID0gc3JjT2JqLmhhc093blByb3BlcnR5KGF0dHJpYikgJiYgXy5pc09iamVjdChzcmNPYmpbYXR0cmliXSlcbiAgICAgICAgICAgID8gc3JjT2JqW2F0dHJpYl1cbiAgICAgICAgICAgIDoge31cbiAgICAgICAgICAgIDtcbiAgICAgICAgaWYgKGluZGV4IDwgc3RlcHMubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgc3JjT2JqID0gc3JjT2JqW2F0dHJpYl07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoXy5pc09iamVjdChmaW5hbFZhbHVlKSAmJiAhXy5pc0Z1bmN0aW9uKGZpbmFsVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgc3JjT2JqID0gXy5leHRlbmQoc3JjT2JqW2F0dHJpYl0gfHwge30sIGZpbmFsVmFsdWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzcmNPYmogPSBzcmNPYmpbYXR0cmliXSA9IGZpbmFsVmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gc3JjT2JqO1xufVxuXG5cbi8qKlxuICogQ2FwdHVyZXMgb2JqZWN0IG9mIEpTT04gZGF0YSBpbiBwYXJ0aWN1bGFyIHN0YXRlc1xuICogQGNsYXNzIHtKU09OaWZpZXJ9XG4gKi9cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgSlNPTmlmaWVyIHtcblxuICAgIC8qKlxuICAgICAqIEBtZXRob2QgY29uc3RydWN0b3JcbiAgICAgKiBAcGFyYW0gIHtKU09OaWZpZXJ9ICAgICAgc3RhdGUgICBBIEpTT05pZmllciBpbnN0YW5jZSB0byBpbmhlcml0IHByb3BlcnRpZXMgZnJvbVxuICAgICAqXG4gICAgICogQHBhcmFtICB7T2JqZWN0fSAgICAgICAgIG9wcyAgICAgICAgICAgICBPcHRpb25hbCBwYXJhbWV0ZXJzXG4gICAgICogQHBhcmFtICB7U3RyaW5nfSAgICAgICAgIG9wcy5uYW1lc3BhY2UgICBQZXJpb2Qgc2VwYXJhdGVkIG5hbWVzcGFjZTogJ2EuYi5jJyA9PiB7J2EnOiB7J2InOiAnYyc6e319fVxuICAgICAqIEBwYXJhbSAge0ludGVnZXJ9ICAgICAgICBvcHMubGltaXQgICAgICAgTGltaXQgdGhlIG51bWJlciBvZiByZXNwb25zZXMgZnJvbSB0aGlzIGluc3RhbmNlIFtkZWZhdWx0OiB1bmxpbWl0ZWRdXG4gICAgICogQHBhcmFtICB7RnVuY3Rpb259ICAgICAgIG9wcy5jb21waWxlciAgICBDaGFuZ2UgdGhlIHdheSBhbiBpbnN0YW5jZSBidWlsZHMgSlNPTiBvYmplY3Qge0BsaW5rIGNvbXBpbGVyfVxuICAgICAqIEByZXR1cm4ge0pTT05pZmllcn1cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihzdGF0ZSwgb3BzKSB7XG4gICAgICAgIHRoaXMub3B0aW9ucyA9IHtcbiAgICAgICAgICAgIG5hbWVzcGFjZTogdW5kZWZpbmVkLFxuICAgICAgICAgICAgbGltaXQ6IC0xLFxuICAgICAgICAgICAgY29tcGlsZXI6IGNvbXBpbGVyXG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHN0YXRlIGluc3RhbmNlb2YgSlNPTmlmaWVyICYmIF8uaXNPYmplY3Qob3BzKSkge1xuICAgICAgICAgICAgXy5leHRlbmQodGhpcy5vcHRpb25zLCBvcHMpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKF8uaXNPYmplY3Qoc3RhdGUpICYmIF8uaXNVbmRlZmluZWQob3BzKSkge1xuICAgICAgICAgICAgXy5leHRlbmQodGhpcy5vcHRpb25zLCBzdGF0ZSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnN0YXRlID0gc3RhdGUgaW5zdGFuY2VvZiBKU09OaWZpZXJcbiAgICAgICAgICAgID8gXy5jbG9uZURlZXAoc3RhdGUuc3RhdGUpXG4gICAgICAgICAgICA6IHt9XG4gICAgICAgICAgICA7XG5cbiAgICAgICAgdGhpcy5fY3VycmVudCA9IF8uaXNVbmRlZmluZWQodGhpcy5vcHRpb25zLm5hbWVzcGFjZSlcbiAgICAgICAgICAgID8gdGhpcy5zdGF0ZVxuICAgICAgICAgICAgOiBjcmVhdGVPYmplY3QodGhpcy5zdGF0ZSwgdGhpcy5vcHRpb25zLm5hbWVzcGFjZSwge30pXG4gICAgICAgICAgICA7XG4gICAgfVxuXG4gICAgZ2V0IHN0YXRlKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhdGU7XG4gICAgfVxuXG4gICAgc2V0IHN0YXRlKHN0YXRlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGF0ZSA9IHN0YXRlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEFkZHMgYW4gZW5oYW5jZWQgJ0pTT04gb2JqZWN0JyB0byB0aGUgY3VycmVudCBpbnN0YW5jZVxuICAgICAqXG4gICAgICogQG1ldGhvZCBhZGRcbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd9ICAgICAgICAgICAgICAgICAgICAgbWV0aG9kICAgIFtvcHRpb25hbF0gRG90IG5vdGF0aW9uOiBlLmcuICdhJyBvciAnYS5iLmMuZCdcbiAgICAgKiBAcGFyYW0gIHtPYmplY3R8RnVuY3Rpb258R2VuZXJhdG9yfSAgWWllbGQgc3RhdGljIGRhdGEgKG9iamVjdCwgc3RyaW5nLCBudW1iZXIsIGV0Yy4uLilcbiAgICAgKi9cbiAgICBhZGQobWV0aG9kLCBnZW5lcmF0b3IpIHtcbiAgICAgICAgaWYgKF8uaXNTdHJpbmcobWV0aG9kKSkge1xuICAgICAgICAgICAgY3JlYXRlT2JqZWN0KHRoaXMuX2N1cnJlbnQsIG1ldGhvZCwgZ2VuZXJhdG9yKTtcbiAgICAgICAgICAgIC8vXy5hc3NpZ25XaXRoKGdlbmVyYXRvciwgZ2VuZXJhdG9yLCBkeW5hbWljQ3VzdG9taXNlcilcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKF8uaXNVbmRlZmluZWQoZ2VuZXJhdG9yKSAmJiBfLmlzT2JqZWN0KG1ldGhvZCkpIHtcbiAgICAgICAgICAgIF8uYXNzaWduKHRoaXMuX2N1cnJlbnQsIG1ldGhvZCk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIHRocm93IEVycm9yKCdJbGxlZ2FsIHVzZSBvZiBqc29uaWZpZXIjYWRkJyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogWWllbGRzIHN0YXRpYyBKU09OIG9iamVjdHMgZnJvbSBhbGwgaW5oZXJpdGVkIGluc3RhbmNlc1xuICAgICAqIEBtZXRob2QgIGJ1aWxkXG4gICAgICogQHBhcmFtICAge1N0cmluZ30gICAgbmFtZXNwYWNlICAgW29wdGlvbmFsXSBOYW1lc3BhY2UgdG8gYnVpbGQsIGRlZmF1bHRzIHRvIGFsbC5cbiAgICAgKiBAcmV0dXJuICB7R2VuZXJhdG9yfSAgICAgICAgICAgICB3aGljaCB5aWVsZHMgSlNPTiBvYmplY3RzXG4gICAgICovXG4gICAgYnVpbGQobmFtZXNwYWNlKSB7XG4gICAgICAgIGlmIChuYW1lc3BhY2UgJiYgIV8uaGFzKHRoaXMuc3RhdGUsIG5hbWVzcGFjZSkpIHtcbiAgICAgICAgICAgIGxldCBuYW1lc3BhY2VzID0gT2JqZWN0LmtleXModGhpcy5zdGF0ZSkuam9pbignLCAnKTtcbiAgICAgICAgICAgIHRocm93IEVycm9yKGBVbmtub3duIG5hbWVzcGFjZSAnJHtuYW1lc3BhY2V9JzogJHtuYW1lc3BhY2VzfWApO1xuICAgICAgICB9XG4gICAgICAgIGxldCBzdGF0ZSA9IF8uaXNVbmRlZmluZWQobmFtZXNwYWNlKVxuICAgICAgICAgICAgPyB0aGlzLnN0YXRlXG4gICAgICAgICAgICA6IHRoaXMuc3RhdGVbbmFtZXNwYWNlXVxuICAgICAgICAgICAgO1xuICAgICAgICBsZXQgdGhhdCA9IHRoaXM7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiogaXRlcmFibGVKU09OaWZpZXIoKSB7XG4gICAgICAgICAgICBzdGF0ZSA9IGNvbnZlcnRlcihzdGF0ZSk7XG4gICAgICAgICAgICBmb3IobGV0IGk9MDsgaSAhPSB0aGF0Lm9wdGlvbnMubGltaXQ7IGkgPSAoaSArIDEpICUgTnVtYmVyLk1BWF9TQUZFX0lOVEVHRVIpIHtcbiAgICAgICAgICAgICAgICB5aWVsZCB0aGF0Lm9wdGlvbnMuY29tcGlsZXIoc3RhdGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KCk7XG4gICAgfVxufTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
