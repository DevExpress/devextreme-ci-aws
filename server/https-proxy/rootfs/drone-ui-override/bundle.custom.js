webpackJsonp([0],[
/* 0 */,
/* 1 */,
/* 2 */,
/* 3 */
/***/ (function(module, exports) {

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
// css base code, injected by the css-loader
module.exports = function(useSourceMap) {
	var list = [];

	// return the list of modules as css string
	list.toString = function toString() {
		return this.map(function (item) {
			var content = cssWithMappingToString(item, useSourceMap);
			if(item[2]) {
				return "@media " + item[2] + "{" + content + "}";
			} else {
				return content;
			}
		}).join("");
	};

	// import a list of modules into the list
	list.i = function(modules, mediaQuery) {
		if(typeof modules === "string")
			modules = [[null, modules, ""]];
		var alreadyImportedModules = {};
		for(var i = 0; i < this.length; i++) {
			var id = this[i][0];
			if(typeof id === "number")
				alreadyImportedModules[id] = true;
		}
		for(i = 0; i < modules.length; i++) {
			var item = modules[i];
			// skip already imported module
			// this implementation is not 100% perfect for weird media query combinations
			//  when a module is imported multiple times with different media queries.
			//  I hope this will never occur (Hey this way we have smaller bundles)
			if(typeof item[0] !== "number" || !alreadyImportedModules[item[0]]) {
				if(mediaQuery && !item[2]) {
					item[2] = mediaQuery;
				} else if(mediaQuery) {
					item[2] = "(" + item[2] + ") and (" + mediaQuery + ")";
				}
				list.push(item);
			}
		}
	};
	return list;
};

function cssWithMappingToString(item, useSourceMap) {
	var content = item[1] || '';
	var cssMapping = item[3];
	if (!cssMapping) {
		return content;
	}

	if (useSourceMap && typeof btoa === 'function') {
		var sourceMapping = toComment(cssMapping);
		var sourceURLs = cssMapping.sources.map(function (source) {
			return '/*# sourceURL=' + cssMapping.sourceRoot + source + ' */'
		});

		return [content].concat(sourceURLs).concat([sourceMapping]).join('\n');
	}

	return [content].join('\n');
}

// Adapted from convert-source-map (MIT)
function toComment(sourceMap) {
	// eslint-disable-next-line no-undef
	var base64 = btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap))));
	var data = 'sourceMappingURL=data:application/json;charset=utf-8;base64,' + base64;

	return '/*# ' + data + ' */';
}


/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

var stylesInDom = {};

var	memoize = function (fn) {
	var memo;

	return function () {
		if (typeof memo === "undefined") memo = fn.apply(this, arguments);
		return memo;
	};
};

var isOldIE = memoize(function () {
	// Test for IE <= 9 as proposed by Browserhacks
	// @see http://browserhacks.com/#hack-e71d8692f65334173fee715c222cb805
	// Tests for existence of standard globals is to allow style-loader
	// to operate correctly into non-standard environments
	// @see https://github.com/webpack-contrib/style-loader/issues/177
	return window && document && document.all && !window.atob;
});

var getElement = (function (fn) {
	var memo = {};

	return function(selector) {
		if (typeof memo[selector] === "undefined") {
			memo[selector] = fn.call(this, selector);
		}

		return memo[selector]
	};
})(function (target) {
	return document.querySelector(target)
});

var singleton = null;
var	singletonCounter = 0;
var	stylesInsertedAtTop = [];

var	fixUrls = __webpack_require__(415);

module.exports = function(list, options) {
	if (typeof DEBUG !== "undefined" && DEBUG) {
		if (typeof document !== "object") throw new Error("The style-loader cannot be used in a non-browser environment");
	}

	options = options || {};

	options.attrs = typeof options.attrs === "object" ? options.attrs : {};

	// Force single-tag solution on IE6-9, which has a hard limit on the # of <style>
	// tags it will allow on a page
	if (!options.singleton) options.singleton = isOldIE();

	// By default, add <style> tags to the <head> element
	if (!options.insertInto) options.insertInto = "head";

	// By default, add <style> tags to the bottom of the target
	if (!options.insertAt) options.insertAt = "bottom";

	var styles = listToStyles(list, options);

	addStylesToDom(styles, options);

	return function update (newList) {
		var mayRemove = [];

		for (var i = 0; i < styles.length; i++) {
			var item = styles[i];
			var domStyle = stylesInDom[item.id];

			domStyle.refs--;
			mayRemove.push(domStyle);
		}

		if(newList) {
			var newStyles = listToStyles(newList, options);
			addStylesToDom(newStyles, options);
		}

		for (var i = 0; i < mayRemove.length; i++) {
			var domStyle = mayRemove[i];

			if(domStyle.refs === 0) {
				for (var j = 0; j < domStyle.parts.length; j++) domStyle.parts[j]();

				delete stylesInDom[domStyle.id];
			}
		}
	};
};

function addStylesToDom (styles, options) {
	for (var i = 0; i < styles.length; i++) {
		var item = styles[i];
		var domStyle = stylesInDom[item.id];

		if(domStyle) {
			domStyle.refs++;

			for(var j = 0; j < domStyle.parts.length; j++) {
				domStyle.parts[j](item.parts[j]);
			}

			for(; j < item.parts.length; j++) {
				domStyle.parts.push(addStyle(item.parts[j], options));
			}
		} else {
			var parts = [];

			for(var j = 0; j < item.parts.length; j++) {
				parts.push(addStyle(item.parts[j], options));
			}

			stylesInDom[item.id] = {id: item.id, refs: 1, parts: parts};
		}
	}
}

function listToStyles (list, options) {
	var styles = [];
	var newStyles = {};

	for (var i = 0; i < list.length; i++) {
		var item = list[i];
		var id = options.base ? item[0] + options.base : item[0];
		var css = item[1];
		var media = item[2];
		var sourceMap = item[3];
		var part = {css: css, media: media, sourceMap: sourceMap};

		if(!newStyles[id]) styles.push(newStyles[id] = {id: id, parts: [part]});
		else newStyles[id].parts.push(part);
	}

	return styles;
}

function insertStyleElement (options, style) {
	var target = getElement(options.insertInto)

	if (!target) {
		throw new Error("Couldn't find a style target. This probably means that the value for the 'insertInto' parameter is invalid.");
	}

	var lastStyleElementInsertedAtTop = stylesInsertedAtTop[stylesInsertedAtTop.length - 1];

	if (options.insertAt === "top") {
		if (!lastStyleElementInsertedAtTop) {
			target.insertBefore(style, target.firstChild);
		} else if (lastStyleElementInsertedAtTop.nextSibling) {
			target.insertBefore(style, lastStyleElementInsertedAtTop.nextSibling);
		} else {
			target.appendChild(style);
		}
		stylesInsertedAtTop.push(style);
	} else if (options.insertAt === "bottom") {
		target.appendChild(style);
	} else {
		throw new Error("Invalid value for parameter 'insertAt'. Must be 'top' or 'bottom'.");
	}
}

function removeStyleElement (style) {
	if (style.parentNode === null) return false;
	style.parentNode.removeChild(style);

	var idx = stylesInsertedAtTop.indexOf(style);
	if(idx >= 0) {
		stylesInsertedAtTop.splice(idx, 1);
	}
}

function createStyleElement (options) {
	var style = document.createElement("style");

	options.attrs.type = "text/css";

	addAttrs(style, options.attrs);
	insertStyleElement(options, style);

	return style;
}

function createLinkElement (options) {
	var link = document.createElement("link");

	options.attrs.type = "text/css";
	options.attrs.rel = "stylesheet";

	addAttrs(link, options.attrs);
	insertStyleElement(options, link);

	return link;
}

function addAttrs (el, attrs) {
	Object.keys(attrs).forEach(function (key) {
		el.setAttribute(key, attrs[key]);
	});
}

function addStyle (obj, options) {
	var style, update, remove, result;

	// If a transform function was defined, run it on the css
	if (options.transform && obj.css) {
	    result = options.transform(obj.css);

	    if (result) {
	    	// If transform returns a value, use that instead of the original css.
	    	// This allows running runtime transformations on the css.
	    	obj.css = result;
	    } else {
	    	// If the transform function returns a falsy value, don't add this css.
	    	// This allows conditional loading of css
	    	return function() {
	    		// noop
	    	};
	    }
	}

	if (options.singleton) {
		var styleIndex = singletonCounter++;

		style = singleton || (singleton = createStyleElement(options));

		update = applyToSingletonTag.bind(null, style, styleIndex, false);
		remove = applyToSingletonTag.bind(null, style, styleIndex, true);

	} else if (
		obj.sourceMap &&
		typeof URL === "function" &&
		typeof URL.createObjectURL === "function" &&
		typeof URL.revokeObjectURL === "function" &&
		typeof Blob === "function" &&
		typeof btoa === "function"
	) {
		style = createLinkElement(options);
		update = updateLink.bind(null, style, options);
		remove = function () {
			removeStyleElement(style);

			if(style.href) URL.revokeObjectURL(style.href);
		};
	} else {
		style = createStyleElement(options);
		update = applyToTag.bind(null, style);
		remove = function () {
			removeStyleElement(style);
		};
	}

	update(obj);

	return function updateStyle (newObj) {
		if (newObj) {
			if (
				newObj.css === obj.css &&
				newObj.media === obj.media &&
				newObj.sourceMap === obj.sourceMap
			) {
				return;
			}

			update(obj = newObj);
		} else {
			remove();
		}
	};
}

var replaceText = (function () {
	var textStore = [];

	return function (index, replacement) {
		textStore[index] = replacement;

		return textStore.filter(Boolean).join('\n');
	};
})();

function applyToSingletonTag (style, index, remove, obj) {
	var css = remove ? "" : obj.css;

	if (style.styleSheet) {
		style.styleSheet.cssText = replaceText(index, css);
	} else {
		var cssNode = document.createTextNode(css);
		var childNodes = style.childNodes;

		if (childNodes[index]) style.removeChild(childNodes[index]);

		if (childNodes.length) {
			style.insertBefore(cssNode, childNodes[index]);
		} else {
			style.appendChild(cssNode);
		}
	}
}

function applyToTag (style, obj) {
	var css = obj.css;
	var media = obj.media;

	if(media) {
		style.setAttribute("media", media)
	}

	if(style.styleSheet) {
		style.styleSheet.cssText = css;
	} else {
		while(style.firstChild) {
			style.removeChild(style.firstChild);
		}

		style.appendChild(document.createTextNode(css));
	}
}

function updateLink (link, options, obj) {
	var css = obj.css;
	var sourceMap = obj.sourceMap;

	/*
		If convertToAbsoluteUrls isn't defined, but sourcemaps are enabled
		and there is no publicPath defined then lets turn convertToAbsoluteUrls
		on by default.  Otherwise default to the convertToAbsoluteUrls option
		directly
	*/
	var autoFixUrls = options.convertToAbsoluteUrls === undefined && sourceMap;

	if (options.convertToAbsoluteUrls || autoFixUrls) {
		css = fixUrls(css);
	}

	if (sourceMap) {
		// http://stackoverflow.com/a/26603875
		css += "\n/*# sourceMappingURL=data:application/json;base64," + btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap)))) + " */";
	}

	var blob = new Blob([css], { type: "text/css" });

	var oldSrc = link.href;

	link.href = URL.createObjectURL(blob);

	if(oldSrc) URL.revokeObjectURL(oldSrc);
}


/***/ }),
/* 5 */,
/* 6 */,
/* 7 */,
/* 8 */,
/* 9 */,
/* 10 */,
/* 11 */,
/* 12 */,
/* 13 */,
/* 14 */,
/* 15 */,
/* 16 */,
/* 17 */,
/* 18 */,
/* 19 */,
/* 20 */,
/* 21 */,
/* 22 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports.inject = exports.drone = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var drone = exports.drone = function drone(client, Component) {
	// @see https://github.com/yannickcr/eslint-plugin-react/issues/512
	// eslint-disable-next-line react/display-name
	var component = function (_React$Component) {
		_inherits(component, _React$Component);

		function component() {
			_classCallCheck(this, component);

			return _possibleConstructorReturn(this, _React$Component.apply(this, arguments));
		}

		component.prototype.getChildContext = function getChildContext() {
			return {
				drone: client
			};
		};

		component.prototype.render = function render() {
			return _react2["default"].createElement(Component, _extends({}, this.state, this.props));
		};

		return component;
	}(_react2["default"].Component);

	component.childContextTypes = {
		drone: function drone(props, propName) {}
	};

	return component;
};

var inject = exports.inject = function inject(Component) {
	// @see https://github.com/yannickcr/eslint-plugin-react/issues/512
	// eslint-disable-next-line react/display-name
	var component = function (_React$Component2) {
		_inherits(component, _React$Component2);

		function component() {
			_classCallCheck(this, component);

			return _possibleConstructorReturn(this, _React$Component2.apply(this, arguments));
		}

		component.prototype.render = function render() {
			this.props.drone = this.context.drone;
			return _react2["default"].createElement(Component, _extends({}, this.state, this.props));
		};

		return component;
	}(_react2["default"].Component);

	return component;
};

/***/ }),
/* 23 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports.repositorySlug = exports.compareRepository = exports.disableRepository = exports.enableRepository = exports.updateRepository = exports.syncRepostoryList = exports.fetchRepostoryList = exports.fetchRepository = undefined;

var _message = __webpack_require__(68);

/**
 * Get the named repository and store the results in
 * the state tree.
 *
 * @param {Object} tree - The drone state tree.
 * @param {Object} client - The drone client.
 * @param {string} owner - The repository owner.
 * @param {string} name - The repository name.
 */
var fetchRepository = exports.fetchRepository = function fetchRepository(tree, client, owner, name) {
	tree.unset(["repo", "error"]);
	tree.unset(["repo", "loaded"]);

	client.getRepo(owner, name).then(function (repo) {
		tree.set(["repos", "data", repo.full_name], repo);
		tree.set(["repo", "loaded"], true);
	})["catch"](function (error) {
		tree.set(["repo", "error"], error);
		tree.set(["repo", "loaded"], true);
	});
};

/**
 * Get the repository list for the current user and
 * store the results in the state tree.
 *
 * @param {Object} tree - The drone state tree.
 * @param {Object} client - The drone client.
 */
var fetchRepostoryList = exports.fetchRepostoryList = function fetchRepostoryList(tree, client) {
	tree.unset(["repos", "loaded"]);
	tree.unset(["repos", "error"]);

	client.getRepoList({ all: true }).then(function (results) {
		var list = {};
		results.map(function (repo) {
			list[repo.full_name] = repo;
		});

		var path = ["repos", "data"];
		if (tree.exists(path)) {
			tree.deepMerge(path, list);
		} else {
			tree.set(path, list);
		}

		tree.set(["repos", "loaded"], true);
	})["catch"](function (error) {
		tree.set(["repos", "loaded"], true);
		tree.set(["repos", "error"], error);
	});
};

/**
 * Synchronize the repository list for the current user
 * and merge the results into the state tree.
 *
 * @param {Object} tree - The drone state tree.
 * @param {Object} client - The drone client.
 */
var syncRepostoryList = exports.syncRepostoryList = function syncRepostoryList(tree, client) {
	tree.unset(["repos", "loaded"]);
	tree.unset(["repos", "error"]);

	client.getRepoList({ all: true, flush: true }).then(function (results) {
		var list = {};
		results.map(function (repo) {
			list[repo.full_name] = repo;
		});

		var path = ["repos", "data"];
		if (tree.exists(path)) {
			tree.deepMerge(path, list);
		} else {
			tree.set(path, list);
		}

		(0, _message.displayMessage)(tree, "Successfully synchronized your repository list");
		tree.set(["repos", "loaded"], true);
	})["catch"](function (error) {
		(0, _message.displayMessage)(tree, "Failed to synchronize your repository list");
		tree.set(["repos", "loaded"], true);
		tree.set(["repos", "error"], error);
	});
};

/**
 * Update the repository and if successful update the
 * repository information into the state tree.
 *
 * @param {Object} tree - The drone state tree.
 * @param {Object} client - The drone client.
 * @param {string} owner - The repository owner.
 * @param {string} name - The repository name.
 * @param {Object} data - The repository updates.
 */
var updateRepository = exports.updateRepository = function updateRepository(tree, client, owner, name, data) {
	client.updateRepo(owner, name, data).then(function (repo) {
		tree.set(["repos", "data", repo.full_name], repo);
		(0, _message.displayMessage)(tree, "Successfully updated the repository settings");
	})["catch"](function () {
		(0, _message.displayMessage)(tree, "Failed to update the repository settings");
	});
};

/**
 * Enables the repository and if successful update the
 * repository active status in the state tree.
 *
 * @param {Object} tree - The drone state tree.
 * @param {Object} client - The drone client.
 * @param {string} owner - The repository owner.
 * @param {string} name - The repository name.
 */
var enableRepository = exports.enableRepository = function enableRepository(tree, client, owner, name) {
	client.activateRepo(owner, name).then(function (result) {
		(0, _message.displayMessage)(tree, "Successfully activated your repository");
		tree.set(["repos", "data", result.full_name, "active"], true);
	})["catch"](function () {
		(0, _message.displayMessage)(tree, "Failed to activate your repository");
	});
};

/**
 * Disables the repository and if successful update the
 * repository active status in the state tree.
 *
 * @param {Object} tree - The drone state tree.
 * @param {Object} client - The drone client.
 * @param {string} owner - The repository owner.
 * @param {string} name - The repository name.
 */
var disableRepository = exports.disableRepository = function disableRepository(tree, client, owner, name) {
	client.deleteRepo(owner, name).then(function (result) {
		(0, _message.displayMessage)(tree, "Successfully disabled your repository");
		tree.set(["repos", "data", result.full_name, "active"], false);
	})["catch"](function () {
		(0, _message.displayMessage)(tree, "Failed to disabled your repository");
	});
};

/**
 * Compare two repositories by name.
 *
 * @param {Object} a - A repository.
 * @param {Object} b - A repository.
 * @returns {number}
 */
var compareRepository = exports.compareRepository = function compareRepository(a, b) {
	if (a.full_name < b.full_name) return -1;
	if (a.full_name > b.full_name) return 1;
	return 0;
};

/**
 * Returns the repository slug.
 *
 * @param {string} owner - The repository owner.
 * @param {string} name - The process name.
 */
var repositorySlug = exports.repositorySlug = function repositorySlug(owner, name) {
	return owner + "/" + name;
};

/***/ }),
/* 24 */,
/* 25 */,
/* 26 */,
/* 27 */,
/* 28 */,
/* 29 */,
/* 30 */,
/* 31 */,
/* 32 */,
/* 33 */,
/* 34 */,
/* 35 */,
/* 36 */,
/* 37 */,
/* 38 */,
/* 39 */,
/* 40 */,
/* 41 */,
/* 42 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports.TimelapseIcon = exports.TagIcon = exports.SyncIcon = exports.ScheduleIcon = exports.RemoveIcon = exports.RefreshIcon = exports.PlayIcon = exports.PauseIcon = exports.MergeIcon = exports.MenuIcon = exports.LinkIcon = exports.LaunchIcon = exports.ExpandIcon = exports.DeployIcon = exports.CommitIcon = exports.ClockIcon = exports.CloseIcon = exports.CheckIcon = exports.BranchIcon = exports.BackIcon = undefined;

var _back = __webpack_require__(451);

var _back2 = _interopRequireDefault(_back);

var _branch = __webpack_require__(452);

var _branch2 = _interopRequireDefault(_branch);

var _check = __webpack_require__(453);

var _check2 = _interopRequireDefault(_check);

var _clock = __webpack_require__(454);

var _clock2 = _interopRequireDefault(_clock);

var _close = __webpack_require__(127);

var _close2 = _interopRequireDefault(_close);

var _commit = __webpack_require__(455);

var _commit2 = _interopRequireDefault(_commit);

var _deploy = __webpack_require__(456);

var _deploy2 = _interopRequireDefault(_deploy);

var _expand = __webpack_require__(457);

var _expand2 = _interopRequireDefault(_expand);

var _launch = __webpack_require__(458);

var _launch2 = _interopRequireDefault(_launch);

var _link = __webpack_require__(459);

var _link2 = _interopRequireDefault(_link);

var _menu = __webpack_require__(187);

var _menu2 = _interopRequireDefault(_menu);

var _merge = __webpack_require__(460);

var _merge2 = _interopRequireDefault(_merge);

var _pause = __webpack_require__(461);

var _pause2 = _interopRequireDefault(_pause);

var _play = __webpack_require__(462);

var _play2 = _interopRequireDefault(_play);

var _refresh = __webpack_require__(189);

var _refresh2 = _interopRequireDefault(_refresh);

var _remove = __webpack_require__(463);

var _remove2 = _interopRequireDefault(_remove);

var _schedule = __webpack_require__(464);

var _schedule2 = _interopRequireDefault(_schedule);

var _sync = __webpack_require__(465);

var _sync2 = _interopRequireDefault(_sync);

var _tag = __webpack_require__(466);

var _tag2 = _interopRequireDefault(_tag);

var _timelapse = __webpack_require__(467);

var _timelapse2 = _interopRequireDefault(_timelapse);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

exports.BackIcon = _back2["default"];
exports.BranchIcon = _branch2["default"];
exports.CheckIcon = _check2["default"];
exports.CloseIcon = _close2["default"];
exports.ClockIcon = _clock2["default"];
exports.CommitIcon = _commit2["default"];
exports.DeployIcon = _deploy2["default"];
exports.ExpandIcon = _expand2["default"];
exports.LaunchIcon = _launch2["default"];
exports.LinkIcon = _link2["default"];
exports.MenuIcon = _menu2["default"];
exports.MergeIcon = _merge2["default"];
exports.PauseIcon = _pause2["default"];
exports.PlayIcon = _play2["default"];
exports.RefreshIcon = _refresh2["default"];
exports.RemoveIcon = _remove2["default"];
exports.ScheduleIcon = _schedule2["default"];
exports.SyncIcon = _sync2["default"];
exports.TagIcon = _tag2["default"];
exports.TimelapseIcon = _timelapse2["default"];

/***/ }),
/* 43 */,
/* 44 */,
/* 45 */,
/* 46 */,
/* 47 */,
/* 48 */,
/* 49 */,
/* 50 */,
/* 51 */,
/* 52 */,
/* 53 */,
/* 54 */,
/* 55 */,
/* 56 */,
/* 57 */,
/* 58 */,
/* 59 */,
/* 60 */,
/* 61 */,
/* 62 */,
/* 63 */,
/* 64 */,
/* 65 */,
/* 66 */,
/* 67 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports.StatusLabel = exports["default"] = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _classnames = __webpack_require__(66);

var _classnames2 = _interopRequireDefault(_classnames);

var _status = __webpack_require__(87);

var _status2 = __webpack_require__(449);

var _status3 = _interopRequireDefault(_status2);

var _index = __webpack_require__(42);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var defaultIconSize = 15;

var statusLabel = function statusLabel(status) {
	switch (status) {
		case _status.STATUS_BLOCKED:
			return "Pending Approval";
		case _status.STATUS_DECLINED:
			return "Declined";
		case _status.STATUS_ERROR:
			return "Error";
		case _status.STATUS_FAILURE:
			return "Failure";
		case _status.STATUS_KILLED:
			return "Cancelled";
		case _status.STATUS_PENDING:
			return "Pending";
		case _status.STATUS_RUNNING:
			return "Running";
		case _status.STATUS_SKIPPED:
			return "Skipped";
		case _status.STATUS_STARTED:
			return "Running";
		case _status.STATUS_SUCCESS:
			return "Successful";
		default:
			return "";
	}
};

var renderIcon = function renderIcon(status, size) {
	switch (status) {
		case _status.STATUS_SKIPPED:
			return _react2["default"].createElement(_index.RemoveIcon, { size: size });
		case _status.STATUS_PENDING:
			return _react2["default"].createElement(_index.ClockIcon, { size: size });
		case _status.STATUS_RUNNING:
		case _status.STATUS_STARTED:
			return _react2["default"].createElement(_index.RefreshIcon, { size: size });
		case _status.STATUS_SUCCESS:
			return _react2["default"].createElement(_index.CheckIcon, { size: size });
		default:
			return _react2["default"].createElement(_index.CloseIcon, { size: size });
	}
};

var Status = function (_Component) {
	_inherits(Status, _Component);

	function Status() {
		_classCallCheck(this, Status);

		return _possibleConstructorReturn(this, _Component.apply(this, arguments));
	}

	Status.prototype.shouldComponentUpdate = function shouldComponentUpdate(nextProps, nextState) {
		return this.props.status !== nextProps.status;
	};

	Status.prototype.render = function render() {
		var status = this.props.status;

		var icon = renderIcon(status, defaultIconSize);
		var classes = (0, _classnames2["default"])(_status3["default"].root, _status3["default"][status]);
		return _react2["default"].createElement(
			"div",
			{ className: classes },
			icon
		);
	};

	return Status;
}(_react.Component);

exports["default"] = Status;
var StatusLabel = exports.StatusLabel = function StatusLabel(_ref) {
	var status = _ref.status;

	return _react2["default"].createElement(
		"div",
		{ className: (0, _classnames2["default"])(_status3["default"].label, _status3["default"][status]) },
		_react2["default"].createElement(
			"div",
			null,
			statusLabel(status)
		)
	);
};

/***/ }),
/* 68 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
/**
 * Displays the globa message.
 *
 * @param {Object} tree - The drone state tree.
 * @param {string} message - The message text.
 */
var displayMessage = exports.displayMessage = function displayMessage(tree, message) {
  tree.set(["message", "text"], message);
};

/**
 * Hide the global message.
 *
 * @param {Object} tree - The drone state tree.
 */
var hideMessage = exports.hideMessage = function hideMessage(tree) {
  tree.unset(["message", "text"]);
};

/***/ }),
/* 69 */,
/* 70 */,
/* 71 */,
/* 72 */,
/* 73 */,
/* 74 */,
/* 75 */,
/* 76 */,
/* 77 */,
/* 78 */,
/* 79 */,
/* 80 */,
/* 81 */,
/* 82 */,
/* 83 */,
/* 84 */,
/* 85 */,
/* 86 */,
/* 87 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
var STATUS_BLOCKED = "blocked";
var STATUS_DECLINED = "declined";
var STATUS_ERROR = "error";
var STATUS_FAILURE = "failure";
var STATUS_KILLED = "killed";
var STATUS_PENDING = "pending";
var STATUS_RUNNING = "running";
var STATUS_SKIPPED = "skipped";
var STATUS_STARTED = "started";
var STATUS_SUCCESS = "success";

exports.STATUS_BLOCKED = STATUS_BLOCKED;
exports.STATUS_DECLINED = STATUS_DECLINED;
exports.STATUS_ERROR = STATUS_ERROR;
exports.STATUS_FAILURE = STATUS_FAILURE;
exports.STATUS_KILLED = STATUS_KILLED;
exports.STATUS_PENDING = STATUS_PENDING;
exports.STATUS_RUNNING = STATUS_RUNNING;
exports.STATUS_SKIPPED = STATUS_SKIPPED;
exports.STATUS_SUCCESS = STATUS_SUCCESS;
exports.STATUS_STARTED = STATUS_STARTED;

/***/ }),
/* 88 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports["default"] = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _index = __webpack_require__(42);

var _reactTimeago = __webpack_require__(190);

var _reactTimeago2 = _interopRequireDefault(_reactTimeago);

var _duration = __webpack_require__(470);

var _duration2 = _interopRequireDefault(_duration);

var _build_time = __webpack_require__(471);

var _build_time2 = _interopRequireDefault(_build_time);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Runtime = function (_Component) {
	_inherits(Runtime, _Component);

	function Runtime() {
		_classCallCheck(this, Runtime);

		return _possibleConstructorReturn(this, _Component.apply(this, arguments));
	}

	Runtime.prototype.render = function render() {
		var _props = this.props,
		    start = _props.start,
		    finish = _props.finish;

		return _react2["default"].createElement(
			"div",
			{ className: _build_time2["default"].host },
			_react2["default"].createElement(
				"div",
				{ className: _build_time2["default"].row },
				_react2["default"].createElement(
					"div",
					null,
					_react2["default"].createElement(_index.ScheduleIcon, null)
				),
				_react2["default"].createElement(
					"div",
					null,
					start ? _react2["default"].createElement(_reactTimeago2["default"], { date: start * 1000 }) : _react2["default"].createElement(
						"span",
						null,
						"--"
					)
				)
			),
			_react2["default"].createElement(
				"div",
				{ className: _build_time2["default"].row },
				_react2["default"].createElement(
					"div",
					null,
					_react2["default"].createElement(_index.TimelapseIcon, null)
				),
				_react2["default"].createElement(
					"div",
					null,
					finish ? _react2["default"].createElement(_duration2["default"], { start: start, finished: finish }) : start ? _react2["default"].createElement(_reactTimeago2["default"], { date: start * 1000 }) : _react2["default"].createElement(
						"span",
						null,
						"--"
					)
				)
			)
		);
	};

	return Runtime;
}(_react.Component);

exports["default"] = Runtime;

/***/ }),
/* 89 */,
/* 90 */,
/* 91 */,
/* 92 */,
/* 93 */,
/* 94 */,
/* 95 */,
/* 96 */,
/* 97 */,
/* 98 */,
/* 99 */,
/* 100 */,
/* 101 */,
/* 102 */,
/* 103 */,
/* 104 */,
/* 105 */,
/* 106 */,
/* 107 */,
/* 108 */,
/* 109 */,
/* 110 */,
/* 111 */,
/* 112 */,
/* 113 */,
/* 114 */,
/* 115 */,
/* 116 */,
/* 117 */,
/* 118 */,
/* 119 */,
/* 120 */,
/* 121 */,
/* 122 */,
/* 123 */,
/* 124 */,
/* 125 */,
/* 126 */,
/* 127 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports["default"] = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var CloseIcon = function (_Component) {
	_inherits(CloseIcon, _Component);

	function CloseIcon() {
		_classCallCheck(this, CloseIcon);

		return _possibleConstructorReturn(this, _Component.apply(this, arguments));
	}

	CloseIcon.prototype.render = function render() {
		return _react2["default"].createElement(
			"svg",
			{
				className: this.props.className,
				width: this.props.size || 24,
				height: this.props.size || 24,
				viewBox: "0 0 24 24"
			},
			_react2["default"].createElement("path", { d: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" }),
			_react2["default"].createElement("path", { d: "M0 0h24v24H0z", fill: "none" })
		);
	};

	return CloseIcon;
}(_react.Component);

exports["default"] = CloseIcon;

/***/ }),
/* 128 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports.assertBuildMatrix = exports.assertBuildFinished = exports.compareBuild = exports.declineBuild = exports.approveBuild = exports.restartBuild = exports.cancelBuild = exports.fetchBuildList = exports.fetchBuild = undefined;

var _repository = __webpack_require__(23);

var _message = __webpack_require__(68);

var _status = __webpack_require__(87);

/**
 * Gets the build for the named repository and stores
 * the results in the state tree.
 *
 * @param {Object} tree - The drone state tree.
 * @param {Object} client - The drone client.
 * @param {string} owner - The repository owner.
 * @param {string} name - The repository name.
 * @param {number|string} number - The build number.
 */
var fetchBuild = exports.fetchBuild = function fetchBuild(tree, client, owner, name, number) {
	var slug = (0, _repository.repositorySlug)(owner, name);

	tree.unset(["builds", "loaded"]);
	client.getBuild(owner, name, number).then(function (build) {
		var path = ["builds", "data", slug, build.number];

		if (tree.exists(path)) {
			tree.deepMerge(path, build);
		} else {
			tree.set(path, build);
		}

		tree.set(["builds", "loaded"], true);
	})["catch"](function (error) {
		tree.set(["builds", "loaded"], true);
		tree.set(["builds", "error"], error);
	});
};

/**
 * Gets the build list for the named repository and
 * stores the results in the state tree.
 *
 * @param {Object} tree - The drone state tree.
 * @param {Object} client - The drone client.
 * @param {string} owner - The repository owner.
 * @param {string} name - The repository name.
 */
var fetchBuildList = exports.fetchBuildList = function fetchBuildList(tree, client, owner, name) {
	var slug = (0, _repository.repositorySlug)(owner, name);

	tree.unset(["builds", "loaded"]);
	tree.unset(["builds", "error"]);

	client.getBuildList(owner, name).then(function (results) {
		var list = {};
		results.map(function (build) {
			list[build.number] = build;
		});

		var path = ["builds", "data", slug];
		if (tree.exists(path)) {
			tree.deepMerge(path, list);
		} else {
			tree.set(path, list);
		}

		tree.unset(["builds", "error"]);
		tree.set(["builds", "loaded"], true);
	})["catch"](function (error) {
		tree.set(["builds", "error"], error);
		tree.set(["builds", "loaded"], true);
	});
};

/**
 * Cancels the build.
 *
 * @param {Object} tree - The drone state tree.
 * @param {Object} client - The drone client.
 * @param {string} owner - The repository owner.
 * @param {string} name - The repository name.
 * @param {number} build - The build number.
 * @param {number} proc - The process number.
 */
var cancelBuild = exports.cancelBuild = function cancelBuild(tree, client, owner, repo, build, proc) {
	client.cancelBuild(owner, repo, build, proc).then(function (result) {
		(0, _message.displayMessage)(tree, "Successfully cancelled your build");
	})["catch"](function () {
		(0, _message.displayMessage)(tree, "Failed to cancel your build");
	});
};

/**
 * Restarts the build.
 *
 * @param {Object} tree - The drone state tree.
 * @param {Object} client - The drone client.
 * @param {string} owner - The repository owner.
 * @param {string} name - The repository name.
 * @param {number} build - The build number.
 */
var restartBuild = exports.restartBuild = function restartBuild(tree, client, owner, repo, build) {
	client.restartBuild(owner, repo, build, { fork: true }).then(function (result) {
		(0, _message.displayMessage)(tree, "Successfully restarted your build");
	})["catch"](function () {
		(0, _message.displayMessage)(tree, "Failed to restart your build");
	});
};

/**
 * Approves the blocked build.
 *
 * @param {Object} tree - The drone state tree.
 * @param {Object} client - The drone client.
 * @param {string} owner - The repository owner.
 * @param {string} name - The repository name.
 * @param {number} build - The build number.
 */
var approveBuild = exports.approveBuild = function approveBuild(tree, client, owner, repo, build) {
	client.approveBuild(owner, repo, build).then(function (result) {
		(0, _message.displayMessage)(tree, "Successfully processed your approval decision");
	})["catch"](function () {
		(0, _message.displayMessage)(tree, "Failed to process your approval decision");
	});
};

/**
 * Declines the blocked build.
 *
 * @param {Object} tree - The drone state tree.
 * @param {Object} client - The drone client.
 * @param {string} owner - The repository owner.
 * @param {string} name - The repository name.
 * @param {number} build - The build number.
 */
var declineBuild = exports.declineBuild = function declineBuild(tree, client, owner, repo, build) {
	client.declineBuild(owner, repo, build).then(function (result) {
		(0, _message.displayMessage)(tree, "Successfully processed your decline decision");
	})["catch"](function () {
		(0, _message.displayMessage)(tree, "Failed to process your decline decision");
	});
};

/**
 * Compare two builds by number.
 *
 * @param {Object} a - A build.
 * @param {Object} b - A build.
 * @returns {number}
 */
var compareBuild = exports.compareBuild = function compareBuild(a, b) {
	return b.number - a.number;
};

/**
 * Returns true if the build is in a penidng or running state.
 *
 * @param {Object} build - The build object.
 * @returns {boolean}
 */
var assertBuildFinished = exports.assertBuildFinished = function assertBuildFinished(build) {
	return build.status !== _status.STATUS_RUNNING && build.status !== _status.STATUS_PENDING;
};

/**
 * Returns true if the build is a matrix.
 *
 * @param {Object} build - The build object.
 * @returns {boolean}
 */
var assertBuildMatrix = exports.assertBuildMatrix = function assertBuildMatrix(build) {
	return build && build.procs && build.procs.length > 1;
};

/***/ }),
/* 129 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports["default"] = exports.BACK_BUTTON = exports.SEPARATOR = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _index = __webpack_require__(42);

var _breadcrumb = __webpack_require__(522);

var _breadcrumb2 = _interopRequireDefault(_breadcrumb);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// breadcrumb separater icon.
var SEPARATOR = exports.SEPARATOR = _react2["default"].createElement(_index.ExpandIcon, { size: 18, className: _breadcrumb2["default"].separator });

// breadcrumb back button.
var BACK_BUTTON = exports.BACK_BUTTON = _react2["default"].createElement(_index.BackIcon, { size: 18, className: _breadcrumb2["default"].back });

// helper function to render a list item.
var renderItem = function renderItem(element, index) {
	return _react2["default"].createElement(
		"li",
		{ key: index },
		element
	);
};

var Breadcrumb = function (_Component) {
	_inherits(Breadcrumb, _Component);

	function Breadcrumb() {
		_classCallCheck(this, Breadcrumb);

		return _possibleConstructorReturn(this, _Component.apply(this, arguments));
	}

	Breadcrumb.prototype.render = function render() {
		var elements = this.props.elements;

		return _react2["default"].createElement(
			"ol",
			{ className: _breadcrumb2["default"].breadcrumb },
			elements.map(renderItem)
		);
	};

	return Breadcrumb;
}(_react.Component);

exports["default"] = Breadcrumb;

/***/ }),
/* 130 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports.assertProcRunning = exports.assertProcFinished = exports.findChildProcess = undefined;

var _status = __webpack_require__(87);

/**
 * Returns a process from the process tree with the
 * matching process number.
 *
 * @param {Object} procs - The process tree.
 * @param {number|string} pid - The process number.
 * @returns {Object}
 */
var findChildProcess = exports.findChildProcess = function findChildProcess(tree, pid) {
  for (var i = 0; i < tree.length; i++) {
    var parent = tree[i];
    // eslint-disable-next-line
    if (parent.pid == pid) {
      return parent;
    }
    for (var ii = 0; ii < parent.children.length; ii++) {
      var child = parent.children[ii];
      // eslint-disable-next-line
      if (child.pid == pid) {
        return child;
      }
    }
  }
};

/**
 * Returns true if the process is in a completed state.
 *
 * @param {Object} proc - The process object.
 * @returns {boolean}
 */
var assertProcFinished = exports.assertProcFinished = function assertProcFinished(proc) {
  return proc.state !== _status.STATUS_RUNNING && proc.state !== _status.STATUS_PENDING;
};

/**
 * Returns true if the process is running.
 *
 * @param {Object} proc - The process object.
 * @returns {boolean}
 */
var assertProcRunning = exports.assertProcRunning = function assertProcRunning(proc) {
  return proc.state === _status.STATUS_RUNNING;
};

/***/ }),
/* 131 */,
/* 132 */,
/* 133 */,
/* 134 */,
/* 135 */,
/* 136 */,
/* 137 */,
/* 138 */,
/* 139 */,
/* 140 */,
/* 141 */,
/* 142 */,
/* 143 */,
/* 144 */,
/* 145 */,
/* 146 */,
/* 147 */,
/* 148 */,
/* 149 */,
/* 150 */,
/* 151 */,
/* 152 */,
/* 153 */,
/* 154 */,
/* 155 */,
/* 156 */,
/* 157 */,
/* 158 */,
/* 159 */,
/* 160 */,
/* 161 */,
/* 162 */,
/* 163 */,
/* 164 */,
/* 165 */,
/* 166 */,
/* 167 */,
/* 168 */,
/* 169 */,
/* 170 */,
/* 171 */,
/* 172 */,
/* 173 */,
/* 174 */,
/* 175 */,
/* 176 */,
/* 177 */,
/* 178 */,
/* 179 */,
/* 180 */,
/* 181 */,
/* 182 */,
/* 183 */,
/* 184 */,
/* 185 */,
/* 186 */,
/* 187 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports["default"] = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var MenuIcon = function (_Component) {
	_inherits(MenuIcon, _Component);

	function MenuIcon() {
		_classCallCheck(this, MenuIcon);

		return _possibleConstructorReturn(this, _Component.apply(this, arguments));
	}

	MenuIcon.prototype.render = function render() {
		return _react2["default"].createElement(
			"svg",
			{
				className: this.props.className,
				width: this.props.size || 24,
				height: this.props.size || 24,
				viewBox: "0 0 24 24"
			},
			_react2["default"].createElement("path", { d: "M0 0h24v24H0z", fill: "none" }),
			_react2["default"].createElement("path", { d: "M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" })
		);
	};

	return MenuIcon;
}(_react.Component);

exports["default"] = MenuIcon;

/***/ }),
/* 188 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports.fetchFeedOnce = fetchFeedOnce;
exports.subscribeToFeedOnce = subscribeToFeedOnce;
/**
 * Get the event feed and store the results in the
 * state tree.
 *
 * @param {Object} tree - The drone state tree.
 * @param {Object} client - The drone client.
 */
var fetchFeed = exports.fetchFeed = function fetchFeed(tree, client) {
	client.getBuildFeed({ latest: true }).then(function (results) {
		var list = {};
		var sorted = results.sort(compareFeedItem);
		sorted.map(function (repo) {
			list[repo.full_name] = repo;
		});
		if (sorted && sorted.length > 0) {
			tree.set(["feed", "latest"], sorted[0]);
		}
		tree.set(["feed", "loaded"], true);
		tree.set(["feed", "data"], list);
	})["catch"](function (error) {
		tree.set(["feed", "loaded"], true);
		tree.set(["feed", "error"], error);
	});
};

/**
 * Ensures the fetchFeed function is invoked exactly once.
 * TODO replace this with a decorator
 *
 * @param {Object} tree - The drone state tree.
 * @param {Object} client - The drone client.
 */
function fetchFeedOnce(tree, client) {
	if (fetchFeedOnce.fired) {
		return;
	}
	fetchFeedOnce.fired = true;
	return fetchFeed(tree, client);
}

/**
 * Subscribes to the server-side event feed and synchonizes
 * event data with the state tree.
 *
 * @param {Object} tree - The drone state tree.
 * @param {Object} client - The drone client.
 */
var subscribeToFeed = exports.subscribeToFeed = function subscribeToFeed(tree, client) {
	return client.on(function (data) {
		var repo = data.repo,
		    build = data.build;


		if (tree.exists("feed", "data", repo.full_name)) {
			var cursor = tree.select(["feed", "data", repo.full_name]);
			cursor.merge(build);
		}

		if (tree.exists("builds", "data", repo.full_name)) {
			tree.set(["builds", "data", repo.full_name, build.number], build);
		}
	});
};

/**
 * Ensures the subscribeToFeed function is invoked exactly once.
 * TODO replace this with a decorator
 *
 * @param {Object} tree - The drone state tree.
 * @param {Object} client - The drone client.
 */
function subscribeToFeedOnce(tree, client) {
	if (subscribeToFeedOnce.fired) {
		return;
	}
	subscribeToFeedOnce.fired = true;
	return subscribeToFeed(tree, client);
}

/**
 * Compare two feed items by name.
 * @param {Object} a - A feed item.
 * @param {Object} b - A feed item.
 * @returns {number}
 */
var compareFeedItem = exports.compareFeedItem = function compareFeedItem(a, b) {
	return (b.started_at || b.created_at || -1) - (a.started_at || a.created_at || -1);
};

/***/ }),
/* 189 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports["default"] = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var RefreshIcon = function (_Component) {
	_inherits(RefreshIcon, _Component);

	function RefreshIcon() {
		_classCallCheck(this, RefreshIcon);

		return _possibleConstructorReturn(this, _Component.apply(this, arguments));
	}

	RefreshIcon.prototype.render = function render() {
		return _react2["default"].createElement(
			"svg",
			{
				className: this.props.className,
				width: this.props.size || 24,
				height: this.props.size || 24,
				viewBox: "0 0 24 24"
			},
			_react2["default"].createElement("path", { d: "M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" }),
			_react2["default"].createElement("path", { d: "M0 0h24v24H0z", fill: "none" })
		);
	};

	return RefreshIcon;
}(_react.Component);

exports["default"] = RefreshIcon;

/***/ }),
/* 190 */,
/* 191 */,
/* 192 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
var EVENT_DEPLOY = "deployment";
var EVENT_PULL_REQUEST = "pull_request";
var EVENT_PUSH = "push";
var EVENT_TAG = "tag";

exports.EVENT_DEPLOY = EVENT_DEPLOY;
exports.EVENT_PULL_REQUEST = EVENT_PULL_REQUEST;
exports.EVENT_PUSH = EVENT_PUSH;
exports.EVENT_TAG = EVENT_TAG;

/***/ }),
/* 193 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports["default"] = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _classnames = __webpack_require__(66);

var _classnames2 = _interopRequireDefault(_classnames);

var _status_number = __webpack_require__(506);

var _status_number2 = _interopRequireDefault(_status_number);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var StatusNumber = function (_Component) {
	_inherits(StatusNumber, _Component);

	function StatusNumber() {
		_classCallCheck(this, StatusNumber);

		return _possibleConstructorReturn(this, _Component.apply(this, arguments));
	}

	StatusNumber.prototype.render = function render() {
		var _props = this.props,
		    status = _props.status,
		    number = _props.number;

		var className = (0, _classnames2["default"])(_status_number2["default"].root, _status_number2["default"][status]);
		return _react2["default"].createElement(
			"div",
			{ className: className },
			number
		);
	};

	return StatusNumber;
}(_react.Component);

exports["default"] = StatusNumber;

/***/ }),
/* 194 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports["default"] = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _index = __webpack_require__(42);

var _events = __webpack_require__(192);

var _build_event = __webpack_require__(508);

var _build_event2 = _interopRequireDefault(_build_event);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var BuildEvent = function (_Component) {
	_inherits(BuildEvent, _Component);

	function BuildEvent() {
		_classCallCheck(this, BuildEvent);

		return _possibleConstructorReturn(this, _Component.apply(this, arguments));
	}

	BuildEvent.prototype.render = function render() {
		var _props = this.props,
		    event = _props.event,
		    branch = _props.branch,
		    commit = _props.commit,
		    refs = _props.refs,
		    refspec = _props.refspec,
		    link = _props.link,
		    target = _props.target;


		return _react2["default"].createElement(
			"div",
			{ className: _build_event2["default"].host },
			_react2["default"].createElement(
				"div",
				{ className: _build_event2["default"].row },
				_react2["default"].createElement(
					"div",
					null,
					_react2["default"].createElement(_index.CommitIcon, null)
				),
				_react2["default"].createElement(
					"div",
					null,
					commit && commit.substr(0, 10)
				)
			),
			_react2["default"].createElement(
				"div",
				{ className: _build_event2["default"].row },
				_react2["default"].createElement(
					"div",
					null,
					event === _events.EVENT_TAG ? _react2["default"].createElement(_index.TagIcon, null) : event === _events.EVENT_PULL_REQUEST ? _react2["default"].createElement(_index.MergeIcon, null) : event === _events.EVENT_DEPLOY ? _react2["default"].createElement(_index.DeployIcon, null) : _react2["default"].createElement(_index.BranchIcon, null)
				),
				_react2["default"].createElement(
					"div",
					null,
					event === _events.EVENT_TAG && refs ? trimTagRef(refs) : event === _events.EVENT_PULL_REQUEST && refspec ? trimMergeRef(refs) : event === _events.EVENT_DEPLOY && target ? target : branch
				)
			),
			_react2["default"].createElement(
				"a",
				{ href: link, target: "_blank" },
				_react2["default"].createElement(_index.LaunchIcon, null)
			)
		);
	};

	return BuildEvent;
}(_react.Component);

exports["default"] = BuildEvent;


var trimMergeRef = function trimMergeRef(ref) {
	return ref.match(/\d/g) || ref;
};

var trimTagRef = function trimTagRef(ref) {
	return ref.startsWith("refs/tags/") ? ref.substr(10) : ref;
};

// push
// pull request (ref)
// tag (ref)
// deploy

/***/ }),
/* 195 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports["default"] = undefined;

var _dec, _class;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _reactRouterDom = __webpack_require__(30);

var _higherOrder = __webpack_require__(16);

var _sync = __webpack_require__(530);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var binding = function binding(props, context) {
	return {
		feed: ["feed"],
		user: ["user", "data"],
		syncing: ["user", "syncing"]
	};
};

var RedirectRoot = (_dec = (0, _higherOrder.branch)(binding), _dec(_class = function (_Component) {
	_inherits(RedirectRoot, _Component);

	function RedirectRoot() {
		_classCallCheck(this, RedirectRoot);

		return _possibleConstructorReturn(this, _Component.apply(this, arguments));
	}

	RedirectRoot.prototype.componentWillReceiveProps = function componentWillReceiveProps(nextProps) {
		var user = nextProps.user;

		if (!user && window) {
			window.location.href = "/login";
		}
	};

	RedirectRoot.prototype.render = function render() {
		var _props = this.props,
		    user = _props.user,
		    syncing = _props.syncing;
		var _props$feed = this.props.feed,
		    latest = _props$feed.latest,
		    loaded = _props$feed.loaded;


		return !loaded && syncing ? _react2["default"].createElement(_sync.Message, null) : !loaded ? undefined : !user ? undefined : !latest ? _react2["default"].createElement(_reactRouterDom.Redirect, { to: "/account/repos" }) : !latest.number ? _react2["default"].createElement(_reactRouterDom.Redirect, { to: "/" + latest.full_name }) : _react2["default"].createElement(_reactRouterDom.Redirect, { to: "/" + latest.full_name + "/" + latest.number });
	};

	return RedirectRoot;
}(_react.Component)) || _class);
exports["default"] = RedirectRoot;

/***/ }),
/* 196 */,
/* 197 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports["default"] = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _reactRouterDom = __webpack_require__(30);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var RepoMenu = function (_Component) {
	_inherits(RepoMenu, _Component);

	function RepoMenu() {
		_classCallCheck(this, RepoMenu);

		return _possibleConstructorReturn(this, _Component.apply(this, arguments));
	}

	RepoMenu.prototype.render = function render() {
		var _props$match$params = this.props.match.params,
		    owner = _props$match$params.owner,
		    repo = _props$match$params.repo;

		return _react2["default"].createElement(
			"section",
			null,
			_react2["default"].createElement(
				"ul",
				null,
				_react2["default"].createElement(
					"li",
					null,
					_react2["default"].createElement(
						_reactRouterDom.Link,
						{ to: "/" + owner + "/" + repo },
						"Builds"
					)
				),
				_react2["default"].createElement(
					"li",
					null,
					_react2["default"].createElement(
						_reactRouterDom.Link,
						{ to: "/" + owner + "/" + repo + "/settings/secrets" },
						"Secrets"
					)
				),
				_react2["default"].createElement(
					"li",
					null,
					_react2["default"].createElement(
						_reactRouterDom.Link,
						{ to: "/" + owner + "/" + repo + "/settings/registry" },
						"Registry"
					)
				),
				_react2["default"].createElement(
					"li",
					null,
					_react2["default"].createElement(
						_reactRouterDom.Link,
						{ to: "/" + owner + "/" + repo + "/settings" },
						"Settings"
					)
				)
			)
		);
	};

	return RepoMenu;
}(_react.Component);

exports["default"] = RepoMenu;

/***/ }),
/* 198 */,
/* 199 */,
/* 200 */,
/* 201 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


__webpack_require__(132);

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _reactDom = __webpack_require__(1);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var root = void 0;

function init() {
	var App = __webpack_require__(406)["default"];
	root = (0, _reactDom.render)(_react2["default"].createElement(App, null), document.body, root);
}

init();

if (false) module.hot.accept("./screens/drone", init);

/***/ }),
/* 202 */,
/* 203 */,
/* 204 */,
/* 205 */,
/* 206 */,
/* 207 */,
/* 208 */,
/* 209 */,
/* 210 */,
/* 211 */,
/* 212 */,
/* 213 */,
/* 214 */,
/* 215 */,
/* 216 */,
/* 217 */,
/* 218 */,
/* 219 */,
/* 220 */,
/* 221 */,
/* 222 */,
/* 223 */,
/* 224 */,
/* 225 */,
/* 226 */,
/* 227 */,
/* 228 */,
/* 229 */,
/* 230 */,
/* 231 */,
/* 232 */,
/* 233 */,
/* 234 */,
/* 235 */,
/* 236 */,
/* 237 */,
/* 238 */,
/* 239 */,
/* 240 */,
/* 241 */,
/* 242 */,
/* 243 */,
/* 244 */,
/* 245 */,
/* 246 */,
/* 247 */,
/* 248 */,
/* 249 */,
/* 250 */,
/* 251 */,
/* 252 */,
/* 253 */,
/* 254 */,
/* 255 */,
/* 256 */,
/* 257 */,
/* 258 */,
/* 259 */,
/* 260 */,
/* 261 */,
/* 262 */,
/* 263 */,
/* 264 */,
/* 265 */,
/* 266 */,
/* 267 */,
/* 268 */,
/* 269 */,
/* 270 */,
/* 271 */,
/* 272 */,
/* 273 */,
/* 274 */,
/* 275 */,
/* 276 */,
/* 277 */,
/* 278 */,
/* 279 */,
/* 280 */,
/* 281 */,
/* 282 */,
/* 283 */,
/* 284 */,
/* 285 */,
/* 286 */,
/* 287 */,
/* 288 */,
/* 289 */,
/* 290 */,
/* 291 */,
/* 292 */,
/* 293 */,
/* 294 */,
/* 295 */,
/* 296 */,
/* 297 */,
/* 298 */,
/* 299 */,
/* 300 */,
/* 301 */,
/* 302 */,
/* 303 */,
/* 304 */,
/* 305 */,
/* 306 */,
/* 307 */,
/* 308 */,
/* 309 */,
/* 310 */,
/* 311 */,
/* 312 */,
/* 313 */,
/* 314 */,
/* 315 */,
/* 316 */,
/* 317 */,
/* 318 */,
/* 319 */,
/* 320 */,
/* 321 */,
/* 322 */,
/* 323 */,
/* 324 */,
/* 325 */,
/* 326 */,
/* 327 */,
/* 328 */,
/* 329 */,
/* 330 */,
/* 331 */,
/* 332 */,
/* 333 */,
/* 334 */,
/* 335 */,
/* 336 */,
/* 337 */,
/* 338 */,
/* 339 */,
/* 340 */,
/* 341 */,
/* 342 */,
/* 343 */,
/* 344 */,
/* 345 */,
/* 346 */,
/* 347 */,
/* 348 */,
/* 349 */,
/* 350 */,
/* 351 */,
/* 352 */,
/* 353 */,
/* 354 */,
/* 355 */,
/* 356 */,
/* 357 */,
/* 358 */,
/* 359 */,
/* 360 */,
/* 361 */,
/* 362 */,
/* 363 */,
/* 364 */,
/* 365 */,
/* 366 */,
/* 367 */,
/* 368 */,
/* 369 */,
/* 370 */,
/* 371 */,
/* 372 */,
/* 373 */,
/* 374 */,
/* 375 */,
/* 376 */,
/* 377 */,
/* 378 */,
/* 379 */,
/* 380 */,
/* 381 */,
/* 382 */,
/* 383 */,
/* 384 */,
/* 385 */,
/* 386 */,
/* 387 */,
/* 388 */,
/* 389 */,
/* 390 */,
/* 391 */,
/* 392 */,
/* 393 */,
/* 394 */,
/* 395 */,
/* 396 */,
/* 397 */,
/* 398 */,
/* 399 */,
/* 400 */,
/* 401 */,
/* 402 */,
/* 403 */,
/* 404 */,
/* 405 */,
/* 406 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _higherOrder = __webpack_require__(16);

var _state = __webpack_require__(409);

var _state2 = _interopRequireDefault(_state);

var _client = __webpack_require__(410);

var _client2 = _interopRequireDefault(_client);

var _inject = __webpack_require__(22);

var _screens = __webpack_require__(411);

var _titles = __webpack_require__(423);

var _titles2 = _interopRequireDefault(_titles);

var _layout = __webpack_require__(444);

var _layout2 = _interopRequireDefault(_layout);

var _redirect = __webpack_require__(195);

var _redirect2 = _interopRequireDefault(_redirect);

var _feed = __webpack_require__(188);

var _reactRouterDom = __webpack_require__(30);

var _drone = __webpack_require__(580);

var _drone2 = _interopRequireDefault(_drone);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// eslint-disable-next-line no-unused-vars


var App = function (_Component) {
	_inherits(App, _Component);

	function App() {
		_classCallCheck(this, App);

		return _possibleConstructorReturn(this, _Component.apply(this, arguments));
	}

	App.prototype.render = function render() {
		return _react2["default"].createElement(
			_reactRouterDom.BrowserRouter,
			null,
			_react2["default"].createElement(
				"div",
				null,
				_react2["default"].createElement(_titles2["default"], null),
				_react2["default"].createElement(
					_reactRouterDom.Switch,
					null,
					_react2["default"].createElement(_reactRouterDom.Route, { path: "/", exact: true, component: _redirect2["default"] }),
					_react2["default"].createElement(_reactRouterDom.Route, { path: "/login/form", exact: true, component: _screens.LoginForm }),
					_react2["default"].createElement(_reactRouterDom.Route, { path: "/login/error", exact: true, component: _screens.LoginError }),
					_react2["default"].createElement(_reactRouterDom.Route, { path: "/", exact: false, component: _layout2["default"] })
				)
			)
		);
	};

	return App;
}(_react.Component);

if (_state2["default"].exists(["user", "data"])) {
	(0, _feed.fetchFeedOnce)(_state2["default"], _client2["default"]);
	(0, _feed.subscribeToFeedOnce)(_state2["default"], _client2["default"]);
}

_client2["default"].onerror = function (error) {
	console.error(error);
	if (error.status === 401) {
		_state2["default"].unset(["user", "data"]);
	}
};

exports["default"] = (0, _higherOrder.root)(_state2["default"], (0, _inject.drone)(_client2["default"], App));

/***/ }),
/* 407 */,
/* 408 */,
/* 409 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;

var _baobab = __webpack_require__(62);

var _baobab2 = _interopRequireDefault(_baobab);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var user = window.DRONE_USER;
var sync = window.DRONE_SYNC;

var state = {
	follow: false,
	language: "en-US",

	user: {
		data: user,
		error: undefined,
		loaded: true,
		syncing: sync
	},

	feed: {
		loaded: false,
		error: undefined,
		data: {}
	},

	repos: {
		loaded: false,
		error: undefined,
		data: {}
	},

	secrets: {
		loaded: false,
		error: undefined,
		data: {}
	},

	registry: {
		error: undefined,
		loaded: false,
		data: {}
	},

	builds: {
		loaded: false,
		error: undefined,
		data: {}
	},

	logs: {
		follow: false,
		loading: true,
		error: false,
		data: {}
	},

	token: {
		value: undefined,
		error: undefined,
		loading: false
	},

	message: {
		show: false,
		text: undefined,
		error: false
	},

	location: {
		protocol: window.location.protocol,
		host: window.location.host
	}
};

var tree = new _baobab2["default"](state);

if (window) {
	window.tree = tree;
}

exports["default"] = tree;

/***/ }),
/* 410 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;

var _droneJs = __webpack_require__(171);

var _droneJs2 = _interopRequireDefault(_droneJs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

exports["default"] = _droneJs2["default"].fromWindow();

/***/ }),
/* 411 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports.LoginError = exports.LoginForm = undefined;

var _form = __webpack_require__(412);

var _form2 = _interopRequireDefault(_form);

var _error = __webpack_require__(416);

var _error2 = _interopRequireDefault(_error);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

exports.LoginForm = _form2["default"];
exports.LoginError = _error2["default"];

/***/ }),
/* 412 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _index = __webpack_require__(413);

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var LoginForm = function LoginForm(props) {
	return _react2["default"].createElement(
		"div",
		{ className: _index2["default"].login },
		_react2["default"].createElement(
			"form",
			{ method: "post", action: "/authorize" },
			_react2["default"].createElement(
				"p",
				null,
				"Login with your version control system username and password."
			),
			_react2["default"].createElement("input", {
				placeholder: "Username",
				name: "username",
				type: "text",
				spellCheck: "false"
			}),
			_react2["default"].createElement("input", { placeholder: "Password", name: "password", type: "password" }),
			_react2["default"].createElement("input", { value: "Login", type: "submit" })
		)
	);
};

exports["default"] = LoginForm;

/***/ }),
/* 413 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(414);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(4)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2!../../../../../node_modules/less-loader/dist/cjs.js!./index.less", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2!../../../../../node_modules/less-loader/dist/cjs.js!./index.less");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 414 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(3)(undefined);
// imports


// module
exports.push([module.i, ".index__login___2DLO_ {\n  margin-top: 50px;\n}\n.index__login___2DLO_ p {\n  color: #212121;\n  padding: 0px;\n  margin: 0px;\n  margin-bottom: 30px;\n  text-align: center;\n  line-height: 22px;\n  font-family: \"Roboto\";\n  user-select: none;\n}\n.index__login___2DLO_ input {\n  outline: none;\n  display: block;\n  width: 100%;\n  box-sizing: border-box;\n}\n.index__login___2DLO_ input[type=password],\n.index__login___2DLO_ input[type=text] {\n  padding: 10px;\n  margin-bottom: 20px;\n  border: 1px solid #eceff1;\n  background: #fff;\n  font-family: \"Roboto\";\n}\n.index__login___2DLO_ input[type=password]:focus,\n.index__login___2DLO_ input[type=text]:focus {\n  border: 1px solid #212121;\n}\n.index__login___2DLO_ input[type=submit] {\n  color: #fff;\n  border: none;\n  background: #212121;\n  line-height: 36px;\n  font-family: \"Roboto\";\n  user-select: none;\n}\n.index__login___2DLO_ form {\n  margin: 0px auto;\n  min-width: 400px;\n  max-width: 400px;\n  padding: 30px;\n  box-sizing: border-box;\n}\n.index__login___2DLO_ ::-moz-input-placeholder {\n  color: #bdbdbd;\n  font-weight: 300;\n  font-size: 16px;\n  user-select: none;\n}\n.index__login___2DLO_ ::-webkit-input-placeholder {\n  color: #bdbdbd;\n  font-weight: 300;\n  font-size: 16px;\n  user-select: none;\n}\n", ""]);

// exports
exports.locals = {
	"login": "index__login___2DLO_"
};

/***/ }),
/* 415 */
/***/ (function(module, exports) {


/**
 * When source maps are enabled, `style-loader` uses a link element with a data-uri to
 * embed the css on the page. This breaks all relative urls because now they are relative to a
 * bundle instead of the current page.
 *
 * One solution is to only use full urls, but that may be impossible.
 *
 * Instead, this function "fixes" the relative urls to be absolute according to the current page location.
 *
 * A rudimentary test suite is located at `test/fixUrls.js` and can be run via the `npm test` command.
 *
 */

module.exports = function (css) {
  // get current location
  var location = typeof window !== "undefined" && window.location;

  if (!location) {
    throw new Error("fixUrls requires window.location");
  }

	// blank or null?
	if (!css || typeof css !== "string") {
	  return css;
  }

  var baseUrl = location.protocol + "//" + location.host;
  var currentDir = baseUrl + location.pathname.replace(/\/[^\/]*$/, "/");

	// convert each url(...)
	/*
	This regular expression is just a way to recursively match brackets within
	a string.

	 /url\s*\(  = Match on the word "url" with any whitespace after it and then a parens
	   (  = Start a capturing group
	     (?:  = Start a non-capturing group
	         [^)(]  = Match anything that isn't a parentheses
	         |  = OR
	         \(  = Match a start parentheses
	             (?:  = Start another non-capturing groups
	                 [^)(]+  = Match anything that isn't a parentheses
	                 |  = OR
	                 \(  = Match a start parentheses
	                     [^)(]*  = Match anything that isn't a parentheses
	                 \)  = Match a end parentheses
	             )  = End Group
              *\) = Match anything and then a close parens
          )  = Close non-capturing group
          *  = Match anything
       )  = Close capturing group
	 \)  = Match a close parens

	 /gi  = Get all matches, not the first.  Be case insensitive.
	 */
	var fixedCss = css.replace(/url\s*\(((?:[^)(]|\((?:[^)(]+|\([^)(]*\))*\))*)\)/gi, function(fullMatch, origUrl) {
		// strip quotes (if they exist)
		var unquotedOrigUrl = origUrl
			.trim()
			.replace(/^"(.*)"$/, function(o, $1){ return $1; })
			.replace(/^'(.*)'$/, function(o, $1){ return $1; });

		// already a full url? no change
		if (/^(#|data:|http:\/\/|https:\/\/|file:\/\/\/)/i.test(unquotedOrigUrl)) {
		  return fullMatch;
		}

		// convert the url to a full url
		var newUrl;

		if (unquotedOrigUrl.indexOf("//") === 0) {
		  	//TODO: should we add protocol?
			newUrl = unquotedOrigUrl;
		} else if (unquotedOrigUrl.indexOf("/") === 0) {
			// path should be relative to the base url
			newUrl = baseUrl + unquotedOrigUrl; // already starts with '/'
		} else {
			// path should be relative to current directory
			newUrl = currentDir + unquotedOrigUrl.replace(/^\.\//, ""); // Strip leading './'
		}

		// send back the fixed url(...)
		return "url(" + JSON.stringify(newUrl) + ")";
	});

	// send back the fixed css
	return fixedCss;
};


/***/ }),
/* 416 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _queryString = __webpack_require__(172);

var _queryString2 = _interopRequireDefault(_queryString);

var _report = __webpack_require__(420);

var _report2 = _interopRequireDefault(_report);

var _index = __webpack_require__(421);

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var DEFAULT_ERROR = "The system failed to process your Login request.";

var Error = function (_Component) {
	_inherits(Error, _Component);

	function Error() {
		_classCallCheck(this, Error);

		return _possibleConstructorReturn(this, _Component.apply(this, arguments));
	}

	Error.prototype.render = function render() {
		var parsed = _queryString2["default"].parse(window.location.search);
		var error = DEFAULT_ERROR;

		switch (parsed.code || parsed.error) {
			case "oauth_error":
				break;
			case "access_denied":
				break;
		}

		return _react2["default"].createElement(
			"div",
			{ className: _index2["default"].root },
			_react2["default"].createElement(
				"div",
				{ className: _index2["default"].alert },
				_react2["default"].createElement(
					"div",
					null,
					_react2["default"].createElement(_report2["default"], null)
				),
				_react2["default"].createElement(
					"div",
					null,
					error
				)
			)
		);
	};

	return Error;
}(_react.Component);

exports["default"] = Error;

/***/ }),
/* 417 */,
/* 418 */,
/* 419 */,
/* 420 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports["default"] = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ReportIcon = function (_Component) {
	_inherits(ReportIcon, _Component);

	function ReportIcon() {
		_classCallCheck(this, ReportIcon);

		return _possibleConstructorReturn(this, _Component.apply(this, arguments));
	}

	ReportIcon.prototype.render = function render() {
		return _react2["default"].createElement(
			"svg",
			{ className: this.props.className, viewBox: "0 0 24 24" },
			_react2["default"].createElement("path", { d: "M15.73 3H8.27L3 8.27v7.46L8.27 21h7.46L21 15.73V8.27L15.73 3zM12 17.3c-.72 0-1.3-.58-1.3-1.3 0-.72.58-1.3 1.3-1.3.72 0 1.3.58 1.3 1.3 0 .72-.58 1.3-1.3 1.3zm1-4.3h-2V7h2v6z" }),
			_react2["default"].createElement("path", { d: "M0 0h24v24H0z", fill: "none" })
		);
	};

	return ReportIcon;
}(_react.Component);

exports["default"] = ReportIcon;

/***/ }),
/* 421 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(422);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(4)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2!../../../../../node_modules/less-loader/dist/cjs.js!./index.less", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2!../../../../../node_modules/less-loader/dist/cjs.js!./index.less");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 422 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(3)(undefined);
// imports


// module
exports.push([module.i, ".index__root___2x1ZH {\n  margin: 50px auto;\n  min-width: 400px;\n  max-width: 400px;\n  padding: 30px;\n  box-sizing: border-box;\n}\n.index__root___2x1ZH .index__alert___1-ZtD {\n  margin-bottom: 20px;\n  text-align: left;\n  display: block;\n  color: #fff;\n  background: #fdb835;\n  padding: 20px;\n  display: flex;\n}\n.index__root___2x1ZH .index__alert___1-ZtD > :last-child {\n  padding-top: 2px;\n  padding-left: 10px;\n  line-height: 20px;\n  font-family: \"Roboto\";\n  font-size: 15px;\n}\n.index__root___2x1ZH svg {\n  fill: #fff;\n  width: 26px;\n  height: 26px;\n}\n", ""]);

// exports
exports.locals = {
	"root": "index__root___2x1ZH",
	"alert": "index__alert___1-ZtD"
};

/***/ }),
/* 423 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;

exports["default"] = function () {
	return _react2["default"].createElement(
		_reactRouterDom.Switch,
		null,
		_react2["default"].createElement(_reactRouterDom.Route, { path: "/account/tokens", exact: true, component: accountTitle }),
		_react2["default"].createElement(_reactRouterDom.Route, { path: "/account/repos", exact: true, component: accountRepos }),
		_react2["default"].createElement(_reactRouterDom.Route, { path: "/login", exact: false, component: loginTitle }),
		_react2["default"].createElement(_reactRouterDom.Route, { path: "/:owner/:repo", exact: false, component: repoTitle }),
		_react2["default"].createElement(_reactRouterDom.Route, { path: "/", exact: false, component: defautTitle })
	);
};

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _reactRouterDom = __webpack_require__(30);

var _reactTitleComponent = __webpack_require__(185);

var _reactTitleComponent2 = _interopRequireDefault(_reactTitleComponent);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var accountTitle = function accountTitle() {
	return _react2["default"].createElement(_reactTitleComponent2["default"], { render: "Tokens | drone" });
};

// @see https://github.com/yannickcr/eslint-plugin-react/issues/512
// eslint-disable-next-line react/display-name


var accountRepos = function accountRepos() {
	return _react2["default"].createElement(_reactTitleComponent2["default"], { render: "Repositories | drone" });
};

var loginTitle = function loginTitle() {
	return _react2["default"].createElement(_reactTitleComponent2["default"], { render: "Login | drone" });
};

var repoTitle = function repoTitle(_ref) {
	var match = _ref.match;
	return _react2["default"].createElement(_reactTitleComponent2["default"], { render: match.params.owner + "/" + match.params.repo + " | drone" });
};

var defautTitle = function defautTitle() {
	return _react2["default"].createElement(_reactTitleComponent2["default"], { render: "Welcome | drone" });
};

/***/ }),
/* 424 */,
/* 425 */,
/* 426 */,
/* 427 */,
/* 428 */,
/* 429 */,
/* 430 */,
/* 431 */,
/* 432 */,
/* 433 */,
/* 434 */,
/* 435 */,
/* 436 */,
/* 437 */,
/* 438 */,
/* 439 */,
/* 440 */,
/* 441 */,
/* 442 */,
/* 443 */,
/* 444 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports["default"] = undefined;

var _dec, _dec2, _class;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _classnames = __webpack_require__(66);

var _classnames2 = _interopRequireDefault(_classnames);

var _reactRouterDom = __webpack_require__(30);

var _reactScreenSize = __webpack_require__(186);

var _higherOrder = __webpack_require__(16);

var _inject = __webpack_require__(22);

var _menu = __webpack_require__(187);

var _menu2 = _interopRequireDefault(_menu);

var _feed = __webpack_require__(445);

var _feed2 = _interopRequireDefault(_feed);

var _registry = __webpack_require__(477);

var _registry2 = _interopRequireDefault(_registry);

var _secrets = __webpack_require__(488);

var _secrets2 = _interopRequireDefault(_secrets);

var _settings = __webpack_require__(499);

var _settings2 = _interopRequireDefault(_settings);

var _builds = __webpack_require__(503);

var _builds2 = _interopRequireDefault(_builds);

var _repos = __webpack_require__(514);

var _repos2 = _interopRequireDefault(_repos);

var _tokens = __webpack_require__(526);

var _tokens2 = _interopRequireDefault(_tokens);

var _redirect = __webpack_require__(195);

var _redirect2 = _interopRequireDefault(_redirect);

var _header = __webpack_require__(533);

var _header2 = _interopRequireDefault(_header);

var _menu3 = __webpack_require__(534);

var _menu4 = _interopRequireDefault(_menu3);

var _build = __webpack_require__(535);

var _build2 = _interopRequireDefault(_build);

var _menu5 = __webpack_require__(562);

var _menu6 = _interopRequireDefault(_menu5);

var _menu7 = __webpack_require__(197);

var _menu8 = _interopRequireDefault(_menu7);

var _snackbar = __webpack_require__(563);

var _drawer = __webpack_require__(575);

var _layout = __webpack_require__(578);

var _layout2 = _interopRequireDefault(_layout);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var binding = function binding(props, context) {
	return {
		user: ["user"],
		message: ["message"],
		sidebar: ["sidebar"],
		menu: ["menu"]
	};
};

var mapScreenSizeToProps = function mapScreenSizeToProps(screenSize) {
	return {
		isTablet: screenSize["small"],
		isMobile: screenSize["mobile"],
		isDesktop: screenSize["> small"]
	};
};

var Default = (_dec = (0, _higherOrder.branch)(binding), _dec2 = (0, _reactScreenSize.connectScreenSize)(mapScreenSizeToProps), (0, _inject.inject)(_class = _dec(_class = _dec2(_class = function (_Component) {
	_inherits(Default, _Component);

	function Default(props, context) {
		_classCallCheck(this, Default);

		var _this = _possibleConstructorReturn(this, _Component.call(this, props, context));

		_this.state = {
			menu: false,
			feed: false
		};

		_this.openMenu = _this.openMenu.bind(_this);
		_this.closeMenu = _this.closeMenu.bind(_this);
		_this.closeSnackbar = _this.closeSnackbar.bind(_this);
		return _this;
	}

	Default.prototype.componentWillReceiveProps = function componentWillReceiveProps(nextProps) {
		if (nextProps.location !== this.props.location) {
			this.closeMenu(true);
		}
	};

	Default.prototype.openMenu = function openMenu() {
		this.props.dispatch(function (tree) {
			tree.set(["menu"], true);
		});
	};

	Default.prototype.closeMenu = function closeMenu() {
		this.props.dispatch(function (tree) {
			tree.set(["menu"], false);
		});
	};

	Default.prototype.render = function render() {
		var _props = this.props,
		    user = _props.user,
		    message = _props.message,
		    menu = _props.menu;


		var classes = (0, _classnames2["default"])(!user || !user.data ? _layout2["default"].guest : null);
		return _react2["default"].createElement(
			"div",
			{ className: classes },
			_react2["default"].createElement(
				"div",
				{ className: _layout2["default"].left },
				_react2["default"].createElement(
					_reactRouterDom.Switch,
					null,
					_react2["default"].createElement(_reactRouterDom.Route, { path: "/", component: _feed2["default"] })
				)
			),
			_react2["default"].createElement(
				"div",
				{ className: _layout2["default"].center },
				!user || !user.data ? _react2["default"].createElement(
					"a",
					{ href: "/login", target: "_self", className: _layout2["default"].login },
					"Click to Login"
				) : _react2["default"].createElement("noscript", null),
				_react2["default"].createElement(
					"div",
					{ className: _layout2["default"].title },
					_react2["default"].createElement(
						_reactRouterDom.Switch,
						null,
						_react2["default"].createElement(_reactRouterDom.Route, { path: "/account/repos", component: _repos.UserRepoTitle }),
						_react2["default"].createElement(_reactRouterDom.Route, {
							path: "/:owner/:repo/:build(\\d*)/:proc(\\d*)",
							exact: true,
							component: _build.BuildLogsTitle
						}),
						_react2["default"].createElement(_reactRouterDom.Route, {
							path: "/:owner/:repo/:build(\\d*)",
							component: _build.BuildLogsTitle
						}),
						_react2["default"].createElement(_reactRouterDom.Route, { path: "/:owner/:repo", component: _header2["default"] })
					),
					user && user.data ? _react2["default"].createElement(
						"div",
						{ className: _layout2["default"].avatar },
						_react2["default"].createElement("img", { src: user.data.avatar_url })
					) : undefined,
					user && user.data ? _react2["default"].createElement(
						"button",
						{ onClick: this.openMenu },
						_react2["default"].createElement(_menu2["default"], null)
					) : _react2["default"].createElement("noscript", null)
				),
				_react2["default"].createElement(
					_reactRouterDom.Switch,
					null,
					_react2["default"].createElement(_reactRouterDom.Route, { path: "/account/token", exact: true, component: _tokens2["default"] }),
					_react2["default"].createElement(_reactRouterDom.Route, { path: "/account/repos", exact: true, component: _repos2["default"] }),
					_react2["default"].createElement(_reactRouterDom.Route, {
						path: "/:owner/:repo/settings/secrets",
						exact: true,
						component: _secrets2["default"]
					}),
					_react2["default"].createElement(_reactRouterDom.Route, {
						path: "/:owner/:repo/settings/registry",
						exact: true,
						component: _registry2["default"]
					}),
					_react2["default"].createElement(_reactRouterDom.Route, {
						path: "/:owner/:repo/settings",
						exact: true,
						component: _settings2["default"]
					}),
					_react2["default"].createElement(_reactRouterDom.Route, {
						path: "/:owner/:repo/:build(\\d*)",
						exact: true,
						component: _build2["default"]
					}),
					_react2["default"].createElement(_reactRouterDom.Route, {
						path: "/:owner/:repo/:build(\\d*)/:proc(\\d*)",
						exact: true,
						component: _build2["default"]
					}),
					_react2["default"].createElement(_reactRouterDom.Route, { path: "/:owner/:repo", exact: true, component: _builds2["default"] }),
					_react2["default"].createElement(_reactRouterDom.Route, { path: "/", exact: true, component: _redirect2["default"] })
				)
			),
			_react2["default"].createElement(_snackbar.Snackbar, { message: message.text, onClose: this.closeSnackbar }),
			_react2["default"].createElement(
				_drawer.Drawer,
				{ onClick: this.closeMenu, position: _drawer.DOCK_RIGHT, open: menu },
				_react2["default"].createElement(
					_reactRouterDom.Switch,
					null,
					_react2["default"].createElement(_reactRouterDom.Route, {
						path: "/account/repos",
						exact: true,
						component: _menu4["default"]
					}),
					_react2["default"].createElement(_reactRouterDom.Route, {
						path: "/account/",
						exact: false,
						component: undefined
					}),
					"BuildMenu",
					_react2["default"].createElement(_reactRouterDom.Route, {
						path: "/:owner/:repo/:build(\\d*)/:proc(\\d*)",
						exact: true,
						component: _menu6["default"]
					}),
					_react2["default"].createElement(_reactRouterDom.Route, {
						path: "/:owner/:repo/:build(\\d*)",
						exact: true,
						component: _menu6["default"]
					}),
					_react2["default"].createElement(_reactRouterDom.Route, { path: "/:owner/:repo", exact: false, component: _menu8["default"] })
				),
				_react2["default"].createElement(
					"section",
					null,
					_react2["default"].createElement(
						"ul",
						null,
						_react2["default"].createElement(
							"li",
							null,
							_react2["default"].createElement(
								_reactRouterDom.Link,
								{ to: "/account/repos" },
								"Repositories"
							)
						),
						_react2["default"].createElement(
							"li",
							null,
							_react2["default"].createElement(
								_reactRouterDom.Link,
								{ to: "/account/token" },
								"Token"
							)
						)
					)
				),
				_react2["default"].createElement(
					"section",
					null,
					_react2["default"].createElement(
						"ul",
						null,
						_react2["default"].createElement(
							"li",
							null,
							_react2["default"].createElement(
								"a",
								{ href: "/logout", target: "_self" },
								"Logout"
							)
						)
					)
				)
			)
		);
	};

	Default.prototype.closeSnackbar = function closeSnackbar() {
		this.props.dispatch(function (tree) {
			tree.unset(["message", "text"]);
		});
	};

	return Default;
}(_react.Component)) || _class) || _class) || _class);
exports["default"] = Default;

/***/ }),
/* 445 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports["default"] = undefined;

var _dec, _class;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _reactRouterDom = __webpack_require__(30);

var _feed = __webpack_require__(188);

var _higherOrder = __webpack_require__(16);

var _inject = __webpack_require__(22);

var _logo = __webpack_require__(446);

var _logo2 = _interopRequireDefault(_logo);

var _components = __webpack_require__(447);

var _index = __webpack_require__(475);

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var binding = function binding(props, context) {
	return { feed: ["feed"] };
};

var Sidebar = (_dec = (0, _higherOrder.branch)(binding), (0, _inject.inject)(_class = _dec(_class = function (_Component) {
	_inherits(Sidebar, _Component);

	function Sidebar(props, context) {
		_classCallCheck(this, Sidebar);

		var _this = _possibleConstructorReturn(this, _Component.call(this, props, context));

		_this.handleFilter = _this.handleFilter.bind(_this);
		return _this;
	}

	Sidebar.prototype.shouldComponentUpdate = function shouldComponentUpdate(nextProps, nextState) {
		return this.props.feed !== nextProps.feed || this.state.filter !== nextState.filter;
	};

	Sidebar.prototype.handleFilter = function handleFilter(e) {
		this.setState({
			filter: e.target.value
		});
	};

	Sidebar.prototype.render = function render() {
		var feed = this.props.feed;
		var filter = this.state.filter;


		var list = feed.data ? Object.values(feed.data) : [];

		var filterFunc = function filterFunc(item) {
			return !filter || item.full_name.indexOf(filter) !== -1;
		};

		var filtered = list.filter(filterFunc).sort(_feed.compareFeedItem);

		return _react2["default"].createElement(
			"div",
			{ className: _index2["default"].feed },
			LOGO,
			_react2["default"].createElement("input", {
				type: "text",
				placeholder: "Search \u2026",
				onChange: this.handleFilter
			}),
			feed.loaded === false ? LOADING : feed.error ? ERROR : list.length === 0 ? EMPTY : filtered.length > 0 ? renderFeed(filtered) : NO_MATCHES
		);
	};

	return Sidebar;
}(_react.Component)) || _class) || _class);
exports["default"] = Sidebar;


var renderFeed = function renderFeed(list) {
	return _react2["default"].createElement(
		_components.List,
		null,
		list.map(renderItem)
	);
};

var renderItem = function renderItem(item) {
	return _react2["default"].createElement(
		_reactRouterDom.Link,
		{ to: "/" + item.full_name, key: item.full_name },
		_react2["default"].createElement(_components.Item, { item: item })
	);
};

var LOGO = _react2["default"].createElement(
	"div",
	{ className: _index2["default"].brand },
	_react2["default"].createElement(_logo2["default"], null)
);

var LOADING = _react2["default"].createElement(
	"div",
	{ className: _index2["default"].message },
	"Loading"
);

var EMPTY = _react2["default"].createElement(
	"div",
	{ className: _index2["default"].message },
	"Your build feed is empty"
);

var NO_MATCHES = _react2["default"].createElement(
	"div",
	{ className: _index2["default"].message },
	"No results found"
);

var ERROR = _react2["default"].createElement(
	"div",
	{ className: _index2["default"].message },
	"Oops. It looks like there was a problem loading your feed"
);

/***/ }),
/* 446 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports["default"] = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Logo = function (_Component) {
	_inherits(Logo, _Component);

	function Logo() {
		_classCallCheck(this, Logo);

		return _possibleConstructorReturn(this, _Component.apply(this, arguments));
	}

	Logo.prototype.render = function render() {
		return _react2["default"].createElement(
			"svg",
			{ viewBox: "0 0 256 218", preserveAspectRatio: "xMidYMid" },
			_react2["default"].createElement(
				"g",
				null,
				_react2["default"].createElement("path", { d: "M128.224307,0.72249586 C32.0994301,0.72249586 0.394430682,84.5663333 0.394430682,115.221578 L78.3225537,115.221578 C78.3225537,115.221578 89.3644231,75.2760497 128.224307,75.2760497 C167.08419,75.2760497 178.130047,115.221578 178.130047,115.221578 L255.605569,115.221578 C255.605569,84.5623457 224.348186,0.72249586 128.224307,0.72249586" }),
				_react2["default"].createElement("path", { d: "M227.043854,135.175898 L178.130047,135.175898 C178.130047,135.175898 169.579477,175.122423 128.224307,175.122423 C86.8691361,175.122423 78.3225537,135.175898 78.3225537,135.175898 L30.2571247,135.175898 C30.2571247,145.426215 67.9845088,217.884246 128.699837,217.884246 C189.414168,217.884246 227.043854,158.280482 227.043854,135.175898" }),
				_react2["default"].createElement("circle", { cx: "128", cy: "126.076531", r: "32.7678394" })
			)
		);
	};

	return Logo;
}(_react.Component);

exports["default"] = Logo;

/***/ }),
/* 447 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports.Item = exports.List = undefined;

var _list = __webpack_require__(448);

exports.List = _list.List;
exports.Item = _list.Item;

/***/ }),
/* 448 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports.Item = exports.List = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _status = __webpack_require__(67);

var _status2 = _interopRequireDefault(_status);

var _build_time = __webpack_require__(88);

var _build_time2 = _interopRequireDefault(_build_time);

var _list = __webpack_require__(473);

var _list2 = _interopRequireDefault(_list);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var List = exports.List = function List(_ref) {
	var children = _ref.children;
	return _react2["default"].createElement(
		"div",
		{ className: _list2["default"].list },
		children
	);
};

var Item = exports.Item = function (_Component) {
	_inherits(Item, _Component);

	function Item() {
		_classCallCheck(this, Item);

		return _possibleConstructorReturn(this, _Component.apply(this, arguments));
	}

	Item.prototype.render = function render() {
		var item = this.props.item;

		return _react2["default"].createElement(
			"div",
			{ className: _list2["default"].item },
			_react2["default"].createElement(
				"div",
				{ className: _list2["default"].header },
				_react2["default"].createElement(
					"div",
					{ className: _list2["default"].title },
					item.full_name
				),
				_react2["default"].createElement(
					"div",
					{ className: _list2["default"].icon },
					item.status ? _react2["default"].createElement(_status2["default"], { status: item.status }) : _react2["default"].createElement("noscript", null)
				)
			),
			_react2["default"].createElement(
				"div",
				{ className: _list2["default"].body },
				_react2["default"].createElement(_build_time2["default"], {
					start: item.started_at || item.created_at,
					finish: item.finished_at
				})
			)
		);
	};

	Item.prototype.shouldComponentUpdate = function shouldComponentUpdate(nextProps, nextState) {
		return this.props.item !== nextProps.item;
	};

	return Item;
}(_react.Component);

/***/ }),
/* 449 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(450);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(4)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../node_modules/css-loader/index.js??ref--2!../../../node_modules/less-loader/dist/cjs.js!./status.less", function() {
			var newContent = require("!!../../../node_modules/css-loader/index.js??ref--2!../../../node_modules/less-loader/dist/cjs.js!./status.less");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 450 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(3)(undefined);
// imports


// module
exports.push([module.i, ".status__root___32Khq {\n  width: 23px;\n  height: 23px;\n  border-width: 2px;\n  border-style: solid;\n  border-radius: 50%;\n  box-sizing: border-box;\n  display: flex;\n  align-content: center;\n  padding: 2px;\n}\n.status__root___32Khq.status__success___1d-pm {\n  border-color: #4dc89a;\n}\n.status__root___32Khq.status__success___1d-pm svg {\n  fill: #4dc89a;\n}\n.status__root___32Khq.status__declined___3VyBF,\n.status__root___32Khq.status__failure___1pnCl,\n.status__root___32Khq.status__killed___3_8KY,\n.status__root___32Khq.status__error___p2dFk {\n  border-color: #fc4758;\n}\n.status__root___32Khq.status__declined___3VyBF svg,\n.status__root___32Khq.status__failure___1pnCl svg,\n.status__root___32Khq.status__killed___3_8KY svg,\n.status__root___32Khq.status__error___p2dFk svg {\n  fill: #fc4758;\n}\n.status__root___32Khq.status__blocked___2cPhf,\n.status__root___32Khq.status__running___3YRya,\n.status__root___32Khq.status__started___gDfvr {\n  border-color: #fdb835;\n}\n.status__root___32Khq.status__blocked___2cPhf svg,\n.status__root___32Khq.status__running___3YRya svg,\n.status__root___32Khq.status__started___gDfvr svg {\n  fill: #fdb835;\n}\n.status__root___32Khq.status__started___gDfvr svg,\n.status__root___32Khq.status__running___3YRya svg {\n  animation: status__spinner___30VrG 1.2s ease infinite;\n}\n.status__root___32Khq.status__pending___3_OvT,\n.status__root___32Khq.status__skipped___3cp3z {\n  border-color: #bdbdbd;\n}\n.status__root___32Khq.status__pending___3_OvT svg,\n.status__root___32Khq.status__skipped___3cp3z svg {\n  fill: #bdbdbd;\n}\n.status__root___32Khq.status__pending___3_OvT svg {\n  animation: status__wrench___2GnRS 2.5s ease infinite;\n  transform-origin: center 54%;\n}\n@keyframes status__spinner___30VrG {\n  0% {\n    transform: rotate(0deg);\n  }\n  100% {\n    transform: rotate(359deg);\n  }\n}\n@keyframes status__wrench___2GnRS {\n  0% {\n    transform: rotate(-12deg);\n  }\n  8% {\n    transform: rotate(12deg);\n  }\n  10% {\n    transform: rotate(24deg);\n  }\n  18% {\n    transform: rotate(-24deg);\n  }\n  20% {\n    transform: rotate(-24deg);\n  }\n  28% {\n    transform: rotate(24deg);\n  }\n  30% {\n    transform: rotate(24deg);\n  }\n  38% {\n    transform: rotate(-24deg);\n  }\n  40% {\n    transform: rotate(-24deg);\n  }\n  48% {\n    transform: rotate(24deg);\n  }\n  50% {\n    transform: rotate(24deg);\n  }\n  58% {\n    transform: rotate(-24deg);\n  }\n  60% {\n    transform: rotate(-24deg);\n  }\n  68% {\n    transform: rotate(24deg);\n  }\n  75%,\n  100% {\n    transform: rotate(0deg);\n  }\n}\n.status__label___pztjT {\n  display: flex;\n  padding: 10px 20px;\n  border-radius: 2px;\n  background-color: #4dc89a;\n  color: #fff;\n  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);\n}\n.status__label___pztjT div {\n  flex: 1;\n  vertical-align: middle;\n  line-height: 22px;\n  font-size: 15px;\n}\n.status__label___pztjT.status__success___1d-pm {\n  background-color: #4dc89a;\n}\n.status__label___pztjT.status__declined___3VyBF,\n.status__label___pztjT.status__failure___1pnCl,\n.status__label___pztjT.status__killed___3_8KY,\n.status__label___pztjT.status__error___p2dFk {\n  background-color: #fc4758;\n}\n.status__label___pztjT.status__blocked___2cPhf,\n.status__label___pztjT.status__running___3YRya,\n.status__label___pztjT.status__started___gDfvr {\n  background-color: #fdb835;\n}\n.status__label___pztjT.status__pending___3_OvT,\n.status__label___pztjT.status__skipped___3cp3z {\n  background-color: #bdbdbd;\n}\n", ""]);

// exports
exports.locals = {
	"root": "status__root___32Khq",
	"success": "status__success___1d-pm",
	"declined": "status__declined___3VyBF",
	"failure": "status__failure___1pnCl",
	"killed": "status__killed___3_8KY",
	"error": "status__error___p2dFk",
	"blocked": "status__blocked___2cPhf",
	"running": "status__running___3YRya",
	"started": "status__started___gDfvr",
	"spinner": "status__spinner___30VrG",
	"pending": "status__pending___3_OvT",
	"skipped": "status__skipped___3cp3z",
	"wrench": "status__wrench___2GnRS",
	"label": "status__label___pztjT"
};

/***/ }),
/* 451 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports["default"] = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var BackIcon = function (_Component) {
	_inherits(BackIcon, _Component);

	function BackIcon() {
		_classCallCheck(this, BackIcon);

		return _possibleConstructorReturn(this, _Component.apply(this, arguments));
	}

	BackIcon.prototype.render = function render() {
		return _react2["default"].createElement(
			"svg",
			{
				className: this.props.className,
				width: this.props.size || 24,
				height: this.props.size || 24,
				viewBox: "0 0 24 24"
			},
			_react2["default"].createElement("path", { d: "M0 0h24v24H0z", fill: "none" }),
			_react2["default"].createElement("path", { d: "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" })
		);
	};

	return BackIcon;
}(_react.Component);

exports["default"] = BackIcon;

/***/ }),
/* 452 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports["default"] = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var BranchIcon = function (_Component) {
	_inherits(BranchIcon, _Component);

	function BranchIcon() {
		_classCallCheck(this, BranchIcon);

		return _possibleConstructorReturn(this, _Component.apply(this, arguments));
	}

	BranchIcon.prototype.render = function render() {
		return _react2["default"].createElement(
			"svg",
			{ viewBox: "0 0 24 24" },
			_react2["default"].createElement("path", { d: "M6,2A3,3 0 0,1 9,5C9,6.28 8.19,7.38 7.06,7.81C7.15,8.27 7.39,8.83 8,9.63C9,10.92 11,12.83 12,14.17C13,12.83 15,10.92 16,9.63C16.61,8.83 16.85,8.27 16.94,7.81C15.81,7.38 15,6.28 15,5A3,3 0 0,1 18,2A3,3 0 0,1 21,5C21,6.32 20.14,7.45 18.95,7.85C18.87,8.37 18.64,9 18,9.83C17,11.17 15,13.08 14,14.38C13.39,15.17 13.15,15.73 13.06,16.19C14.19,16.62 15,17.72 15,19A3,3 0 0,1 12,22A3,3 0 0,1 9,19C9,17.72 9.81,16.62 10.94,16.19C10.85,15.73 10.61,15.17 10,14.38C9,13.08 7,11.17 6,9.83C5.36,9 5.13,8.37 5.05,7.85C3.86,7.45 3,6.32 3,5A3,3 0 0,1 6,2M6,4A1,1 0 0,0 5,5A1,1 0 0,0 6,6A1,1 0 0,0 7,5A1,1 0 0,0 6,4M18,4A1,1 0 0,0 17,5A1,1 0 0,0 18,6A1,1 0 0,0 19,5A1,1 0 0,0 18,4M12,18A1,1 0 0,0 11,19A1,1 0 0,0 12,20A1,1 0 0,0 13,19A1,1 0 0,0 12,18Z" })
		);
	};

	return BranchIcon;
}(_react.Component);

exports["default"] = BranchIcon;

/***/ }),
/* 453 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports["default"] = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var CheckIcon = function (_Component) {
	_inherits(CheckIcon, _Component);

	function CheckIcon() {
		_classCallCheck(this, CheckIcon);

		return _possibleConstructorReturn(this, _Component.apply(this, arguments));
	}

	CheckIcon.prototype.render = function render() {
		return _react2["default"].createElement(
			"svg",
			{
				className: this.props.className,
				width: this.props.size || 24,
				height: this.props.size || 24,
				viewBox: "0 0 24 24"
			},
			_react2["default"].createElement("path", { d: "M0 0h24v24H0z", fill: "none" }),
			_react2["default"].createElement("path", { d: "M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" })
		);
	};

	return CheckIcon;
}(_react.Component);

exports["default"] = CheckIcon;

/***/ }),
/* 454 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports["default"] = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ClockIcon = function (_Component) {
	_inherits(ClockIcon, _Component);

	function ClockIcon() {
		_classCallCheck(this, ClockIcon);

		return _possibleConstructorReturn(this, _Component.apply(this, arguments));
	}

	ClockIcon.prototype.render = function render() {
		return _react2["default"].createElement(
			"svg",
			{
				className: this.props.className,
				width: this.props.size || 24,
				height: this.props.size || 24,
				viewBox: "0 0 24 24"
			},
			_react2["default"].createElement("path", { d: "M0 0h24v24H0z", fill: "none" }),
			_react2["default"].createElement("path", { d: "M22 5.72l-4.6-3.86-1.29 1.53 4.6 3.86L22 5.72zM7.88 3.39L6.6 1.86 2 5.71l1.29 1.53 4.59-3.85zM12.5 8H11v6l4.75 2.85.75-1.23-4-2.37V8zM12 4c-4.97 0-9 4.03-9 9s4.02 9 9 9c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 16c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" })
		);
	};

	return ClockIcon;
}(_react.Component);

exports["default"] = ClockIcon;

/***/ }),
/* 455 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports["default"] = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var CommitIcon = function (_Component) {
	_inherits(CommitIcon, _Component);

	function CommitIcon() {
		_classCallCheck(this, CommitIcon);

		return _possibleConstructorReturn(this, _Component.apply(this, arguments));
	}

	CommitIcon.prototype.render = function render() {
		return _react2["default"].createElement(
			"svg",
			{
				className: this.props.className,
				width: this.props.size || 24,
				height: this.props.size || 24,
				viewBox: "0 0 24 24"
			},
			_react2["default"].createElement("path", { d: "M17,12C17,14.42 15.28,16.44 13,16.9V21H11V16.9C8.72,16.44 7,14.42 7,12C7,9.58 8.72,7.56 11,7.1V3H13V7.1C15.28,7.56 17,9.58 17,12M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9Z" })
		);
	};

	return CommitIcon;
}(_react.Component);

exports["default"] = CommitIcon;

/***/ }),
/* 456 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports["default"] = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var DeployIcon = function (_Component) {
	_inherits(DeployIcon, _Component);

	function DeployIcon() {
		_classCallCheck(this, DeployIcon);

		return _possibleConstructorReturn(this, _Component.apply(this, arguments));
	}

	DeployIcon.prototype.render = function render() {
		return _react2["default"].createElement(
			"svg",
			{ className: this.props.className, viewBox: "0 0 24 24" },
			_react2["default"].createElement("path", { d: "M19,18H6A4,4 0 0,1 2,14A4,4 0 0,1 6,10H6.71C7.37,7.69 9.5,6 12,6A5.5,5.5 0 0,1 17.5,11.5V12H19A3,3 0 0,1 22,15A3,3 0 0,1 19,18M19.35,10.03C18.67,6.59 15.64,4 12,4C9.11,4 6.6,5.64 5.35,8.03C2.34,8.36 0,10.9 0,14A6,6 0 0,0 6,20H19A5,5 0 0,0 24,15C24,12.36 21.95,10.22 19.35,10.03Z" })
		);
	};

	return DeployIcon;
}(_react.Component);

exports["default"] = DeployIcon;

/***/ }),
/* 457 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports["default"] = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ExpandIcon = function (_Component) {
	_inherits(ExpandIcon, _Component);

	function ExpandIcon() {
		_classCallCheck(this, ExpandIcon);

		return _possibleConstructorReturn(this, _Component.apply(this, arguments));
	}

	ExpandIcon.prototype.render = function render() {
		return _react2["default"].createElement(
			"svg",
			{
				className: this.props.className,
				width: this.props.size || 24,
				height: this.props.size || 24,
				viewBox: "0 0 24 24"
			},
			_react2["default"].createElement("path", { d: "M7.41 7.84L12 12.42l4.59-4.58L18 9.25l-6 6-6-6z" }),
			_react2["default"].createElement("path", { d: "M0-.75h24v24H0z", fill: "none" })
		);
	};

	return ExpandIcon;
}(_react.Component);

exports["default"] = ExpandIcon;

/***/ }),
/* 458 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports["default"] = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var LaunchIcon = function (_Component) {
	_inherits(LaunchIcon, _Component);

	function LaunchIcon() {
		_classCallCheck(this, LaunchIcon);

		return _possibleConstructorReturn(this, _Component.apply(this, arguments));
	}

	LaunchIcon.prototype.render = function render() {
		return _react2["default"].createElement(
			"svg",
			{ className: this.props.className, viewBox: "0 0 24 24" },
			_react2["default"].createElement("path", { d: "M0 0h24v24H0z", fill: "none" }),
			_react2["default"].createElement("path", { d: "M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" })
		);
	};

	return LaunchIcon;
}(_react.Component);

exports["default"] = LaunchIcon;

/***/ }),
/* 459 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports["default"] = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var LinkIcon = function (_Component) {
	_inherits(LinkIcon, _Component);

	function LinkIcon() {
		_classCallCheck(this, LinkIcon);

		return _possibleConstructorReturn(this, _Component.apply(this, arguments));
	}

	LinkIcon.prototype.render = function render() {
		return _react2["default"].createElement(
			"svg",
			{
				className: this.props.className,
				width: this.props.size || 24,
				height: this.props.size || 24,
				viewBox: "0 0 24 24"
			},
			_react2["default"].createElement("path", { d: "M0 0h24v24H0z", fill: "none" }),
			_react2["default"].createElement("path", { d: "M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" })
		);
	};

	return LinkIcon;
}(_react.Component);

exports["default"] = LinkIcon;

/***/ }),
/* 460 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports["default"] = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var MergeIcon = function (_Component) {
	_inherits(MergeIcon, _Component);

	function MergeIcon() {
		_classCallCheck(this, MergeIcon);

		return _possibleConstructorReturn(this, _Component.apply(this, arguments));
	}

	MergeIcon.prototype.render = function render() {
		return _react2["default"].createElement(
			"svg",
			{ className: this.props.className, viewBox: "0 0 24 24" },
			_react2["default"].createElement("path", { d: "M5.41,21L6.12,17H2.12L2.47,15H6.47L7.53,9H3.53L3.88,7H7.88L8.59,3H10.59L9.88,7H15.88L16.59,3H18.59L17.88,7H21.88L21.53,9H17.53L16.47,15H20.47L20.12,17H16.12L15.41,21H13.41L14.12,17H8.12L7.41,21H5.41M9.53,9L8.47,15H14.47L15.53,9H9.53Z" })
		);
	};

	return MergeIcon;
}(_react.Component);

// <svg class={this.props.className} viewBox="0 0 54.5 68">
//   <path d="M20,13C20,8.6,16.4,5,12.1,5C7.7,5,4.2,8.6,4.2,13c0,3.2,1.9,6,4.7,7.2v27.1c-2.7,1.2-4.7,4-4.7,7.2c0,4.4,3.6,7.9,7.9,7.9   c4.4,0,7.9-3.6,7.9-7.9c0-3.2-1.9-6-4.7-7.2V20.2C18.1,18.9,20,16.2,20,13z M16,54.5c0,2.2-1.8,3.9-3.9,3.9c-2.2,0-3.9-1.8-3.9-3.9   c0-2.2,1.8-3.9,3.9-3.9C14.2,50.5,16,52.3,16,54.5z M12.1,16.9c-2.2,0-3.9-1.8-3.9-3.9c0-2.2,1.8-3.9,3.9-3.9C14.2,9,16,10.8,16,13   C16,15.1,14.2,16.9,12.1,16.9z"/>
//   <path d="M45.3,47.3V20.8c0-6.1-5-11.1-11.1-11.1h-2.7V3.6L20.7,13l10.8,9.3v-6.1h2.7c2.6,0,4.6,2.1,4.6,4.6v26.4   c-2.7,1.2-4.7,4-4.7,7.2c0,4.4,3.6,7.9,7.9,7.9c4.4,0,7.9-3.6,7.9-7.9C50,51.3,48.1,48.5,45.3,47.3z M42.1,58.4   c-2.2,0-3.9-1.8-3.9-3.9c0-2.2,1.8-3.9,3.9-3.9c2.2,0,3.9,1.8,3.9,3.9C46,56.6,44.2,58.4,42.1,58.4z"/>
// </svg>


exports["default"] = MergeIcon;

/***/ }),
/* 461 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports["default"] = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var PauseIcon = function (_Component) {
	_inherits(PauseIcon, _Component);

	function PauseIcon() {
		_classCallCheck(this, PauseIcon);

		return _possibleConstructorReturn(this, _Component.apply(this, arguments));
	}

	PauseIcon.prototype.render = function render() {
		return _react2["default"].createElement(
			"svg",
			{
				className: this.props.className,
				width: this.props.size || 24,
				height: this.props.size || 24,
				viewBox: "0 0 24 24"
			},
			_react2["default"].createElement("path", { d: "M6 19h4V5H6v14zm8-14v14h4V5h-4z" }),
			_react2["default"].createElement("path", { d: "M0 0h24v24H0z", fill: "none" })
		);
	};

	return PauseIcon;
}(_react.Component);

exports["default"] = PauseIcon;

/***/ }),
/* 462 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports["default"] = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var PlayIcon = function (_Component) {
	_inherits(PlayIcon, _Component);

	function PlayIcon() {
		_classCallCheck(this, PlayIcon);

		return _possibleConstructorReturn(this, _Component.apply(this, arguments));
	}

	PlayIcon.prototype.render = function render() {
		return _react2["default"].createElement(
			"svg",
			{
				className: this.props.className,
				width: this.props.size || 24,
				height: this.props.size || 24,
				viewBox: "0 0 24 24"
			},
			_react2["default"].createElement("path", { d: "M8 5v14l11-7z" }),
			_react2["default"].createElement("path", { d: "M0 0h24v24H0z", fill: "none" })
		);
	};

	return PlayIcon;
}(_react.Component);

exports["default"] = PlayIcon;

/***/ }),
/* 463 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports["default"] = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var CheckIcon = function (_Component) {
	_inherits(CheckIcon, _Component);

	function CheckIcon() {
		_classCallCheck(this, CheckIcon);

		return _possibleConstructorReturn(this, _Component.apply(this, arguments));
	}

	CheckIcon.prototype.render = function render() {
		return _react2["default"].createElement(
			"svg",
			{
				className: this.props.className,
				width: this.props.size || 24,
				height: this.props.size || 24,
				viewBox: "0 0 24 24"
			},
			_react2["default"].createElement("path", { d: "M19 13H5v-2h14v2z" }),
			_react2["default"].createElement("path", { d: "M0 0h24v24H0z", fill: "none" })
		);
	};

	return CheckIcon;
}(_react.Component);

exports["default"] = CheckIcon;

/***/ }),
/* 464 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports["default"] = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ScheduleIcon = function (_Component) {
	_inherits(ScheduleIcon, _Component);

	function ScheduleIcon() {
		_classCallCheck(this, ScheduleIcon);

		return _possibleConstructorReturn(this, _Component.apply(this, arguments));
	}

	ScheduleIcon.prototype.render = function render() {
		return _react2["default"].createElement(
			"svg",
			{
				className: this.props.className,
				width: this.props.size || 24,
				height: this.props.size || 24,
				viewBox: "0 0 24 24"
			},
			_react2["default"].createElement("path", { d: "M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" }),
			_react2["default"].createElement("path", { d: "M0 0h24v24H0z", fill: "none" }),
			_react2["default"].createElement("path", { d: "M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z" })
		);
	};

	return ScheduleIcon;
}(_react.Component);

exports["default"] = ScheduleIcon;

/***/ }),
/* 465 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports["default"] = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var SyncIcon = function (_Component) {
	_inherits(SyncIcon, _Component);

	function SyncIcon() {
		_classCallCheck(this, SyncIcon);

		return _possibleConstructorReturn(this, _Component.apply(this, arguments));
	}

	SyncIcon.prototype.render = function render() {
		return _react2["default"].createElement(
			"svg",
			{ className: this.props.className, viewBox: "0 0 24 24" },
			_react2["default"].createElement("path", { d: "M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" }),
			_react2["default"].createElement("path", { d: "M0 0h24v24H0z", fill: "none" })
		);
	};

	return SyncIcon;
}(_react.Component);

exports["default"] = SyncIcon;

/***/ }),
/* 466 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports["default"] = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var TagIcon = function (_Component) {
	_inherits(TagIcon, _Component);

	function TagIcon() {
		_classCallCheck(this, TagIcon);

		return _possibleConstructorReturn(this, _Component.apply(this, arguments));
	}

	TagIcon.prototype.render = function render() {
		return _react2["default"].createElement(
			"svg",
			{ className: this.props.className, viewBox: "0 0 24 24" },
			_react2["default"].createElement("path", { d: "M5.5,7A1.5,1.5 0 0,0 7,5.5A1.5,1.5 0 0,0 5.5,4A1.5,1.5 0 0,0 4,5.5A1.5,1.5 0 0,0 5.5,7M21.41,11.58C21.77,11.94 22,12.44 22,13C22,13.55 21.78,14.05 21.41,14.41L14.41,21.41C14.05,21.77 13.55,22 13,22C12.45,22 11.95,21.77 11.58,21.41L2.59,12.41C2.22,12.05 2,11.55 2,11V4C2,2.89 2.89,2 4,2H11C11.55,2 12.05,2.22 12.41,2.58L21.41,11.58M13,20L20,13L11.5,4.5L4.5,11.5L13,20Z" })
		);
	};

	return TagIcon;
}(_react.Component);

exports["default"] = TagIcon;

/***/ }),
/* 467 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports["default"] = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var TimelapseIcon = function (_Component) {
	_inherits(TimelapseIcon, _Component);

	function TimelapseIcon() {
		_classCallCheck(this, TimelapseIcon);

		return _possibleConstructorReturn(this, _Component.apply(this, arguments));
	}

	TimelapseIcon.prototype.render = function render() {
		return _react2["default"].createElement(
			"svg",
			{
				className: this.props.className,
				width: this.props.size || 24,
				height: this.props.size || 24,
				viewBox: "0 0 24 24"
			},
			_react2["default"].createElement("path", { d: "M0 0h24v24H0z", fill: "none" }),
			_react2["default"].createElement("path", { d: "M16.24 7.76C15.07 6.59 13.54 6 12 6v6l-4.24 4.24c2.34 2.34 6.14 2.34 8.49 0 2.34-2.34 2.34-6.14-.01-8.48zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" })
		);
	};

	return TimelapseIcon;
}(_react.Component);

exports["default"] = TimelapseIcon;

/***/ }),
/* 468 */,
/* 469 */,
/* 470 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports["default"] = undefined;

var _humanizeDuration = __webpack_require__(191);

var _humanizeDuration2 = _interopRequireDefault(_humanizeDuration);

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Duration = function (_React$Component) {
	_inherits(Duration, _React$Component);

	function Duration() {
		_classCallCheck(this, Duration);

		return _possibleConstructorReturn(this, _React$Component.apply(this, arguments));
	}

	Duration.prototype.render = function render() {
		var _props = this.props,
		    start = _props.start,
		    finished = _props.finished;


		return _react2["default"].createElement(
			"time",
			null,
			(0, _humanizeDuration2["default"])((finished - start) * 1000)
		);
	};

	return Duration;
}(_react2["default"].Component);

exports["default"] = Duration;

/***/ }),
/* 471 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(472);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(4)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../node_modules/css-loader/index.js??ref--2!../../../node_modules/less-loader/dist/cjs.js!./build_time.less", function() {
			var newContent = require("!!../../../node_modules/css-loader/index.js??ref--2!../../../node_modules/less-loader/dist/cjs.js!./build_time.less");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 472 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(3)(undefined);
// imports


// module
exports.push([module.i, ".build_time__host___32Jg0 svg {\n  width: 16px;\n  height: 16px;\n}\n.build_time__row___272jD {\n  display: flex;\n}\n.build_time__row___272jD :first-child {\n  display: flex;\n  align-items: center;\n  margin-right: 5px;\n}\n.build_time__row___272jD :last-child {\n  flex: 1;\n  line-height: 24px;\n  font-size: 14px;\n  white-space: nowrap;\n}\n", ""]);

// exports
exports.locals = {
	"host": "build_time__host___32Jg0",
	"row": "build_time__row___272jD"
};

/***/ }),
/* 473 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(474);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(4)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../node_modules/css-loader/index.js??ref--2!../../../../node_modules/less-loader/dist/cjs.js!./list.less", function() {
			var newContent = require("!!../../../../node_modules/css-loader/index.js??ref--2!../../../../node_modules/less-loader/dist/cjs.js!./list.less");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 474 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(3)(undefined);
// imports


// module
exports.push([module.i, ".list__text-ellipsis___2-4iQ {\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n.list__list___cBf8h a {\n  display: block;\n  border-top: 1px solid #eceff1;\n  text-decoration: none;\n  color: #212121;\n}\n.list__list___cBf8h a:first-of-type {\n  border-top-width: 0px;\n}\n.list__item___2JUrT {\n  display: flex;\n  flex-direction: column;\n  padding: 20px;\n  text-decoration: none;\n}\n.list__item___2JUrT .list__header___NFMk4 {\n  margin-bottom: 10px;\n  display: flex;\n}\n.list__item___2JUrT .list__title___2iExW {\n  font-size: 15px;\n  line-height: 22px;\n  color: #212121;\n  flex: 1 1 auto;\n  max-width: 250px;\n  padding-right: 20px;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n.list__item___2JUrT .list__body___2DxG7 div time {\n  font-size: 13px !important;\n  color: #212121;\n}\n.list__item___2JUrT .list__body___2DxG7 time {\n  color: #212121;\n  font-size: 13px;\n  line-height: 22px;\n  vertical-align: middle;\n  display: inline-block;\n  padding: 0px;\n  margin: 0px;\n}\n.list__item___2JUrT .list__body___2DxG7 svg {\n  fill: #212121;\n  vertical-align: middle;\n  margin-right: 10px;\n  line-height: 22px;\n}\n", ""]);

// exports
exports.locals = {
	"text-ellipsis": "list__text-ellipsis___2-4iQ",
	"list": "list__list___cBf8h",
	"item": "list__item___2JUrT",
	"header": "list__header___NFMk4",
	"title": "list__title___2iExW",
	"body": "list__body___2DxG7"
};

/***/ }),
/* 475 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(476);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(4)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../node_modules/css-loader/index.js??ref--2!../../../node_modules/less-loader/dist/cjs.js!./index.less", function() {
			var newContent = require("!!../../../node_modules/css-loader/index.js??ref--2!../../../node_modules/less-loader/dist/cjs.js!./index.less");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 476 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(3)(undefined);
// imports


// module
exports.push([module.i, ".index__feed___3Qss3 {\n  width: 300px;\n}\n.index__feed___3Qss3 input {\n  border: none;\n  width: 100%;\n  box-sizing: border-box;\n  outline: none;\n  line-height: 45px;\n  line-height: 24px;\n  height: 45px;\n  font-size: 15px;\n  padding: 0px 20px;\n  border-bottom: 1px solid #eceff1;\n}\n.index__feed___3Qss3 ::-moz-input-placeholder {\n  color: #bdbdbd;\n  font-weight: 300;\n  font-size: 15px;\n}\n.index__feed___3Qss3 ::-webkit-input-placeholder {\n  color: #bdbdbd;\n  font-weight: 300;\n  font-size: 15px;\n}\n.index__message___3JCC5 {\n  padding: 20px;\n  color: #bdbdbd;\n  font-size: 15px;\n  margin-top: 50px;\n  text-align: center;\n}\n.index__brand___2NR6b {\n  height: 60px;\n  padding: 0px 20px;\n  box-sizing: border-box;\n  border-bottom: 1px solid #eceff1;\n  display: flex;\n  align-items: center;\n}\n.index__brand___2NR6b svg {\n  width: 30px;\n  fill: #212121;\n}\n", ""]);

// exports
exports.locals = {
	"feed": "index__feed___3Qss3",
	"message": "index__message___3JCC5",
	"brand": "index__brand___2NR6b"
};

/***/ }),
/* 477 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports["default"] = undefined;

var _dec, _class;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _repository = __webpack_require__(23);

var _registry = __webpack_require__(478);

var _higherOrder = __webpack_require__(16);

var _inject = __webpack_require__(22);

var _components = __webpack_require__(479);

var _index = __webpack_require__(486);

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var binding = function binding(props, context) {
	var _props$match$params = props.match.params,
	    owner = _props$match$params.owner,
	    repo = _props$match$params.repo;

	var slug = (0, _repository.repositorySlug)(owner, repo);
	return {
		loaded: ["registry", "loaded"],
		registries: ["registry", "data", slug]
	};
};

var RepoRegistry = (_dec = (0, _higherOrder.branch)(binding), (0, _inject.inject)(_class = _dec(_class = function (_Component) {
	_inherits(RepoRegistry, _Component);

	function RepoRegistry(props, context) {
		_classCallCheck(this, RepoRegistry);

		var _this = _possibleConstructorReturn(this, _Component.call(this, props, context));

		_this.handleDelete = _this.handleDelete.bind(_this);
		_this.handleSave = _this.handleSave.bind(_this);
		return _this;
	}

	RepoRegistry.prototype.shouldComponentUpdate = function shouldComponentUpdate(nextProps, nextState) {
		return this.props.registries !== nextProps.registries;
	};

	RepoRegistry.prototype.componentWillMount = function componentWillMount() {
		var _props = this.props,
		    dispatch = _props.dispatch,
		    drone = _props.drone,
		    match = _props.match;
		var _match$params = match.params,
		    owner = _match$params.owner,
		    repo = _match$params.repo;

		dispatch(_registry.fetchRegistryList, drone, owner, repo);
	};

	RepoRegistry.prototype.handleSave = function handleSave(e) {
		var _props2 = this.props,
		    dispatch = _props2.dispatch,
		    drone = _props2.drone,
		    match = _props2.match;
		var _match$params2 = match.params,
		    owner = _match$params2.owner,
		    repo = _match$params2.repo;

		var registry = {
			address: e.detail.address,
			username: e.detail.username,
			password: e.detail.password
		};

		dispatch(_registry.createRegistry, drone, owner, repo, registry);
	};

	RepoRegistry.prototype.handleDelete = function handleDelete(registry) {
		var _props3 = this.props,
		    dispatch = _props3.dispatch,
		    drone = _props3.drone,
		    match = _props3.match;
		var _match$params3 = match.params,
		    owner = _match$params3.owner,
		    repo = _match$params3.repo;

		dispatch(_registry.deleteRegistry, drone, owner, repo, registry.address);
	};

	RepoRegistry.prototype.render = function render() {
		var _props4 = this.props,
		    registries = _props4.registries,
		    loaded = _props4.loaded;


		if (!loaded) {
			return LOADING;
		}

		return _react2["default"].createElement(
			"div",
			{ className: _index2["default"].root },
			_react2["default"].createElement(
				"div",
				{ className: _index2["default"].left },
				Object.keys(registries || {}).length === 0 ? EMPTY : undefined,
				_react2["default"].createElement(
					_components.List,
					null,
					Object.values(registries || {}).map(renderRegistry.bind(this))
				)
			),
			_react2["default"].createElement(
				"div",
				{ className: _index2["default"].right },
				_react2["default"].createElement(_components.Form, { onsubmit: this.handleSave })
			)
		);
	};

	return RepoRegistry;
}(_react.Component)) || _class) || _class);
exports["default"] = RepoRegistry;


function renderRegistry(registry) {
	return _react2["default"].createElement(_components.Item, {
		name: registry.address,
		ondelete: this.handleDelete.bind(this, registry)
	});
}

var LOADING = _react2["default"].createElement(
	"div",
	{ className: _index2["default"].loading },
	"Loading"
);

var EMPTY = _react2["default"].createElement(
	"div",
	{ className: _index2["default"].empty },
	"There are no registry credentials for this repository."
);

/***/ }),
/* 478 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports.deleteRegistry = exports.createRegistry = exports.fetchRegistryList = undefined;

var _message = __webpack_require__(68);

var _repository = __webpack_require__(23);

/**
 * Get the registry list for the named repository and
 * store the results in the state tree.
 *
 * @param {Object} tree - The drone state tree.
 * @param {Object} client - The drone client.
 * @param {string} owner - The repository owner.
 * @param {string} name - The repository name.
 */
var fetchRegistryList = exports.fetchRegistryList = function fetchRegistryList(tree, client, owner, name) {
	var slug = (0, _repository.repositorySlug)(owner, name);

	tree.unset(["registry", "loaded"]);
	tree.unset(["registry", "error"]);

	client.getRegistryList(owner, name).then(function (results) {
		var list = {};
		results.map(function (registry) {
			list[registry.address] = registry;
		});
		tree.set(["registry", "data", slug], list);
		tree.set(["registry", "loaded"], true);
	});
};

/**
 * Create the registry credentials for the named repository
 * and if successful, store the result in the state tree.
 *
 * @param {Object} tree - The drone state tree.
 * @param {Object} client - The drone client.
 * @param {string} owner - The repository owner.
 * @param {string} name - The repository name.
 * @param {Object} registry - The registry hostname.
 */
var createRegistry = exports.createRegistry = function createRegistry(tree, client, owner, name, registry) {
	var slug = (0, _repository.repositorySlug)(owner, name);

	client.createRegistry(owner, name, registry).then(function (result) {
		tree.set(["registry", "data", slug, registry.address], result);
		(0, _message.displayMessage)(tree, "Successfully stored the registry credentials");
	})["catch"](function () {
		(0, _message.displayMessage)(tree, "Failed to store the registry credentials");
	});
};

/**
 * Delete the registry credentials for the named repository
 * and if successful, remove from the state tree.
 *
 * @param {Object} tree - The drone state tree.
 * @param {Object} client - The drone client.
 * @param {string} owner - The repository owner.
 * @param {string} name - The repository name.
 * @param {Object} registry - The registry hostname.
 */
var deleteRegistry = exports.deleteRegistry = function deleteRegistry(tree, client, owner, name, registry) {
	var slug = (0, _repository.repositorySlug)(owner, name);

	client.deleteRegistry(owner, name, registry).then(function (result) {
		tree.unset(["registry", "data", slug, registry]);
		(0, _message.displayMessage)(tree, "Successfully deleted the registry credentials");
	})["catch"](function () {
		(0, _message.displayMessage)(tree, "Failed to delete the registry credentials");
	});
};

/***/ }),
/* 479 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports.Item = exports.List = exports.Form = undefined;

var _form = __webpack_require__(480);

var _list = __webpack_require__(483);

exports.Form = _form.Form;
exports.List = _list.List;
exports.Item = _list.Item;

/***/ }),
/* 480 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports.Form = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _form = __webpack_require__(481);

var _form2 = _interopRequireDefault(_form);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Form = exports.Form = function (_Component) {
	_inherits(Form, _Component);

	function Form(props, context) {
		_classCallCheck(this, Form);

		var _this = _possibleConstructorReturn(this, _Component.call(this, props, context));

		_this.state = {
			address: "",
			username: "",
			password: ""
		};

		_this._handleAddressChange = _this._handleAddressChange.bind(_this);
		_this._handleUsernameChange = _this._handleUsernameChange.bind(_this);
		_this._handlePasswordChange = _this._handlePasswordChange.bind(_this);
		_this._handleSubmit = _this._handleSubmit.bind(_this);

		_this.clear = _this.clear.bind(_this);
		return _this;
	}

	Form.prototype._handleAddressChange = function _handleAddressChange(event) {
		this.setState({ address: event.target.value });
	};

	Form.prototype._handleUsernameChange = function _handleUsernameChange(event) {
		this.setState({ username: event.target.value });
	};

	Form.prototype._handlePasswordChange = function _handlePasswordChange(event) {
		this.setState({ password: event.target.value });
	};

	Form.prototype._handleSubmit = function _handleSubmit() {
		var onsubmit = this.props.onsubmit;


		var detail = {
			address: this.state.address,
			username: this.state.username,
			password: this.state.password
		};

		onsubmit({ detail: detail });
		this.clear();
	};

	Form.prototype.clear = function clear() {
		this.setState({ address: "" });
		this.setState({ username: "" });
		this.setState({ password: "" });
	};

	Form.prototype.render = function render() {
		return _react2["default"].createElement(
			"div",
			{ className: _form2["default"].form },
			_react2["default"].createElement("input", {
				type: "text",
				value: this.state.address,
				onChange: this._handleAddressChange,
				placeholder: "Registry Address (e.g. docker.io)"
			}),
			_react2["default"].createElement("input", {
				type: "text",
				value: this.state.username,
				onChange: this._handleUsernameChange,
				placeholder: "Registry Username"
			}),
			_react2["default"].createElement("textarea", {
				rows: "1",
				value: this.state.password,
				onChange: this._handlePasswordChange,
				placeholder: "Registry Password"
			}),
			_react2["default"].createElement(
				"div",
				{ className: _form2["default"].actions },
				_react2["default"].createElement(
					"button",
					{ onClick: this._handleSubmit },
					"Save"
				)
			)
		);
	};

	return Form;
}(_react.Component);

/***/ }),
/* 481 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(482);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(4)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../../node_modules/css-loader/index.js??ref--2!../../../../../../node_modules/less-loader/dist/cjs.js!./form.less", function() {
			var newContent = require("!!../../../../../../node_modules/css-loader/index.js??ref--2!../../../../../../node_modules/less-loader/dist/cjs.js!./form.less");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 482 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(3)(undefined);
// imports


// module
exports.push([module.i, ".form__form___3RD00 input {\n  border: 1px solid #eceff1;\n  display: block;\n  width: 100%;\n  box-sizing: border-box;\n  outline: none;\n  padding: 10px;\n  margin-bottom: 20px;\n}\n.form__form___3RD00 input:focus {\n  border: 1px solid #212121;\n}\n.form__form___3RD00 textarea {\n  box-sizing: border-box;\n  border: 1px solid #eceff1;\n  display: block;\n  width: 100%;\n  outline: none;\n  padding: 10px;\n  margin-bottom: 20px;\n  height: 100px;\n}\n.form__form___3RD00 textarea:focus {\n  border: 1px solid #212121;\n}\n.form__form___3RD00 .form__actions___lpw6T {\n  text-align: right;\n}\n.form__form___3RD00 button {\n  outline: none;\n  color: #212121;\n  border: 1px solid #212121;\n  background: #fff;\n  line-height: 28px;\n  padding: 0px 20px;\n  font-family: \"Roboto\";\n  user-select: none;\n  font-size: 14px;\n  text-transform: uppercase;\n  border-radius: 2px;\n  cursor: pointer;\n}\n.form__form___3RD00 ::-moz-input-placeholder {\n  color: #bdbdbd;\n  font-weight: 300;\n  font-size: 15px;\n  user-select: none;\n}\n.form__form___3RD00 ::-webkit-input-placeholder {\n  color: #bdbdbd;\n  font-weight: 300;\n  font-size: 15px;\n  user-select: none;\n}\n", ""]);

// exports
exports.locals = {
	"form": "form__form___3RD00",
	"actions": "form__actions___lpw6T"
};

/***/ }),
/* 483 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports.Item = exports.List = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _list = __webpack_require__(484);

var _list2 = _interopRequireDefault(_list);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var List = exports.List = function List(_ref) {
	var children = _ref.children;
	return _react2["default"].createElement(
		"div",
		{ className: _list2["default"].list },
		children
	);
};

var Item = exports.Item = function Item(props) {
	return _react2["default"].createElement(
		"div",
		{ className: _list2["default"].item, key: props.name },
		_react2["default"].createElement(
			"div",
			null,
			props.name
		),
		_react2["default"].createElement(
			"div",
			null,
			_react2["default"].createElement(
				"button",
				{ onClick: props.ondelete },
				"delete"
			)
		)
	);
};

/***/ }),
/* 484 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(485);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(4)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../../node_modules/css-loader/index.js??ref--2!../../../../../../node_modules/less-loader/dist/cjs.js!./list.less", function() {
			var newContent = require("!!../../../../../../node_modules/css-loader/index.js??ref--2!../../../../../../node_modules/less-loader/dist/cjs.js!./list.less");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 485 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(3)(undefined);
// imports


// module
exports.push([module.i, ".list__item___1YjPk {\n  display: flex;\n  border-bottom: 1px solid #eceff1;\n  padding: 10px 10px;\n  padding-bottom: 20px;\n}\n.list__item___1YjPk:last-child {\n  border-bottom: none;\n}\n.list__item___1YjPk:first-child {\n  padding-top: 0px;\n}\n.list__item___1YjPk > div:first-child {\n  flex: 1 1 auto;\n  line-height: 24px;\n  font-size: 15px;\n  text-transform: lowercase;\n  line-height: 32px;\n}\n.list__item___1YjPk > div:last-child {\n  text-align: right;\n  display: flex;\n  align-content: stretch;\n  justify-content: center;\n  flex-direction: column;\n}\n.list__item___1YjPk button {\n  background: #fff;\n  color: #fc4758;\n  border: 1px solid #fc4758;\n  text-decoration: none;\n  text-align: center;\n  border-radius: 2px;\n  text-transform: uppercase;\n  font-size: 13px;\n  padding: 2px 10px;\n  display: block;\n  cursor: pointer;\n}\n", ""]);

// exports
exports.locals = {
	"item": "list__item___1YjPk"
};

/***/ }),
/* 486 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(487);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(4)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2!../../../../../node_modules/less-loader/dist/cjs.js!./index.less", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2!../../../../../node_modules/less-loader/dist/cjs.js!./index.less");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 487 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(3)(undefined);
// imports


// module
exports.push([module.i, ".index__root___oxkm9 {\n  padding: 20px;\n  display: flex;\n}\n.index__left___2DYQ8 {\n  flex: 1;\n  margin-right: 20px;\n}\n.index__right___3Xvp5 {\n  flex: 1;\n  border-left: 1px solid #eceff1;\n  padding-left: 20px;\n  padding-top: 10px;\n}\n@media (max-width: 960px) {\n  .index__root___oxkm9 {\n    flex-direction: column;\n  }\n  .index__list___2jks5 {\n    margin-right: 0px;\n  }\n  .index__right___3Xvp5 {\n    border-left: none;\n    padding-left: 0px;\n    padding-top: 20px;\n  }\n}\n", ""]);

// exports
exports.locals = {
	"root": "index__root___oxkm9",
	"left": "index__left___2DYQ8",
	"right": "index__right___3Xvp5",
	"list": "index__list___2jks5"
};

/***/ }),
/* 488 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports["default"] = undefined;

var _dec, _class;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _repository = __webpack_require__(23);

var _events = __webpack_require__(192);

var _secrets = __webpack_require__(489);

var _higherOrder = __webpack_require__(16);

var _inject = __webpack_require__(22);

var _components = __webpack_require__(490);

var _index = __webpack_require__(497);

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var binding = function binding(props, context) {
	var _props$match$params = props.match.params,
	    owner = _props$match$params.owner,
	    repo = _props$match$params.repo;

	var slug = (0, _repository.repositorySlug)(owner, repo);
	return {
		loaded: ["secrets", "loaded"],
		secrets: ["secrets", "data", slug]
	};
};

var RepoSecrets = (_dec = (0, _higherOrder.branch)(binding), (0, _inject.inject)(_class = _dec(_class = function (_Component) {
	_inherits(RepoSecrets, _Component);

	function RepoSecrets(props, context) {
		_classCallCheck(this, RepoSecrets);

		var _this = _possibleConstructorReturn(this, _Component.call(this, props, context));

		_this.handleSave = _this.handleSave.bind(_this);
		return _this;
	}

	RepoSecrets.prototype.shouldComponentUpdate = function shouldComponentUpdate(nextProps, nextState) {
		return this.props.secrets !== nextProps.secrets;
	};

	RepoSecrets.prototype.componentWillMount = function componentWillMount() {
		var _props$match$params2 = this.props.match.params,
		    owner = _props$match$params2.owner,
		    repo = _props$match$params2.repo;

		this.props.dispatch(_secrets.fetchSecretList, this.props.drone, owner, repo);
	};

	RepoSecrets.prototype.handleSave = function handleSave(e) {
		var _props = this.props,
		    dispatch = _props.dispatch,
		    drone = _props.drone,
		    match = _props.match;
		var _match$params = match.params,
		    owner = _match$params.owner,
		    repo = _match$params.repo;

		var secret = {
			name: e.detail.name,
			value: e.detail.value,
			event: [_events.EVENT_PUSH, _events.EVENT_TAG, _events.EVENT_DEPLOY]
		};

		dispatch(_secrets.createSecret, drone, owner, repo, secret);
	};

	RepoSecrets.prototype.handleDelete = function handleDelete(secret) {
		var _props2 = this.props,
		    dispatch = _props2.dispatch,
		    drone = _props2.drone,
		    match = _props2.match;
		var _match$params2 = match.params,
		    owner = _match$params2.owner,
		    repo = _match$params2.repo;

		dispatch(_secrets.deleteSecret, drone, owner, repo, secret.name);
	};

	RepoSecrets.prototype.render = function render() {
		var _props3 = this.props,
		    secrets = _props3.secrets,
		    loaded = _props3.loaded;


		if (!loaded) {
			return LOADING;
		}

		return _react2["default"].createElement(
			"div",
			{ className: _index2["default"].root },
			_react2["default"].createElement(
				"div",
				{ className: _index2["default"].left },
				Object.keys(secrets || {}).length === 0 ? EMPTY : undefined,
				_react2["default"].createElement(
					_components.List,
					null,
					Object.values(secrets || {}).map(renderSecret.bind(this))
				)
			),
			_react2["default"].createElement(
				"div",
				{ className: _index2["default"].right },
				_react2["default"].createElement(_components.Form, { onsubmit: this.handleSave })
			)
		);
	};

	return RepoSecrets;
}(_react.Component)) || _class) || _class);
exports["default"] = RepoSecrets;


function renderSecret(secret) {
	return _react2["default"].createElement(_components.Item, {
		name: secret.name,
		event: secret.event,
		ondelete: this.handleDelete.bind(this, secret)
	});
}

var LOADING = _react2["default"].createElement(
	"div",
	{ className: _index2["default"].loading },
	"Loading"
);

var EMPTY = _react2["default"].createElement(
	"div",
	{ className: _index2["default"].empty },
	"There are no secrets for this repository."
);

/***/ }),
/* 489 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports.deleteSecret = exports.createSecret = exports.fetchSecretList = undefined;

var _message = __webpack_require__(68);

var _repository = __webpack_require__(23);

/**
 * Get the secret list for the named repository and
 * store the results in the state tree.
 *
 * @param {Object} tree - The drone state tree.
 * @param {Object} client - The drone client.
 * @param {string} owner - The repository owner.
 * @param {string} name - The repository name.
 */
var fetchSecretList = exports.fetchSecretList = function fetchSecretList(tree, client, owner, name) {
	var slug = (0, _repository.repositorySlug)(owner, name);

	tree.unset(["secrets", "loaded"]);
	tree.unset(["secrets", "error"]);

	client.getSecretList(owner, name).then(function (results) {
		var list = {};
		results.map(function (secret) {
			list[secret.name] = secret;
		});
		tree.set(["secrets", "data", slug], list);
		tree.set(["secrets", "loaded"], true);
	});
};

/**
 * Create the named repository secret and if successful
 * store the result in the state tree.
 *
 * @param {Object} tree - The drone state tree.
 * @param {Object} client - The drone client.
 * @param {string} owner - The repository owner.
 * @param {string} name - The repository name.
 * @param {Object} secret - The secret object.
 */
var createSecret = exports.createSecret = function createSecret(tree, client, owner, name, secret) {
	var slug = (0, _repository.repositorySlug)(owner, name);

	client.createSecret(owner, name, secret).then(function (result) {
		tree.set(["secrets", "data", slug, secret.name], result);
		(0, _message.displayMessage)(tree, "Successfully added the secret");
	})["catch"](function () {
		(0, _message.displayMessage)(tree, "Failed to create the secret");
	});
};

/**
 * Delete the named repository secret from the server and
 * remove from the state tree.
 *
 * @param {Object} tree - The drone state tree.
 * @param {Object} client - The drone client.
 * @param {string} owner - The repository owner.
 * @param {string} name - The repository name.
 * @param {string} secret - The secret name.
 */
var deleteSecret = exports.deleteSecret = function deleteSecret(tree, client, owner, name, secret) {
	var slug = (0, _repository.repositorySlug)(owner, name);

	client.deleteSecret(owner, name, secret).then(function (result) {
		tree.unset(["secrets", "data", slug, secret]);
		(0, _message.displayMessage)(tree, "Successfully removed the secret");
	})["catch"](function () {
		(0, _message.displayMessage)(tree, "Failed to remove the secret");
	});
};

/***/ }),
/* 490 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports.Item = exports.List = exports.Form = undefined;

var _form = __webpack_require__(491);

var _list = __webpack_require__(494);

exports.Form = _form.Form;
exports.List = _list.List;
exports.Item = _list.Item;

/***/ }),
/* 491 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports.Form = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _form = __webpack_require__(492);

var _form2 = _interopRequireDefault(_form);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Form = exports.Form = function (_Component) {
	_inherits(Form, _Component);

	function Form(props, context) {
		_classCallCheck(this, Form);

		var _this = _possibleConstructorReturn(this, _Component.call(this, props, context));

		_this.state = {
			name: "",
			value: ""
		};

		_this._handleNameChange = _this._handleNameChange.bind(_this);
		_this._handleValueChange = _this._handleValueChange.bind(_this);
		_this._handleSubmit = _this._handleSubmit.bind(_this);

		_this.clear = _this.clear.bind(_this);
		return _this;
	}

	Form.prototype._handleNameChange = function _handleNameChange(event) {
		this.setState({ name: event.target.value });
	};

	Form.prototype._handleValueChange = function _handleValueChange(event) {
		this.setState({ value: event.target.value });
	};

	Form.prototype._handleSubmit = function _handleSubmit() {
		var onsubmit = this.props.onsubmit;


		var detail = {
			name: this.state.name,
			value: this.state.value
		};

		onsubmit({ detail: detail });
		this.clear();
	};

	Form.prototype.clear = function clear() {
		this.setState({ name: "" });
		this.setState({ value: "" });
	};

	Form.prototype.render = function render() {
		return _react2["default"].createElement(
			"div",
			{ className: _form2["default"].form },
			_react2["default"].createElement("input", {
				type: "text",
				name: "name",
				value: this.state.name,
				placeholder: "Secret Name",
				onChange: this._handleNameChange
			}),
			_react2["default"].createElement("textarea", {
				rows: "1",
				name: "value",
				value: this.state.value,
				placeholder: "Secret Value",
				onChange: this._handleValueChange
			}),
			_react2["default"].createElement(
				"div",
				{ className: _form2["default"].actions },
				_react2["default"].createElement(
					"button",
					{ onClick: this._handleSubmit },
					"Save"
				)
			)
		);
	};

	return Form;
}(_react.Component);

/***/ }),
/* 492 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(493);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(4)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../../node_modules/css-loader/index.js??ref--2!../../../../../../node_modules/less-loader/dist/cjs.js!./form.less", function() {
			var newContent = require("!!../../../../../../node_modules/css-loader/index.js??ref--2!../../../../../../node_modules/less-loader/dist/cjs.js!./form.less");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 493 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(3)(undefined);
// imports


// module
exports.push([module.i, ".form__form___1kGPu input {\n  border: 1px solid #eceff1;\n  display: block;\n  width: 100%;\n  box-sizing: border-box;\n  outline: none;\n  padding: 10px;\n  margin-bottom: 20px;\n}\n.form__form___1kGPu input:focus {\n  border: 1px solid #212121;\n}\n.form__form___1kGPu textarea {\n  box-sizing: border-box;\n  border: 1px solid #eceff1;\n  display: block;\n  width: 100%;\n  outline: none;\n  padding: 10px;\n  margin-bottom: 20px;\n  height: 100px;\n}\n.form__form___1kGPu textarea:focus {\n  border: 1px solid #212121;\n}\n.form__form___1kGPu .form__actions___3bHSZ {\n  text-align: right;\n}\n.form__form___1kGPu button {\n  outline: none;\n  color: #212121;\n  border: 1px solid #212121;\n  background: #fff;\n  line-height: 28px;\n  padding: 0px 20px;\n  font-family: \"Roboto\";\n  user-select: none;\n  font-size: 14px;\n  text-transform: uppercase;\n  border-radius: 2px;\n  cursor: pointer;\n}\n.form__form___1kGPu ::-moz-input-placeholder {\n  color: #bdbdbd;\n  font-weight: 300;\n  font-size: 15px;\n  user-select: none;\n}\n.form__form___1kGPu ::-webkit-input-placeholder {\n  color: #bdbdbd;\n  font-weight: 300;\n  font-size: 15px;\n  user-select: none;\n}\n", ""]);

// exports
exports.locals = {
	"form": "form__form___1kGPu",
	"actions": "form__actions___3bHSZ"
};

/***/ }),
/* 494 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports.Item = exports.List = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _list = __webpack_require__(495);

var _list2 = _interopRequireDefault(_list);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var List = exports.List = function List(_ref) {
	var children = _ref.children;
	return _react2["default"].createElement(
		"div",
		{ className: _list2["default"].list },
		children
	);
};

var Item = exports.Item = function Item(props) {
	return _react2["default"].createElement(
		"div",
		{ className: _list2["default"].item, key: props.name },
		_react2["default"].createElement(
			"div",
			null,
			props.name,
			_react2["default"].createElement(
				"ul",
				null,
				props.event ? props.event.map(renderEvent) : null
			)
		),
		_react2["default"].createElement(
			"div",
			null,
			_react2["default"].createElement(
				"button",
				{ onClick: props.ondelete },
				"delete"
			)
		)
	);
};

var renderEvent = function renderEvent(event) {
	return _react2["default"].createElement(
		"li",
		null,
		event
	);
};

/***/ }),
/* 495 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(496);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(4)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../../node_modules/css-loader/index.js??ref--2!../../../../../../node_modules/less-loader/dist/cjs.js!./list.less", function() {
			var newContent = require("!!../../../../../../node_modules/css-loader/index.js??ref--2!../../../../../../node_modules/less-loader/dist/cjs.js!./list.less");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 496 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(3)(undefined);
// imports


// module
exports.push([module.i, ".list__item___2UxWB {\n  display: flex;\n  border-bottom: 1px solid #eceff1;\n  padding: 10px 10px;\n  padding-bottom: 20px;\n}\n.list__item___2UxWB:last-child {\n  border-bottom: none;\n}\n.list__item___2UxWB:first-child {\n  padding-top: 0px;\n}\n.list__item___2UxWB > div:first-child {\n  flex: 1 1 auto;\n  line-height: 24px;\n  font-size: 15px;\n  text-transform: lowercase;\n  line-height: 32px;\n}\n.list__item___2UxWB > div:last-child {\n  text-align: right;\n  display: flex;\n  align-content: stretch;\n  justify-content: center;\n  flex-direction: column;\n}\n.list__item___2UxWB button {\n  background: #fff;\n  color: #fc4758;\n  border: 1px solid #fc4758;\n  text-decoration: none;\n  text-align: center;\n  border-radius: 2px;\n  text-transform: uppercase;\n  font-size: 13px;\n  padding: 2px 10px;\n  display: block;\n  cursor: pointer;\n}\n.list__item___2UxWB ul {\n  padding: 0px;\n  margin: 0px;\n  list-style: none;\n  line-height: 0px;\n}\n.list__item___2UxWB li {\n  display: inline-block;\n  background: #eceff1;\n  color: #212121;\n  padding: 0px 10px;\n  border-radius: 2px;\n  margin-right: 2px;\n  font-size: 12px;\n  line-height: 20px;\n  text-transform: uppercase;\n  margin-bottom: 2px;\n}\n", ""]);

// exports
exports.locals = {
	"item": "list__item___2UxWB"
};

/***/ }),
/* 497 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(498);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(4)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2!../../../../../node_modules/less-loader/dist/cjs.js!./index.less", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2!../../../../../node_modules/less-loader/dist/cjs.js!./index.less");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 498 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(3)(undefined);
// imports


// module
exports.push([module.i, ".index__root___CCLj7 {\n  padding: 20px;\n  display: flex;\n}\n.index__left___3jhr9 {\n  flex: 1;\n  margin-right: 20px;\n}\n.index__right___eV2Ss {\n  flex: 1;\n  border-left: 1px solid #eceff1;\n  padding-left: 20px;\n  padding-top: 10px;\n}\n@media (max-width: 960px) {\n  .index__root___CCLj7 {\n    flex-direction: column;\n  }\n  .index__list___1Fvht {\n    margin-right: 0px;\n  }\n  .index__right___eV2Ss {\n    border-left: none;\n    padding-left: 0px;\n    padding-top: 20px;\n  }\n}\n", ""]);

// exports
exports.locals = {
	"root": "index__root___CCLj7",
	"left": "index__left___3jhr9",
	"right": "index__right___eV2Ss",
	"list": "index__list___1Fvht"
};

/***/ }),
/* 499 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports["default"] = undefined;

var _dec, _class;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _higherOrder = __webpack_require__(16);

var _inject = __webpack_require__(22);

var _repository = __webpack_require__(23);

var _visibility = __webpack_require__(500);

var _index = __webpack_require__(501);

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var binding = function binding(props, context) {
	var _props$match$params = props.match.params,
	    owner = _props$match$params.owner,
	    repo = _props$match$params.repo;

	var slug = (0, _repository.repositorySlug)(owner, repo);
	return {
		user: ["user", "data"],
		repo: ["repos", "data", slug]
	};
};

var Settings = (_dec = (0, _higherOrder.branch)(binding), (0, _inject.inject)(_class = _dec(_class = function (_Component) {
	_inherits(Settings, _Component);

	function Settings(props, context) {
		_classCallCheck(this, Settings);

		var _this = _possibleConstructorReturn(this, _Component.call(this, props, context));

		_this.handlePushChange = _this.handlePushChange.bind(_this);
		_this.handlePullChange = _this.handlePullChange.bind(_this);
		_this.handleTagChange = _this.handleTagChange.bind(_this);
		_this.handleDeployChange = _this.handleDeployChange.bind(_this);
		_this.handleTrustedChange = _this.handleTrustedChange.bind(_this);
		_this.handleProtectedChange = _this.handleProtectedChange.bind(_this);
		_this.handleVisibilityChange = _this.handleVisibilityChange.bind(_this);
		_this.handleTimeoutChange = _this.handleTimeoutChange.bind(_this);
		_this.handleChange = _this.handleChange.bind(_this);
		return _this;
	}

	Settings.prototype.shouldComponentUpdate = function shouldComponentUpdate(nextProps, nextState) {
		return this.props.repo !== nextProps.repo;
	};

	Settings.prototype.componentWillMount = function componentWillMount() {
		var _props = this.props,
		    drone = _props.drone,
		    dispatch = _props.dispatch,
		    match = _props.match,
		    repo = _props.repo;


		if (!repo) {
			dispatch(_repository.fetchRepository, drone, match.params.owner, match.params.repo);
		}
	};

	Settings.prototype.render = function render() {
		var repo = this.props.repo;


		if (!repo) {
			return undefined;
		}

		return _react2["default"].createElement(
			"div",
			{ className: _index2["default"].root },
			_react2["default"].createElement(
				"section",
				null,
				_react2["default"].createElement(
					"h2",
					null,
					"Repository Hooks"
				),
				_react2["default"].createElement(
					"div",
					null,
					_react2["default"].createElement(
						"label",
						null,
						_react2["default"].createElement("input", {
							type: "checkbox",
							checked: repo.allow_push,
							onChange: this.handlePushChange
						}),
						_react2["default"].createElement(
							"span",
							null,
							"push"
						)
					),
					_react2["default"].createElement(
						"label",
						null,
						_react2["default"].createElement("input", {
							type: "checkbox",
							checked: repo.allow_pr,
							onChange: this.handlePullChange
						}),
						_react2["default"].createElement(
							"span",
							null,
							"pull request"
						)
					),
					_react2["default"].createElement(
						"label",
						null,
						_react2["default"].createElement("input", {
							type: "checkbox",
							checked: repo.allow_tags,
							onChange: this.handleTagChange
						}),
						_react2["default"].createElement(
							"span",
							null,
							"tag"
						)
					),
					_react2["default"].createElement(
						"label",
						null,
						_react2["default"].createElement("input", {
							type: "checkbox",
							checked: repo.allow_deploys,
							onChange: this.handleDeployChange
						}),
						_react2["default"].createElement(
							"span",
							null,
							"deployment"
						)
					)
				)
			),
			_react2["default"].createElement(
				"section",
				null,
				_react2["default"].createElement(
					"h2",
					null,
					"Project Settings"
				),
				_react2["default"].createElement(
					"div",
					null,
					_react2["default"].createElement(
						"label",
						null,
						_react2["default"].createElement("input", {
							type: "checkbox",
							checked: repo.gated,
							onChange: this.handleProtectedChange
						}),
						_react2["default"].createElement(
							"span",
							null,
							"Protected"
						)
					),
					_react2["default"].createElement(
						"label",
						null,
						_react2["default"].createElement("input", {
							type: "checkbox",
							checked: repo.trusted,
							onChange: this.handleTrustedChange
						}),
						_react2["default"].createElement(
							"span",
							null,
							"Trusted"
						)
					)
				)
			),
			_react2["default"].createElement(
				"section",
				null,
				_react2["default"].createElement(
					"h2",
					null,
					"Project Visibility"
				),
				_react2["default"].createElement(
					"div",
					null,
					_react2["default"].createElement(
						"label",
						null,
						_react2["default"].createElement("input", {
							type: "radio",
							name: "visibility",
							value: "public",
							checked: repo.visibility === _visibility.VISIBILITY_PUBLIC,
							onChange: this.handleVisibilityChange
						}),
						_react2["default"].createElement(
							"span",
							null,
							"Public"
						)
					),
					_react2["default"].createElement(
						"label",
						null,
						_react2["default"].createElement("input", {
							type: "radio",
							name: "visibility",
							value: "private",
							checked: repo.visibility === _visibility.VISIBILITY_PRIVATE,
							onChange: this.handleVisibilityChange
						}),
						_react2["default"].createElement(
							"span",
							null,
							"Private"
						)
					),
					_react2["default"].createElement(
						"label",
						null,
						_react2["default"].createElement("input", {
							type: "radio",
							name: "visibility",
							value: "internal",
							checked: repo.visibility === _visibility.VISIBILITY_INTERNAL,
							onChange: this.handleVisibilityChange
						}),
						_react2["default"].createElement(
							"span",
							null,
							"Internal"
						)
					)
				)
			),
			_react2["default"].createElement(
				"section",
				null,
				_react2["default"].createElement(
					"h2",
					null,
					"Timeout"
				),
				_react2["default"].createElement(
					"div",
					null,
					_react2["default"].createElement("input", {
						type: "number",
						value: repo.timeout,
						onBlur: this.handleTimeoutChange
					}),
					_react2["default"].createElement(
						"span",
						{ className: _index2["default"].minutes },
						"minutes"
					)
				)
			)
		);
	};

	Settings.prototype.handlePushChange = function handlePushChange(e) {
		this.handleChange("allow_push", e.target.checked);
	};

	Settings.prototype.handlePullChange = function handlePullChange(e) {
		this.handleChange("allow_pr", e.target.checked);
	};

	Settings.prototype.handleTagChange = function handleTagChange(e) {
		this.handleChange("allow_tag", e.target.checked);
	};

	Settings.prototype.handleDeployChange = function handleDeployChange(e) {
		this.handleChange("allow_deploy", e.target.checked);
	};

	Settings.prototype.handleTrustedChange = function handleTrustedChange(e) {
		this.handleChange("trusted", e.target.checked);
	};

	Settings.prototype.handleProtectedChange = function handleProtectedChange(e) {
		this.handleChange("gated", e.target.checked);
	};

	Settings.prototype.handleVisibilityChange = function handleVisibilityChange(e) {
		this.handleChange("visibility", e.target.value);
	};

	Settings.prototype.handleTimeoutChange = function handleTimeoutChange(e) {
		this.handleChange("timeout", parseInt(e.target.value));
	};

	Settings.prototype.handleChange = function handleChange(prop, value) {
		var _props2 = this.props,
		    dispatch = _props2.dispatch,
		    drone = _props2.drone,
		    repo = _props2.repo;

		var data = {};
		data[prop] = value;
		dispatch(_repository.updateRepository, drone, repo.owner, repo.name, data);
	};

	return Settings;
}(_react.Component)) || _class) || _class);
exports["default"] = Settings;

/***/ }),
/* 500 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
var VISIBILITY_PUBLIC = "public";
var VISIBILITY_PRIVATE = "private";
var VISIBILITY_INTERNAL = "internal";

exports.VISIBILITY_PUBLIC = VISIBILITY_PUBLIC;
exports.VISIBILITY_PRIVATE = VISIBILITY_PRIVATE;
exports.VISIBILITY_INTERNAL = VISIBILITY_INTERNAL;

/***/ }),
/* 501 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(502);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(4)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2!../../../../../node_modules/less-loader/dist/cjs.js!./index.less", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2!../../../../../node_modules/less-loader/dist/cjs.js!./index.less");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 502 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(3)(undefined);
// imports


// module
exports.push([module.i, ".index__root___RrU4l {\n  padding: 20px;\n}\n.index__root___RrU4l section {\n  flex: 1 1 auto;\n  border-bottom: 1px solid #eceff1;\n  padding: 20px 10px;\n  display: flex;\n}\n.index__root___RrU4l section > div {\n  flex: 1;\n}\n.index__root___RrU4l section:first-child {\n  padding-top: 0px;\n}\n.index__root___RrU4l section:last-child {\n  border-bottom-width: 0px;\n}\n@media (max-width: 600px) {\n  .index__root___RrU4l section {\n    display: flex;\n    flex-direction: column;\n  }\n  .index__root___RrU4l section h2 {\n    margin-bottom: 20px;\n    flex: none;\n  }\n  .index__root___RrU4l section > :last-child {\n    padding-left: 20px;\n  }\n}\n.index__root___RrU4l h2 {\n  flex: 0 0 200px;\n  padding: 0px;\n  margin: 0px;\n  font-weight: normal;\n  font-size: 15px;\n  line-height: 26px;\n}\n.index__root___RrU4l label {\n  display: block;\n  padding: 0px;\n}\n.index__root___RrU4l label span {\n  font-size: 15px;\n}\n.index__root___RrU4l input[type=checkbox],\n.index__root___RrU4l input[type=radio] {\n  margin-right: 10px;\n}\n.index__root___RrU4l input[type=number] {\n  border: 1px solid #eceff1;\n  padding: 5px 10px;\n  font-size: 15px;\n  width: 50px;\n}\n.index__root___RrU4l .index__minutes___1dxvW {\n  margin-left: 5px;\n}\n", ""]);

// exports
exports.locals = {
	"root": "index__root___RrU4l",
	"minutes": "index__minutes___1dxvW"
};

/***/ }),
/* 503 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports["default"] = undefined;

var _dec, _class;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _reactRouterDom = __webpack_require__(30);

var _components = __webpack_require__(504);

var _build = __webpack_require__(128);

var _repository = __webpack_require__(23);

var _higherOrder = __webpack_require__(16);

var _inject = __webpack_require__(22);

var _index = __webpack_require__(512);

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var binding = function binding(props, context) {
	var _props$match$params = props.match.params,
	    owner = _props$match$params.owner,
	    repo = _props$match$params.repo;

	var slug = (0, _repository.repositorySlug)(owner, repo);
	return {
		repo: ["repos", "data", slug],
		builds: ["builds", "data", slug],
		loaded: ["builds", "loaded"],
		error: ["builds", "error"]
	};
};

var Main = (_dec = (0, _higherOrder.branch)(binding), (0, _inject.inject)(_class = _dec(_class = function (_Component) {
	_inherits(Main, _Component);

	function Main() {
		_classCallCheck(this, Main);

		return _possibleConstructorReturn(this, _Component.apply(this, arguments));
	}

	Main.prototype.componentWillMount = function componentWillMount() {
		this.synchronize(this.props);
	};

	Main.prototype.shouldComponentUpdate = function shouldComponentUpdate(nextProps, nextState) {
		return this.props.repo !== nextProps.repo || this.props.builds !== nextProps.builds || this.props.error !== nextProps.error || this.props.loaded !== nextProps.loaded;
	};

	Main.prototype.componentWillUpdate = function componentWillUpdate(nextProps) {
		if (this.props.match.url !== nextProps.match.url) {
			this.synchronize(nextProps);
		}
	};

	Main.prototype.componentDidUpdate = function componentDidUpdate(prevProps) {
		if (this.props.location !== prevProps.location) {
			window.scrollTo(0, 0);
		}
	};

	Main.prototype.synchronize = function synchronize(props) {
		var drone = props.drone,
		    dispatch = props.dispatch,
		    match = props.match,
		    repo = props.repo;


		if (!repo) {
			dispatch(_repository.fetchRepository, drone, match.params.owner, match.params.repo);
		}

		dispatch(_build.fetchBuildList, drone, match.params.owner, match.params.repo);
	};

	Main.prototype.render = function render() {
		var _props = this.props,
		    repo = _props.repo,
		    builds = _props.builds,
		    loaded = _props.loaded,
		    error = _props.error;

		var list = Object.values(builds || {});

		function renderBuild(build) {
			return _react2["default"].createElement(
				_reactRouterDom.Link,
				{ to: "/" + repo.full_name + "/" + build.number, key: build.number },
				_react2["default"].createElement(_components.Item, { build: build })
			);
		}

		if (error) {
			return _react2["default"].createElement(
				"div",
				null,
				"Not Found"
			);
		}

		if (!loaded && list.length === 0) {
			return _react2["default"].createElement(
				"div",
				null,
				"Loading"
			);
		}

		if (!repo) {
			return _react2["default"].createElement(
				"div",
				null,
				"Loading"
			);
		}

		if (list.length === 0) {
			return _react2["default"].createElement(
				"div",
				null,
				"Build list is empty"
			);
		}

		return _react2["default"].createElement(
			"div",
			{ className: _index2["default"].root },
			_react2["default"].createElement(
				_components.List,
				null,
				list.sort(_build.compareBuild).map(renderBuild)
			)
		);
	};

	return Main;
}(_react.Component)) || _class) || _class);
exports["default"] = Main;

/***/ }),
/* 504 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports.Item = exports.List = undefined;

var _list = __webpack_require__(505);

exports.List = _list.List;
exports.Item = _list.Item;

/***/ }),
/* 505 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports.Item = exports.List = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _status = __webpack_require__(67);

var _status2 = _interopRequireDefault(_status);

var _status_number = __webpack_require__(193);

var _status_number2 = _interopRequireDefault(_status_number);

var _build_time = __webpack_require__(88);

var _build_time2 = _interopRequireDefault(_build_time);

var _build_event = __webpack_require__(194);

var _build_event2 = _interopRequireDefault(_build_event);

var _list = __webpack_require__(510);

var _list2 = _interopRequireDefault(_list);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var List = exports.List = function List(_ref) {
	var children = _ref.children;
	return _react2["default"].createElement(
		"div",
		{ className: _list2["default"].list },
		children
	);
};

var Item = exports.Item = function (_Component) {
	_inherits(Item, _Component);

	function Item() {
		_classCallCheck(this, Item);

		return _possibleConstructorReturn(this, _Component.apply(this, arguments));
	}

	Item.prototype.render = function render() {
		var build = this.props.build;

		return _react2["default"].createElement(
			"div",
			{ className: _list2["default"].item },
			_react2["default"].createElement(
				"div",
				{ className: _list2["default"].icon },
				_react2["default"].createElement("img", { src: build.author_avatar })
			),
			_react2["default"].createElement(
				"div",
				{ className: _list2["default"].body },
				_react2["default"].createElement(
					"h3",
					null,
					build.message
				)
			),
			_react2["default"].createElement(
				"div",
				{ className: _list2["default"].meta },
				_react2["default"].createElement(_build_event2["default"], {
					link: build.link_url,
					event: build.event,
					commit: build.commit,
					branch: build.branch,
					target: build.deploy_to,
					refspec: build.refspec,
					refs: build.ref
				})
			),
			_react2["default"].createElement("div", { className: _list2["default"]["break"] }),
			_react2["default"].createElement(
				"div",
				{ className: _list2["default"].time },
				_react2["default"].createElement(_build_time2["default"], {
					start: build.started_at || build.created_at,
					finish: build.finished_at
				})
			),
			_react2["default"].createElement(
				"div",
				{ className: _list2["default"].status },
				_react2["default"].createElement(_status_number2["default"], { status: build.status, number: build.number }),
				_react2["default"].createElement(_status2["default"], { status: build.status })
			)
		);
	};

	return Item;
}(_react.Component);

/***/ }),
/* 506 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(507);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(4)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../node_modules/css-loader/index.js??ref--2!../../../node_modules/less-loader/dist/cjs.js!./status_number.less", function() {
			var newContent = require("!!../../../node_modules/css-loader/index.js??ref--2!../../../node_modules/less-loader/dist/cjs.js!./status_number.less");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 507 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(3)(undefined);
// imports


// module
exports.push([module.i, ".status_number__root___2AXbs {\n  display: inline-block;\n  border-width: 2px;\n  border-style: solid;\n  border-radius: 2px;\n  text-align: center;\n  line-height: 20px;\n  min-width: 65px;\n  font-size: 14px;\n}\n.status_number__root___2AXbs.status_number__success___3vmZY {\n  border-color: #4dc89a;\n  color: #4dc89a;\n}\n.status_number__root___2AXbs.status_number__declined___EHkHN,\n.status_number__root___2AXbs.status_number__failure___D4g63,\n.status_number__root___2AXbs.status_number__killed___3KMZr,\n.status_number__root___2AXbs.status_number__error___a4Pf_ {\n  color: #fc4758;\n  border-color: #fc4758;\n}\n.status_number__root___2AXbs.status_number__blocked___11OWA,\n.status_number__root___2AXbs.status_number__running___1oycX,\n.status_number__root___2AXbs.status_number__started___1vgLc {\n  color: #fdb835;\n  border-color: #fdb835;\n}\n.status_number__root___2AXbs.status_number__pending___2lCwq,\n.status_number__root___2AXbs.status_number__skipped___10JCL {\n  color: #bdbdbd;\n  border-color: #bdbdbd;\n}\n", ""]);

// exports
exports.locals = {
	"root": "status_number__root___2AXbs",
	"success": "status_number__success___3vmZY",
	"declined": "status_number__declined___EHkHN",
	"failure": "status_number__failure___D4g63",
	"killed": "status_number__killed___3KMZr",
	"error": "status_number__error___a4Pf_",
	"blocked": "status_number__blocked___11OWA",
	"running": "status_number__running___1oycX",
	"started": "status_number__started___1vgLc",
	"pending": "status_number__pending___2lCwq",
	"skipped": "status_number__skipped___10JCL"
};

/***/ }),
/* 508 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(509);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(4)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../node_modules/css-loader/index.js??ref--2!../../../node_modules/less-loader/dist/cjs.js!./build_event.less", function() {
			var newContent = require("!!../../../node_modules/css-loader/index.js??ref--2!../../../node_modules/less-loader/dist/cjs.js!./build_event.less");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 509 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(3)(undefined);
// imports


// module
exports.push([module.i, ".build_event__text-ellipsis___2vFhY {\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n.build_event__host___k6RW5 {\n  position: relative;\n}\n.build_event__host___k6RW5 svg {\n  width: 18px;\n  height: 18px;\n}\n.build_event__host___k6RW5 a {\n  display: block;\n  position: absolute;\n  top: 0px;\n  right: 0px;\n}\n.build_event__row___26SKW {\n  display: flex;\n}\n.build_event__row___26SKW :first-child {\n  display: flex;\n  align-items: center;\n  margin-right: 5px;\n}\n.build_event__row___26SKW :last-child {\n  flex: 1;\n  line-height: 24px;\n  font-size: 14px;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n", ""]);

// exports
exports.locals = {
	"text-ellipsis": "build_event__text-ellipsis___2vFhY",
	"host": "build_event__host___k6RW5",
	"row": "build_event__row___26SKW"
};

/***/ }),
/* 510 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(511);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(4)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../../node_modules/css-loader/index.js??ref--2!../../../../../../node_modules/less-loader/dist/cjs.js!./list.less", function() {
			var newContent = require("!!../../../../../../node_modules/css-loader/index.js??ref--2!../../../../../../node_modules/less-loader/dist/cjs.js!./list.less");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 511 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(3)(undefined);
// imports


// module
exports.push([module.i, ".list__list___37q5d > a {\n  display: block;\n  text-decoration: none;\n  color: #212121;\n  padding: 20px 0px;\n  border-bottom: 1px solid #eceff1;\n  box-sizing: border-box;\n}\n.list__list___37q5d > a:last-child {\n  border-bottom: none;\n}\n.list__list___37q5d > a a {\n  display: none;\n}\n.list__item___ygtZF {\n  display: flex;\n}\n.list__item___ygtZF .list__break___3VBa1 {\n  display: none;\n}\n@media (max-width: 1100px) {\n  .list__item___ygtZF {\n    flex-wrap: wrap;\n  }\n  .list__item___ygtZF .list__icon___v8oV5 {\n    order: 0;\n  }\n  .list__item___ygtZF .list__body___2Iq7C {\n    order: 1;\n    flex: 1;\n  }\n  .list__item___ygtZF .list__body___2Iq7C h3 {\n    padding-right: 20px;\n  }\n  .list__item___ygtZF .list__meta___3rBvw {\n    order: 4;\n    margin: 0px;\n    margin-top: 20px;\n    margin-right: 20px;\n    padding: 0px;\n    padding-left: 52px;\n    border-left-width: 0px;\n  }\n  .list__item___ygtZF .list__time___632u0 {\n    order: 5;\n    margin-top: 20px;\n  }\n  .list__item___ygtZF .list__status___16tMr {\n    order: 2;\n  }\n  .list__item___ygtZF .list__break___3VBa1 {\n    order: 3;\n    flex-basis: 100%;\n    width: 0px;\n    height: 0px;\n    overflow: hidden;\n    display: block;\n  }\n}\n.list__item___ygtZF h3 {\n  margin: 0;\n  line-height: 22px;\n  min-height: 22px;\n  font-size: 15px;\n  font-weight: normal;\n  overflow: hidden;\n  display: -webkit-box;\n  -webkit-line-clamp: 2;\n  -webkit-box-orient: vertical;\n}\n.list__item___ygtZF em {\n  font-style: normal;\n  font-size: 14px;\n}\n.list__item___ygtZF span {\n  margin: 0 5px;\n  font-size: 14px;\n  color: #bdbdbd;\n}\n.list__icon___v8oV5 {\n  width: 22px;\n  min-width: 22px;\n  max-width: 22px;\n  margin-right: 20px;\n  margin-left: 10px;\n}\n.list__icon___v8oV5 img {\n  border-radius: 50%;\n  width: 22px;\n  height: 22px;\n}\n.list__status___16tMr {\n  text-align: right;\n  white-space: nowrap;\n  display: inline-block;\n}\n.list__status___16tMr span {\n  display: inline-block;\n  color: #4dc89a;\n  border: 2px solid #4dc89a;\n  text-align: center;\n  border-radius: 2px;\n  line-height: 20px;\n  min-width: 65px;\n  margin-right: 10px;\n}\n.list__status___16tMr div {\n  vertical-align: middle;\n  display: inline-block;\n}\n.list__status___16tMr div:last-child {\n  margin-left: 20px;\n}\n.list__body___2Iq7C {\n  flex: 1;\n}\n.list__meta___3rBvw {\n  padding-left: 20px;\n  padding-right: 20px;\n  margin-left: 20px;\n  margin-right: 20px;\n  border-left: 1px solid #eceff1;\n  border-right: 1px solid #eceff1;\n  box-sizing: border-box;\n  min-width: 200px;\n  flex: 0 0 200px;\n}\n.list__time___632u0 {\n  padding-right: 20px;\n  margin-right: 20px;\n  box-sizing: border-box;\n  min-width: 200px;\n  flex: 0 0 200px;\n}\n", ""]);

// exports
exports.locals = {
	"list": "list__list___37q5d",
	"item": "list__item___ygtZF",
	"break": "list__break___3VBa1",
	"icon": "list__icon___v8oV5",
	"body": "list__body___2Iq7C",
	"meta": "list__meta___3rBvw",
	"time": "list__time___632u0",
	"status": "list__status___16tMr"
};

/***/ }),
/* 512 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(513);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(4)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2!../../../../../node_modules/less-loader/dist/cjs.js!./index.less", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2!../../../../../node_modules/less-loader/dist/cjs.js!./index.less");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 513 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(3)(undefined);
// imports


// module
exports.push([module.i, ".index__root___3hREV {\n  padding: 20px;\n}\n", ""]);

// exports
exports.locals = {
	"root": "index__root___3hREV"
};

/***/ }),
/* 514 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports.UserRepoTitle = exports["default"] = undefined;

var _dec, _class;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _higherOrder = __webpack_require__(16);

var _inject = __webpack_require__(22);

var _repository = __webpack_require__(23);

var _components = __webpack_require__(515);

var _breadcrumb = __webpack_require__(129);

var _breadcrumb2 = _interopRequireDefault(_breadcrumb);

var _index = __webpack_require__(524);

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var binding = function binding(props, context) {
	return {
		repos: ["repos", "data"],
		loaded: ["repos", "loaded"],
		error: ["repos", "error"]
	};
};

var UserRepos = (_dec = (0, _higherOrder.branch)(binding), (0, _inject.inject)(_class = _dec(_class = function (_Component) {
	_inherits(UserRepos, _Component);

	function UserRepos(props, context) {
		_classCallCheck(this, UserRepos);

		var _this = _possibleConstructorReturn(this, _Component.call(this, props, context));

		_this.handleFilter = _this.handleFilter.bind(_this);
		_this.renderItem = _this.renderItem.bind(_this);
		_this.handleToggle = _this.handleToggle.bind(_this);
		return _this;
	}

	UserRepos.prototype.handleFilter = function handleFilter(e) {
		this.setState({
			search: e.target.value
		});
	};

	UserRepos.prototype.handleToggle = function handleToggle(repo, e) {
		var _props = this.props,
		    dispatch = _props.dispatch,
		    drone = _props.drone;

		if (e.target.checked) {
			dispatch(_repository.enableRepository, drone, repo.owner, repo.name);
		} else {
			dispatch(_repository.disableRepository, drone, repo.owner, repo.name);
		}
	};

	UserRepos.prototype.componentWillMount = function componentWillMount() {
		if (!this._dispatched) {
			this._dispatched = true;
			this.props.dispatch(_repository.fetchRepostoryList, this.props.drone);
		}
	};

	UserRepos.prototype.shouldComponentUpdate = function shouldComponentUpdate(nextProps, nextState) {
		return this.props.repos !== nextProps.repos || this.state.search !== nextState.search;
	};

	UserRepos.prototype.render = function render() {
		var _props2 = this.props,
		    repos = _props2.repos,
		    loaded = _props2.loaded,
		    error = _props2.error;
		var search = this.state.search;

		var list = Object.values(repos || {});

		if (error) {
			return ERROR;
		}

		if (!loaded) {
			return LOADING;
		}

		if (list.length === 0) {
			return EMPTY;
		}

		var filter = function filter(repo) {
			return !search || repo.full_name.indexOf(search) !== -1;
		};

		var filtered = list.filter(filter);

		return _react2["default"].createElement(
			"div",
			null,
			_react2["default"].createElement(
				"div",
				{ className: _index2["default"].search },
				_react2["default"].createElement("input", {
					type: "text",
					placeholder: "Search \u2026",
					onChange: this.handleFilter
				})
			),
			_react2["default"].createElement(
				"div",
				{ className: _index2["default"].root },
				filtered.length === 0 ? NO_MATCHES : null,
				_react2["default"].createElement(
					_components.List,
					null,
					list.filter(filter).map(this.renderItem)
				)
			)
		);
	};

	UserRepos.prototype.renderItem = function renderItem(repo) {
		return _react2["default"].createElement(_components.Item, {
			key: repo.full_name,
			owner: repo.owner,
			name: repo.name,
			active: repo.active,
			link: "/" + repo.full_name,
			onchange: this.handleToggle.bind(this, repo)
		});
	};

	return UserRepos;
}(_react.Component)) || _class) || _class);
exports["default"] = UserRepos;


var LOADING = _react2["default"].createElement(
	"div",
	null,
	"Loading"
);

var EMPTY = _react2["default"].createElement(
	"div",
	null,
	"Your repository list is empty"
);

var NO_MATCHES = _react2["default"].createElement(
	"div",
	null,
	"No matches found"
);

var ERROR = _react2["default"].createElement(
	"div",
	null,
	"Error"
);

/* eslint-disable react/jsx-key */

var UserRepoTitle = exports.UserRepoTitle = function (_Component2) {
	_inherits(UserRepoTitle, _Component2);

	function UserRepoTitle() {
		_classCallCheck(this, UserRepoTitle);

		return _possibleConstructorReturn(this, _Component2.apply(this, arguments));
	}

	UserRepoTitle.prototype.render = function render() {
		return _react2["default"].createElement(_breadcrumb2["default"], {
			elements: [_react2["default"].createElement(
				"span",
				null,
				"Account"
			), _breadcrumb.SEPARATOR, _react2["default"].createElement(
				"span",
				null,
				"Repositories"
			)]
		});
	};

	return UserRepoTitle;
}(_react.Component);
/* eslint-enable react/jsx-key */

/***/ }),
/* 515 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports.Item = exports.List = undefined;

var _list = __webpack_require__(516);

exports.List = _list.List;
exports.Item = _list.Item;

/***/ }),
/* 516 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports.Item = exports.List = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _reactRouterDom = __webpack_require__(30);

var _icons = __webpack_require__(42);

var _switch = __webpack_require__(517);

var _list = __webpack_require__(520);

var _list2 = _interopRequireDefault(_list);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var List = exports.List = function List(_ref) {
	var children = _ref.children;
	return _react2["default"].createElement(
		"div",
		{ className: _list2["default"].list },
		children
	);
};

var Item = exports.Item = function (_Component) {
	_inherits(Item, _Component);

	function Item() {
		_classCallCheck(this, Item);

		return _possibleConstructorReturn(this, _Component.apply(this, arguments));
	}

	Item.prototype.render = function render() {
		var _props = this.props,
		    owner = _props.owner,
		    name = _props.name,
		    active = _props.active,
		    link = _props.link,
		    onchange = _props.onchange;

		return _react2["default"].createElement(
			"div",
			{ className: _list2["default"].item },
			_react2["default"].createElement(
				"div",
				null,
				owner,
				"/",
				name
			),
			_react2["default"].createElement(
				"div",
				{ className: active ? _list2["default"].active : _list2["default"].inactive },
				_react2["default"].createElement(
					_reactRouterDom.Link,
					{ to: link },
					_react2["default"].createElement(_icons.LaunchIcon, null)
				)
			),
			_react2["default"].createElement(
				"div",
				null,
				_react2["default"].createElement(_switch.Switch, { onchange: onchange, checked: active })
			)
		);
	};

	Item.prototype.shouldComponentUpdate = function shouldComponentUpdate(nextProps) {
		return this.props.owner !== nextProps.owner || this.props.name !== nextProps.name || this.props.active !== nextProps.active;
	};

	return Item;
}(_react.Component);

/***/ }),
/* 517 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports.Switch = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _switch = __webpack_require__(518);

var _switch2 = _interopRequireDefault(_switch);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Switch = exports.Switch = function (_Component) {
	_inherits(Switch, _Component);

	function Switch() {
		_classCallCheck(this, Switch);

		return _possibleConstructorReturn(this, _Component.apply(this, arguments));
	}

	Switch.prototype.render = function render() {
		var _props = this.props,
		    checked = _props.checked,
		    onchange = _props.onchange;

		return _react2["default"].createElement(
			"label",
			{ className: _switch2["default"]["switch"] },
			_react2["default"].createElement("input", { type: "checkbox", checked: checked, onChange: onchange })
		);
	};

	return Switch;
}(_react.Component);

/***/ }),
/* 518 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(519);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(4)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../../node_modules/css-loader/index.js??ref--2!../../../../../../node_modules/less-loader/dist/cjs.js!./switch.less", function() {
			var newContent = require("!!../../../../../../node_modules/css-loader/index.js??ref--2!../../../../../../node_modules/less-loader/dist/cjs.js!./switch.less");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 519 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(3)(undefined);
// imports


// module
exports.push([module.i, ".switch__switch___ezV9a label {\n  display: flex;\n  align-items: center;\n  margin-bottom: 10px;\n  cursor: pointer;\n}\n.switch__switch___ezV9a input[type=checkbox] {\n  cursor: pointer;\n  width: 12px;\n  height: 12px;\n  margin-right: 30px;\n  position: relative;\n  appearance: none;\n  -webkit-appearance: none;\n  -moz-appearance: none;\n  -ms-appearance: none;\n  outline: none;\n}\n.switch__switch___ezV9a input[type=checkbox]::before,\n.switch__switch___ezV9a input[type=checkbox]::after {\n  content: \"\";\n  position: absolute;\n}\n.switch__switch___ezV9a input[type=checkbox]::before {\n  width: 250%;\n  background-color: #e3e3e3;\n  transform: translate(-25%, 0);\n  border-radius: 30px;\n  height: 100%;\n  transition: all 0.25s ease-in-out;\n}\n.switch__switch___ezV9a input[type=checkbox]::after {\n  width: 150%;\n  height: 150%;\n  margin-top: -25%;\n  margin-left: 10%;\n  background-color: #bdbdbd;\n  border-radius: 30px;\n  transform: translate(-60%, 0);\n  transition: all 0.2s;\n}\n.switch__switch___ezV9a input[type=checkbox]:checked::after {\n  transform: scale(0.75, 0.75);\n  transform: translate(25%, 0);\n  background-color: #4dc89a;\n}\n.switch__switch___ezV9a input[type=checkbox]:checked::before {\n  background-color: #87dabb;\n}\n", ""]);

// exports
exports.locals = {
	"switch": "switch__switch___ezV9a"
};

/***/ }),
/* 520 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(521);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(4)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../../node_modules/css-loader/index.js??ref--2!../../../../../../node_modules/less-loader/dist/cjs.js!./list.less", function() {
			var newContent = require("!!../../../../../../node_modules/css-loader/index.js??ref--2!../../../../../../node_modules/less-loader/dist/cjs.js!./list.less");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 521 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(3)(undefined);
// imports


// module
exports.push([module.i, ".list__item___1lrfw {\n  display: flex;\n  border-bottom: 1px solid #eceff1;\n  padding: 10px 10px;\n}\n.list__item___1lrfw:last-child {\n  border-bottom-width: 0px;\n}\n.list__item___1lrfw > div:first-child {\n  flex: 1 1 auto;\n  line-height: 24px;\n}\n.list__item___1lrfw > div:nth-child(3) {\n  text-align: right;\n  display: flex;\n  align-content: stretch;\n  justify-content: center;\n  flex-direction: column;\n}\n.list__item___1lrfw a {\n  margin-right: 20px;\n  width: 100px;\n}\n.list__item___1lrfw a svg {\n  width: 20px;\n  height: 20px;\n  fill: #bdbdbd;\n}\n.list__item___1lrfw .list__inactive___vNpyy {\n  display: none;\n}\n", ""]);

// exports
exports.locals = {
	"item": "list__item___1lrfw",
	"inactive": "list__inactive___vNpyy"
};

/***/ }),
/* 522 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(523);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(4)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../node_modules/css-loader/index.js??ref--2!../../../node_modules/less-loader/dist/cjs.js!./breadcrumb.less", function() {
			var newContent = require("!!../../../node_modules/css-loader/index.js??ref--2!../../../node_modules/less-loader/dist/cjs.js!./breadcrumb.less");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 523 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(3)(undefined);
// imports


// module
exports.push([module.i, ".breadcrumb__breadcrumb___2Xds9 {\n  text-align: left;\n  display: inline-block;\n  padding: 0px;\n  margin: 0px;\n}\n.breadcrumb__breadcrumb___2Xds9 li {\n  display: inline-block;\n  vertical-align: middle;\n}\n.breadcrumb__breadcrumb___2Xds9 li > span,\n.breadcrumb__breadcrumb___2Xds9 li > div,\n.breadcrumb__breadcrumb___2Xds9 a,\n.breadcrumb__breadcrumb___2Xds9 a:visited,\n.breadcrumb__breadcrumb___2Xds9 a:active {\n  text-decoration: none;\n  color: #212121;\n  font-size: 20px;\n}\n.breadcrumb__breadcrumb___2Xds9 svg {\n  width: 24px;\n  height: 24px;\n  vertical-align: middle;\n}\n.breadcrumb__breadcrumb___2Xds9 svg.breadcrumb__separator___2EDvS {\n  transform: rotate(270deg);\n  margin: 0px 5px;\n}\n.breadcrumb__breadcrumb___2Xds9 svg.breadcrumb__back___3VVCm {\n  margin-right: 20px;\n}\n", ""]);

// exports
exports.locals = {
	"breadcrumb": "breadcrumb__breadcrumb___2Xds9",
	"separator": "breadcrumb__separator___2EDvS",
	"back": "breadcrumb__back___3VVCm"
};

/***/ }),
/* 524 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(525);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(4)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2!../../../../../node_modules/less-loader/dist/cjs.js!./index.less", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2!../../../../../node_modules/less-loader/dist/cjs.js!./index.less");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 525 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(3)(undefined);
// imports


// module
exports.push([module.i, ".index__root___1dCx1 {\n  padding: 20px;\n}\n.index__search___3dNFF input {\n  border: none;\n  width: 100%;\n  box-sizing: border-box;\n  outline: none;\n  line-height: 24px;\n  font-size: 15px;\n  padding: 0px 20px;\n  border-bottom: 1px solid #eceff1;\n  height: 45px;\n}\n.index__search___3dNFF ::-moz-input-placeholder {\n  color: #bdbdbd;\n  font-weight: 300;\n  font-size: 15px;\n}\n.index__search___3dNFF ::-webkit-input-placeholder {\n  color: #bdbdbd;\n  font-weight: 300;\n  font-size: 15px;\n}\n", ""]);

// exports
exports.locals = {
	"root": "index__root___1dCx1",
	"search": "index__search___3dNFF"
};

/***/ }),
/* 526 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports["default"] = undefined;

var _dec, _class;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _users = __webpack_require__(527);

var _higherOrder = __webpack_require__(16);

var _inject = __webpack_require__(22);

var _index = __webpack_require__(528);

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var binding = function binding(props, context) {
	return {
		location: ["location"],
		token: ["token"]
	};
};

var Tokens = (_dec = (0, _higherOrder.branch)(binding), (0, _inject.inject)(_class = _dec(_class = function (_Component) {
	_inherits(Tokens, _Component);

	function Tokens() {
		_classCallCheck(this, Tokens);

		return _possibleConstructorReturn(this, _Component.apply(this, arguments));
	}

	Tokens.prototype.shouldComponentUpdate = function shouldComponentUpdate(nextProps, nextState) {
		return this.props.location !== nextProps.location || this.props.token !== nextProps.token;
	};

	Tokens.prototype.componentWillMount = function componentWillMount() {
		var _props = this.props,
		    drone = _props.drone,
		    dispatch = _props.dispatch;


		dispatch(_users.generateToken, drone);
	};

	Tokens.prototype.render = function render() {
		var _props2 = this.props,
		    location = _props2.location,
		    token = _props2.token;


		if (!location || !token) {
			return _react2["default"].createElement(
				"div",
				null,
				"Loading"
			);
		}
		return _react2["default"].createElement(
			"div",
			{ className: _index2["default"].root },
			_react2["default"].createElement(
				"h2",
				null,
				"Your Personal Token:"
			),
			_react2["default"].createElement(
				"pre",
				null,
				token
			),
			_react2["default"].createElement(
				"h2",
				null,
				"Example API Usage:"
			),
			_react2["default"].createElement(
				"pre",
				null,
				usageWithCURL(location, token)
			),
			_react2["default"].createElement(
				"h2",
				null,
				"Example CLI Usage:"
			),
			_react2["default"].createElement(
				"pre",
				null,
				usageWithCLI(location, token)
			)
		);
	};

	return Tokens;
}(_react.Component)) || _class) || _class);
exports["default"] = Tokens;


var usageWithCURL = function usageWithCURL(location, token) {
	return "curl -i " + location.protocol + "//" + location.host + "/api/user -H \"Authorization: Bearer " + token + "\"";
};

var usageWithCLI = function usageWithCLI(location, token) {
	return "export DRONE_SERVER=" + location.protocol + "//" + location.host + "\n\t\texport DRONE_TOKEN=" + token + "\n\n\t\tdrone info";
};

/***/ }),
/* 527 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports.generateToken = undefined;

var _message = __webpack_require__(68);

/**
* Generates a personal access token and stores the results in
* the state tree.
 *
 * @param {Object} tree - The drone state tree.
 * @param {Object} client - The drone client.
 */
var generateToken = exports.generateToken = function generateToken(tree, client) {
	client.getToken().then(function (token) {
		tree.set(["token"], token);
	})["catch"](function () {
		(0, _message.displayMessage)(tree, "Failed to retrieve your personal access token");
	});
};

/***/ }),
/* 528 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(529);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(4)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2!../../../../../node_modules/less-loader/dist/cjs.js!./index.less", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2!../../../../../node_modules/less-loader/dist/cjs.js!./index.less");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 529 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(3)(undefined);
// imports


// module
exports.push([module.i, ".index__root___VOrRS {\n  padding: 20px;\n}\n.index__root___VOrRS pre {\n  background: #eceff1;\n  padding: 20px;\n  white-space: pre-line;\n  word-wrap: break-word;\n  font-family: 'Roboto Mono', monospace;\n  max-width: 650px;\n  margin-bottom: 40px;\n  font-size: 12px;\n}\n.index__root___VOrRS h2 {\n  font-weight: normal;\n  font-size: 15px;\n}\n.index__root___VOrRS h2:first-of-type {\n  margin-top: 0px;\n}\n", ""]);

// exports
exports.locals = {
	"root": "index__root___VOrRS"
};

/***/ }),
/* 530 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports.Message = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _refresh = __webpack_require__(189);

var _refresh2 = _interopRequireDefault(_refresh);

var _sync = __webpack_require__(531);

var _sync2 = _interopRequireDefault(_sync);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var Message = exports.Message = function Message() {
	return _react2["default"].createElement(
		"div",
		{ className: _sync2["default"].root },
		_react2["default"].createElement(
			"div",
			{ className: _sync2["default"].alert },
			_react2["default"].createElement(
				"div",
				null,
				_react2["default"].createElement(_refresh2["default"], null)
			),
			_react2["default"].createElement(
				"div",
				null,
				"Account synchronization in progress"
			)
		)
	);
};

/***/ }),
/* 531 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(532);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(4)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../node_modules/css-loader/index.js??ref--2!../../../node_modules/less-loader/dist/cjs.js!./sync.less", function() {
			var newContent = require("!!../../../node_modules/css-loader/index.js??ref--2!../../../node_modules/less-loader/dist/cjs.js!./sync.less");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 532 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(3)(undefined);
// imports


// module
exports.push([module.i, ".sync__root___164qZ {\n  margin: 50px auto;\n  min-width: 400px;\n  max-width: 400px;\n  padding: 30px;\n  box-sizing: border-box;\n}\n.sync__root___164qZ .sync__alert___AHHnn {\n  margin-bottom: 20px;\n  text-align: left;\n  display: block;\n  color: #fff;\n  background: #fdb835;\n  padding: 20px;\n  display: flex;\n  border-radius: 2px;\n}\n.sync__root___164qZ .sync__alert___AHHnn > :last-child {\n  padding-top: 2px;\n  padding-left: 10px;\n  line-height: 20px;\n  font-family: \"Roboto\";\n  font-size: 15px;\n}\n.sync__root___164qZ svg {\n  fill: #fff;\n  width: 26px;\n  height: 26px;\n  animation: sync__spinner___1t33Z 1.2s ease infinite;\n}\n@keyframes sync__spinner___1t33Z {\n  0% {\n    transform: rotate(0deg);\n  }\n  100% {\n    transform: rotate(359deg);\n  }\n}\n", ""]);

// exports
exports.locals = {
	"root": "sync__root___164qZ",
	"alert": "sync__alert___AHHnn",
	"spinner": "sync__spinner___1t33Z"
};

/***/ }),
/* 533 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports["default"] = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _reactRouterDom = __webpack_require__(30);

var _breadcrumb = __webpack_require__(129);

var _breadcrumb2 = _interopRequireDefault(_breadcrumb);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Header = function (_Component) {
	_inherits(Header, _Component);

	function Header() {
		_classCallCheck(this, Header);

		return _possibleConstructorReturn(this, _Component.apply(this, arguments));
	}

	Header.prototype.render = function render() {
		var _props$match$params = this.props.match.params,
		    owner = _props$match$params.owner,
		    repo = _props$match$params.repo;

		return _react2["default"].createElement(
			"div",
			null,
			_react2["default"].createElement(_breadcrumb2["default"], {
				elements: [_react2["default"].createElement(
					_reactRouterDom.Link,
					{ to: "/" + owner + "/" + repo, key: owner + "-" + repo },
					owner,
					" / ",
					repo
				)]
			})
		);
	};

	return Header;
}(_react.Component);

exports["default"] = Header;

/***/ }),
/* 534 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports["default"] = undefined;

var _dec, _class;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _repository = __webpack_require__(23);

var _higherOrder = __webpack_require__(16);

var _inject = __webpack_require__(22);

var _icons = __webpack_require__(42);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var binding = function binding(props, context) {
	return {
		repos: ["repos"]
	};
};

var UserReposMenu = (_dec = (0, _higherOrder.branch)(binding), (0, _inject.inject)(_class = _dec(_class = function (_Component) {
	_inherits(UserReposMenu, _Component);

	function UserReposMenu(props, context) {
		_classCallCheck(this, UserReposMenu);

		var _this = _possibleConstructorReturn(this, _Component.call(this, props, context));

		_this.handleClick = _this.handleClick.bind(_this);
		return _this;
	}

	UserReposMenu.prototype.handleClick = function handleClick() {
		var _props = this.props,
		    dispatch = _props.dispatch,
		    drone = _props.drone;

		dispatch(_repository.syncRepostoryList, drone);
	};

	UserReposMenu.prototype.render = function render() {
		var loaded = this.props.repos.loaded;

		return _react2["default"].createElement(
			"section",
			null,
			_react2["default"].createElement(
				"ul",
				null,
				_react2["default"].createElement(
					"li",
					null,
					_react2["default"].createElement(
						"button",
						{ disabled: !loaded, onClick: this.handleClick },
						_react2["default"].createElement(_icons.SyncIcon, null),
						_react2["default"].createElement(
							"span",
							null,
							"Synchronize"
						)
					)
				)
			)
		);
	};

	return UserReposMenu;
}(_react.Component)) || _class) || _class);
exports["default"] = UserReposMenu;

/***/ }),
/* 535 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports.BuildLogsTitle = exports["default"] = undefined;

var _dec, _class;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _reactRouterDom = __webpack_require__(30);

var _build = __webpack_require__(128);

var _status = __webpack_require__(87);

var _proc = __webpack_require__(130);

var _repository = __webpack_require__(23);

var _breadcrumb = __webpack_require__(129);

var _breadcrumb2 = _interopRequireDefault(_breadcrumb);

var _components = __webpack_require__(536);

var _higherOrder = __webpack_require__(16);

var _inject = __webpack_require__(22);

var _logs = __webpack_require__(550);

var _logs2 = _interopRequireDefault(_logs);

var _index = __webpack_require__(560);

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var binding = function binding(props, context) {
	var _props$match$params = props.match.params,
	    owner = _props$match$params.owner,
	    repo = _props$match$params.repo,
	    build = _props$match$params.build;

	var slug = owner + "/" + repo;
	var number = parseInt(build);

	return {
		repo: ["repos", "data", slug],
		build: ["builds", "data", slug, number]
	};
};

var BuildLogs = (_dec = (0, _higherOrder.branch)(binding), (0, _inject.inject)(_class = _dec(_class = function (_Component) {
	_inherits(BuildLogs, _Component);

	function BuildLogs(props, context) {
		_classCallCheck(this, BuildLogs);

		var _this = _possibleConstructorReturn(this, _Component.call(this, props, context));

		_this.handleApprove = _this.handleApprove.bind(_this);
		_this.handleDecline = _this.handleDecline.bind(_this);
		return _this;
	}

	BuildLogs.prototype.componentWillMount = function componentWillMount() {
		this.synchronize(this.props);
	};

	BuildLogs.prototype.handleApprove = function handleApprove() {
		var _props = this.props,
		    repo = _props.repo,
		    build = _props.build,
		    drone = _props.drone;

		this.props.dispatch(_build.approveBuild, drone, repo.owner, repo.name, build.number);
	};

	BuildLogs.prototype.handleDecline = function handleDecline() {
		var _props2 = this.props,
		    repo = _props2.repo,
		    build = _props2.build,
		    drone = _props2.drone;

		this.props.dispatch(_build.declineBuild, drone, repo.owner, repo.name, build.number);
	};

	BuildLogs.prototype.componentWillUpdate = function componentWillUpdate(nextProps) {
		if (this.props.match.url !== nextProps.match.url) {
			this.synchronize(nextProps);
		}
	};

	BuildLogs.prototype.synchronize = function synchronize(props) {
		if (!props.repo) {
			this.props.dispatch(_repository.fetchRepository, props.drone, props.match.params.owner, props.match.params.repo);
		}
		if (!props.build || !props.build.procs) {
			this.props.dispatch(_build.fetchBuild, props.drone, props.match.params.owner, props.match.params.repo, props.match.params.build);
		}
	};

	BuildLogs.prototype.render = function render() {
		var _props3 = this.props,
		    repo = _props3.repo,
		    build = _props3.build;


		if (!build || !repo) {
			return this.renderLoading();
		}

		if (build.status === _status.STATUS_DECLINED || build.status === _status.STATUS_ERROR) {
			return this.renderError();
		}

		if (build.status === _status.STATUS_BLOCKED) {
			return this.renderBlocked();
		}

		if (!build.procs) {
			return this.renderLoading();
		}

		if ((0, _build.assertBuildMatrix)(build)) {
			return this.renderMatrix();
		}

		return this.renderSimple();
	};

	BuildLogs.prototype.renderLoading = function renderLoading() {
		return _react2["default"].createElement(
			"div",
			{ className: _index2["default"].host },
			_react2["default"].createElement(
				"div",
				{ className: _index2["default"].columns },
				_react2["default"].createElement(
					"div",
					{ className: _index2["default"].right },
					"Loading ..."
				)
			)
		);
	};

	BuildLogs.prototype.renderBlocked = function renderBlocked() {
		var build = this.props.build;

		return _react2["default"].createElement(
			"div",
			{ className: _index2["default"].host },
			_react2["default"].createElement(
				"div",
				{ className: _index2["default"].columns },
				_react2["default"].createElement(
					"div",
					{ className: _index2["default"].right },
					_react2["default"].createElement(_components.Details, { build: build })
				),
				_react2["default"].createElement(
					"div",
					{ className: _index2["default"].left },
					_react2["default"].createElement(_components.Approval, {
						onapprove: this.handleApprove,
						ondecline: this.handleDecline
					})
				)
			)
		);
	};

	BuildLogs.prototype.renderError = function renderError() {
		var build = this.props.build;

		return _react2["default"].createElement(
			"div",
			{ className: _index2["default"].host },
			_react2["default"].createElement(
				"div",
				{ className: _index2["default"].columns },
				_react2["default"].createElement(
					"div",
					{ className: _index2["default"].right },
					_react2["default"].createElement(_components.Details, { build: build })
				),
				_react2["default"].createElement(
					"div",
					{ className: _index2["default"].left },
					_react2["default"].createElement(
						"div",
						{ className: _index2["default"].logerror },
						build.status === _status.STATUS_ERROR ? build.error : "Pipeline execution was declined"
					)
				)
			)
		);
	};

	BuildLogs.prototype.renderSimple = function renderSimple() {
		var _props4 = this.props,
		    repo = _props4.repo,
		    build = _props4.build,
		    match = _props4.match;

		var proc = (0, _proc.findChildProcess)(build.procs || [], match.params.proc || 2);
		var parent = (0, _proc.findChildProcess)(build.procs, proc.ppid);

		var data = Object.assign({}, build);
		if ((0, _build.assertBuildMatrix)(data)) {
			data.started_at = parent.start_time;
			data.finish_at = parent.finish_time;
			data.status = parent.state;
		}

		return _react2["default"].createElement(
			"div",
			{ className: _index2["default"].host },
			_react2["default"].createElement(
				"div",
				{ className: _index2["default"].columns },
				_react2["default"].createElement(
					"div",
					{ className: _index2["default"].right },
					_react2["default"].createElement(_components.Details, { build: data }),
					_react2["default"].createElement(
						"section",
						{ className: _index2["default"].sticky },
						_react2["default"].createElement(
							_components.ProcList,
							null,
							parent.children.map(function (child) {
								return _react2["default"].createElement(
									_reactRouterDom.Link,
									{
										to: "/" + repo.full_name + "/" + build.number + "/" + child.pid,
										key: repo.full_name + "-" + build.number + "-" + child.pid
									},
									_react2["default"].createElement(_components.ProcListItem, {
										key: child.pid,
										name: child.name,
										start: child.start_time,
										finish: child.end_time,
										state: child.state,
										selected: child.pid === proc.pid
									})
								);
							})
						)
					)
				),
				_react2["default"].createElement(
					"div",
					{ className: _index2["default"].left },
					proc && proc.error ? _react2["default"].createElement(
						"div",
						{ className: _index2["default"].logerror },
						proc.error
					) : null,
					parent && parent.error ? _react2["default"].createElement(
						"div",
						{ className: _index2["default"].logerror },
						parent.error
					) : null,
					_react2["default"].createElement(_logs2["default"], {
						match: this.props.match,
						build: this.props.build,
						parent: parent,
						proc: proc
					})
				)
			)
		);
	};

	BuildLogs.prototype.renderMatrix = function renderMatrix() {
		var _props5 = this.props,
		    repo = _props5.repo,
		    build = _props5.build,
		    match = _props5.match;


		if (match.params.proc) {
			return this.renderSimple();
		}

		return _react2["default"].createElement(
			"div",
			{ className: _index2["default"].host },
			_react2["default"].createElement(
				"div",
				{ className: _index2["default"].columns },
				_react2["default"].createElement(
					"div",
					{ className: _index2["default"].right },
					_react2["default"].createElement(_components.Details, { build: build })
				),
				_react2["default"].createElement(
					"div",
					{ className: _index2["default"].left },
					_react2["default"].createElement(
						_components.MatrixList,
						null,
						build.procs.map(function (child) {
							return _react2["default"].createElement(
								_reactRouterDom.Link,
								{
									to: "/" + repo.full_name + "/" + build.number + "/" + child.children[0].pid,
									key: repo.full_name + "-" + build.number + "-" + child.children[0].pid
								},
								_react2["default"].createElement(_components.MatrixItem, {
									number: child.pid,
									start: child.start_time,
									finish: child.end_time,
									status: child.state,
									environ: child.environ
								})
							);
						})
					)
				)
			)
		);
	};

	return BuildLogs;
}(_react.Component)) || _class) || _class);
exports["default"] = BuildLogs;

var BuildLogsTitle = exports.BuildLogsTitle = function (_Component2) {
	_inherits(BuildLogsTitle, _Component2);

	function BuildLogsTitle() {
		_classCallCheck(this, BuildLogsTitle);

		return _possibleConstructorReturn(this, _Component2.apply(this, arguments));
	}

	BuildLogsTitle.prototype.render = function render() {
		var _props$match$params2 = this.props.match.params,
		    owner = _props$match$params2.owner,
		    repo = _props$match$params2.repo,
		    build = _props$match$params2.build;

		return _react2["default"].createElement(_breadcrumb2["default"], {
			elements: [_react2["default"].createElement(
				_reactRouterDom.Link,
				{ to: "/" + owner + "/" + repo, key: owner + "-" + repo },
				owner,
				" / ",
				repo
			), _breadcrumb.SEPARATOR, _react2["default"].createElement(
				_reactRouterDom.Link,
				{
					to: "/" + owner + "/" + repo + "/" + build,
					key: owner + "-" + repo + "-" + build
				},
				build
			)]
		});
	};

	return BuildLogsTitle;
}(_react.Component);

/***/ }),
/* 536 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports.ProcListItem = exports.ProcList = exports.MatrixItem = exports.MatrixList = exports.Details = exports.Approval = undefined;

var _approval = __webpack_require__(537);

var _details = __webpack_require__(540);

var _matrix = __webpack_require__(543);

var _procs = __webpack_require__(546);

exports.Approval = _approval.Approval;
exports.Details = _details.Details;
exports.MatrixList = _matrix.MatrixList;
exports.MatrixItem = _matrix.MatrixItem;
exports.ProcList = _procs.ProcList;
exports.ProcListItem = _procs.ProcListItem;

/***/ }),
/* 537 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports.Approval = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _approval = __webpack_require__(538);

var _approval2 = _interopRequireDefault(_approval);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var Approval = exports.Approval = function Approval(_ref) {
	var onapprove = _ref.onapprove,
	    ondecline = _ref.ondecline;
	return _react2["default"].createElement(
		"div",
		{ className: _approval2["default"].root },
		_react2["default"].createElement(
			"p",
			null,
			"Pipeline execution is blocked pending administrator approval"
		),
		_react2["default"].createElement(
			"button",
			{ onClick: onapprove },
			"Approve"
		),
		_react2["default"].createElement(
			"button",
			{ onClick: ondecline },
			"Decline"
		)
	);
};

/***/ }),
/* 538 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(539);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(4)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../../node_modules/css-loader/index.js??ref--2!../../../../../../node_modules/less-loader/dist/cjs.js!./approval.less", function() {
			var newContent = require("!!../../../../../../node_modules/css-loader/index.js??ref--2!../../../../../../node_modules/less-loader/dist/cjs.js!./approval.less");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 539 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(3)(undefined);
// imports


// module
exports.push([module.i, ".approval__root___3TgLN {\n  background: #fdb835;\n  margin-bottom: 20px;\n  padding: 20px;\n  border-radius: 2px;\n}\n.approval__root___3TgLN button {\n  margin-right: 10px;\n  background: rgba(255, 255, 255, 0.2);\n  border: none;\n  color: #fff;\n  font-size: 13px;\n  border-radius: 2px;\n  padding: 0px 10px;\n  line-height: 28px;\n  min-width: 100px;\n  cursor: pointer;\n  text-transform: uppercase;\n}\n.approval__root___3TgLN button:focus {\n  outline: 1px solid #fff;\n  border-radius: 2px;\n}\n.approval__root___3TgLN p {\n  margin-top: 0px;\n  margin-bottom: 20px;\n  color: #fff;\n  font-size: 15px;\n}\n", ""]);

// exports
exports.locals = {
	"root": "approval__root___3TgLN"
};

/***/ }),
/* 540 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports.Details = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _build_event = __webpack_require__(194);

var _build_event2 = _interopRequireDefault(_build_event);

var _build_time = __webpack_require__(88);

var _build_time2 = _interopRequireDefault(_build_time);

var _status = __webpack_require__(67);

var _details = __webpack_require__(541);

var _details2 = _interopRequireDefault(_details);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Details = exports.Details = function (_Component) {
	_inherits(Details, _Component);

	function Details() {
		_classCallCheck(this, Details);

		return _possibleConstructorReturn(this, _Component.apply(this, arguments));
	}

	Details.prototype.render = function render() {
		var build = this.props.build;


		return _react2["default"].createElement(
			"div",
			{ className: _details2["default"].info },
			_react2["default"].createElement(_status.StatusLabel, { status: build.status }),
			_react2["default"].createElement(
				"section",
				{ className: _details2["default"].message },
				build.message
			),
			_react2["default"].createElement(
				"section",
				null,
				_react2["default"].createElement(_build_time2["default"], {
					start: build.started_at || build.created_at,
					finish: build.finished_at
				})
			),
			_react2["default"].createElement(
				"section",
				null,
				_react2["default"].createElement(_build_event2["default"], {
					link: build.link_url,
					event: build.event,
					commit: build.commit,
					branch: build.branch,
					target: build.deploy_to,
					refspec: build.refspec,
					refs: build.ref
				})
			)
		);
	};

	return Details;
}(_react.Component);

/***/ }),
/* 541 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(542);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(4)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../../node_modules/css-loader/index.js??ref--2!../../../../../../node_modules/less-loader/dist/cjs.js!./details.less", function() {
			var newContent = require("!!../../../../../../node_modules/css-loader/index.js??ref--2!../../../../../../node_modules/less-loader/dist/cjs.js!./details.less");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 542 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(3)(undefined);
// imports


// module
exports.push([module.i, ".details__info___2EbkI section {\n  margin: 20px 0px;\n  padding: 0px 10px;\n  padding-bottom: 20px;\n  line-height: 20px;\n  font-size: 14px;\n  border-bottom: 1px solid #eceff1;\n}\n.details__info___2EbkI section:last-of-type {\n  border-bottom: 0px;\n  margin-bottom: 0px;\n}\n", ""]);

// exports
exports.locals = {
	"info": "details__info___2EbkI"
};

/***/ }),
/* 543 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports.MatrixItem = exports.MatrixList = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _status = __webpack_require__(67);

var _status2 = _interopRequireDefault(_status);

var _status_number = __webpack_require__(193);

var _status_number2 = _interopRequireDefault(_status_number);

var _build_time = __webpack_require__(88);

var _build_time2 = _interopRequireDefault(_build_time);

var _matrix = __webpack_require__(544);

var _matrix2 = _interopRequireDefault(_matrix);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var MatrixList = exports.MatrixList = function MatrixList(_ref) {
	var children = _ref.children;
	return _react2["default"].createElement(
		"div",
		{ className: _matrix2["default"].list },
		children
	);
};

var MatrixItem = exports.MatrixItem = function MatrixItem(_ref2) {
	var environ = _ref2.environ,
	    start = _ref2.start,
	    finish = _ref2.finish,
	    status = _ref2.status,
	    number = _ref2.number;
	return _react2["default"].createElement(
		"div",
		{ className: _matrix2["default"].item },
		_react2["default"].createElement(
			"div",
			{ className: _matrix2["default"].header },
			Object.entries(environ).map(renderEnviron)
		),
		_react2["default"].createElement(
			"div",
			{ className: _matrix2["default"].body },
			_react2["default"].createElement(_build_time2["default"], { start: start, finish: finish })
		),
		_react2["default"].createElement(
			"div",
			{ className: _matrix2["default"].status },
			_react2["default"].createElement(_status_number2["default"], { status: status, number: number }),
			_react2["default"].createElement(_status2["default"], { status: status })
		)
	);
};

var renderEnviron = function renderEnviron(data) {
	return _react2["default"].createElement(
		"div",
		null,
		data[0],
		"=",
		data[1]
	);
};

/***/ }),
/* 544 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(545);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(4)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../../node_modules/css-loader/index.js??ref--2!../../../../../../node_modules/less-loader/dist/cjs.js!./matrix.less", function() {
			var newContent = require("!!../../../../../../node_modules/css-loader/index.js??ref--2!../../../../../../node_modules/less-loader/dist/cjs.js!./matrix.less");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 545 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(3)(undefined);
// imports


// module
exports.push([module.i, ".matrix__list___1jktT a {\n  text-decoration: none;\n  border-bottom: 1px solid #eceff1;\n  display: block;\n  padding: 20px 10px;\n  color: #212121;\n  cursor: pointer;\n}\n.matrix__list___1jktT a:hover {\n  background: #eceff1;\n}\n.matrix__list___1jktT a:hover .matrix__body___2qv-0 {\n  border-color: #bdbdbd;\n}\n.matrix__list___1jktT a:first-of-type {\n  padding-top: 10px;\n}\n.matrix__list___1jktT a:last-of-type {\n  border-bottom: none;\n}\n.matrix__item___3oQCt {\n  display: flex;\n  flex-direction: row;\n}\n.matrix__header___2QCO6 {\n  flex: 1;\n}\n.matrix__header___2QCO6 div {\n  font-size: 14px;\n  line-height: 26px;\n  font-family: 'Roboto Mono';\n}\n.matrix__body___2qv-0 {\n  border-left: 1px solid #eceff1;\n  padding-left: 20px;\n  flex: 0 0 200px;\n}\n.matrix__status___2oMxf {\n  padding-left: 20px;\n  display: flex;\n  align-items: right;\n}\n.matrix__status___2oMxf > :last-child {\n  margin-left: 20px;\n}\n", ""]);

// exports
exports.locals = {
	"list": "matrix__list___1jktT",
	"body": "matrix__body___2qv-0",
	"item": "matrix__item___3oQCt",
	"header": "matrix__header___2QCO6",
	"status": "matrix__status___2oMxf"
};

/***/ }),
/* 546 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports.ProcListItem = exports.ProcList = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _classnames = __webpack_require__(66);

var _classnames2 = _interopRequireDefault(_classnames);

var _status = __webpack_require__(67);

var _status2 = _interopRequireDefault(_status);

var _elapsed = __webpack_require__(547);

var _procs = __webpack_require__(548);

var _procs2 = _interopRequireDefault(_procs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var ProcList = exports.ProcList = function ProcList(_ref) {
	var children = _ref.children;
	return _react2["default"].createElement(
		"div",
		{ className: _procs2["default"].list },
		children
	);
};

var ProcListItem = exports.ProcListItem = function ProcListItem(_ref2) {
	var name = _ref2.name,
	    start = _ref2.start,
	    finish = _ref2.finish,
	    state = _ref2.state,
	    selected = _ref2.selected;
	return _react2["default"].createElement(
		"div",
		{ className: (0, _classnames2["default"])(_procs2["default"].item, selected ? _procs2["default"].selected : null) },
		_react2["default"].createElement(
			"h3",
			null,
			name
		),
		finish ? _react2["default"].createElement(
			"time",
			null,
			(0, _elapsed.formatTime)(finish, start)
		) : _react2["default"].createElement(_elapsed.Elapsed, { start: start }),
		_react2["default"].createElement(
			"div",
			null,
			_react2["default"].createElement(_status2["default"], { status: state })
		)
	);
};

// function List({ children }) {
// 	return <div className={styles.list}>{children}</div>;
// }
//
// function ListItem({ name, start, finish, state, selected }) {
// 	const classes = classnames(styles.item, selected ? styles.selected : null);
// 	return (
// 		<div className={classes}>
// 			<h3>{name}</h3>
//
// 			{finish ? (
// 				<time>{formatTime(finish, start)}</time>
// 			) : (
// 				<Timer start={start} />
// 			)}
//
// 			<div>
// 				<Status status={state} />
// 			</div>
// 		</div>
// 	);
// }

/***/ }),
/* 547 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports.formatTime = exports.Elapsed = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Elapsed = exports.Elapsed = function (_Component) {
	_inherits(Elapsed, _Component);

	function Elapsed(props, context) {
		_classCallCheck(this, Elapsed);

		var _this = _possibleConstructorReturn(this, _Component.call(this, props));

		_this.state = {
			elapsed: 0
		};

		_this.tick = _this.tick.bind(_this);
		return _this;
	}

	Elapsed.prototype.componentDidMount = function componentDidMount() {
		this.timer = setInterval(this.tick, 1000);
	};

	Elapsed.prototype.componentWillUnmount = function componentWillUnmount() {
		clearInterval(this.timer);
	};

	Elapsed.prototype.tick = function tick() {
		var start = this.props.start;

		var stop = ~~(Date.now() / 1000);
		this.setState({
			elapsed: stop - start
		});
	};

	Elapsed.prototype.render = function render() {
		var elapsed = this.state.elapsed;

		var date = new Date(null);
		date.setSeconds(elapsed);
		return _react2["default"].createElement(
			"time",
			null,
			!elapsed ? undefined : elapsed > 3600 ? date.toISOString().substr(11, 8) : date.toISOString().substr(14, 5)
		);
	};

	return Elapsed;
}(_react.Component);

/*
 * Returns the duration in hh:mm:ss format.
 *
 * @param {number} from - The start time in secnds
 * @param {number} to - The end time in seconds
 * @return {string}
 */


var formatTime = exports.formatTime = function formatTime(end, start) {
	var diff = end - start;
	var date = new Date(null);
	date.setSeconds(diff);

	return diff > 3600 ? date.toISOString().substr(11, 8) : date.toISOString().substr(14, 5);
};

/***/ }),
/* 548 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(549);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(4)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../../node_modules/css-loader/index.js??ref--2!../../../../../../node_modules/less-loader/dist/cjs.js!./procs.less", function() {
			var newContent = require("!!../../../../../../node_modules/css-loader/index.js??ref--2!../../../../../../node_modules/less-loader/dist/cjs.js!./procs.less");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 549 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(3)(undefined);
// imports


// module
exports.push([module.i, ".procs__list___cgu5- a {\n  display: block;\n  text-decoration: none;\n  color: #212121;\n}\n.procs__item___yoTYB {\n  box-sizing: border-box;\n  display: flex;\n  padding: 0px 10px;\n  background: #fff;\n}\n.procs__item___yoTYB.procs__selected___11Lbp,\n.procs__item___yoTYB:hover {\n  background: #eceff1;\n}\n.procs__item___yoTYB time {\n  color: #bdbdbd;\n  font-size: 13px;\n  line-height: 32px;\n  display: inline-block;\n  margin-right: 15px;\n  vertical-align: middle;\n}\n.procs__item___yoTYB h3 {\n  margin: 0px;\n  padding: 0px;\n  font-weight: normal;\n  font-size: 14px;\n  line-height: 36px;\n  vertical-align: middle;\n  flex: 1 1 auto;\n}\n.procs__item___yoTYB:last-child {\n  display: flex;\n  align-items: center;\n}\n", ""]);

// exports
exports.locals = {
	"list": "procs__list___cgu5-",
	"item": "procs__item___yoTYB",
	"selected": "procs__selected___11Lbp"
};

/***/ }),
/* 550 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports["default"] = undefined;

var _dec, _class;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _inject = __webpack_require__(22);

var _higherOrder = __webpack_require__(16);

var _repository = __webpack_require__(23);

var _proc = __webpack_require__(130);

var _logs = __webpack_require__(551);

var _term = __webpack_require__(552);

var _term2 = _interopRequireDefault(_term);

var _anchor = __webpack_require__(555);

var _index = __webpack_require__(42);

var _index2 = __webpack_require__(558);

var _index3 = _interopRequireDefault(_index2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var binding = function binding(props, context) {
	var _props$match$params = props.match.params,
	    owner = _props$match$params.owner,
	    repo = _props$match$params.repo,
	    build = _props$match$params.build,
	    proc = _props$match$params.proc;

	var slug = (0, _repository.repositorySlug)(owner, repo);
	var number = parseInt(build);
	var pid = parseInt(proc || 2);

	return {
		logs: ["logs", "data", slug, number, pid, "data"],
		eof: ["logs", "data", slug, number, pid, "eof"],
		loading: ["logs", "data", slug, number, pid, "loading"],
		error: ["logs", "data", slug, number, pid, "error"],
		follow: ["logs", "follow"]
	};
};

var Output = (_dec = (0, _higherOrder.branch)(binding), (0, _inject.inject)(_class = _dec(_class = function (_Component) {
	_inherits(Output, _Component);

	function Output(props, context) {
		_classCallCheck(this, Output);

		var _this = _possibleConstructorReturn(this, _Component.call(this, props, context));

		_this.handleFollow = _this.handleFollow.bind(_this);
		return _this;
	}

	Output.prototype.componentWillMount = function componentWillMount() {
		if (this.props.proc) {
			this.componentWillUpdate(this.props);
		}
	};

	Output.prototype.componentWillUpdate = function componentWillUpdate(nextProps) {
		var loading = nextProps.loading,
		    logs = nextProps.logs,
		    eof = nextProps.eof,
		    error = nextProps.error;

		var routeChange = this.props.match.url !== nextProps.match.url;

		if (loading || error || logs && eof) {
			return;
		}

		if ((0, _proc.assertProcFinished)(nextProps.proc)) {
			return this.props.dispatch(_logs.fetchLogs, nextProps.drone, nextProps.match.params.owner, nextProps.match.params.repo, nextProps.build.number, nextProps.proc.pid);
		}

		if ((0, _proc.assertProcRunning)(nextProps.proc) && (!logs || routeChange)) {
			this.props.dispatch(_logs.subscribeToLogs, nextProps.drone, nextProps.match.params.owner, nextProps.match.params.repo, nextProps.build.number, nextProps.proc);
		}
	};

	Output.prototype.componentDidUpdate = function componentDidUpdate() {
		if (this.props.follow) {
			(0, _anchor.scrollToBottom)();
		}
	};

	Output.prototype.handleFollow = function handleFollow() {
		this.props.dispatch(_logs.toggleLogs, !this.props.follow);
	};

	Output.prototype.render = function render() {
		var _props = this.props,
		    logs = _props.logs,
		    error = _props.error,
		    proc = _props.proc,
		    loading = _props.loading,
		    follow = _props.follow;


		if (loading || !proc) {
			return _react2["default"].createElement(_term2["default"].Loading, null);
		}

		if (error) {
			return _react2["default"].createElement(_term2["default"].Error, null);
		}

		return _react2["default"].createElement(
			"div",
			null,
			_react2["default"].createElement(_anchor.Top, null),
			_react2["default"].createElement(_term2["default"], {
				lines: logs || [],
				exitcode: (0, _proc.assertProcFinished)(proc) ? proc.exit_code : undefined
			}),
			_react2["default"].createElement(_anchor.Bottom, null),
			_react2["default"].createElement(Actions, {
				running: (0, _proc.assertProcRunning)(proc),
				following: follow,
				onfollow: this.handleFollow,
				onunfollow: this.handleFollow
			})
		);
	};

	return Output;
}(_react.Component)) || _class) || _class);

/**
 * Component renders floating log actions. These can be used
 * to follow, unfollow, scroll to top and scroll to bottom.
 */

exports["default"] = Output;
var Actions = function Actions(_ref) {
	var following = _ref.following,
	    running = _ref.running,
	    onfollow = _ref.onfollow,
	    onunfollow = _ref.onunfollow;
	return _react2["default"].createElement(
		"div",
		{ className: _index3["default"].actions },
		running && !following ? _react2["default"].createElement(
			"button",
			{ onClick: onfollow, className: _index3["default"].follow },
			_react2["default"].createElement(_index.PlayIcon, null)
		) : null,
		running && following ? _react2["default"].createElement(
			"button",
			{ onClick: onunfollow, className: _index3["default"].unfollow },
			_react2["default"].createElement(_index.PauseIcon, null)
		) : null,
		_react2["default"].createElement(
			"button",
			{ onClick: _anchor.scrollToTop, className: _index3["default"].bottom },
			_react2["default"].createElement(_index.ExpandIcon, null)
		),
		_react2["default"].createElement(
			"button",
			{ onClick: _anchor.scrollToBottom, className: _index3["default"].top },
			_react2["default"].createElement(_index.ExpandIcon, null)
		)
	);
};

/***/ }),
/* 551 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports.toggleLogs = undefined;
exports.subscribeToLogs = subscribeToLogs;
exports.fetchLogs = fetchLogs;

var _repository = __webpack_require__(23);

function subscribeToLogs(tree, client, owner, repo, build, proc) {
	if (subscribeToLogs.ws) {
		subscribeToLogs.ws.close();
	}
	var slug = (0, _repository.repositorySlug)(owner, repo);
	var init = { data: [] };

	tree.set(["logs", "data", slug, build, proc.pid], init);

	subscribeToLogs.ws = client.stream(owner, repo, build, proc.ppid, function (item) {
		if (item.proc === proc.name) {
			tree.push(["logs", "data", slug, build, proc.pid, "data"], item);
		}
	});
}

function fetchLogs(tree, client, owner, repo, build, proc) {
	var slug = (0, _repository.repositorySlug)(owner, repo);
	var init = {
		data: [],
		loading: true
	};

	tree.set(["logs", "data", slug, build, proc], init);

	client.getLogs(owner, repo, build, proc).then(function (results) {
		tree.set(["logs", "data", slug, build, proc, "data"], results || []);
		tree.set(["logs", "data", slug, build, proc, "loading"], false);
		tree.set(["logs", "data", slug, build, proc, "eof"], true);
	})["catch"](function () {
		tree.set(["logs", "data", slug, build, proc, "loading"], false);
		tree.set(["logs", "data", slug, build, proc, "eof"], true);
	});
}

/**
 * Toggles whether or not the browser should follow
 * the logs (ie scroll to bottom).
 *
 * @param {boolean} follow - Follow the logs.
 */
var toggleLogs = exports.toggleLogs = function toggleLogs(tree, follow) {
	tree.set(["logs", "follow"], follow);
};

/***/ }),
/* 552 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _ansi_up = __webpack_require__(196);

var _ansi_up2 = _interopRequireDefault(_ansi_up);

var _term = __webpack_require__(553);

var _term2 = _interopRequireDefault(_term);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var formatter = new _ansi_up2["default"]();
formatter.use_classes = true;

var Term = function (_Component) {
	_inherits(Term, _Component);

	function Term() {
		_classCallCheck(this, Term);

		return _possibleConstructorReturn(this, _Component.apply(this, arguments));
	}

	Term.prototype.render = function render() {
		var _props = this.props,
		    lines = _props.lines,
		    exitcode = _props.exitcode;

		return _react2["default"].createElement(
			"div",
			{ className: _term2["default"].term },
			lines.map(renderTermLine),
			exitcode !== undefined ? renderExitCode(exitcode) : undefined
		);
	};

	Term.prototype.shouldComponentUpdate = function shouldComponentUpdate(nextProps, nextState) {
		return this.props.lines !== nextProps.lines || this.props.exitcode !== nextProps.exitcode;
	};

	return Term;
}(_react.Component);

var TermLine = function (_Component2) {
	_inherits(TermLine, _Component2);

	function TermLine() {
		_classCallCheck(this, TermLine);

		return _possibleConstructorReturn(this, _Component2.apply(this, arguments));
	}

	TermLine.prototype.render = function render() {
		var line = this.props.line;

		return _react2["default"].createElement(
			"div",
			{ className: _term2["default"].line, key: line.pos },
			_react2["default"].createElement(
				"div",
				null,
				line.pos + 1
			),
			_react2["default"].createElement("div", { dangerouslySetInnerHTML: { __html: this.colored } }),
			_react2["default"].createElement(
				"div",
				null,
				line.time || 0,
				"s"
			)
		);
	};

	TermLine.prototype.shouldComponentUpdate = function shouldComponentUpdate(nextProps, nextState) {
		return this.props.line.out !== nextProps.line.out;
	};

	_createClass(TermLine, [{
		key: "colored",
		get: function get() {
			return formatter.ansi_to_html(this.props.line.out || "");
		}
	}]);

	return TermLine;
}(_react.Component);

var renderTermLine = function renderTermLine(line) {
	return _react2["default"].createElement(TermLine, { line: line });
};

var renderExitCode = function renderExitCode(code) {
	return _react2["default"].createElement(
		"div",
		{ className: _term2["default"].exitcode },
		"exit code ",
		code
	);
};

var TermError = function TermError() {
	return _react2["default"].createElement(
		"div",
		{ className: _term2["default"].error },
		"Oops. There was a problem loading the logs."
	);
};

var TermLoading = function TermLoading() {
	return _react2["default"].createElement(
		"div",
		{ className: _term2["default"].loading },
		"Loading ..."
	);
};

Term.Line = TermLine;
Term.Error = TermError;
Term.Loading = TermLoading;

exports["default"] = Term;

/***/ }),
/* 553 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(554);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(4)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../../../node_modules/css-loader/index.js??ref--2!../../../../../../../node_modules/less-loader/dist/cjs.js!./term.less", function() {
			var newContent = require("!!../../../../../../../node_modules/css-loader/index.js??ref--2!../../../../../../../node_modules/less-loader/dist/cjs.js!./term.less");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 554 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(3)(undefined);
// imports


// module
exports.push([module.i, ".term__term___qouuv {\n  padding: 20px;\n  border-radius: 2px;\n  background: #222222;\n}\n.term__term___qouuv .term__exitcode___2u3Id {\n  margin-top: 10px;\n  padding: 0;\n  min-width: 20px;\n  color: #666;\n  font-family: 'Roboto Mono', monospace;\n  font-size: 13px;\n  -webkit-user-select: none;\n  -moz-user-select: none;\n  user-select: none;\n}\n.term__line___3-V4M {\n  color: #f1f1f1;\n  line-height: 19px;\n  display: flex;\n  max-width: 100%;\n}\n.term__line___3-V4M * {\n  font-family: 'Roboto Mono', monospace;\n  font-size: 12px;\n}\n.term__line___3-V4M div:first-child {\n  padding-right: 20px;\n  min-width: 20px;\n  color: #666;\n  -webkit-user-select: none;\n  user-select: none;\n}\n.term__line___3-V4M div:nth-child(2) {\n  flex: 1 1 auto;\n  min-width: 0;\n  white-space: pre-wrap;\n  word-wrap: break-word;\n}\n.term__line___3-V4M div:last-child {\n  padding-left: 20px;\n  color: #666;\n  -webkit-user-select: none;\n  user-select: none;\n}\n.term__loading___2-jC_ {\n  padding: 20px;\n  border-radius: 2px;\n  background: #222222;\n  font-family: 'Roboto Mono', monospace;\n  font-size: 13px;\n}\n.term__error___3CLlL {\n  background: #222222;\n  color: #FF6C60;\n  padding: 20px;\n  border-radius: 2px;\n  font-size: 14px;\n  margin-bottom: 10px;\n}\n.ansi-black-fg {\n  color: #4E4E4E;\n}\n.ansi-red-fg {\n  color: #FF6C60;\n}\n.ansi-green-fg {\n  color: #0A0;\n}\n.ansi-yellow-fg {\n  color: #FFFFB6;\n}\n.ansi-blue-fg {\n  color: #96CBFE;\n}\n.ansi-magenta-fg {\n  color: #FF73FD;\n}\n.ansi-cyan-fg {\n  color: #5FF;\n}\n.ansi-white-fg {\n  color: #EEE;\n}\n.ansi-bright-black-fg {\n  color: #7C7C7C;\n}\n.ansi-bright-red-fg {\n  color: #FF9B93;\n}\n.ansi-bright-green-fg {\n  color: #B1FD79;\n}\n.ansi-bright-yellow-fg {\n  color: #FFFF91;\n}\n.ansi-bright-blue-fg {\n  color: #B5DCFE;\n}\n.ansi-bright-magenta-fg {\n  color: #FF9CFE;\n}\n.ansi-bright-cyan-fg {\n  color: #5FF;\n}\n.ansi-bright-white-fg {\n  color: #FFF;\n}\n.ansi-black-bg {\n  background-color: #4E4E4E;\n}\n.ansi-red-bg {\n  background-color: #FF6C60;\n}\n.ansi-green-bg {\n  background-color: #0A0;\n}\n.ansi-yellow-bg {\n  background-color: #FFFFB6;\n}\n.ansi-blue-bg {\n  background-color: #96CBFE;\n}\n.ansi-magenta-bg {\n  background-color: #FF73FD;\n}\n.ansi-cyan-bg {\n  background-color: #0AA;\n}\n.ansi-white-bg {\n  background-color: #EEE;\n}\n.ansi-bright-black-bg {\n  background-color: #4E4E4E;\n}\n.ansi-bright-red-bg {\n  background-color: #FF6C60;\n}\n.ansi-bright-green-bg {\n  background-color: #0A0;\n}\n.ansi-bright-yellow-bg {\n  background-color: #FFFFB6;\n}\n.ansi-bright-blue-bg {\n  background-color: #96CBFE;\n}\n.ansi-bright-magenta-bg {\n  background-color: #FF73FD;\n}\n.ansi-bright-cyan-bg {\n  background-color: #0AA;\n}\n.ansi-bright-white-bg {\n  background-color: #EEE;\n}\n", ""]);

// exports
exports.locals = {
	"term": "term__term___qouuv",
	"exitcode": "term__exitcode___2u3Id",
	"line": "term__line___3-V4M",
	"loading": "term__loading___2-jC_",
	"error": "term__error___3CLlL"
};

/***/ }),
/* 555 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports.scrollToBottom = exports.scrollToTop = exports.Bottom = exports.Top = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _anchor = __webpack_require__(556);

var _anchor2 = _interopRequireDefault(_anchor);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var Top = exports.Top = function Top() {
	return _react2["default"].createElement("div", { className: _anchor2["default"].top });
};

var Bottom = exports.Bottom = function Bottom() {
	return _react2["default"].createElement("div", { className: _anchor2["default"].bottom });
};

var scrollToTop = exports.scrollToTop = function scrollToTop() {
	document.querySelector("." + _anchor2["default"].top).scrollIntoView();
};

var scrollToBottom = exports.scrollToBottom = function scrollToBottom() {
	document.querySelector("." + _anchor2["default"].bottom).scrollIntoView();
};

/***/ }),
/* 556 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(557);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(4)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../../../node_modules/css-loader/index.js??ref--2!../../../../../../../node_modules/less-loader/dist/cjs.js!./anchor.less", function() {
			var newContent = require("!!../../../../../../../node_modules/css-loader/index.js??ref--2!../../../../../../../node_modules/less-loader/dist/cjs.js!./anchor.less");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 557 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(3)(undefined);
// imports


// module
exports.push([module.i, ".anchor__top___3byOM,\n.anchor__bottom___j1in0 {\n  font-size: 0px;\n}\n", ""]);

// exports
exports.locals = {
	"top": "anchor__top___3byOM",
	"bottom": "anchor__bottom___j1in0"
};

/***/ }),
/* 558 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(559);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(4)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../../node_modules/css-loader/index.js??ref--2!../../../../../../node_modules/less-loader/dist/cjs.js!./index.less", function() {
			var newContent = require("!!../../../../../../node_modules/css-loader/index.js??ref--2!../../../../../../node_modules/less-loader/dist/cjs.js!./index.less");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 559 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(3)(undefined);
// imports


// module
exports.push([module.i, ".index__loading___2ybsE {\n  padding: 20px;\n  border-radius: 2px;\n  background: #eceff1;\n  font-family: 'Roboto Mono', monospace;\n  font-size: 12px;\n}\n.index__error___2zpSZ {\n  background: #eceff1;\n  color: #fc4758;\n  padding: 20px;\n  border-radius: 2px;\n  font-size: 14px;\n  margin-bottom: 10px;\n}\n.index__actions___Vs5AA {\n  position: fixed;\n  bottom: 30px;\n  right: 30px;\n  display: flex;\n  flex-direction: row;\n}\n.index__actions___Vs5AA button {\n  background: #fff;\n  border: none;\n  outline: none;\n  border: 1px solid #bdbdbd;\n  margin-left: -1px;\n  padding: 0px;\n  display: flex;\n  flex-direction: row;\n  align-items: center;\n  padding: 2px;\n  cursor: pointer;\n  color: #212121;\n  justify-content: center;\n  min-width: 32px;\n  min-height: 32px;\n}\n.index__actions___Vs5AA button.index__bottom___1VcSD svg {\n  transform: rotate(180deg);\n}\n.index__actions___Vs5AA button.index__follow___1uZDe svg,\n.index__actions___Vs5AA button.index__unfollow___2WM9F svg {\n  width: 18px;\n  height: 18px;\n}\n.index__actions___Vs5AA svg {\n  fill: #212121;\n}\n.index__logactions___25MHh {\n  position: fixed;\n  bottom: 30px;\n  right: 30px;\n  display: flex;\n}\n.index__logactions___25MHh div {\n  display: flex;\n}\n.index__logactions___25MHh button {\n  background: #fff;\n  border: none;\n  outline: none;\n  border: 1px solid #eceff1;\n  margin-left: -1px;\n  padding: 0px;\n  display: flex;\n  flex-direction: row;\n  align-items: center;\n  padding: 2px;\n  cursor: pointer;\n  color: #212121;\n  justify-content: center;\n  min-width: 32px;\n  min-height: 32px;\n}\n.index__logactions___25MHh button svg {\n  fill: #212121;\n}\n.index__logactions___25MHh button.index__gotoTop___WsH02 {\n  transform: rotate(180deg);\n}\n.index__logactions___25MHh button.index__followButton___2VPgY svg {\n  width: 18px;\n  height: 18px;\n}\n.index__logactions___25MHh button.index__unfollowButton___1zJ1G svg {\n  width: 18px;\n  height: 18px;\n}\n", ""]);

// exports
exports.locals = {
	"loading": "index__loading___2ybsE",
	"error": "index__error___2zpSZ",
	"actions": "index__actions___Vs5AA",
	"bottom": "index__bottom___1VcSD",
	"follow": "index__follow___1uZDe",
	"unfollow": "index__unfollow___2WM9F",
	"logactions": "index__logactions___25MHh",
	"gotoTop": "index__gotoTop___WsH02",
	"followButton": "index__followButton___2VPgY",
	"unfollowButton": "index__unfollowButton___1zJ1G"
};

/***/ }),
/* 560 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(561);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(4)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2!../../../../../node_modules/less-loader/dist/cjs.js!./index.less", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2!../../../../../node_modules/less-loader/dist/cjs.js!./index.less");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 561 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(3)(undefined);
// imports


// module
exports.push([module.i, ".index__host___1kGFX {\n  padding: 0px 20px;\n  padding-bottom: 20px;\n  padding-right: 0px;\n}\n.index__host___1kGFX .index__columns___1L-oi {\n  display: flex;\n}\n.index__host___1kGFX .index__columns___1L-oi .index__left___qjp9F {\n  flex: 1;\n  padding-top: 20px;\n  padding-right: 20px;\n  min-width: 0px;\n  box-sizing: border-box;\n}\n.index__host___1kGFX .index__columns___1L-oi .index__right___1LO5T {\n  box-sizing: border-box;\n  padding-top: 20px;\n  padding-right: 20px;\n  flex: 0 0 350px;\n  min-width: 0px;\n}\n.index__host___1kGFX .index__columns___1L-oi .index__right___1LO5T > section {\n  border-top: 1px solid #eceff1;\n  padding-top: 20px;\n}\nsection.index__sticky___1qmqf {\n  position: sticky;\n  top: 0px;\n}\nsection.index__sticky___1qmqf:stuck {\n  border-top-width: 0px;\n}\n.index__logerror___3Q4k6 {\n  background: #eceff1;\n  color: #fc4758;\n  padding: 20px;\n  display: block;\n  border-radius: 2px;\n  font-size: 14px;\n  margin-bottom: 10px;\n}\n", ""]);

// exports
exports.locals = {
	"host": "index__host___1kGFX",
	"columns": "index__columns___1L-oi",
	"left": "index__left___qjp9F",
	"right": "index__right___1LO5T",
	"sticky": "index__sticky___1qmqf",
	"logerror": "index__logerror___3Q4k6"
};

/***/ }),
/* 562 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports["default"] = undefined;

var _dec, _class;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _menu = __webpack_require__(197);

var _menu2 = _interopRequireDefault(_menu);

var _icons = __webpack_require__(42);

var _build = __webpack_require__(128);

var _proc = __webpack_require__(130);

var _repository = __webpack_require__(23);

var _higherOrder = __webpack_require__(16);

var _inject = __webpack_require__(22);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var binding = function binding(props, context) {
	var _props$match$params = props.match.params,
	    owner = _props$match$params.owner,
	    repo = _props$match$params.repo,
	    build = _props$match$params.build;

	var slug = (0, _repository.repositorySlug)(owner, repo);
	var number = parseInt(build);
	return {
		repo: ["repos", "data", slug],
		build: ["builds", "data", slug, number]
	};
};

var BuildMenu = (_dec = (0, _higherOrder.branch)(binding), (0, _inject.inject)(_class = _dec(_class = function (_Component) {
	_inherits(BuildMenu, _Component);

	function BuildMenu(props, context) {
		_classCallCheck(this, BuildMenu);

		var _this = _possibleConstructorReturn(this, _Component.call(this, props, context));

		_this.handleCancel = _this.handleCancel.bind(_this);
		_this.handleRestart = _this.handleRestart.bind(_this);
		return _this;
	}

	BuildMenu.prototype.handleRestart = function handleRestart() {
		var _props = this.props,
		    dispatch = _props.dispatch,
		    drone = _props.drone,
		    repo = _props.repo,
		    build = _props.build;

		dispatch(_build.restartBuild, drone, repo.owner, repo.name, build.number);
	};

	BuildMenu.prototype.handleCancel = function handleCancel() {
		var _props2 = this.props,
		    dispatch = _props2.dispatch,
		    drone = _props2.drone,
		    repo = _props2.repo,
		    build = _props2.build,
		    match = _props2.match;

		var proc = (0, _proc.findChildProcess)(build.procs, match.params.proc || 2);

		dispatch(_build.cancelBuild, drone, repo.owner, repo.name, build.number, proc.ppid);
	};

	BuildMenu.prototype.render = function render() {
		var _props3 = this.props,
		    build = _props3.build,
		    match = _props3.match;
		var proc = match.params.proc;


		var hideCancel = (0, _build.assertBuildMatrix)(build) && !proc;

		return _react2["default"].createElement(
			"div",
			null,
			!build ? undefined : _react2["default"].createElement(
				"section",
				null,
				_react2["default"].createElement(
					"ul",
					null,
					_react2["default"].createElement(
						"li",
						null,
						build.status === "peding" || build.status === "running" ? !hideCancel ? _react2["default"].createElement(
							"button",
							{ onClick: this.handleCancel },
							_react2["default"].createElement(_icons.CloseIcon, null),
							_react2["default"].createElement(
								"span",
								null,
								"Cancel"
							)
						) : null : _react2["default"].createElement(
							"button",
							{ onClick: this.handleRestart },
							_react2["default"].createElement(_icons.RefreshIcon, null),
							_react2["default"].createElement(
								"span",
								null,
								"Restart Build"
							)
						)
					)
				)
			),
			_react2["default"].createElement(_menu2["default"], this.props)
		);
	};

	return BuildMenu;
}(_react.Component)) || _class) || _class);
exports["default"] = BuildMenu;

/***/ }),
/* 563 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports.Snackbar = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _snackbar = __webpack_require__(564);

var _snackbar2 = _interopRequireDefault(_snackbar);

var _close = __webpack_require__(127);

var _close2 = _interopRequireDefault(_close);

var _reactTransitionGroup = __webpack_require__(131);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Snackbar = exports.Snackbar = function (_React$Component) {
	_inherits(Snackbar, _React$Component);

	function Snackbar() {
		_classCallCheck(this, Snackbar);

		return _possibleConstructorReturn(this, _React$Component.apply(this, arguments));
	}

	Snackbar.prototype.render = function render() {
		var message = this.props.message;


		var classes = [_snackbar2["default"].snackbar];
		if (message) {
			classes.push(_snackbar2["default"].open);
		}

		var content = message ? _react2["default"].createElement(
			"div",
			{ className: classes.join(" "), key: message },
			_react2["default"].createElement(
				"div",
				null,
				message
			),
			_react2["default"].createElement(
				"button",
				{ onClick: this.props.onClose },
				_react2["default"].createElement(_close2["default"], null)
			)
		) : null;

		return _react2["default"].createElement(
			_reactTransitionGroup.CSSTransitionGroup,
			{
				transitionName: "slideup",
				transitionEnterTimeout: 200,
				transitionLeaveTimeout: 200,
				transitionAppearTimeout: 200,
				transitionAppear: true,
				transitionEnter: true,
				transitionLeave: true,
				className: classes.root
			},
			content
		);
	};

	return Snackbar;
}(_react2["default"].Component);

// const SnackbarContent = ({ children, ...props }) => {
// 	<div {...props}>{children}</div>
// }
//
// const SnackbarClose = ({ children, ...props }) => {
// 	<div {...props}>{children}</div>
// }

/***/ }),
/* 564 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(565);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(4)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../node_modules/css-loader/index.js??ref--2!../../../node_modules/less-loader/dist/cjs.js!./snackbar.less", function() {
			var newContent = require("!!../../../node_modules/css-loader/index.js??ref--2!../../../node_modules/less-loader/dist/cjs.js!./snackbar.less");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 565 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(3)(undefined);
// imports


// module
exports.push([module.i, ".snackbar__root___3D7vp {\n  position: absolute;\n  top: -1000px;\n  bottom: -1000px;\n  width: 0px;\n  height: 0px;\n}\n.snackbar__snackbar___13rCk {\n  z-index: 2;\n  position: fixed;\n  min-width: 500px;\n  left: 20px;\n  bottom: 20px;\n  background: #212121;\n  display: none;\n  flex-direction: row;\n  align-items: stretch;\n  box-shadow: 0px 3px 5px -1px rgba(0, 0, 0, 0.2), 0px 6px 10px 0px rgba(0, 0, 0, 0.14), 0px 1px 18px 0px rgba(0, 0, 0, 0.12);\n}\n.snackbar__snackbar___13rCk.snackbar__open___2j5Fx {\n  display: flex;\n}\n.snackbar__snackbar___13rCk > :first-child {\n  flex: 1;\n  line-height: 24px;\n  vertical-align: middle;\n  color: #fff;\n  font-size: 14px;\n  padding: 10px 20px;\n}\n.snackbar__snackbar___13rCk button {\n  display: flex;\n  flex: 0 0 24px;\n  margin: 0px;\n  padding: 0px;\n  border: none;\n  background: transparent;\n  outline: none;\n  cursor: pointer;\n  margin-right: 10px;\n}\n.snackbar__snackbar___13rCk button svg {\n  align-items: center;\n  height: 24px;\n  fill: #fff;\n}\n.slideup-enter {\n  bottom: -50px;\n}\n.slideup-enter.slideup-enter-active {\n  bottom: 20px;\n  transition: bottom 200ms linear;\n}\n.slideup-leave {\n  bottom: 20px;\n}\n.slideup-leave.slideup-leave-active {\n  bottom: -50px;\n  transition: bottom 200ms linear;\n}\n", ""]);

// exports
exports.locals = {
	"root": "snackbar__root___3D7vp",
	"snackbar": "snackbar__snackbar___13rCk",
	"open": "snackbar__open___2j5Fx"
};

/***/ }),
/* 566 */,
/* 567 */,
/* 568 */,
/* 569 */,
/* 570 */,
/* 571 */,
/* 572 */,
/* 573 */,
/* 574 */,
/* 575 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;
exports.MenuButton = exports.CloseButton = exports.Drawer = exports.DOCK_RIGHT = exports.DOCK_LEFT = undefined;

var _react = __webpack_require__(1);

var _react2 = _interopRequireDefault(_react);

var _close = __webpack_require__(127);

var _close2 = _interopRequireDefault(_close);

var _drawer = __webpack_require__(576);

var _drawer2 = _interopRequireDefault(_drawer);

var _reactTransitionGroup = __webpack_require__(131);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var DOCK_LEFT = exports.DOCK_LEFT = _drawer2["default"].left;
var DOCK_RIGHT = exports.DOCK_RIGHT = _drawer2["default"].right;

var Drawer = exports.Drawer = function (_Component) {
	_inherits(Drawer, _Component);

	function Drawer() {
		_classCallCheck(this, Drawer);

		return _possibleConstructorReturn(this, _Component.apply(this, arguments));
	}

	Drawer.prototype.render = function render() {
		var _props = this.props,
		    open = _props.open,
		    position = _props.position;


		var classes = [_drawer2["default"].drawer];
		if (open) {
			classes.push(_drawer2["default"].open);
		}
		if (position) {
			classes.push(position);
		}

		var child = open ? _react2["default"].createElement("div", { key: 0, onClick: this.props.onClick, className: _drawer2["default"].backdrop }) : null;

		return _react2["default"].createElement(
			"div",
			{ className: classes.join(" ") },
			_react2["default"].createElement(
				_reactTransitionGroup.CSSTransitionGroup,
				{
					transitionName: "fade",
					transitionEnterTimeout: 150,
					transitionLeaveTimeout: 150,
					transitionAppearTimeout: 150,
					transitionAppear: true,
					transitionEnter: true,
					transitionLeave: true
				},
				child
			),
			_react2["default"].createElement(
				"div",
				{ className: _drawer2["default"].inner },
				this.props.children
			)
		);
	};

	return Drawer;
}(_react.Component);

var CloseButton = exports.CloseButton = function (_Component2) {
	_inherits(CloseButton, _Component2);

	function CloseButton() {
		_classCallCheck(this, CloseButton);

		return _possibleConstructorReturn(this, _Component2.apply(this, arguments));
	}

	CloseButton.prototype.render = function render() {
		return _react2["default"].createElement(
			"button",
			{ className: _drawer2["default"].close, onClick: this.props.onClick },
			_react2["default"].createElement(_close2["default"], null)
		);
	};

	return CloseButton;
}(_react.Component);

var MenuButton = exports.MenuButton = function (_Component3) {
	_inherits(MenuButton, _Component3);

	function MenuButton() {
		_classCallCheck(this, MenuButton);

		return _possibleConstructorReturn(this, _Component3.apply(this, arguments));
	}

	MenuButton.prototype.render = function render() {
		return _react2["default"].createElement(
			"button",
			{ className: _drawer2["default"].close, onClick: this.props.onClick },
			"Show Menu"
		);
	};

	return MenuButton;
}(_react.Component);

/***/ }),
/* 576 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(577);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(4)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../node_modules/css-loader/index.js??ref--2!../../../../node_modules/less-loader/dist/cjs.js!./drawer.less", function() {
			var newContent = require("!!../../../../node_modules/css-loader/index.js??ref--2!../../../../node_modules/less-loader/dist/cjs.js!./drawer.less");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 577 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(3)(undefined);
// imports


// module
exports.push([module.i, ".drawer__backdrop___26bv9 {\n  position: fixed;\n  top: 0px;\n  bottom: 0px;\n  left: 0px;\n  right: 0px;\n  background-color: rgba(0, 0, 0, 0.54);\n}\n.drawer__inner___QNXoC {\n  background: #fff;\n  width: 300px;\n  box-sizing: border-box;\n  position: absolute;\n  display: flex;\n  flex-direction: column;\n  transition: left ease-in 0.15s;\n  overflow: hidden;\n  position: fixed;\n  top: 0px;\n  bottom: 0px;\n  left: 0px;\n  right: 0px;\n  box-shadow: 0px 8px 10px -5px rgba(0, 0, 0, 0.2), 0px 16px 24px 2px rgba(0, 0, 0, 0.14), 0px 6px 30px 5px rgba(0, 0, 0, 0.12);\n}\n.drawer__drawer___3kRod {\n  position: fixed;\n  width: 0px;\n  height: 0px;\n  left: -1000px;\n  top: -1000px;\n  display: none;\n}\n.drawer__drawer___3kRod.drawer__open___2uEwQ {\n  display: flex;\n}\n.drawer__drawer___3kRod.drawer__open___2uEwQ .drawer__inner___QNXoC {\n  left: 0px;\n  transition: left ease-in 0.15s;\n}\n.drawer__drawer___3kRod.drawer__right___QCsNu .drawer__inner___QNXoC {\n  left: auto;\n  right: 0px;\n}\n.drawer__close___1ibyt {\n  width: 100%;\n  border: none;\n  background: transparent;\n  text-align: right;\n  padding: 10px 10px;\n  margin: 0px;\n  outline: none;\n  cursor: pointer;\n  align-items: center;\n  display: flex;\n}\n.drawer__close___1ibyt svg {\n  fill: #eceff1;\n}\n.drawer__right___QCsNu .drawer__close___1ibyt {\n  flex-direction: row-reverse;\n}\n.drawer__drawer___3kRod ul {\n  border-top: 1px solid #eceff1;\n  padding: 10px 0px;\n  margin: 0px;\n}\n.drawer__drawer___3kRod ul li {\n  padding: 0px;\n  margin: 0px;\n  padding: 0px 10px;\n  display: block;\n}\n.drawer__drawer___3kRod ul a {\n  color: #212121;\n  padding: 0px 10px;\n  line-height: 32px;\n  text-decoration: none;\n  display: block;\n}\n.drawer__drawer___3kRod ul a:hover {\n  background: #eceff1;\n}\n.drawer__drawer___3kRod ul button {\n  background: #fff;\n  border: none;\n  margin: 0px;\n  padding: 0px 10px;\n  width: 100%;\n  cursor: pointer;\n  display: flex;\n  align-items: center;\n}\n.drawer__drawer___3kRod ul button:hover {\n  background: #eceff1;\n}\n.drawer__drawer___3kRod ul button[disabled] {\n  color: #bdbdbd;\n  cursor: wait;\n}\n.drawer__drawer___3kRod ul button[disabled]:hover {\n  background: #eceff1;\n}\n.drawer__drawer___3kRod ul button[disabled] svg {\n  fill: #bdbdbd;\n}\n.drawer__drawer___3kRod ul button span {\n  flex: 1;\n  line-height: 32px;\n  text-align: left;\n  padding-left: 10px;\n}\n.drawer__drawer___3kRod ul button svg {\n  width: 22px;\n  height: 22px;\n  display: inline-block;\n}\n.drawer__drawer___3kRod > section:first-of-type ul {\n  border-top: none;\n}\n.fade-enter {\n  opacity: 0.01;\n}\n.fade-enter.fade-enter-active {\n  opacity: 1;\n  transition: opacity 150ms ease-in;\n}\n.fade-leave {\n  opacity: 1;\n}\n.fade-leave.fade-leave-active {\n  opacity: 0.01;\n  transition: opacity 150ms ease-in;\n}\n", ""]);

// exports
exports.locals = {
	"backdrop": "drawer__backdrop___26bv9",
	"inner": "drawer__inner___QNXoC",
	"drawer": "drawer__drawer___3kRod",
	"open": "drawer__open___2uEwQ",
	"right": "drawer__right___QCsNu",
	"close": "drawer__close___1ibyt"
};

/***/ }),
/* 578 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(579);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(4)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../node_modules/css-loader/index.js??ref--2!../../node_modules/less-loader/dist/cjs.js!./layout.less", function() {
			var newContent = require("!!../../node_modules/css-loader/index.js??ref--2!../../node_modules/less-loader/dist/cjs.js!./layout.less");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 579 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(3)(undefined);
// imports


// module
exports.push([module.i, ".layout__title___2pewo {\n  border-bottom: 1px solid #eceff1;\n  box-sizing: border-box;\n  height: 60px;\n  display: flex;\n  align-items: center;\n  padding: 0px 20px;\n}\n.layout__title___2pewo > :first-child {\n  flex: 1;\n}\n.layout__title___2pewo .layout__avatar___3BOGD {\n  display: flex;\n  align-items: center;\n}\n.layout__title___2pewo .layout__avatar___3BOGD img {\n  border-radius: 50%;\n  width: 28px;\n  height: 28px;\n}\n.layout__title___2pewo button {\n  background: #fff;\n  padding: 0px;\n  margin: 0px;\n  border: none;\n  cursor: pointer;\n  margin-left: 10px;\n  outline: none;\n  display: flex;\n  align-items: stretch;\n}\n.layout__left___1DnSb {\n  position: fixed;\n  top: 0px;\n  left: 0px;\n  right: 0px;\n  width: 300px;\n  overflow: hidden;\n  overflow-y: auto;\n  bottom: 0px;\n  border-right: 1px solid #cfd6db;\n  box-sizing: border-box;\n}\n.layout__center___3QxP5 {\n  box-sizing: border-box;\n  padding-left: 300px;\n}\n.layout__login___3E5Pu {\n  padding: 0px 30px;\n  text-align: center;\n  line-height: 50px;\n  box-sizing: border-box;\n  text-transform: uppercase;\n  display: block;\n  text-decoration: none;\n  color: #fff;\n  font-size: 15px;\n  background: #fdb835;\n  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);\n  margin-top: -1px;\n}\n.layout__guest___3Wc1- .layout__left___1DnSb {\n  display: none;\n}\n.layout__guest___3Wc1- .layout__center___3QxP5 {\n  padding-left: 0px;\n}\n", ""]);

// exports
exports.locals = {
	"title": "layout__title___2pewo",
	"avatar": "layout__avatar___3BOGD",
	"left": "layout__left___1DnSb",
	"center": "layout__center___3QxP5",
	"login": "layout__login___3E5Pu",
	"guest": "layout__guest___3Wc1-"
};

/***/ }),
/* 580 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(581);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(4)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../node_modules/css-loader/index.js??ref--2!../../node_modules/less-loader/dist/cjs.js!./drone.less", function() {
			var newContent = require("!!../../node_modules/css-loader/index.js??ref--2!../../node_modules/less-loader/dist/cjs.js!./drone.less");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 581 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(3)(undefined);
// imports
exports.push([module.i, "@import url(https://fonts.googleapis.com/css?family=Roboto+Mono|Roboto:300,400,500);", ""]);

// module
exports.push([module.i, " {\n}\n* {\n  font-family: \"Roboto\";\n  font-size: 16px;\n}\nhtml,\nbody {\n  margin: 0px;\n  padding: 0px;\n}\n", ""]);

// exports


/***/ })
],[201]);