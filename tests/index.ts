import mongoose from 'mongoose';
import { assert, expect } from 'chai';
import mongoosePaginate from '../src/index';

const MONGO_URI = 'mongodb://localhost/mongoose_paginate_test';

interface IAuthor {
  name: string;
}

const AuthorSchema = new mongoose.Schema<IAuthor>({
  name: String,
});

const Author = mongoose.model<IAuthor>('Author', AuthorSchema);

interface IBook {
  title: string;
  date: Date;
  price: number;
  author: IAuthor;
  loc: {
    type: string;
    coordinates: number[];
  };
}

const BookSchema = new mongoose.Schema<IBook>({
  title: String,
  date: Date,
  price: Number,
  author: {
    type: mongoose.Types.ObjectId,
    ref: 'Author',
  },
  loc: Object,
});

BookSchema.index({
  loc: '2dsphere',
});

BookSchema.plugin(mongoosePaginate);

const Book = mongoose.model<IBook>('Book', BookSchema);

describe('mongoose-paginate', () => {
  before((done) => {
    mongoose.connect(
      MONGO_URI,
      {
        useUnifiedTopology: true,
        useNewUrlParser: true,
      },
      done
    );
  });

  before((done) => {
    mongoose.connection.db.dropDatabase(done);
  });

  before(async () => {
    let book: IBook;
    const books: IBook[] = [];
    const date = new Date();

    const author = await Author.create({
      name: 'Arthur Conan Doyle',
    });

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

    await Book.create(books);
  });

  it('promise return test', () => {
    const promise = Book.paginate();
    expect(promise.then).to.be.an.instanceof(Function);
  });

  it('callback test', (done) => {
    Book.paginate({}, {}, (err, result) => {
      expect(err).to.be.null;
      expect(result).to.be.an.instanceOf(Object);
      done();
    });
  });

  it('with page and limit', async () => {
    const query = {
      title: {
        $in: [/Book/i],
      },
    };

    const options = {
      limit: 10,
      page: 5,
      lean: true,
    };

    const result = await Book.paginate(query, options);

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

  it('first page with page and limit, limit > doc.length', async () => {
    const query = {
      title: {
        $in: [/Book/i],
      },
    };

    const options = {
      limit: 200,
      page: 1,
      lean: true,
    };

    const result = await Book.paginate(query, options);

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

  it('first page with page and limit', async () => {
    const query = {
      title: {
        $in: [/Book/i],
      },
    };

    const options = {
      limit: 10,
      page: 1,
      lean: true,
    };

    const result = await Book.paginate(query, options);

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

  it('last page with page and limit', async () => {
    const query = {
      title: {
        $in: [/Book/i],
      },
    };

    const options = {
      limit: 10,
      page: 10,
      lean: true,
    };

    const result = await Book.paginate(query, options);

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

  it('with offset and limit (not page)', async () => {
    const query = {
      title: {
        $in: [/Book/i],
      },
    };

    const options = {
      limit: 10,
      offset: 98,
      sort: {
        _id: 1,
      },
      lean: true,
    };

    const result = await Book.paginate(query, options);

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

  it('with offset and limit (not page) condition: offset > 0 < limit', async () => {
    const query = {
      title: {
        $in: [/Book/i],
      },
    };

    const options = {
      limit: 10,
      offset: 5,
      sort: {
        _id: 1,
      },
      lean: true,
    };

    const result = await Book.paginate(query, options);

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

  it('with limit=0 (metadata only)', async () => {
    const query = {
      title: {
        $in: [/Book #1/i],
      },
    };

    const options = {
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

    const result = await Book.paginate(query, options);

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

  /*
  it('with $where condition', async () => {
    var query = {
      $where: 'this.price < 100',
    };

    var options = {
      sort: {
        price: -1,
      },
      page: 2,
    };

    const result = await Book.paginate(query, options);

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
  */

  it('with empty custom labels', async () => {
    const query = {
      title: {
        $in: [/Book/i],
      },
    };

    const myCustomLabels: mongoose.CustomLabels = {
      nextPage: undefined,
      prevPage: '',
    };

    const options: mongoose.PaginateOptions = {
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

    const result = await Book.paginate(query, options);

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

  it('with custom labels', async () => {
    const query = {
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

    const options = {
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

    const result = await Book.paginate(query, options);

    expect(result.itemsList).to.have.length(10);
    expect(
      Array.isArray(result.itemsList) && result.itemsList[0].title
    ).to.equal('Book #41');
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

  it('with custom Meta label', async () => {
    const query = {
      title: {
        $in: [/Book/i],
      },
    };

    const myCustomLabels = {
      meta: 'meta',
      docs: 'itemsList',
      totalDocs: 'total',
    };

    const options = {
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

    const result = await Book.paginate(query, options);

    expect(result.itemsList).to.have.length(10);
    expect(
      Array.isArray(result.itemsList) && result.itemsList[0].title
    ).to.equal('Book #41');
    expect(result.meta).to.be.an.instanceOf(Object);
    expect(result.meta.total).to.equal(100);
  });

  it('2dsphere', async () => {
    const query = {
      loc: {
        $nearSphere: [50, 50],
      },
    };

    const myCustomLabels = {
      meta: 'meta',
      docs: 'itemsList',
      totalDocs: 'total',
    };

    const options = {
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

    const result = await Book.paginate(query, options);

    expect(result.meta.total).to.equal(100);
  });

  it('all data (without pagination)', async () => {
    const query = {
      title: {
        $in: [/Book/i],
      },
    };

    const options = {
      pagination: false,
    };

    const result = await Book.paginate(query, options);

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

  it('estimated count works', (done) => {
    Book.paginate({}, { useEstimatedCount: true }, (err, result) => {
      expect(err).to.be.null;
      expect(result).to.be.an.instanceOf(Object);
      assert.isNumber(result.totalDocs, 'totalDocs is a number');
      done();
    });
  });

  it('count Custom Fn works', (done) => {
    Book.paginate(
      {},
      {
        useCustomCountFn: async () => {
          return 100;
        },
      },
      (err, result) => {
        expect(err).to.be.null;
        expect(result).to.be.an.instanceOf(Object);
        assert.isNumber(result.totalDocs, 'totalDocs is a number');
        expect(result.totalDocs).to.equal(100);
        done();
      }
    );
  });

  it('count Custom Fn with Promise return works', (done) => {
    Book.paginate(
      {},
      {
        useCustomCountFn: () => {
          return Promise.resolve(100);
        },
      },
      (err, result) => {
        expect(err).to.be.null;
        expect(result).to.be.an.instanceOf(Object);
        assert.isNumber(result.totalDocs, 'totalDocs is a number');
        expect(result.totalDocs).to.equal(100);
        done();
      }
    );
  });

  it('pagination=false, limit/page=undefined -> return all docs', async () => {
    const query = {
      title: {
        $in: [/Book/i],
      },
    };

    const options: mongoose.PaginateOptions = {
      pagination: false,
      page: undefined,
      limit: undefined,
    };

    const result = await Book.paginate(query, options);

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

  after((done) => {
    mongoose.connection.db.dropDatabase(done);
  });

  after((done) => {
    mongoose.disconnect(done);
  });
});
