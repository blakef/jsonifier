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
            for (let i = 0; i != that.options.limit; i = (i + 1) % Number.MAX_SAFE_INTEGER) {
                yield that.options.compiler(state);
            }
        }();
    }
};
//# sourceMappingURL=data:application/json;base64,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RCxHQUFzQixTQUF0QixFQUFnQyxHQUFoQyxHQUFxQyxVQUFyQyxFQUFnRCxDQUF0RCxDQUFOLENBRjRDO1NBQWhEO0FBSUEsWUFBSSxRQUFRLEVBQUUsV0FBRixDQUFjLFNBQWQsSUFDTixLQUFLLEtBQUwsR0FDQSxLQUFLLEtBQUwsQ0FBVyxTQUFYLENBRk0sQ0FMQztBQVNiLFlBQUksT0FBTyxJQUFQLENBVFM7QUFVYixlQUFPLFVBQVUsaUJBQVYsR0FBOEI7QUFDakMsaUJBQUksSUFBSSxJQUFFLENBQUYsRUFBSyxLQUFLLEtBQUssT0FBTCxDQUFhLEtBQWIsRUFBb0IsSUFBSSxDQUFDLElBQUksQ0FBSixDQUFELEdBQVUsT0FBTyxnQkFBUCxFQUF5QjtBQUN6RSxzQkFBTSxLQUFLLE9BQUwsQ0FBYSxRQUFiLENBQXNCLEtBQXRCLENBQU4sQ0FEeUU7YUFBN0U7U0FERyxFQUFQLENBVmE7S0FBakI7Q0F6RWEiLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG5jb25zdCBfID0gcmVxdWlyZSgnbG9kYXNoJyk7XG5cbi8qKlxuICogQ29udmVydHMgb2JqZWN0IHRvIG9ubHkgY29udGFpbiBzdGF0aWMgZGF0YVxuICpcbiAqIFx0T3VyIHN0YXRlIGRhdGEgZWl0aGVyIGhhcyBzdGF0aWMgbGVhZiB2YWx1ZXMgb3IgZnVuY3Rpb25zIHdoaWNoIHlpZWxkIHN0YXRpY1xuICogXHR2YWx1ZXMuICBUaGlzIGNvbnZlcnN0IHRoZSBlbnRpcmUgb2JqZWN0IHRvIG9ubHkgY29udGFpbiBzdGF0aWMgZGF0YSAoc3ViamVjdFxuICogXHR0byB1c2VycyBjcmVhdGluZyBmdW5jdGlvbnMgd2hpY2ggX29ubHlfIHlpZWxkIHN0YXRpYyBvdXRwdXQpXG4gKlxuICogQG1ldGhvZCBjb21waWxlclxuICogQHBhcmFtICB7T2JqZWN0fSBvYmogVHlwaWNhbGx5IGpzb25pZmllciBzdGF0ZSBvYmplY3RcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqL1xuZnVuY3Rpb24gY29tcGlsZXIob2JqKSB7XG4gICAgaWYgKF8uaXNGdW5jdGlvbihvYmopKSB7XG4gICAgICAgIHJldHVybiBvYmooKTtcbiAgICB9IGVsc2UgaWYgKF8uaXNPYmplY3Qob2JqKSkge1xuICAgICAgICBsZXQgcmVzdWx0ID0ge307XG4gICAgICAgIE9iamVjdC5rZXlzKG9iaikuZm9yRWFjaChrZXkgPT4gcmVzdWx0W2tleV0gPSBjb21waWxlcihvYmpba2V5XSkpO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICByZXR1cm4gb2JqO1xufVxuXG5cbi8qKlxuICogQ29udmVydHMgZ2VuZXJhdG9ycyB0byBmdW5jdGlvbnMgd2hpY2ggeWllbGQgbmV4dCB2YWx1ZVxuICpcbiAqIFx0U2VlIFtfLmFzc2lnbldpdGhdKGh0dHBzOi8vbG9kYXNoLmNvbS9kb2NzI2Fzc2lnbkluV2l0aClcbiAqL1xuZnVuY3Rpb24gZHluYW1pY0N1c3RvbWlzZXIob2JqVmFsdWUsIHNyY1ZhbHVlKSB7XG4gICAgaWYgKF8uaXNGdW5jdGlvbihzcmNWYWx1ZSkpIHtcbiAgICAgICAgbGV0IHJlc3VsdCA9IHNyY1ZhbHVlKCk7XG4gICAgICAgIGlmIChyZXN1bHQudG9TdHJpbmcoKSA9PT0gJ1tvYmplY3QgR2VuZXJhdG9yXScpIHtcbiAgICAgICAgICAgIHNyY1ZhbHVlID0gKCkgPT4gcmVzdWx0Lm5leHQoKS52YWx1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gc3JjVmFsdWU7XG59XG5cblxuLyoqXG4gKiBFeHRlbmRzIGFuIG9iamVjdCB0byBtYWtlIHN1cmUgaXQgaGFzIGNoaWxkIGF0dHJpYnV0ZXNcbiAqXG4gKiBAbWV0aG9kIGNyZWF0ZU9iamVjdFxuICogQHBhcmFtICB7T2JqZWN0fSAgICAgc3JjT2JqICAgICAgVGhlIHRhcmdldCBvYmplY3RcbiAqIEBwYXJhbSAge1N0cmluZ30gICAgIHJlZiAgICAgICAgIFBlcmlvZCBzZXBhcmF0ZWQgZGVzY3JpcHRpb246XG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcdGEuYi5jID0+IHthOiB7Yjoge2M6IHt9fX19XG4gKiBAcGFyYW0gIHtPYmplY3R9ICAgICBmaW5hbFZhbHVlICBbb3B0aW9uYWxdIGZpbmFsIHZhbHVlIHRvIGFzc2lnbiB0byBsZWFmIG5vZGU6XG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcdGEuYi5jIChmaW5hbCAnZm9vJykgPT4ge2E6IHtiOiB7YzogJ2Zvbyd9fX1cbiAqIEByZXR1cm4ge09iamVjdCBSZWZ9IFRoZSBmaW5hbCBvYmplY3RzICdhLmIuYycgPT4ge2M6IHt9fVxuICovXG5mdW5jdGlvbiBjcmVhdGVPYmplY3Qoc3JjT2JqLCByZWYsIGZpbmFsVmFsdWUpIHtcbiAgICBsZXQgc3RlcHMgPSByZWYuc3BsaXQoJy4nKTtcblxuICAgIHN0ZXBzLmZvckVhY2goKGF0dHJpYiwgaW5kZXgpID0+IHtcbiAgICAgICAgc3JjT2JqW2F0dHJpYl0gPSBzcmNPYmouaGFzT3duUHJvcGVydHkoYXR0cmliKSAmJiBfLmlzT2JqZWN0KHNyY09ialthdHRyaWJdKVxuICAgICAgICAgICAgPyBzcmNPYmpbYXR0cmliXVxuICAgICAgICAgICAgOiB7fVxuICAgICAgICAgICAgO1xuICAgICAgICBpZiAoaW5kZXggPCBzdGVwcy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICBzcmNPYmogPSBzcmNPYmpbYXR0cmliXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChfLmlzT2JqZWN0KGZpbmFsVmFsdWUpICYmICFfLmlzRnVuY3Rpb24oZmluYWxWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICBzcmNPYmogPSBfLmV4dGVuZChzcmNPYmpbYXR0cmliXSB8fCB7fSwgZmluYWxWYWx1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNyY09iaiA9IHNyY09ialthdHRyaWJdID0gZmluYWxWYWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBzcmNPYmo7XG59XG5cblxuLyoqXG4gKiBDYXB0dXJlcyBvYmplY3Qgb2YgSlNPTiBkYXRhIGluIHBhcnRpY3VsYXIgc3RhdGVzXG4gKiBAY2xhc3Mge0pTT05pZmllcn1cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBKU09OaWZpZXIge1xuXG4gICAgLyoqXG4gICAgICogQG1ldGhvZCBjb25zdHJ1Y3RvclxuICAgICAqIEBwYXJhbSAge0pTT05pZmllcn0gICAgICBzdGF0ZSAgIEEgSlNPTmlmaWVyIGluc3RhbmNlIHRvIGluaGVyaXQgcHJvcGVydGllcyBmcm9tXG4gICAgICpcbiAgICAgKiBAcGFyYW0gIHtPYmplY3R9ICAgICAgICAgb3BzICAgICAgICAgICAgIE9wdGlvbmFsIHBhcmFtZXRlcnNcbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd9ICAgICAgICAgb3BzLm5hbWVzcGFjZSAgIFBlcmlvZCBzZXBhcmF0ZWQgbmFtZXNwYWNlOiAnYS5iLmMnID0+IHsnYSc6IHsnYic6ICdjJzp7fX19XG4gICAgICogQHBhcmFtICB7SW50ZWdlcn0gICAgICAgIG9wcy5saW1pdCAgICAgICBMaW1pdCB0aGUgbnVtYmVyIG9mIHJlc3BvbnNlcyBmcm9tIHRoaXMgaW5zdGFuY2UgW2RlZmF1bHQ6IHVubGltaXRlZF1cbiAgICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gICAgICAgb3BzLmNvbXBpbGVyICAgIENoYW5nZSB0aGUgd2F5IGFuIGluc3RhbmNlIGJ1aWxkcyBKU09OIG9iamVjdCB7QGxpbmsgY29tcGlsZXJ9XG4gICAgICogQHJldHVybiB7SlNPTmlmaWVyfVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHN0YXRlLCBvcHMpIHtcbiAgICAgICAgdGhpcy5vcHRpb25zID0ge1xuICAgICAgICAgICAgbmFtZXNwYWNlOiB1bmRlZmluZWQsXG4gICAgICAgICAgICBsaW1pdDogLTEsXG4gICAgICAgICAgICBjb21waWxlcjogY29tcGlsZXJcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoc3RhdGUgaW5zdGFuY2VvZiBKU09OaWZpZXIgJiYgXy5pc09iamVjdChvcHMpKSB7XG4gICAgICAgICAgICBfLmV4dGVuZCh0aGlzLm9wdGlvbnMsIG9wcyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoXy5pc09iamVjdChzdGF0ZSkgJiYgXy5pc1VuZGVmaW5lZChvcHMpKSB7XG4gICAgICAgICAgICBfLmV4dGVuZCh0aGlzLm9wdGlvbnMsIHN0YXRlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuc3RhdGUgPSBzdGF0ZSBpbnN0YW5jZW9mIEpTT05pZmllclxuICAgICAgICAgICAgPyBfLmNsb25lRGVlcChzdGF0ZS5zdGF0ZSlcbiAgICAgICAgICAgIDoge31cbiAgICAgICAgICAgIDtcblxuICAgICAgICB0aGlzLl9jdXJyZW50ID0gXy5pc1VuZGVmaW5lZCh0aGlzLm9wdGlvbnMubmFtZXNwYWNlKVxuICAgICAgICAgICAgPyB0aGlzLnN0YXRlXG4gICAgICAgICAgICA6IGNyZWF0ZU9iamVjdCh0aGlzLnN0YXRlLCB0aGlzLm9wdGlvbnMubmFtZXNwYWNlLCB7fSlcbiAgICAgICAgICAgIDtcbiAgICB9XG5cbiAgICBnZXQgc3RhdGUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGF0ZTtcbiAgICB9XG5cbiAgICBzZXQgc3RhdGUoc3RhdGUpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YXRlID0gc3RhdGU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQWRkcyBhbiBlbmhhbmNlZCAnSlNPTiBvYmplY3QnIHRvIHRoZSBjdXJyZW50IGluc3RhbmNlXG4gICAgICpcbiAgICAgKiBAbWV0aG9kIGFkZFxuICAgICAqIEBwYXJhbSAge1N0cmluZ30gICAgICAgICAgICAgICAgICAgICBtZXRob2QgICAgW29wdGlvbmFsXSBEb3Qgbm90YXRpb246IGUuZy4gJ2EnIG9yICdhLmIuYy5kJ1xuICAgICAqIEBwYXJhbSAge09iamVjdHxGdW5jdGlvbnxHZW5lcmF0b3J9ICBZaWVsZCBzdGF0aWMgZGF0YSAob2JqZWN0LCBzdHJpbmcsIG51bWJlciwgZXRjLi4uKVxuICAgICAqL1xuICAgIGFkZChtZXRob2QsIGdlbmVyYXRvcikge1xuICAgICAgICBpZiAoXy5pc1N0cmluZyhtZXRob2QpKSB7XG4gICAgICAgICAgICBjcmVhdGVPYmplY3QodGhpcy5fY3VycmVudCwgbWV0aG9kLCBfLmFzc2lnbldpdGgoZ2VuZXJhdG9yLCBnZW5lcmF0b3IsIGR5bmFtaWNDdXN0b21pc2VyKSk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChfLmlzVW5kZWZpbmVkKGdlbmVyYXRvcikgJiYgXy5pc09iamVjdChtZXRob2QpKSB7XG4gICAgICAgICAgICBfLmFzc2lnbldpdGgodGhpcy5fY3VycmVudCwgbWV0aG9kLCBkeW5hbWljQ3VzdG9taXNlcik7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIHRocm93IEVycm9yKCdJbGxlZ2FsIHVzZSBvZiBqc29uaWZpZXIjYWRkJyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogWWllbGRzIHN0YXRpYyBKU09OIG9iamVjdHMgZnJvbSBhbGwgaW5oZXJpdGVkIGluc3RhbmNlc1xuICAgICAqIEBtZXRob2QgIGJ1aWxkXG4gICAgICogQHBhcmFtICAge1N0cmluZ30gICAgbmFtZXNwYWNlICAgW29wdGlvbmFsXSBOYW1lc3BhY2UgdG8gYnVpbGQsIGRlZmF1bHRzIHRvIGFsbC5cbiAgICAgKiBAcmV0dXJuICB7R2VuZXJhdG9yfSAgICAgICAgICAgICB3aGljaCB5aWVsZHMgSlNPTiBvYmplY3RzXG4gICAgICovXG4gICAgYnVpbGQobmFtZXNwYWNlKSB7XG4gICAgICAgIGlmIChuYW1lc3BhY2UgJiYgIV8uaGFzKHRoaXMuc3RhdGUsIG5hbWVzcGFjZSkpIHtcbiAgICAgICAgICAgIGxldCBuYW1lc3BhY2VzID0gT2JqZWN0LmtleXModGhpcy5zdGF0ZSkuam9pbignLCAnKTtcbiAgICAgICAgICAgIHRocm93IEVycm9yKGBVbmtub3duIG5hbWVzcGFjZSAnJHtuYW1lc3BhY2V9JzogJHtuYW1lc3BhY2VzfWApO1xuICAgICAgICB9XG4gICAgICAgIGxldCBzdGF0ZSA9IF8uaXNVbmRlZmluZWQobmFtZXNwYWNlKVxuICAgICAgICAgICAgPyB0aGlzLnN0YXRlXG4gICAgICAgICAgICA6IHRoaXMuc3RhdGVbbmFtZXNwYWNlXVxuICAgICAgICAgICAgO1xuICAgICAgICBsZXQgdGhhdCA9IHRoaXM7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiogaXRlcmFibGVKU09OaWZpZXIoKSB7XG4gICAgICAgICAgICBmb3IobGV0IGk9MDsgaSAhPSB0aGF0Lm9wdGlvbnMubGltaXQ7IGkgPSAoaSArIDEpICUgTnVtYmVyLk1BWF9TQUZFX0lOVEVHRVIpIHtcbiAgICAgICAgICAgICAgICB5aWVsZCB0aGF0Lm9wdGlvbnMuY29tcGlsZXIoc3RhdGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KCk7XG4gICAgfVxufTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
