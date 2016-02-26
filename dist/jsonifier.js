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
//# sourceMappingURL=data:application/json;base64,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S0FBSixHQUFZO0FBQ1IsZUFBTyxLQUFLLE1BQUwsQ0FEQztLQUFaOztBQUlBLFFBQUksS0FBSixDQUFVLEtBQVYsRUFBaUI7QUFDYixlQUFPLEtBQUssTUFBTCxHQUFjLEtBQWQsQ0FETTtLQUFqQjs7Ozs7Ozs7O0FBMUM2QixPQXFEN0IsQ0FBSSxNQUFKLEVBQVksU0FBWixFQUF1QjtBQUNuQixZQUFJLEVBQUUsUUFBRixDQUFXLE1BQVgsQ0FBSixFQUF3QjtBQUNwQix5QkFBYSxLQUFLLFFBQUwsRUFBZSxNQUE1QixFQUFvQyxFQUFFLFVBQUYsQ0FBYSxTQUFiLEVBQXdCLFNBQXhCLEVBQW1DLGlCQUFuQyxDQUFwQyxFQURvQjtBQUVwQixtQkFBTyxJQUFQLENBRm9CO1NBQXhCOztBQUtBLFlBQUksRUFBRSxXQUFGLENBQWMsU0FBZCxLQUE0QixFQUFFLFFBQUYsQ0FBVyxNQUFYLENBQTVCLEVBQWdEO0FBQ2hELGNBQUUsVUFBRixDQUFhLEtBQUssUUFBTCxFQUFlLE1BQTVCLEVBQW9DLGlCQUFwQyxFQURnRDtBQUVoRCxtQkFBTyxJQUFQLENBRmdEO1NBQXBEOztBQUtBLGNBQU0sTUFBTSw4QkFBTixDQUFOLENBWG1CO0tBQXZCOzs7Ozs7O0FBckQ2QixTQXdFN0IsR0FBUTtBQUNKLFlBQUksT0FBTyxJQUFQLENBREE7QUFFSixlQUFPLFVBQVUsaUJBQVYsR0FBOEI7QUFDakMsaUJBQUksSUFBSSxJQUFFLENBQUYsRUFBSyxLQUFLLEtBQUssT0FBTCxDQUFhLEtBQWIsRUFBb0IsSUFBSSxDQUFDLElBQUksQ0FBSixDQUFELEdBQVUsT0FBTyxnQkFBUCxFQUF5QjtBQUN6RSxzQkFBTSxLQUFLLE9BQUwsQ0FBYSxRQUFiLENBQXNCLEtBQUssS0FBTCxDQUE1QixDQUR5RTthQUE3RTtTQURHLEVBQVAsQ0FGSTtLQUFSO0NBeEVhIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuY29uc3QgXyA9IHJlcXVpcmUoJ2xvZGFzaCcpO1xuXG4vKipcbiAqIENvbnZlcnRzIG9iamVjdCB0byBvbmx5IGNvbnRhaW4gc3RhdGljIGRhdGFcbiAqXG4gKiBcdE91ciBzdGF0ZSBkYXRhIGVpdGhlciBoYXMgc3RhdGljIGxlYWYgdmFsdWVzIG9yIGZ1bmN0aW9ucyB3aGljaCB5aWVsZCBzdGF0aWNcbiAqIFx0dmFsdWVzLiAgVGhpcyBjb252ZXJzdCB0aGUgZW50aXJlIG9iamVjdCB0byBvbmx5IGNvbnRhaW4gc3RhdGljIGRhdGEgKHN1YmplY3RcbiAqIFx0dG8gdXNlcnMgY3JlYXRpbmcgZnVuY3Rpb25zIHdoaWNoIF9vbmx5XyB5aWVsZCBzdGF0aWMgb3V0cHV0KVxuICpcbiAqIEBtZXRob2QgY29tcGlsZXJcbiAqIEBwYXJhbSAge09iamVjdH0gb2JqIFR5cGljYWxseSBqc29uaWZpZXIgc3RhdGUgb2JqZWN0XG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKi9cbmZ1bmN0aW9uIGNvbXBpbGVyKG9iaikge1xuICAgIGlmIChfLmlzRnVuY3Rpb24ob2JqKSkge1xuICAgICAgICByZXR1cm4gb2JqKCk7XG4gICAgfSBlbHNlIGlmIChfLmlzT2JqZWN0KG9iaikpIHtcbiAgICAgICAgbGV0IHJlc3VsdCA9IHt9O1xuICAgICAgICBPYmplY3Qua2V5cyhvYmopLmZvckVhY2goa2V5ID0+IHJlc3VsdFtrZXldID0gY29tcGlsZXIob2JqW2tleV0pKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbn1cblxuXG4vKipcbiAqIENvbnZlcnRzIGdlbmVyYXRvcnMgdG8gZnVuY3Rpb25zIHdoaWNoIHlpZWxkIG5leHQgdmFsdWVcbiAqXG4gKiBcdFNlZSBbXy5hc3NpZ25XaXRoXShodHRwczovL2xvZGFzaC5jb20vZG9jcyNhc3NpZ25JbldpdGgpXG4gKi9cbmZ1bmN0aW9uIGR5bmFtaWNDdXN0b21pc2VyKG9ialZhbHVlLCBzcmNWYWx1ZSkge1xuICAgIGlmIChfLmlzRnVuY3Rpb24oc3JjVmFsdWUpKSB7XG4gICAgICAgIGxldCByZXN1bHQgPSBzcmNWYWx1ZSgpO1xuICAgICAgICBpZiAocmVzdWx0LnRvU3RyaW5nKCkgPT09ICdbb2JqZWN0IEdlbmVyYXRvcl0nKSB7XG4gICAgICAgICAgICBzcmNWYWx1ZSA9ICgpID0+IHJlc3VsdC5uZXh0KCkudmFsdWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHNyY1ZhbHVlO1xufVxuXG5cbi8qKlxuICogRXh0ZW5kcyBhbiBvYmplY3QgdG8gbWFrZSBzdXJlIGl0IGhhcyBjaGlsZCBhdHRyaWJ1dGVzXG4gKlxuICogQG1ldGhvZCBjcmVhdGVPYmplY3RcbiAqIEBwYXJhbSAge09iamVjdH0gICAgIHNyY09iaiAgICAgIFRoZSB0YXJnZXQgb2JqZWN0XG4gKiBAcGFyYW0gIHtTdHJpbmd9ICAgICByZWYgICAgICAgICBQZXJpb2Qgc2VwYXJhdGVkIGRlc2NyaXB0aW9uOlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXHRhLmIuYyA9PiB7YToge2I6IHtjOiB7fX19fVxuICogQHBhcmFtICB7T2JqZWN0fSAgICAgZmluYWxWYWx1ZSAgW29wdGlvbmFsXSBmaW5hbCB2YWx1ZSB0byBhc3NpZ24gdG8gbGVhZiBub2RlOlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXHRhLmIuYyAoZmluYWwgJ2ZvbycpID0+IHthOiB7Yjoge2M6ICdmb28nfX19XG4gKiBAcmV0dXJuIHtPYmplY3QgUmVmfSBUaGUgZmluYWwgb2JqZWN0cyAnYS5iLmMnID0+IHtjOiB7fX1cbiAqL1xuZnVuY3Rpb24gY3JlYXRlT2JqZWN0KHNyY09iaiwgcmVmLCBmaW5hbFZhbHVlKSB7XG4gICAgbGV0IHN0ZXBzID0gcmVmLnNwbGl0KCcuJyk7XG5cbiAgICBzdGVwcy5mb3JFYWNoKChhdHRyaWIsIGluZGV4KSA9PiB7XG4gICAgICAgIHNyY09ialthdHRyaWJdID0gc3JjT2JqLmhhc093blByb3BlcnR5KGF0dHJpYikgJiYgXy5pc09iamVjdChzcmNPYmpbYXR0cmliXSlcbiAgICAgICAgICAgID8gc3JjT2JqW2F0dHJpYl1cbiAgICAgICAgICAgIDoge31cbiAgICAgICAgICAgIDtcbiAgICAgICAgaWYgKGluZGV4IDwgc3RlcHMubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgc3JjT2JqID0gc3JjT2JqW2F0dHJpYl07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzcmNPYmogPSBzcmNPYmpbYXR0cmliXSA9IGZpbmFsVmFsdWU7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBzcmNPYmo7XG59XG5cblxuLyoqXG4gKiBDYXB0dXJlcyBvYmplY3Qgb2YgSlNPTiBkYXRhIGluIHBhcnRpY3VsYXIgc3RhdGVzXG4gKiBAY2xhc3Mge0pTT05pZmllcn1cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBKU09OaWZpZXIge1xuXG4gICAgLyoqXG4gICAgICogQG1ldGhvZCBjb25zdHJ1Y3RvclxuICAgICAqIEBwYXJhbSAge0pTT05pZmllcn0gICAgICBzdGF0ZSAgIEEgSlNPTmlmaWVyIGluc3RhbmNlIHRvIGluaGVyaXQgcHJvcGVydGllcyBmcm9tXG4gICAgICpcbiAgICAgKiBAcGFyYW0gIHtPYmplY3R9ICAgICAgICAgb3BzICAgICAgICAgICAgIE9wdGlvbmFsIHBhcmFtZXRlcnNcbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd9ICAgICAgICAgb3BzLm5hbWVzcGFjZSAgIFBlcmlvZCBzZXBhcmF0ZWQgbmFtZXNwYWNlOiAnYS5iLmMnID0+IHsnYSc6IHsnYic6ICdjJzp7fX19XG4gICAgICogQHBhcmFtICB7SW50ZWdlcn0gICAgICAgIG9wcy5saW1pdCAgICAgICBMaW1pdCB0aGUgbnVtYmVyIG9mIHJlc3BvbnNlcyBmcm9tIHRoaXMgaW5zdGFuY2UgW2RlZmF1bHQ6IHVubGltaXRlZF1cbiAgICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gICAgICAgb3BzLmNvbXBpbGVyICAgIENoYW5nZSB0aGUgd2F5IGFuIGluc3RhbmNlIGJ1aWxkcyBKU09OIG9iamVjdCB7QGxpbmsgY29tcGlsZXJ9XG4gICAgICogQHJldHVybiB7SlNPTmlmaWVyfVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHN0YXRlLCBvcHMpIHtcbiAgICAgICAgdGhpcy5vcHRpb25zID0ge1xuICAgICAgICAgICAgbmFtZXNwYWNlOiB1bmRlZmluZWQsXG4gICAgICAgICAgICBsaW1pdDogLTEsXG4gICAgICAgICAgICBjb21waWxlcjogY29tcGlsZXJcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoc3RhdGUgaW5zdGFuY2VvZiBKU09OaWZpZXIgJiYgXy5pc09iamVjdChvcHMpKSB7XG4gICAgICAgICAgICBfLmV4dGVuZCh0aGlzLm9wdGlvbnMsIG9wcyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoXy5pc09iamVjdChzdGF0ZSkgJiYgXy5pc1VuZGVmaW5lZChvcHMpKSB7XG4gICAgICAgICAgICBfLmV4dGVuZCh0aGlzLm9wdGlvbnMsIHN0YXRlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuc3RhdGUgPSBzdGF0ZSBpbnN0YW5jZW9mIEpTT05pZmllclxuICAgICAgICAgICAgPyBfLmNsb25lRGVlcChzdGF0ZS5zdGF0ZSlcbiAgICAgICAgICAgIDoge31cbiAgICAgICAgICAgIDtcblxuICAgICAgICB0aGlzLl9jdXJyZW50ID0gXy5pc1VuZGVmaW5lZCh0aGlzLm9wdGlvbnMubmFtZXNwYWNlKVxuICAgICAgICAgICAgPyB0aGlzLnN0YXRlXG4gICAgICAgICAgICA6IGNyZWF0ZU9iamVjdCh0aGlzLnN0YXRlLCB0aGlzLm9wdGlvbnMubmFtZXNwYWNlLCB7fSlcbiAgICAgICAgICAgIDtcbiAgICB9XG5cbiAgICBnZXQgc3RhdGUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGF0ZTtcbiAgICB9XG5cbiAgICBzZXQgc3RhdGUoc3RhdGUpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YXRlID0gc3RhdGU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQWRkcyBhbiBlbmhhbmNlZCAnSlNPTiBvYmplY3QnIHRvIHRoZSBjdXJyZW50IGluc3RhbmNlXG4gICAgICpcbiAgICAgKiBAbWV0aG9kIGFkZFxuICAgICAqIEBwYXJhbSAge1N0cmluZ30gICAgICAgICAgICAgICAgICAgICBtZXRob2QgICAgW29wdGlvbmFsXSBEb3Qgbm90YXRpb246IGUuZy4gJ2EnIG9yICdhLmIuYy5kJ1xuICAgICAqIEBwYXJhbSAge09iamVjdHxGdW5jdGlvbnxHZW5lcmF0b3J9ICBZaWVsZCBzdGF0aWMgZGF0YSAob2JqZWN0LCBzdHJpbmcsIG51bWJlciwgZXRjLi4uKVxuICAgICAqL1xuICAgIGFkZChtZXRob2QsIGdlbmVyYXRvcikge1xuICAgICAgICBpZiAoXy5pc1N0cmluZyhtZXRob2QpKSB7XG4gICAgICAgICAgICBjcmVhdGVPYmplY3QodGhpcy5fY3VycmVudCwgbWV0aG9kLCBfLmFzc2lnbldpdGgoZ2VuZXJhdG9yLCBnZW5lcmF0b3IsIGR5bmFtaWNDdXN0b21pc2VyKSk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChfLmlzVW5kZWZpbmVkKGdlbmVyYXRvcikgJiYgXy5pc09iamVjdChtZXRob2QpKSB7XG4gICAgICAgICAgICBfLmFzc2lnbldpdGgodGhpcy5fY3VycmVudCwgbWV0aG9kLCBkeW5hbWljQ3VzdG9taXNlcik7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIHRocm93IEVycm9yKCdJbGxlZ2FsIHVzZSBvZiBqc29uaWZpZXIjYWRkJyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogWWllbGRzIHN0YXRpYyBKU09OIG9iamVjdHMgZnJvbSBhbGwgaW5oZXJpdGVkIGluc3RhbmNlc1xuICAgICAqIEBtZXRob2QgYnVpbGRcbiAgICAgKiBAcmV0dXJuIHtHZW5lcmF0b3J9ICB3aGljaCB5aWVsZHMgSlNPTiBvYmplY3RzXG4gICAgICovXG4gICAgYnVpbGQoKSB7XG4gICAgICAgIGxldCB0aGF0ID0gdGhpcztcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKiBpdGVyYWJsZUpTT05pZmllcigpIHtcbiAgICAgICAgICAgIGZvcihsZXQgaT0wOyBpICE9IHRoYXQub3B0aW9ucy5saW1pdDsgaSA9IChpICsgMSkgJSBOdW1iZXIuTUFYX1NBRkVfSU5URUdFUikge1xuICAgICAgICAgICAgICAgIHlpZWxkIHRoYXQub3B0aW9ucy5jb21waWxlcih0aGF0LnN0YXRlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSgpO1xuICAgIH1cbn07XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
