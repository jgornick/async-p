import async from '../src/asyncp';
import {
    iterateeDelayWithOrder,
    iterateePromiseWithOrder,
    iterateeNativeWithOrder
} from './helper';

describe('eachOfSeries', function() {
    it('does delayed items', function() {
        let order = [];
        const coll = {a: 1, b: 3, c: 2};
        const p = async.eachOfSeries(coll, iterateeDelayWithOrder(order));
        return Promise.all([
            p.should.eventually.deep.equal(coll),
            p.then(() => order.should.deep.equal([1, 3, 2]))
        ]);
    });

    it('does sync promise items', function() {
        let order = [];
        const coll = {a: 1, b: 3, c: 2};
        const p = async.eachOfSeries(coll, iterateePromiseWithOrder(order));
        return Promise.all([
            p.should.eventually.deep.equal(coll),
            p.then(() => order.should.deep.equal([1, 3, 2]))
        ]);
    });

    it('does sync native items', function() {
        let order = [];
        const coll = {a: 1, b: 3, c: 2};
        const p = async.eachOfSeries(coll, iterateeNativeWithOrder(order));
        return Promise.all([
            p.should.eventually.deep.equal(coll),
            p.then(() => order.should.deep.equal([1, 3, 2]))
        ]);
    });

    it('does mixed (delayed, promise, native) items', function() {
        let order = [];
        const coll = {a: 3, b: 2, c: 1, d: 4, e: 5, f: 6, g: 9, h: 8, i: 7};
        const p = async.eachOfSeries(coll, value => {
            if (value >= 1 && value <= 3) {
                return new Promise(resolve => setTimeout(
                    () => {
                        order.push(value);
                        resolve(value)
                    },
                    value * 25
                ));
            } else if (value >= 4 && value <= 6) {
                return new Promise(resolve => {
                    order.push(value);
                    resolve(value)
                });
            } else if (value >= 7 && value <= 9) {
                order.push(value);
                return value;
            }
        });

        return Promise.all([
            p.should.eventually.deep.equal(coll),
            p.then(() => order.should.deep.equal([3, 2, 1, 4, 5, 6, 9, 8, 7]))
        ]);
    });

    it('has right arguments', function() {
        const coll = {a: 1, b: 3, c: 2};
        return async.eachOfSeries(coll, (value, key, collection) => {
            switch (value) {
                case 1:
                    key.should.equal('a', `key is invalid for value ${value}`);
                    break;
                case 2:
                    key.should.equal('c', `key is invalid for value ${value}`);
                    break;
                case 3:
                    key.should.equal('b', `key is invalid for value ${value}`);
                    break;
            }

            collection.should.deep.equal(coll, `coll is not equal for value ${value}`);

            return value;
        });
    });

    it('supports promised arguments', function() {
        let order = [];
        const coll = {a: 1, b: 3, c: 2};
        const p = async.eachOfSeries(
            new Promise(resolve => setTimeout(resolve.bind(null, coll), 25)),
            iterateeDelayWithOrder(order)
        );
        return Promise.all([
            p.should.eventually.deep.equal(coll),
            p.then(() => order.should.deep.equal([1, 3, 2]))
        ]);
    });


    it('supports empty collections', function() {
        const p = async.eachOfSeries({}, () => assert(false, 'iteratee should not be called'));

        return Promise.all([
            p.should.eventually.be.empty
        ]);
    });

    it('supports external collection modification with mixed (delayed, sync promise) items', function() {
        let order = [];
        let coll = {a: 4, b: 3, c: 2, d: 1};
        const p = async.eachOfSeries(coll, (value, key, collection) => {
            if (value >= 2 && value <= 3) {
                return new Promise(resolve => {
                    setTimeout(
                        () => {
                            order.push(value);
                            resolve(value);
                        },
                        value * 25
                    );
                });
            } else {
                order.push(value);
                return Promise.resolve(value);
            }
        });

        coll.a = 0;
        delete coll.d;

        return Promise.all([
            p.should.eventually.deep.equal({a: 0, b: 3, c: 2}),
            p.then(() => coll.should.deep.equal({a: 0, b: 3, c: 2})),
            p.then(() => order.should.deep.equal([0, 3, 2]))
        ]);
    });

    it('does not modify collection', function() {
        let order = [];
        const coll = {a: 1, b: 3, c: 2};
        const p = async.eachOfSeries(coll, (value, key) => {
            order.push(value);
            value = value * 100
            key = key + '-bax'
            return value;
        });
        return Promise.all([
            p.should.eventually.deep.equal({a: 100, b: 300, c: 200}),
            p.then((result) => coll.should.not.deep.equal(result)),
            p.then(() => order.should.deep.equal([1, 3, 2]))
        ]);
    });

    it('rejects using delayed Promise.reject', function() {
        let order = [];
        const coll = {a: 1, b: 3, c: 2};
        const p = async.eachOfSeries(coll, iterateeDelayWithOrder(
            order,
            (x) => x == 2 ? Promise.reject(new Error('error')) : x
        ));

        return Promise.all([
            p.should.eventually.be.rejectedWith(Error),
            new Promise(resolve => setTimeout(
                () => resolve(order.should.deep.equal([1, 3, 2])),
                7 * 25
            ))
        ]);
    });

    it('rejects using sync Promise.reject', function() {
        let order = [];
        const coll = {a: 1, b: 3, c: 2};
        const p = async.eachOfSeries(coll, iterateePromiseWithOrder(
            order,
            (x) => x == 3 ? Promise.reject(new Error('error')) : x
        ));

        return Promise.all([
            p.should.eventually.be.rejectedWith(Error),
            new Promise(resolve => setTimeout(
                () => resolve(order.should.deep.equal([1, 3])),
                25
            ))
        ]);
    });

    it('rejects using sync throw', function() {
        let order = [];
        const coll = {a: 1, b: 3, c: 2};
        const p = async.eachOfSeries(coll, iterateeNativeWithOrder(
            order,
            (x) => {
                if (x == 3) {
                    throw new Error('error');
                }
                return x;
            }
        ));

        return Promise.all([
            p.should.eventually.be.rejectedWith(Error),
            new Promise(resolve => setTimeout(
                () => resolve(order.should.deep.equal([1, 3])),
                25
            ))
        ]);
    });

    it('has forEachOfSeries alias', function(done) {
        assert.strictEqual(async.eachOfSeries, async.forEachOfSeries);
        done();
    });

    it('has mapValuesSeries alias', function(done) {
        assert.strictEqual(async.eachOfSeries, async.mapValuesSeries);
        done();
    });
});
