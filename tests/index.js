'use strict';

let mongoose = require('mongoose');
let mongooseLeanVirtuals = require('mongoose-lean-virtuals');
let expect = require('chai').expect;
let assert = require('chai').assert;
let mongoosePaginate = require('../dist/index');
let mongoosePaginateSource = require('../src/index');
let PaginationParameters = require('../dist/pagination-parameters');

let MONGO_URI = 'mongodb://localhost/mongoose_paginate_test';
// let MONGO_URI = 'mongodb://localhost/mongoose_paginate_test?replicaSet=rs0';

let UserSchema = new mongoose.Schema({
  name: String,
  age: Number,
  gender: Number,
});

UserSchema.virtual('displayName').get(function () {
  return `${this.name} (Age: ${this.age})`;
});

UserSchema.plugin(mongooseLeanVirtuals);

let AuthorSchema = new mongoose.Schema({
  name: String,
});

let Author = mongoose.model('Author', AuthorSchema);
let User = mongoose.model('User', UserSchema);

let BookSchema = new mongoose.Schema({
  title: String,
  date: Date,
  price: Number,
  active: Boolean,
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'Author',
  },
  user: [
    {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
  ],
  loc: Object,
});

BookSchema.query.whereActive = function () {
  return this.find({
    active: true,
  });
};

BookSchema.query.byName = function (name) {
  return this.find({
    title: new RegExp(name, 'i'),
  });
};

BookSchema.index({
  loc: '2dsphere',
});

/**
 * Test a collection of documents, and expect it to not be paginated
 *
 * @param {object} result
 * */
const testUnpaginatedCollection = (result) => {
  expect(result.docs).to.have.length(100);
  expect(result.totalDocs).to.equal(100);
  expect(result.limit).to.equal(100);
  expect(result.page).to.equal(1);
  expect(result.pagingCounter).to.equal(1);
  expect(result.hasPrevPage).to.equal(false);
  expect(result.hasNextPage).to.equal(false);
  expect(result.prevPage).to.equal(null);
  expect(result.nextPage).to.equal(null);
  expect(result.totalPages).to.equal(1);
};

/**
 * Test that the result.docs are sorted after their 'price' in descending order
 *
 * @param {object} result
 * */
const testDescendingPrice = (result) => {
  let isSorted = true;

  // Skip the first index of the collection, but then make sure that
  // every following document.price is lower than the last one.
  // If it is not, the sorting is broken, thus failing the test
  for (let i = 1; i < result.docs.length; i++) {
    if (result.docs[i].price > result.docs[i - 1].price) {
      isSorted = false;
      break;
    }
  }

  expect(isSorted).to.be.true;
};

const controlledPromise = () => {
  let resolve;
  let reject;
  const promise = new Promise((resolveFn, rejectFn) => {
    resolve = resolveFn;
    reject = rejectFn;
  });

  return {
    promise,
    resolve,
    reject,
  };
};

const stubQuery = (exec) => ({
  populate() {
    return this;
  },
  select() {
    return this;
  },
  sort() {
    return this;
  },
  lean() {
    return this;
  },
  read() {
    return this;
  },
  skip() {
    return this;
  },
  limit() {
    return this;
  },
  allowDiskUse() {
    return this;
  },
  exec,
});

BookSchema.plugin(mongoosePaginate);

let Book = mongoose.model('Book', BookSchema);

describe('mongoose-paginate', function () {
  before(async function () {
    await mongoose.connect(MONGO_URI);
  });

  before(async function () {
    await mongoose.connection.db.dropDatabase();
  });

  before(async function () {
    let book,
      books = [];
    let date = new Date();

    // create users
    let users = [];
    for (let i = 0; i < 10; ++i) {
      const user = new User({
        name: randomString(),
        gender: 1,
        age: i,
      });
      const newUser = await User.create(user);
      users.push(newUser);
    }

    return Author.create({
      name: 'Arthur Conan Doyle',
    }).then(function (author) {
      for (let i = 1; i <= 100; i++) {
        book = new Book({
          // price: Math.floor(Math.random() * (1000 - 50) ) + 50,
          price: i * 5 + i,
          title: 'Book #' + i,
          date: new Date(date.getTime() + i),
          author: author._id,
          user: users,
          active: i % 2 === 0,
          loc: {
            type: 'Point',
            coordinates: [-10.97, 20.77],
          },
        });
        books.push(book);
      }

      return Book.create(books);
    });
  });

  afterEach(function () {});

  it('promise return test', function () {
    let promise = Book.paginate();
    expect(promise.then).to.be.an.instanceof(Function);
  });

  it('callback test', async function () {
    const result = await Book.paginate({}, {});
    expect(result).to.be.an.instanceOf(Object);
  });

  it('with page and limit', function () {
    var query = {
      title: {
        $in: [/Book/i],
      },
    };

    var options = {
      limit: 10,
      page: 5,
      lean: true,
    };

    return Book.paginate(query, options).then((result) => {
      expect(result.docs).to.have.length(10);
      expect(result.totalDocs).to.equal(100);
      expect(result.limit).to.equal(10);
      expect(result.page).to.equal(5);
      expect(result.pagingCounter).to.equal(41);
      expect(result.hasPrevPage).to.equal(true);
      expect(result.hasNextPage).to.equal(true);
      expect(result.prevPage).to.equal(4);
      expect(result.nextPage).to.equal(6);
      expect(result.totalPages).to.equal(10);
    });
  });

  it('should work with lean and leanWithVirtuals options', async function () {
    var query = {
      title: {
        $in: [/Book/i],
      },
    };

    var options = {
      limit: 10,
      page: 1,
      lean: true,
      leanWithVirtuals: true,
      populate: {
        path: 'user',
      },
    };

    const result = await Book.paginate(query, options);

    // Test pagination metadata
    expect(result.docs).to.have.length(10);
    expect(result.totalDocs).to.equal(100);
    expect(result.page).to.equal(1);

    // Test populated user array has virtual fields
    const firstBookUsers = result.docs[0].user;
    expect(firstBookUsers).to.be.an('array');
    expect(firstBookUsers[0]).to.have.property('displayName');

    // Test virtual field value
    const firstUser = firstBookUsers[0];
    expect(firstUser.displayName).to.equal(
      `${firstUser.name} (Age: ${firstUser.age})`
    );

    // Verify it's a plain JavaScript object (lean) not a Mongoose document
    expect(firstBookUsers[0]).to.not.have.property('$__');
    expect(firstBookUsers[0]).to.not.have.property('isNew');
  });

  it('first page with page and limit, limit > doc.length', function () {
    var query = {
      title: {
        $in: [/Book/i],
      },
    };

    var options = {
      limit: 200,
      page: 1,
      lean: true,
    };

    return Book.paginate(query, options).then((result) => {
      expect(result.docs).to.have.length(100);
      expect(result.totalDocs).to.equal(100);
      expect(result.limit).to.equal(200);
      expect(result.page).to.equal(1);
      expect(result.pagingCounter).to.equal(1);
      expect(result.hasPrevPage).to.equal(false);
      expect(result.hasNextPage).to.equal(false);
      expect(result.prevPage).to.equal(null);
      expect(result.nextPage).to.equal(null);
      expect(result.totalPages).to.equal(1);
    });
  });

  it('first page with page and limit, limit > doc.length, offset by one', function () {
    var query = {
      title: {
        $in: [/Book/i],
      },
    };

    var options = {
      offset: 1,
      limit: 200,
      page: 1,
      lean: true,
    };

    return Book.paginate(query, options).then((result) => {
      expect(result.docs).to.have.length(99);
      expect(result.totalDocs).to.equal(100);
      expect(result.limit).to.equal(200);
      expect(result.page).to.equal(1);
      expect(result.pagingCounter).to.equal(1);
      expect(result.hasPrevPage).to.equal(true);
      expect(result.hasNextPage).to.equal(false);
      expect(result.prevPage).to.equal(1);
      expect(result.nextPage).to.equal(null);
      expect(result.totalPages).to.equal(1);
    });
  });

  it('first page with page and limit', function () {
    var query = {
      title: {
        $in: [/Book/i],
      },
    };

    var options = {
      limit: 10,
      page: 1,
      lean: true,
    };

    return Book.paginate(query, options).then((result) => {
      expect(result.docs).to.have.length(10);
      expect(result.totalDocs).to.equal(100);
      expect(result.limit).to.equal(10);
      expect(result.page).to.equal(1);
      expect(result.pagingCounter).to.equal(1);
      expect(result.hasPrevPage).to.equal(false);
      expect(result.hasNextPage).to.equal(true);
      expect(result.prevPage).to.equal(null);
      expect(result.nextPage).to.equal(2);
      expect(result.totalPages).to.equal(10);
    });
  });

  it('last page with page and limit', function () {
    var query = {
      title: {
        $in: [/Book/i],
      },
    };

    var options = {
      limit: 10,
      page: 10,
      lean: true,
    };

    return Book.paginate(query, options).then((result) => {
      expect(result.docs).to.have.length(10);
      expect(result.totalDocs).to.equal(100);
      expect(result.limit).to.equal(10);
      expect(result.page).to.equal(10);
      expect(result.pagingCounter).to.equal(91);
      expect(result.hasPrevPage).to.equal(true);
      expect(result.hasNextPage).to.equal(false);
      expect(result.prevPage).to.equal(9);
      expect(result.nextPage).to.equal(null);
      expect(result.totalPages).to.equal(10);
    });
  });

  it('with offset and limit (not page)', function () {
    var query = {
      title: {
        $in: [/Book/i],
      },
    };

    var options = {
      limit: 10,
      offset: 98,
      sort: {
        _id: 1,
      },
      lean: true,
    };

    return Book.paginate(query, options).then((result) => {
      expect(result.docs).to.have.length(2);
      expect(result.totalDocs).to.equal(100);
      expect(result.limit).to.equal(10);
      expect(result.page).to.equal(10);
      expect(result.pagingCounter).to.equal(91);
      expect(result.hasPrevPage).to.equal(true);
      expect(result.hasNextPage).to.equal(false);
      expect(result.prevPage).to.equal(9);
      expect(result.nextPage).to.equal(null);
      expect(result.totalPages).to.equal(10);
    });
  });

  it('with offset and limit (not page) condition: offset > 0 < limit', function () {
    var query = {
      title: {
        $in: [/Book/i],
      },
    };

    var options = {
      limit: 10,
      offset: 5,
      sort: {
        _id: 1,
      },
      lean: true,
    };

    return Book.paginate(query, options).then((result) => {
      expect(result.docs).to.have.length(10);
      expect(result.totalDocs).to.equal(100);
      expect(result.limit).to.equal(10);
      expect(result.page).to.equal(1);
      expect(result.pagingCounter).to.equal(1);
      expect(result.hasPrevPage).to.equal(true);
      expect(result.hasNextPage).to.equal(true);
      expect(result.prevPage).to.equal(1);
      expect(result.nextPage).to.equal(2);
      expect(result.totalPages).to.equal(10);
    });
  });

  it('with limit=0 (metadata only)', function () {
    var query = {
      title: {
        $in: [/Book #1/i],
      },
    };

    var options = {
      limit: 0,
      sort: {
        _id: 1,
      },
      collation: {
        locale: 'en',
        strength: 2,
      },
      lean: true,
    };

    return Book.paginate(query, options).then((result) => {
      expect(result.docs).to.have.length(0);
      expect(result.totalDocs).to.equal(12);
      expect(result.limit).to.equal(0);
      expect(result.page).to.equal(1);
      expect(result.pagingCounter).to.equal(1);
      expect(result.hasPrevPage).to.equal(false);
      expect(result.hasNextPage).to.equal(false);
      expect(result.prevPage).to.equal(null);
      expect(result.nextPage).to.equal(null);
      expect(result.totalPages).to.equal(1);
    });
  });

  /*
  it('with $where condition', function () {
    var query = {
      '$where': 'this.price < 100'
    };

    var options = {
      sort: {
        price: -1
      },
      page: 2
    };

    return Book.paginate(query, options).then((result) => {
      expect(result.docs).to.have.length(6);
      expect(result.docs[0].title).to.equal('Book #6');
      expect(result.totalDocs).to.equal(16);
      expect(result.limit).to.equal(10);
      expect(result.page).to.equal(2);
      expect(result.pagingCounter).to.equal(11);
      expect(result.hasPrevPage).to.equal(true);
      expect(result.hasNextPage).to.equal(false);
      expect(result.prevPage).to.equal(1);
      expect(result.nextPage).to.equal(null);
      expect(result.totalPages).to.equal(2);
    });
  });
  */

  it('with empty custom labels', function () {
    var query = {
      title: {
        $in: [/Book/i],
      },
    };

    const myCustomLabels = {
      nextPage: false,
      prevPage: '',
    };

    var options = {
      sort: {
        _id: 1,
      },
      limit: 10,
      page: 5,
      select: {
        title: 1,
        price: 1,
      },
      customLabels: myCustomLabels,
    };
    return Book.paginate(query, options).then((result) => {
      expect(result.docs).to.have.length(10);
      expect(result.docs[0].title).to.equal('Book #41');
      expect(result.totalDocs).to.equal(100);
      expect(result.limit).to.equal(10);
      expect(result.page).to.equal(5);
      expect(result.pagingCounter).to.equal(41);
      expect(result.hasPrevPage).to.equal(true);
      expect(result.hasNextPage).to.equal(true);
      expect(result.totalPages).to.equal(10);
      expect(result.prevPage).to.equal(undefined);
      expect(result.nextPage).to.equal(undefined);
    });
  });

  it('with custom labels', function () {
    var query = {
      title: {
        $in: [/Book/i],
      },
    };

    const myCustomLabels = {
      totalDocs: 'itemCount',
      docs: 'itemsList',
      limit: 'perPage',
      page: 'currentPage',
      nextPage: 'next',
      prevPage: 'prev',
      totalPages: 'pageCount',
      pagingCounter: 'pageCounter',
      hasPrevPage: 'hasPrevious',
      hasNextPage: 'hasNext',
    };

    var options = {
      sort: {
        _id: 1,
      },
      limit: 10,
      page: 5,
      select: {
        title: 1,
        price: 1,
      },
      customLabels: myCustomLabels,
    };
    return Book.paginate(query, options).then((result) => {
      expect(result.itemsList).to.have.length(10);
      expect(result.itemsList[0].title).to.equal('Book #41');
      expect(result.itemCount).to.equal(100);
      expect(result.perPage).to.equal(10);
      expect(result.currentPage).to.equal(5);
      expect(result.pageCounter).to.equal(41);
      expect(result.hasPrevious).to.equal(true);
      expect(result.hasNext).to.equal(true);
      expect(result.prev).to.equal(4);
      expect(result.next).to.equal(6);
      expect(result.pageCount).to.equal(10);
    });
  });

  it('with custom Meta label', function () {
    var query = {
      title: {
        $in: [/Book/i],
      },
    };

    const myCustomLabels = {
      meta: 'meta',
      docs: 'itemsList',
      totalDocs: 'total',
    };

    var options = {
      sort: {
        _id: 1,
      },
      limit: 10,
      page: 5,
      select: {
        title: 1,
        price: 1,
      },
      customLabels: myCustomLabels,
    };
    return Book.paginate(query, options).then((result) => {
      expect(result.itemsList).to.have.length(10);
      expect(result.itemsList[0].title).to.equal('Book #41');
      expect(result.meta).to.be.an.instanceOf(Object);
      expect(result.meta.total).to.equal(100);
    });
  });

  it('Sub documents pagination', async () => {
    var query = {
      title: 'Book #1',
    };
    var option = {
      pagingOptions: {
        populate: {
          path: 'user',
        },
        page: 2,
        limit: 3,
      },
    };

    const result = await Book.paginateSubDocs(query, option);
    expect(result.user.docs).to.have.length(3);
    expect(result.user.totalPages).to.equal(4);
    expect(result.user.page).to.equal(2);
    expect(result.user.limit).to.equal(3);
    expect(result.user.hasPrevPage).to.equal(true);
    expect(result.user.hasNextPage).to.equal(true);
    expect(result.user.prevPage).to.equal(1);
    expect(result.user.nextPage).to.equal(3);
    expect(result.user.pagingCounter).to.equal(4);
    expect(result.user.docs[0].age).to.equal(3);
  });

  /*
  it('2dsphere', function () {
    var query = {
      loc: {
        $nearSphere: [50, 50],
      },
    };

    const myCustomLabels = {
      meta: 'meta',
      docs: 'itemsList',
      totalDocs: 'total',
    };

    var options = {
      sort: {
        _id: 1,
      },
      limit: 10,
      page: 5,
      select: {
        title: 1,
        price: 1,
      },
      forceCountFn: true,
      customLabels: myCustomLabels,
    };
    return Book.paginate(query, options).then((result) => {
      expect(result.meta.total).to.equal(100);
    });
  });
*/
  it('all data (without pagination)', function () {
    var query = {
      title: {
        $in: [/Book/i],
      },
    };

    var options = {
      pagination: false,
    };

    return Book.paginate(query, options).then((result) => {
      testUnpaginatedCollection(result);
    });
  });

  it('estimated count works', async function () {
    const result = await Book.paginate(
      {},
      {
        useEstimatedCount: true,
      }
    );
    expect(result).to.be.an.instanceOf(Object);
    assert.isNumber(result.totalDocs, 'totalDocs is a number');
  });

  it('count Custom Fn works', async function () {
    const result = await Book.paginate(
      {},
      {
        useCustomCountFn: function () {
          return 100;
        },
      }
    );

    expect(result).to.be.an.instanceOf(Object);
    assert.isNumber(result.totalDocs, 'totalDocs is a number');
    expect(result.totalDocs).to.equal(100);
  });

  it('count Custom Fn with Promise return works', async function () {
    const result = await Book.paginate(
      {},
      {
        useCustomCountFn: function () {
          return Promise.resolve(100);
        },
      }
    );

    expect(result).to.be.an.instanceOf(Object);
    assert.isNumber(result.totalDocs, 'totalDocs is a number');
    expect(result.totalDocs).to.equal(100);
  });

  it('pagination=false, limit/page=undefined -> return all docs', function () {
    var query = {
      title: {
        $in: [/Book/i],
      },
    };

    var options = {
      pagination: false,
      page: undefined,
      limit: undefined,
    };

    return Book.paginate(query, options).then((result) => {
      expect(result.docs).to.have.length(100);
      expect(result.totalDocs).to.equal(100);
      expect(result.limit).to.equal(100);
      expect(result.page).to.equal(1);
      expect(result.pagingCounter).to.equal(1);
      expect(result.hasPrevPage).to.equal(false);
      expect(result.hasNextPage).to.equal(false);
      expect(result.prevPage).to.equal(null);
      expect(result.nextPage).to.equal(null);
      expect(result.totalPages).to.equal(1);
    });
  });

  it('PaginationParameters-helper -> number type options work', () => {
    const request = {
      query: {
        limit: '20',
        page: '2',
        // mocks how Frameworks such as Express and Nestjs would parse a JSON object in the query string
        query: '{"title": {"$in": [/Book/i]}}',
      },
    };

    return Book.paginate(...new PaginationParameters(request).get()).then(
      (result) => {
        expect(result.docs).to.have.length(20);
        expect(result.limit).to.equal(20);
        expect(result.page).to.equal(2);
        expect(result.hasPrevPage).to.equal(true);
        expect(result.hasNextPage).to.equal(true);
        expect(result.prevPage).to.equal(1);
        expect(result.nextPage).to.equal(3);
        expect(result.totalPages).to.equal(5);
      }
    );
  });

  it('PaginationParameters-helper -> (JSON) object type options work', () => {
    const request = {
      query: {
        limit: '5',
        page: '4',
        // mocks how Frameworks such as Express and Nestjs would read a JSON object as a part of the query string
        query: '{"price": {"$gt": 100}}',
        sort: '{"price": "desc"}',
      },
    };

    return Book.paginate(...new PaginationParameters(request).get()).then(
      (result) => {
        testDescendingPrice(result);
        expect(result.docs).to.have.length(5);
        expect(result.limit).to.equal(5);
        expect(result.page).to.equal(4);
        expect(result.hasPrevPage).to.equal(true);
        expect(result.hasNextPage).to.equal(true);
        expect(result.prevPage).to.equal(3);
        expect(result.nextPage).to.equal(5);
      }
    );
  });

  it('PaginationParameters-helper -> boolean options work', () => {
    const request = {
      query: {
        pagination: false,
      },
    };

    return Book.paginate(...new PaginationParameters(request).get()).then(
      (result) => {
        testUnpaginatedCollection(result);
      }
    );
  });

  it('PaginationParameters-helper -> string options work', () => {
    const request = {
      query: {
        sort: '-price',
      },
    };

    return Book.paginate(...new PaginationParameters(request).get()).then(
      (result) => {
        testDescendingPrice(result);
      }
    );
  });

  after(async function () {
    await mongoose.connection.db.dropDatabase();
  });

  after(async function () {
    await mongoose.disconnect();
  });

  it('pagination=default, limit/page=undefined -> return first 10', function () {
    var query = {
      title: {
        $in: [/Book/i],
      },
    };

    var options = {
      page: undefined,
      limit: undefined,
    };

    return Book.paginate(query, options).then((result) => {
      expect(result.docs).to.have.length(10);
      expect(result.totalDocs).to.equal(100);
      expect(result.limit).to.equal(10);
      expect(result.page).to.equal(1);
      expect(result.pagingCounter).to.equal(1);
      expect(result.hasPrevPage).to.equal(false);
      expect(result.hasNextPage).to.equal(true);
      expect(result.prevPage).to.equal(null);
      expect(result.nextPage).to.equal(2);
      expect(result.totalPages).to.equal(10);
    });
  });

  it('pagination with queryHelper', function () {
    var query = {};

    var options = {
      page: 1,
      limit: 10,
    };

    return Book.find()
      .whereActive()
      .paginate(query, options)
      .then((result) => {
        expect(result.totalDocs).to.equal(50);
      });
  });

  it('collation with session in transaction should work correctly', async function () {
    // Transactions require a replica set
    if (
      !mongoose.connection.client.topology.description.type.includes(
        'ReplicaSet'
      )
    ) {
      this.skip();
    }

    // Tests that collation + session in a transaction maintains session context.
    // Previously, chaining .collation() after countDocuments broke the session.
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const query = {
        title: {
          $in: [/Book/i],
        },
      };

      const options = {
        limit: 10,
        page: 1,
        collation: {
          locale: 'en',
          strength: 2,
        },
        options: {
          session: session,
        },
      };

      const result = await Book.paginate(query, options);

      expect(result.docs).to.have.length(10);
      expect(result.totalDocs).to.equal(100);
      expect(result.totalPages).to.equal(10);
      expect(result.hasNextPage).to.equal(true);

      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      await session.endSession();
    }
  });

  it('paginate inside a transaction serializes count and docs when session is set', async function () {
    // Transactions require a replica set
    if (
      !mongoose.connection.client.topology.description.type.includes(
        'ReplicaSet'
      )
    ) {
      this.skip();
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const query = {
        title: {
          $in: [/Book/i],
        },
      };

      const options = {
        limit: 10,
        page: 1,
        options: {
          session: session,
        },
      };

      const result = await Book.paginate(query, options);

      expect(result.docs).to.have.length(10);
      expect(result.totalDocs).to.equal(100);
      expect(result.totalPages).to.equal(10);
      expect(result.hasNextPage).to.equal(true);

      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      await session.endSession();
    }
  });

  it('paginate inside an implicit ALS transaction serializes count and docs', async function () {
    // Transactions require a replica set
    if (
      !mongoose.connection.client.topology.description.type.includes(
        'ReplicaSet'
      )
    ) {
      this.skip();
    }

    const originalUseALS = mongoose.get('transactionAsyncLocalStorage');
    mongoose.set('transactionAsyncLocalStorage', true);

    try {
      await mongoose.connection.transaction(async function () {
        const query = {
          title: {
            $in: [/Book/i],
          },
        };

        const options = {
          limit: 10,
          page: 1,
        };

        const store =
          Book.db.base.transactionAsyncLocalStorage &&
          Book.db.base.transactionAsyncLocalStorage.getStore();
        expect(store).to.be.an('object');
        expect(store.session).to.exist;

        const result = await Book.paginate(query, options);

        expect(result.docs).to.have.length(10);
        expect(result.totalDocs).to.equal(100);
        expect(result.totalPages).to.equal(10);
        expect(result.hasNextPage).to.equal(true);
      });
    } finally {
      mongoose.set('transactionAsyncLocalStorage', originalUseALS);
    }
  });

  it('serializes count and docs when an explicit session is in a transaction', async function () {
    const originalCountDocuments = Book.countDocuments;
    const originalFind = Book.find;
    const countControl = controlledPromise();
    const docsControl = controlledPromise();
    let countStarted = false;
    let docsConstructed = false;
    let docsStarted = false;

    try {
      Book.countDocuments = function () {
        return {
          exec() {
            countStarted = true;
            return countControl.promise;
          },
        };
      };

      Book.find = function () {
        docsConstructed = true;
        return stubQuery(function () {
          docsStarted = true;
          return docsControl.promise;
        });
      };

      const resultPromise = mongoosePaginateSource.paginate.call(
        Book,
        { title: 'Serialized explicit session' },
        {
          limit: 10,
          page: 1,
          options: {
            session: {
              id: 'explicit-session',
              inTransaction() {
                return true;
              },
            },
          },
        }
      );

      expect(countStarted).to.equal(true);
      expect(docsConstructed).to.equal(false);
      expect(docsStarted).to.equal(false);

      await Promise.resolve();

      expect(docsConstructed).to.equal(false);
      expect(docsStarted).to.equal(false);

      countControl.resolve(1);
      await Promise.resolve();

      expect(docsConstructed).to.equal(true);
      expect(docsStarted).to.equal(true);

      docsControl.resolve([{ title: 'Serialized explicit session' }]);
      const result = await resultPromise;

      expect(result.totalDocs).to.equal(1);
      expect(result.docs).to.have.length(1);
    } finally {
      Book.countDocuments = originalCountDocuments;
      Book.find = originalFind;
    }
  });

  it('keeps count and docs parallel when an explicit session is not in a transaction', async function () {
    const originalCountDocuments = Book.countDocuments;
    const originalFind = Book.find;
    const countControl = controlledPromise();
    const docsControl = controlledPromise();
    let countStarted = false;
    let docsStarted = false;

    try {
      Book.countDocuments = function () {
        return {
          exec() {
            countStarted = true;
            return countControl.promise;
          },
        };
      };

      Book.find = function () {
        return stubQuery(function () {
          docsStarted = true;
          return docsControl.promise;
        });
      };

      const resultPromise = mongoosePaginateSource.paginate.call(
        Book,
        { title: 'Parallel explicit session' },
        {
          limit: 10,
          page: 1,
          options: {
            session: {
              id: 'explicit-causal-session',
              inTransaction() {
                return false;
              },
            },
          },
        }
      );

      expect(countStarted).to.equal(true);
      expect(docsStarted).to.equal(true);

      countControl.resolve(2);
      docsControl.resolve([
        { title: 'Parallel explicit session 1' },
        { title: 'Parallel explicit session 2' },
      ]);
      const result = await resultPromise;

      expect(result.totalDocs).to.equal(2);
      expect(result.docs).to.have.length(2);
    } finally {
      Book.countDocuments = originalCountDocuments;
      Book.find = originalFind;
    }
  });

  it('serializes count and docs when an implicit ALS session is in a transaction', async function () {
    const originalCountDocuments = Book.countDocuments;
    const originalFind = Book.find;
    const base = Book.db.base;
    const hadTransactionAsyncLocalStorage =
      Object.prototype.hasOwnProperty.call(
        base,
        'transactionAsyncLocalStorage'
      );
    const originalTransactionAsyncLocalStorage =
      base.transactionAsyncLocalStorage;
    const countControl = controlledPromise();
    const docsControl = controlledPromise();
    let countStarted = false;
    let docsConstructed = false;
    let docsStarted = false;

    try {
      base.transactionAsyncLocalStorage = {
        getStore() {
          return {
            session: {
              id: 'implicit-session',
              inTransaction() {
                return true;
              },
            },
          };
        },
      };

      Book.countDocuments = function () {
        return {
          exec() {
            countStarted = true;
            return countControl.promise;
          },
        };
      };

      Book.find = function () {
        docsConstructed = true;
        return stubQuery(function () {
          docsStarted = true;
          return docsControl.promise;
        });
      };

      const resultPromise = mongoosePaginateSource.paginate.call(
        Book,
        { title: 'Serialized implicit session' },
        {
          limit: 10,
          page: 1,
        }
      );

      expect(countStarted).to.equal(true);
      expect(docsConstructed).to.equal(false);
      expect(docsStarted).to.equal(false);

      await Promise.resolve();

      expect(docsConstructed).to.equal(false);
      expect(docsStarted).to.equal(false);

      countControl.resolve(1);
      await Promise.resolve();

      expect(docsConstructed).to.equal(true);
      expect(docsStarted).to.equal(true);

      docsControl.resolve([{ title: 'Serialized implicit session' }]);
      const result = await resultPromise;

      expect(result.totalDocs).to.equal(1);
      expect(result.docs).to.have.length(1);
    } finally {
      Book.countDocuments = originalCountDocuments;
      Book.find = originalFind;

      if (hadTransactionAsyncLocalStorage) {
        base.transactionAsyncLocalStorage =
          originalTransactionAsyncLocalStorage;
      } else {
        delete base.transactionAsyncLocalStorage;
      }
    }
  });

  it('starts count and docs in parallel when no session is active', async function () {
    const originalCountDocuments = Book.countDocuments;
    const originalFind = Book.find;
    const base = Book.db.base;
    const hadTransactionAsyncLocalStorage =
      Object.prototype.hasOwnProperty.call(
        base,
        'transactionAsyncLocalStorage'
      );
    const originalTransactionAsyncLocalStorage =
      base.transactionAsyncLocalStorage;
    const countControl = controlledPromise();
    const docsControl = controlledPromise();
    let countStarted = false;
    let docsStarted = false;

    try {
      base.transactionAsyncLocalStorage = {
        getStore() {
          return null;
        },
      };

      Book.countDocuments = function () {
        return {
          exec() {
            countStarted = true;
            return countControl.promise;
          },
        };
      };

      Book.find = function () {
        return stubQuery(function () {
          docsStarted = true;
          return docsControl.promise;
        });
      };

      const resultPromise = mongoosePaginateSource.paginate.call(
        Book,
        { title: 'Parallel no session' },
        {
          limit: 10,
          page: 1,
        }
      );

      expect(countStarted).to.equal(true);
      expect(docsStarted).to.equal(true);

      countControl.resolve(2);
      docsControl.resolve([
        { title: 'Parallel no session 1' },
        { title: 'Parallel no session 2' },
      ]);
      const result = await resultPromise;

      expect(result.totalDocs).to.equal(2);
      expect(result.docs).to.have.length(2);
    } finally {
      Book.countDocuments = originalCountDocuments;
      Book.find = originalFind;

      if (hadTransactionAsyncLocalStorage) {
        base.transactionAsyncLocalStorage =
          originalTransactionAsyncLocalStorage;
      } else {
        delete base.transactionAsyncLocalStorage;
      }
    }
  });

  it('should not pass limit from options.options to countDocuments', async function () {
    // When options.options contains { limit: 10 }, that limit was being passed to
    // countDocuments(). MongoDB applies limit to the count result, so totalDocs
    // would return 10 instead of the actual count (e.g., 50).
    const query = { active: true };

    const options = {
      limit: 10,
      page: 1,
      collation: {
        locale: 'en',
        strength: 2,
      },
      options: {
        limit: 10, // This should NOT be passed to countDocuments
      },
    };

    const result = await Book.paginate(query, options);

    // Bug: totalDocs returns 10 (the limit) instead of 50 (actual count)
    expect(result.docs).to.have.length(10);
    expect(result.totalDocs).to.equal(50); // This fails with the bug - returns 10
    expect(result.totalPages).to.equal(5);
    expect(result.hasNextPage).to.equal(true);
  });
});

function randomString(strLength, charSet) {
  var result = [];

  strLength = strLength || 5;
  charSet =
    charSet || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  while (strLength--) {
    // (note, fixed typo)
    result.push(charSet.charAt(Math.floor(Math.random() * charSet.length)));
  }

  return result.join('');
}
