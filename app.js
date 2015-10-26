require('coffee-script/register');
var _ = require('underscore');
var express = require('express');
var restling = require('restling');
var TransactionCollection = require('./TransactionCollection')
var app = express();

var api_url = 'http://resttest.bench.co';

app.set('views', 'views');
app.set('view engine', 'jade');

app.get('/', function (req, res, next) {

  var pages = [];
  var page_count;
  var page_size;

  // Fetch transaction data
  // Fetch first page to determine page count
  restling.get(api_url + '/transactions/1.json')
  .then(function(result) {
    pages.push(result.data);
    page_size = result.data.transactions.length;
    page_count = Math.ceil(result.data.totalCount / page_size);

    // Fetch remaining pages
    var page_urls = [];
    for(i=2; i<=page_count; i++) {
      page_urls.push({'url': api_url + '/transactions/' + i + '.json'});
    }
    return restling.settleAsync(page_urls);
  })
  .then(function(responses) {
    pages = pages.concat(responses.map(function(response) { return response.data; }));
    var tc = TransactionCollection.constructFromPages(pages);

    res.render('index', {
      'title': 'Transactions',
      'total_balance': tc.totalBalance(),
      'transactions': tc.getArray(),
      'transactions_by_category': tc.groupByCategory(),
      'page_size': page_size
    });
  })
  .catch(function (error) {
    console.log(error.message);
    res.send("Sorry. There was a problem fetching your data. Please try again and let us know if you still get this message.");
  });
});

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});
