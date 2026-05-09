const express = require('express');
const app = express();
let path = require('path');
let sdk = require('./sdk');

const PORT = 8001;
const HOST = '0.0.0.0';
app.use(express.json());
app.use(express.urlencoded({ extended: true }))

app.get('/init', function (req, res) {
   let a = req.query.a;
   let aval = req.query.aval;
   let b = req.query.b;
   let bval = req.query.bval;
   let c = req.query.c;
   let cval = req.query.cval;
   let args = [a, aval, b, bval, c, cval];
   sdk.send(false, 'Init', args, res);
});

app.get('/invoke', function (req, res) {
   let a = req.query.a;
   let b = req.query.b;
   let c = req.query.c;
   let x = req.query.x;
   let args = [a, b, c, x];
   sdk.send(false, 'Invoke', args, res);
});

app.get('/delete', function (req, res) {
   let a = req.query.a;
   let args = [a];
   sdk.send(false, 'Delete', args, res);
});

app.get('/query', function (req, res) {
   let name = req.query.name;
   let args = [name];
   sdk.send(true, 'Query', args, res);
});

app.get('/all', function (req, res) {
   sdk.send(true, 'GetAllQuery', [], res);
});

app.use(express.static(path.join(__dirname, '../client')));
app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);
