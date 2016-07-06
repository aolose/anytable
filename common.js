var ajaxWorker = function(url,opt,data , dataType , handler){
	// 参数处理 智能匹配 兼容jq Ajax 配置
	var args = Array.prototype.slice.call(arguments);
	if(typeof url==='object'){
		opt = url;
		args.splice(0,0,undefined);
	}
	if('object'!==typeof opt){
		opt = {};
		var pMap={
			'string':function(a){
				a.replace(/^\s+|\s+$/);
				return /get|post/gi.test(a)&&'type'
					|| /^json|jsonP|xml|text$/gi.test(a)&&'dataType'
					|| /[{|}|\[|\]]/.test(a)&&'data'
					||false
			},
			'object':['data'],
			'function':['handler']
		};
		args.slice(1,6).forEach(function(a){
			var c,p;
			c= pMap[typeof a];
			p =typeof c==='function'&&c(a)|| c.splice(0,1)[0];
			if(p)opt[p]=a;
		});
	}
	opt = $.extend({
		url: url,
		type: 'get',
		contentType: /^post$/i.test(opt.type)
			? 'application/x-www-form-urlencoded;charset=UTF8'
			: 'html/text;charset=UTF8',
		dataType: 'json'
	}, opt);
	//降级 - jquery Ajax 方案
	if(!'Worker' in window){
		var f = opt.handler&&'_'||'';
		opt.dataType = f+opt.dataType;
		if(f){
			var c={converters:{}};
			c[opt.dataType +' '+ opt.dataType] = opt.handler;
			delete opt.handler;
		}
		return $.ajax($.extend(opt,c));
	}
	if(opt.handler){
		opt.handler = Object.toString.call(opt.handler);
	}
	//增强 - web Worker 方案
	var worker = function (opt) {
		var w = new Worker('ajaxWorker.js');
		var def = $.Deferred();
		$.extend(this, def.promise());
		var suc = opt.success, err = opt.error;
		if (suc) {
			delete opt.success;
			this.done(function () {
				suc.apply(this, arguments)
			})
		}
		if (err) {
			delete opt.error;
			this.fail(function () {
				err.apply(this, arguments)
			})
		}
		w.onmessage = function (e) {
			var r = e.data;
			w.onmessage=undefined;
			w.terminate();
			if (r.fail) {
				return def.reject.apply(this, r.fail);
			}
			else if (r.done) {
				return def.resolve.apply(this, r.done);
			}
		};
		w.postMessage(opt);
	};
	return new worker(opt);
};
var definedDom = function (tag, opt) {
	var d, r = {}, _func, _children;
	if ('function' === typeof arguments[0]) {
		var _f = arguments[0];
		var callback = function (a) {
			r.dom.appendChild(definedDom(a));
		}.bind(r);
		r.dom = definedDom(_f(callback));
		return r.dom;
	}
	if ('object' === typeof arguments[0]) {
		opt = arguments[0];
		tag = opt['tag'];
		if (opt && /^\[object NodeList]$|^\[object Array]$/i.test(Object.prototype.toString.apply(opt))) {
			opt = {children: opt}
		}
	} else {
		tag = arguments[0];
		opt = arguments[1];
	}
	var _opt = {};
	for (var p in opt) {
		if (opt.hasOwnProperty(p))
			_opt[p] = opt[p];
	}
	opt = _opt;
	delete opt['tag'];
	if (!tag)d = document.createDocumentFragment();
	else {
		d = document.createElement(tag);
	}
	r.dom = d;
	if (opt.virtualParentNode) {
		d.virtualParentNode = opt.virtualParentNode;
		delete opt.virtualParentNode;
	}
	if (opt.text) {
		d.textContent = opt.text;
		delete  opt.text
	}
	if (opt.func) {
		_func = opt.func;
		delete opt.func;
	}
	if (opt.html) {
		d.innerHTML = opt.html;
		delete opt.html;
	}
	if (opt.class) {
		d.className = opt.class;
		delete  opt.class
	}
	if (opt.html) {
		d.innerHTML = opt.html;
		delete  opt.html
	}
	if (opt.css && 'object' === typeof opt.css) {
		for (var i in opt.css) {
			if (opt.css.hasOwnProperty(i)) {
				d.style[i] = opt.css[i];
			}
		}
		delete opt.css;
	}
	if (opt.children) {
		if (!/^\[object NodeList]$|^\[object Array]$/i.test(Object.prototype.toString.apply(opt.children))) {
			_children = [opt.children];
		} else {
			_children = opt.children
		}
		delete  opt.children;
	}
	for (var o in opt) {
		if (opt.hasOwnProperty(o)) {
			d[o] = opt[o]
		}
	}
	if (_children) {
		if (_children.length) {
			var f = document.createDocumentFragment();
			[].forEach.call(_children, function (c) {
				c = c || {};
				if (!/\[object HTML.*?Element]|\[object Text]/i.test(Object.prototype.toString.apply(c))) {
					c.virtualParentNode = d;
					c = definedDom(c);
				}
				f.appendChild(c);
			});
			d.appendChild(f);
			[].forEach.call(d.children || [], function (c) {
				delete c.virtualParentNode;
			});
		}
	}
	if (_func) {
		_func.call(r.dom);
	}
	return d
};