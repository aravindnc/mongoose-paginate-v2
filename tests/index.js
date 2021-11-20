'use strict';

let mongoose = require('mongoose');
let expect = require('chai').expect;
let assert = require('chai').assert;
let mongoosePaginate = require('../dist/index');

let MONGO_URI = 'mongodb://localhost/mongoose_paginate_test';

let AuthorSchema = new mongoose.Schema({
  name: String,
});
let Author = mongoose.model('Author', AuthorSchema);

let BookSchema = new mongoose.Schema({
  title: String,
  date: Date,
  price: Number,
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'Author',
  },
  loc: Object,
});

BookSchema.index({
  loc: '2dsphere',
});

BookSchema.plugin(mongoosePaginate);

let Book = mongoose.model('Book', BookSchema);

describe('mongoose-paginate', function () {
  before(function (done) {
    mongoose.connect(
      MONGO_URI,
      {
        useUnifiedTopology: true,
        useNewUrlParser: true,
      },
      done
    );
  });

  before(function (done) {
    mongoose.connection.db.dropDatabase(done);
  });

  before(function () {
    let book,
      books = [];
    let date = new Date();

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

  it('callback test', function (done) {
    Book.paginate({}, {}, function (err, result) {
      expect(err).to.be.null;
      expect(result).to.be.an.instanceOf(Object);
      done();
    });
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
      expect(result.hasPrevPage).to.equal(false);
      expect(result.hasNextPage).to.equal(true);
      expect(result.prevPage).to.equal(null);
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

  it('estimated count works', function (done) {
    Book.paginate({}, { useEstimatedCount: true }, function (err, result) {
      expect(err).to.be.null;
      expect(result).to.be.an.instanceOf(Object);
      assert.isNumber(result.totalDocs, 'totalDocs is a number');
      done();
    });
  });

  it('count Custom Fn works', function (done) {
    Book.paginate(
      {},
      {
        useCustomCountFn: function () {
          return 100;
        },
      },
      function (err, result) {
        expect(err).to.be.null;
        expect(result).to.be.an.instanceOf(Object);
        assert.isNumber(result.totalDocs, 'totalDocs is a number');
        expect(result.totalDocs).to.equal(100);
        done();
      }
    );
  });

  it('count Custom Fn with Promise return works', function (done) {
    Book.paginate(
      {},
      {
        useCustomCountFn: function () {
          return Promise.resolve(100);
        },
      },
      function (err, result) {
        expect(err).to.be.null;
        expect(result).to.be.an.instanceOf(Object);
        assert.isNumber(result.totalDocs, 'totalDocs is a number');
        expect(result.totalDocs).to.equal(100);
        done();
      }
    );
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

  after(function (done) {
    mongoose.connection.db.dropDatabase(done);
  });

  after(function (done) {
    mongoose.disconnect(done);
  });
});
