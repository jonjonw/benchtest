var express = require('express');
var restling = require('restling');
var app = express();

var api_url = 'http://resttest.bench.co';

app.set('views', 'views');
app.set('view engine', 'jade');

app.get('/', function (req, res, next) {

  var pages = [];
  var transactions = [];
  var page_count;
  var page_size;
  var total_balance;

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
    total_balance = transactions.reduce(function(pv, transaction) { return pv + Number(transaction.Amount) }, 0);
  })
  .then(function(result) {
    //console.log(transactions);
    res.render('index', {
      'title': 'Transactions',
      'total_balance': total_balance,
      'transactions': transactions,
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
