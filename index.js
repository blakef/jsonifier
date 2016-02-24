import _ from 'lodash';

function compiler(obj) {
    if (_.isFunction(obj)) {
        return obj();
    } else if (_.isObject(obj)) {
        let result = {};
        Object.keys(obj).forEach(key => result[key] = compile(obj[key]));
        return result;
    } else if (_.isArray(obj)) {
        return obj.map(compile);
    }
    return obj;
}

export default class JSONifier {

    constructor(state, ops) {
        this.options = defaults = _.extend({
            namespace: undefined,
            limit: -1,
            compiler: compiler
        }, ops);

        if (state instanceof JSONifier) {
            this._state = _.cloneDeep(state._state);
        } else if (_.isObject(state)) {
            this._state = _.cloneDeep(state);
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

            if (_.isFunction(generator)) {
                let result = generator();
                if (result.toString() === '[object Generator]') {
                    generator = () => result.next().value;
                }
                obj[final_step] = result;
            } else {
                obj[final_step] = generator;
            }
            return this;
        }

        if (_.isUndefiend(generator)) {
            if (_.isFunction(method)) {
                this._current = method;
                return this;
            }

            if (_.isObject(method)) {
                _.extend(this._current, method);
                return this;
            }
        }

        throw Error(`Illegal use of jsonifier#add`);
    }

    build() {
        return function* iterableJSONifier() {
            for(let i=0; i != this.options.limit; i = (i + 1) % Number.MAX_SAFE_INTEGER) {
                yield this._compiler(this._state);
            }
        }
    }
}
