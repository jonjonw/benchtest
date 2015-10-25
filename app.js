var _ = require('underscore');
var express = require('express');
var restling = require('restling');
var app = express();

var api_url = 'http://resttest.bench.co';

app.set('views', 'views');
app.set('view engine', 'jade');

app.get('/', function (req, res, next) {

  var pages = [];
  var transactions = [];
  var transactions_by_category;
  var page_count;
  var page_size;
  var total_balance;

  var sumTranaction = function(pv, transaction) { return pv + Number(transaction.Amount) }
  var markDuplicates = function(transactions) {
    var hash = _.groupBy(transactions, function(transaction) {
      return _.values(transaction).join('|'); // key for uniqueness
    });
    _.each(hash, function(transactions) {
      var isDuplicate = transactions.length > 1;
      _.each(transactions, function(transaction) {
        transaction.isDuplicate = isDuplicate;
      })
    });
  }
  var groupByCategory = function(transactions) {
    // Returns an array of objects {category: categoryName, total_balance, transactions}
    //   each object contains transactions of a different cateogry
    grouped = _.chain(transactions).groupBy(function(transaction) {
      return transaction.Ledger
    }).map(function(transactions, category) {
      return {
        'category': category == "" ? "None" : category,
        'total_balance': transactions.reduce(sumTranaction, 0),
        'transactions': transactions
      };
    }).values().sortBy('category').value();
    return grouped;
  }
  var addRunningDailyTotals = function(transactions) {
    var date, dailyTotal = 0;
    _.each(transactions, function(transaction) {
      if (!date) date = transaction.Date;
      if (date !== transaction.Date) {
        date = transaction.Date;
        dailyTotal = Number(transaction.Amount);
      }
      else dailyTotal += Number(transaction.Amount);
      transaction.DailyTotal = dailyTotal.toFixed(2);
    });
  }
  var cleanCompanyNames = function(transactions) {
    _.each(transactions, function(transaction) {
      transaction.Company = transaction.Company
        .replace(/ [a-zA-Z]+ [A-Z]{2}$/,'') // city provence
        .replace(/[xX]+[0-9]+/g,'') // masked card numbers
        .replace(/[^a-zA-Z& ]/g,'') // special characters and numbers
        .split(' ') // Uppercase first letters for each word
        .map(function(word) {
          return word.substring(0,1).toUpperCase() + word.substr(1).toLowerCase();
        }).join(' ');
    });
  }

  // Fetch transaction data
  restling.get(api_url + '/transactions/1.json').then(function(result) {
    pages.push(result.data);
    page_size = result.data.transactions.length;
    page_count = Math.ceil(result.data.totalCount / page_size);
    return result;
  })
  .then(function(result) {
    var page_urls = [];
    for(i=2; i<=page_count; i++) {
      page_urls.push({'url': api_url + '/transactions/' + i + '.json'});
    }
    return restling.settleAsync(page_urls);
  })
  .then(function(responses) {
    pages = pages.concat(responses.map(function(response) { return response.data; }))
    transactions = [].concat.apply([], pages.map(function(page) { return page.transactions }));
    markDuplicates(transactions);
    addRunningDailyTotals(transactions);
    cleanCompanyNames(transactions);
    total_balance = transactions.reduce(sumTranaction, 0);
    transactions_by_category = groupByCategory(transactions);

    res.render('index', {
      'title': 'Transactions',
      'total_balance': total_balance,
      'transactions': transactions,
      'transactions_by_category': transactions_by_category,
      'page_size': page_size
    });
  })
  .catch(function (error) {
    console.log(error.message);
  });
});

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});
