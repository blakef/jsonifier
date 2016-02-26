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
            for (let i = 0; i != that.options.limit; i = (i + 1) % Number.MAX_SAFE_INTEGER) {
                yield that.options.compiler(that.state);
            }
        }();
    }
};
//# sourceMappingURL=data:application/json;base64,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YSxRQUFiLENBQXNCLEtBQUssS0FBTCxDQUE1QixDQUR5RTthQUE3RTtTQURHLEVBQVAsQ0FGSTtLQUFSO0NBeEVhIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuY29uc3QgXyA9IHJlcXVpcmUoJ2xvZGFzaCcpO1xuXG4vKipcbiAqIENvbnZlcnRzIG9iamVjdCB0byBvbmx5IGNvbnRhaW4gc3RhdGljIGRhdGFcbiAqXG4gKiBcdE91ciBzdGF0ZSBkYXRhIGVpdGhlciBoYXMgc3RhdGljIGxlYWYgdmFsdWVzIG9yIGZ1bmN0aW9ucyB3aGljaCB5aWVsZCBzdGF0aWNcbiAqIFx0dmFsdWVzLiAgVGhpcyBjb252ZXJzdCB0aGUgZW50aXJlIG9iamVjdCB0byBvbmx5IGNvbnRhaW4gc3RhdGljIGRhdGEgKHN1YmplY3RcbiAqIFx0dG8gdXNlcnMgY3JlYXRpbmcgZnVuY3Rpb25zIHdoaWNoIF9vbmx5XyB5aWVsZCBzdGF0aWMgb3V0cHV0KVxuICpcbiAqIEBtZXRob2QgY29tcGlsZXJcbiAqIEBwYXJhbSAge09iamVjdH0gb2JqIFR5cGljYWxseSBqc29uaWZpZXIgc3RhdGUgb2JqZWN0XG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKi9cbmZ1bmN0aW9uIGNvbXBpbGVyKG9iaikge1xuICAgIGlmIChfLmlzRnVuY3Rpb24ob2JqKSkge1xuICAgICAgICByZXR1cm4gb2JqKCk7XG4gICAgfSBlbHNlIGlmIChfLmlzT2JqZWN0KG9iaikpIHtcbiAgICAgICAgbGV0IHJlc3VsdCA9IHt9O1xuICAgICAgICBPYmplY3Qua2V5cyhvYmopLmZvckVhY2goa2V5ID0+IHJlc3VsdFtrZXldID0gY29tcGlsZXIob2JqW2tleV0pKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbn1cblxuXG4vKipcbiAqIENvbnZlcnRzIGdlbmVyYXRvcnMgdG8gZnVuY3Rpb25zIHdoaWNoIHlpZWxkIG5leHQgdmFsdWVcbiAqXG4gKiBcdFNlZSBbXy5hc3NpZ25XaXRoXShodHRwczovL2xvZGFzaC5jb20vZG9jcyNhc3NpZ25JbldpdGgpXG4gKi9cbmZ1bmN0aW9uIGR5bmFtaWNDdXN0b21pc2VyKG9ialZhbHVlLCBzcmNWYWx1ZSkge1xuICAgIGlmIChfLmlzRnVuY3Rpb24oc3JjVmFsdWUpKSB7XG4gICAgICAgIGxldCByZXN1bHQgPSBzcmNWYWx1ZSgpO1xuICAgICAgICBpZiAocmVzdWx0LnRvU3RyaW5nKCkgPT09ICdbb2JqZWN0IEdlbmVyYXRvcl0nKSB7XG4gICAgICAgICAgICBzcmNWYWx1ZSA9ICgpID0+IHJlc3VsdC5uZXh0KCkudmFsdWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHNyY1ZhbHVlO1xufVxuXG5cbi8qKlxuICogRXh0ZW5kcyBhbiBvYmplY3QgdG8gbWFrZSBzdXJlIGl0IGhhcyBjaGlsZCBhdHRyaWJ1dGVzXG4gKlxuICogQG1ldGhvZCBjcmVhdGVPYmplY3RcbiAqIEBwYXJhbSAge09iamVjdH0gICAgIHNyY09iaiAgICAgIFRoZSB0YXJnZXQgb2JqZWN0XG4gKiBAcGFyYW0gIHtTdHJpbmd9ICAgICByZWYgICAgICAgICBQZXJpb2Qgc2VwYXJhdGVkIGRlc2NyaXB0aW9uOlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXHRhLmIuYyA9PiB7YToge2I6IHtjOiB7fX19fVxuICogQHBhcmFtICB7T2JqZWN0fSAgICAgZmluYWxWYWx1ZSAgW29wdGlvbmFsXSBmaW5hbCB2YWx1ZSB0byBhc3NpZ24gdG8gbGVhZiBub2RlOlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXHRhLmIuYyAoZmluYWwgJ2ZvbycpID0+IHthOiB7Yjoge2M6ICdmb28nfX19XG4gKiBAcmV0dXJuIHtPYmplY3QgUmVmfSBUaGUgZmluYWwgb2JqZWN0cyAnYS5iLmMnID0+IHtjOiB7fX1cbiAqL1xuZnVuY3Rpb24gY3JlYXRlT2JqZWN0KHNyY09iaiwgcmVmLCBmaW5hbFZhbHVlKSB7XG4gICAgbGV0IHN0ZXBzID0gcmVmLnNwbGl0KCcuJyk7XG5cbiAgICBzdGVwcy5mb3JFYWNoKChhdHRyaWIsIGluZGV4KSA9PiB7XG4gICAgICAgIHNyY09ialthdHRyaWJdID0gc3JjT2JqLmhhc093blByb3BlcnR5KGF0dHJpYikgJiYgXy5pc09iamVjdChzcmNPYmpbYXR0cmliXSlcbiAgICAgICAgICAgID8gc3JjT2JqW2F0dHJpYl1cbiAgICAgICAgICAgIDoge31cbiAgICAgICAgICAgIDtcbiAgICAgICAgaWYgKGluZGV4IDwgc3RlcHMubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgc3JjT2JqID0gc3JjT2JqW2F0dHJpYl07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoXy5pc09iamVjdChmaW5hbFZhbHVlKSAmJiAhXy5pc0Z1bmN0aW9uKGZpbmFsVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgc3JjT2JqID0gXy5leHRlbmQoc3JjT2JqW2F0dHJpYl0gfHwge30sIGZpbmFsVmFsdWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzcmNPYmogPSBzcmNPYmpbYXR0cmliXSA9IGZpbmFsVmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gc3JjT2JqO1xufVxuXG5cbi8qKlxuICogQ2FwdHVyZXMgb2JqZWN0IG9mIEpTT04gZGF0YSBpbiBwYXJ0aWN1bGFyIHN0YXRlc1xuICogQGNsYXNzIHtKU09OaWZpZXJ9XG4gKi9cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgSlNPTmlmaWVyIHtcblxuICAgIC8qKlxuICAgICAqIEBtZXRob2QgY29uc3RydWN0b3JcbiAgICAgKiBAcGFyYW0gIHtKU09OaWZpZXJ9ICAgICAgc3RhdGUgICBBIEpTT05pZmllciBpbnN0YW5jZSB0byBpbmhlcml0IHByb3BlcnRpZXMgZnJvbVxuICAgICAqXG4gICAgICogQHBhcmFtICB7T2JqZWN0fSAgICAgICAgIG9wcyAgICAgICAgICAgICBPcHRpb25hbCBwYXJhbWV0ZXJzXG4gICAgICogQHBhcmFtICB7U3RyaW5nfSAgICAgICAgIG9wcy5uYW1lc3BhY2UgICBQZXJpb2Qgc2VwYXJhdGVkIG5hbWVzcGFjZTogJ2EuYi5jJyA9PiB7J2EnOiB7J2InOiAnYyc6e319fVxuICAgICAqIEBwYXJhbSAge0ludGVnZXJ9ICAgICAgICBvcHMubGltaXQgICAgICAgTGltaXQgdGhlIG51bWJlciBvZiByZXNwb25zZXMgZnJvbSB0aGlzIGluc3RhbmNlIFtkZWZhdWx0OiB1bmxpbWl0ZWRdXG4gICAgICogQHBhcmFtICB7RnVuY3Rpb259ICAgICAgIG9wcy5jb21waWxlciAgICBDaGFuZ2UgdGhlIHdheSBhbiBpbnN0YW5jZSBidWlsZHMgSlNPTiBvYmplY3Qge0BsaW5rIGNvbXBpbGVyfVxuICAgICAqIEByZXR1cm4ge0pTT05pZmllcn1cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihzdGF0ZSwgb3BzKSB7XG4gICAgICAgIHRoaXMub3B0aW9ucyA9IHtcbiAgICAgICAgICAgIG5hbWVzcGFjZTogdW5kZWZpbmVkLFxuICAgICAgICAgICAgbGltaXQ6IC0xLFxuICAgICAgICAgICAgY29tcGlsZXI6IGNvbXBpbGVyXG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHN0YXRlIGluc3RhbmNlb2YgSlNPTmlmaWVyICYmIF8uaXNPYmplY3Qob3BzKSkge1xuICAgICAgICAgICAgXy5leHRlbmQodGhpcy5vcHRpb25zLCBvcHMpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKF8uaXNPYmplY3Qoc3RhdGUpICYmIF8uaXNVbmRlZmluZWQob3BzKSkge1xuICAgICAgICAgICAgXy5leHRlbmQodGhpcy5vcHRpb25zLCBzdGF0ZSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnN0YXRlID0gc3RhdGUgaW5zdGFuY2VvZiBKU09OaWZpZXJcbiAgICAgICAgICAgID8gXy5jbG9uZURlZXAoc3RhdGUuc3RhdGUpXG4gICAgICAgICAgICA6IHt9XG4gICAgICAgICAgICA7XG5cbiAgICAgICAgdGhpcy5fY3VycmVudCA9IF8uaXNVbmRlZmluZWQodGhpcy5vcHRpb25zLm5hbWVzcGFjZSlcbiAgICAgICAgICAgID8gdGhpcy5zdGF0ZVxuICAgICAgICAgICAgOiBjcmVhdGVPYmplY3QodGhpcy5zdGF0ZSwgdGhpcy5vcHRpb25zLm5hbWVzcGFjZSwge30pXG4gICAgICAgICAgICA7XG4gICAgfVxuXG4gICAgZ2V0IHN0YXRlKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhdGU7XG4gICAgfVxuXG4gICAgc2V0IHN0YXRlKHN0YXRlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGF0ZSA9IHN0YXRlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEFkZHMgYW4gZW5oYW5jZWQgJ0pTT04gb2JqZWN0JyB0byB0aGUgY3VycmVudCBpbnN0YW5jZVxuICAgICAqXG4gICAgICogQG1ldGhvZCBhZGRcbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd9ICAgICAgICAgICAgICAgICAgICAgbWV0aG9kICAgIFtvcHRpb25hbF0gRG90IG5vdGF0aW9uOiBlLmcuICdhJyBvciAnYS5iLmMuZCdcbiAgICAgKiBAcGFyYW0gIHtPYmplY3R8RnVuY3Rpb258R2VuZXJhdG9yfSAgWWllbGQgc3RhdGljIGRhdGEgKG9iamVjdCwgc3RyaW5nLCBudW1iZXIsIGV0Yy4uLilcbiAgICAgKi9cbiAgICBhZGQobWV0aG9kLCBnZW5lcmF0b3IpIHtcbiAgICAgICAgaWYgKF8uaXNTdHJpbmcobWV0aG9kKSkge1xuICAgICAgICAgICAgY3JlYXRlT2JqZWN0KHRoaXMuX2N1cnJlbnQsIG1ldGhvZCwgXy5hc3NpZ25XaXRoKGdlbmVyYXRvciwgZ2VuZXJhdG9yLCBkeW5hbWljQ3VzdG9taXNlcikpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoXy5pc1VuZGVmaW5lZChnZW5lcmF0b3IpICYmIF8uaXNPYmplY3QobWV0aG9kKSkge1xuICAgICAgICAgICAgXy5hc3NpZ25XaXRoKHRoaXMuX2N1cnJlbnQsIG1ldGhvZCwgZHluYW1pY0N1c3RvbWlzZXIpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICB0aHJvdyBFcnJvcignSWxsZWdhbCB1c2Ugb2YganNvbmlmaWVyI2FkZCcpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFlpZWxkcyBzdGF0aWMgSlNPTiBvYmplY3RzIGZyb20gYWxsIGluaGVyaXRlZCBpbnN0YW5jZXNcbiAgICAgKiBAbWV0aG9kIGJ1aWxkXG4gICAgICogQHJldHVybiB7R2VuZXJhdG9yfSAgd2hpY2ggeWllbGRzIEpTT04gb2JqZWN0c1xuICAgICAqL1xuICAgIGJ1aWxkKCkge1xuICAgICAgICBsZXQgdGhhdCA9IHRoaXM7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiogaXRlcmFibGVKU09OaWZpZXIoKSB7XG4gICAgICAgICAgICBmb3IobGV0IGk9MDsgaSAhPSB0aGF0Lm9wdGlvbnMubGltaXQ7IGkgPSAoaSArIDEpICUgTnVtYmVyLk1BWF9TQUZFX0lOVEVHRVIpIHtcbiAgICAgICAgICAgICAgICB5aWVsZCB0aGF0Lm9wdGlvbnMuY29tcGlsZXIodGhhdC5zdGF0ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0oKTtcbiAgICB9XG59O1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
