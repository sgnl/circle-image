var should = require('should');

var ci = require('../')

console.log(ci()())

describe('test one', function(){
  it('should be equal', function(){
    (5).should.be.exactly(5).and.be.a.Number();
  });
});

describe('test two', function(){
  it('should be equal', function(){
    (5).should.be.exactly(5).and.be.a.Number();
  });
});
