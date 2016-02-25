const _ = require('lodash');

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

function dynamicCustomiser(objValue, srcValue) {
    if (_.isFunction(srcValue)) {
        let result = srcValue();
        if (result.toString() === '[object Generator]') {
            srcValue = () => result.next().value;
        }
    }
    return srcValue;
}

module.exports = class JSONifier {

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

        if (state instanceof JSONifier) {
            this._state = _.cloneDeep(state._state);
        } else {
            this._state = {};
        }

        this._current = _.isUndefined(this.options.namespace)
            ? this._state
            : this._state[this.options.namespace] = this._state[this.options.namespace] || {}
            ;
    }

    add(method, generator) {
        if (_.isString(method)) {
            let obj = this._current;

            let steps = method.split('.');
            const final_step = steps.pop();

            steps.forEach(attrib => {
                obj[attrib] = obj.hasOwnProperty(attrib) && _.isObject(obj[attrib])
                    ? obj[attrib]
                    : {}
                    ;
                obj = obj[attrib];
            });

            obj[final_step]  = _.assignWith(generator, generator, dynamicCustomiser);
            return this;
        }

        if (_.isUndefined(generator) && _.isObject(method)) {
            _.assignWith(this._current, method, dynamicCustomiser);
            return this;
        }

        throw Error('Illegal use of jsonifier#add');
    }

    build() {
        let that = this;
        return function* iterableJSONifier() {
            for(let i=0; i != that.options.limit; i = (i + 1) % Number.MAX_SAFE_INTEGER) {
                yield that.options.compiler(that._state);
            }
        }();
    }
};
