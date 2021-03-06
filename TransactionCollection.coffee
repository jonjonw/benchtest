_ = require('underscore');

###
# Constructor parameters:
#   transactions: an array of transaction objects.
#     transaction options are simple JS objects with: {Date, Ledger, Amount, Company}
#     and some other optional attributes like isDuplicate and DailyTotal
###

class TransactionCollection

  constructor: (@transactions) ->
    @markDuplicates()
    @addRunningDailyTotals()
    @cleanCompanyNames()
    @prettyAmounts()

  @constructFromPages: (pages) ->
    new TransactionCollection _.chain(pages).map((page) ->
      page.transactions
    ).flatten().sortBy('Date').reverse().value()

  totalTransactionsBalance: (transactions) ->
    Number(_.pluck(transactions, 'Amount').reduce((a,b) ->
      Number(a) + Number(b)
    )).toFixed(2)

  totalBalance: => @totalTransactionsBalance @transactions

  markDuplicates: =>
    hash = _.groupBy(@transactions, (trans) -> _.values(trans).join('|')) # unique hashkey
    _.each hash, (transactions) ->
      _.each transactions, (trans) ->
        trans.isDuplicate = (transactions.length > 1)

  groupByCategory: =>
    # Returns an array of objects {category: categoryName, total_balance, transactions}
    #   each object contains transactions of a different cateogry
    _.chain(@transactions).groupBy((trans) -> trans.Ledger).map((transactions, category) =>
      return (
        category: if category == "" then "Uncategorized" else category
        total_balance: @totalTransactionsBalance transactions
        transactions: transactions
      )
    ).values().sortBy('category').value()

  addRunningDailyTotals: =>
    date = null
    dailyTotal = 0
    _.each(@transactions, (trans) -> 
      date ?= trans.Date
      if (date != trans.Date)
        date = trans.Date
        dailyTotal = Number(trans.Amount)
      else dailyTotal += Number(trans.Amount)
      trans.DailyTotal = dailyTotal.toFixed(2)
    )

  cleanCompanyNames: =>
    _.each @transactions, (trans) -> 
      trans.Company = trans.Company.replace(
        / [^ ]+ [A-Z]{2}$/, '' # city prov
      ).replace(
        / [^ ]*[0-9]+[^ ]*/g, '' # words containing numbers
      ).replace(
        / (CA)|(USD) /g, '' # blacklisted words
      ).replace(
        /[^a-zA-Z&. ]/g,'' # special characters and numbers
      ).split(' ').map((word) -> # Uppercase first letters for each word
        word.substring(0,1).toUpperCase() + word.substr(1).toLowerCase()
      ).join(' ')

  prettyAmounts: =>
    _.each @transactions, (trans) -> trans.Amount = Number(trans.Amount).toFixed(2)

  getArray: => @transactions

module.exports = TransactionCollection