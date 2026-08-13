var express = require('express');
var app = express();

function handleRequest(req, res, next) {
  res.send('OK');
}

module.exports = app;
