/* ! utils.js | Project ACTS | github.com/project-acts */

/* eslint prefer-rest-params: off */

const path = require('path');

exports.getAssetPath = function() {
  return path.join(path.join(__dirname, '../../assets'), ...arguments);
};

exports.getHtmlPath = function() {
  return `${path.resolve(__dirname, '../renderer/', path.join(...arguments))}`;
};
