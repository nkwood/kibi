let _ = require('lodash');
let expect = require('expect.js');
let ngMock = require('ngMock');

let fieldFormats;
let FieldFormat;
let config;

let formatIds = [
  'bytes',
  'date',
  'ip',
  'number',
  'percent',
  'color',
  'string',
  'url',
  '_source',
  'truncate'
];

module.exports = describe('conformance', function () {
  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private, $injector) {
    fieldFormats = Private(require('ui/registry/field_formats'));
    FieldFormat = Private(require('ui/index_patterns/_field_format/FieldFormat'));
    config = $injector.get('config');
  }));

  formatIds.forEach(function (id) {
    let instance;
    let Type;

    beforeEach(function () {
      Type = fieldFormats.getType(id);
      instance = fieldFormats.getInstance(id);
    });

    describe(id + ' Type', function () {
      it('has an id', function () {
        expect(Type.id).to.be.a('string');
      });

      it('has a title', function () {
        expect(Type.title).to.be.a('string');
      });

      it('declares compatible field formats as a string or array', function () {
        expect(Type.fieldType).to.be.ok();
        expect(_.isString(Type.fieldType) || _.isArray(Type.fieldType)).to.be(true);
      });
    });

    describe(id + ' Instance', function () {
      it('extends FieldFormat', function () {
        expect(instance).to.be.a(FieldFormat);
      });
    });
  });

  it('registers all of the fieldFormats', function () {
    expect(_.difference(fieldFormats.raw, formatIds.map(fieldFormats.getType))).to.eql([]);
  });

  describe('Bytes format', basicPatternTests('bytes', require('numeral')));
  describe('Percent Format', basicPatternTests('percent', require('numeral')));
  describe('Date Format', basicPatternTests('date', require('moment')));

  describe('Number Format', function () {
    basicPatternTests('number', require('numeral'))();

    it('tries to parse strings', function () {
      let number = new (fieldFormats.getType('number'))({ pattern: '0.0b' });
      expect(number.convert(123.456)).to.be('123.5B');
      expect(number.convert('123.456')).to.be('123.5B');
    });

  });

  function basicPatternTests(id, lib) {
    let confKey = id === 'date' ? 'dateFormat' : 'format:' + id + ':defaultPattern';

    return function () {
      it('converts using the format:' + id + ':defaultPattern config', function () {
        let inst = fieldFormats.getInstance(id);
        [
          '0b',
          '0 b',
          '0.[000] b',
          '0.[000]b',
          '0.[0]b'
        ].forEach(function (pattern) {
          let num = _.random(-10000, 10000, true);
          config.set(confKey, pattern);
          expect(inst.convert(num)).to.be(lib(num).format(pattern));
        });
      });

      it('uses the pattern param if available', function () {
        let num = _.random(-10000, 10000, true);
        let defFormat = '0b';
        let customFormat = '0.00000%';

        config.set(confKey, defFormat);
        let defInst = fieldFormats.getInstance(id);

        let Type = fieldFormats.getType(id);
        let customInst = new Type({ pattern: customFormat });

        expect(defInst.convert(num)).to.not.be(customInst.convert(num));
        expect(defInst.convert(num)).to.be(lib(num).format(defFormat));
        expect(customInst.convert(num)).to.be(lib(num).format(customFormat));
      });
    };
  }
});
