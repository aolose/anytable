/**
 * @description
 *    日期选择组件核心部分
 *    用于和anyrender 结合
 *    操作体验参考Window7任务栏的日期
 * @Class Anytable
 * */
var Anydate = function () {
	var states = ['date', 'month', 'year', 'decade', 'century'];
	Object.defineProperties(states, {
		next: {
			get: function () {
				return states[states.indexOf(state) + 1]
			}
		},
		prev: {
			get: function () {
				return states[states.indexOf(state) - 1]
			}
		}
	});
	var createDateObj = function (da) {
		var _da, year, decade, century, month, date, hh, mm, ss;
		var init = function (v) {
			_da = new Date(v);
			if (!_da.valueOf())_da = new Date();
			year = _da.getFullYear();
			decade = parseInt(year / 10);
			century = parseInt(year / 100);
			month = _da.getMonth();
			date = _da.getDate();
			hh = _da.getHours();
			mm = _da.getMinutes();
			ss = _da.getSeconds();
			return this;
		};
		init(da);
		var ds = {
			0: 31, get 1() {
				return new Date(new Date(year + '-3-1') - 86400000).getDate()
			},
			2: 31, 3: 30, 4: 31, 5: 30, 6: 31, 7: 31, 8: 30, 9: 31, 10: 30, 11: 31
		};
		var x = {
			init: init,
			getStateInfo: function (s, flag, v) {
				v = v || 1*x.dateValue;
				switch (s) {
					case 'date':
						x.init(v);
						return 1*x.dateValue + (flag&&86399999||0);
					case 'month':
						x.date = flag&& x.dates[x.date]||1;
						break;
					case 'year':
							x.month = flag&&11||0;
						break;
					case 'decade':
						x.year = s * 10 + (flag&&9||0);
						break;
					case 'century':
						x.year = s * 100 + (flag&&99||0);
				}
				return x.getStateInfo(states[states.indexOf(s) - 1],flag, v);
			}
		};

		Object.defineProperties(x, {
			dates: {
				get: function () {
					return ds
				}
			},
			dateValue: {
				get: function () {
					return new Date([year, month + 1, date].join('-'))
				}
			},
			timeValue: {
				get: function () {
					return 1000 * (ss + 60 * mm + 3600 * hh)
				}
			},
			hour: {
				get: function () {
					return hh
				}, set: function (v) {
					hh = v
				}
			},
			minute: {
				get: function () {
					return mm
				}, set: function (v) {
					mm = v
				}
			},
			second: {
				get: function () {
					return ss
				}, set: function (v) {
					ss = v
				}
			},
			century: {
				get: function () {
					return century
				},
				set: function (v) {
					century = v;
					decade = century * 10;
					year = decade * 10 + (year % 10);
				}
			},
			decade: {
				get: function () {
					return decade
				},
				set: function (v) {
					decade = v;
					century = parseInt(decade / 10);
					year = decade * 10 + (year % 10);
				}
			},
			year: {
				get: function () {
					return year
				},
				set: function (v) {
					year = v;
					decade = parseInt(year / 10);
					century = parseInt(year / 100);
					if (month === 1 && date > 28)x.date = 0 + x.date
				}
			},
			month: {
				get: function () {
					return month
				},
				set: function (v) {
					if (v > 11) {
						x.year++;
						x.month = x.month % 11
					} else if (v < 0) {
						x.year--;
						x.month = x.month + 11;
					} else month = v;
				}
			},
			date: {
				get: function () {
					return date;
				},
				set: function (v) {
					var max = ds[month];
					if (v > max) {
						x.month++;
						x.date = v % max;
					} else if (v < 1) {
						x.month--;
						max = ds[month];
						x.date = v + max
					} else date = v;
				}
			}
		});
		return x;
	};
	var
		cursor = createDateObj(),
		da = createDateObj(),
		sel = createDateObj(new Date()),
		min = createDateObj('1900-1-1'),
		max = createDateObj('2900-1-1 23:59:59'),
		plane, state = 'date', opt, locked,
		i18n = {
			'zh-cn': {
				year: '年',
				week: ['日', '一', '二', '三', '四', '五', '六'],
				month: '月',
				months: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
			}
		};
	var getMonthStartDay = function (year, month) {
		return new Date(year + '-' + (month + 1) + '-1').getDay() || 7
	};
	var createEl = function (cls, func) {
		var elValue = cursor.dateValue;
		var v = cursor[state];
		var nState = states.next;
		var pState = states.prev;
		var able = isAbleDate(cursor, state);
		var distance = elValue - sel.dateValue;
		var flag = cursor[nState] !== da[nState];
		var _d = Date.now() - elValue;
		var today = _d <= 86400000 && _d >= 0;
		if (flag) {
			flag = distance > 0 && 1 || -1
		}
		return definedDom('div', {
			children: {tag: 'div', text: able && (func && func(cursor[state]) || cursor[state])},
			class: cls
			+ (today ? ' _today' : '')
			+ (able && distance === 0 ? ' active' : '')
			+ (able ? '' : ' disable')
			+ (da[nState] !== cursor[nState] ? ' other' : ''),
			/**@this {Node}*/
			onclick: able && function () {
				da[state] = v;
				var c = plane.querySelector('.active');
				if (c)c.className = c.className.replace(' active', '');
				this.className = cls + ' active';
				sel.init(elValue);
				setTime(timeBox.hour, timeBox.minute, timeBox.second);
				if (pState) {
					state = pState;
					return addPlane(undefined, 1, 1);
				} else {
					if (opt.onDatePick)opt.onDatePick(sel);
					if (flag)addPlane(flag, 0, 1);
				}
			}
		})
	};
	var isAbleDate = function (obj, state, fix) {
		var _v = obj.dateValue;
		var minV = 1*min.dateValue;
		var maxV = 1*max.dateValue;
		if (fix)obj[state] += fix;
		var _max = obj.getStateInfo(state, true);
		var _min = obj.getStateInfo(state);
		obj.init(_v);
		var arrayM = [minV, maxV, _min, _max].sort(function (a, b) {
			return a - b
		});
		return _max==minV||_min===maxV||(1 !== arrayM.indexOf(maxV) && 1 !== arrayM.indexOf(_max))
	};
	var ablePrev = true;
	var ableNext = true;
	var addPlane = function (flag, fadeIn, keepSel) {
		cursor.init();
		if (cursor.dateValue > max.dateValue || cursor.dateValue < min.dateValue) {
			btnNow.className = btnNow.active = 'today display'
		} else {
			btnNow.className = btnNow.active = 'today'
		}
		da.date = 1;
		ableNext = isAbleDate(da, states.next, 1);
		ablePrev = isAbleDate(da, states.next, -1);
		if (!ablePrev && flag === -1)return;
		if (!ableNext && flag === 1)return;
		if (locked)return;
		locked = true;
		var transformOrigin = '50% 50% 0';
		var titleText;
		var _i18n = i18n[opt.i18n];
		var type = state;
		var els = [];
		var clsN = 'date-grid cell4';
		if (flag) {
			da[states.next] += parseInt(flag) || 0;
			ableNext = isAbleDate(da, states.next, 1);
			ablePrev = isAbleDate(da, states.next, -1);
		}
		prev.className = 'prev' + (!ablePrev && ' dis' || '');
		next.className = 'next' + (!ableNext && ' dis' || '');
		cursor.init(da.dateValue);
		switch (type) {
			case 'date':
				clsN = 'date-grid cell7';
				titleText = da.year + _i18n.year + (da.month + 1) + _i18n.month;
				els = _i18n.week.map(function (d) {
					return definedDom('div', {class: clsN + ' week', children: {tag: 'div', text: d}})
				});
				var x = 1 - getMonthStartDay(da.year, da.month);
				cursor.date = x;
				for (var i = 0; i < 42; i++, cursor.date++) {
					els.push(createEl(clsN));
				}
				break;
			case 'month':
				titleText = da.year + _i18n.year;
				cursor.year = da.year;
				els = _i18n.months.map(function (m, i) {
					cursor.month = i;
					return createEl(clsN, function () {
						return m
					})
				});
				break;
			case 'year':
				var y1 = da.decade * 10;
				var y2 = (da.decade + 1) * 10;
				titleText = y1 + '-' + (y2 - 1);
				for (var k = y1 - 1; (cursor.year = k) <= y2; k++) {
					els.push(createEl(clsN))
				}
				break;
			case 'decade':
				clsN += ' decade';
				var d1 = da.century * 100;
				var d2 = (da.century + 1) * 100;
				titleText = d1 + '-' + (d2 - 1);
				for (var j = d1 / 10 - 1; (cursor.decade = j) <= d2 / 10; j++) {
					els.push(createEl(clsN, function (v) {
						return v * 10 + '-' + (v * 10 + 9)
					}))
				}
				break;
		}
		var clsPR = 'box right';
		var clsPL = 'box left';
		var clsPS2 = 'box scale2';
		var clsPS0 = 'box scale0';
		var clsP = 'box';
		var _plane = definedDom('div', {
			class: clsP,
			children: els
		});
		var actEl;
		if (fadeIn) {
			actEl = _plane.querySelector('.date-grid.active');
		} else {
			actEl = plane && plane.querySelector('.date-grid.active')
		}
		if (actEl) {
			var is4 = clsN.indexOf('date-grid cell4') !== -1;
			var step = is4 ? 4 : 7;
			var elH = is4 ? 42 : 28;
			var elW = is4 ? 49 : 18;
			var elIndex = [].indexOf.call(actEl.parentNode.childNodes, actEl);
			var iY = parseInt((elIndex + step) / step) - 0.5;
			var iX = (elIndex + step) % step + 0.5;
			transformOrigin = (iX * elW) + 'px ' + (iY * elH) + 'px';
			_plane.setAttribute('style',
				'-webkit-transform-origin: ' + transformOrigin
				+ ';-ms-transform-origin: ' + transformOrigin
				+ ';-o-transform-origin: ' + transformOrigin
				+ ';transform-origin: ' + transformOrigin + ';')
		}
		if (flag === -1) {
			_plane.className = clsPL;
			container.insertBefore(_plane, plane);
			setTimeout(function () {
				if (plane) {
					plane.className = clsPR;
					_plane.className = clsP;
				}
			}, 100);
		} else if (flag === 1) {
			_plane.className = clsPR;
			container.appendChild(_plane);
			setTimeout(function () {
				if (plane) {
					plane.className = clsPL;
					_plane.className = clsP;
				}
			}, 100);
		} else {
			if (flag === undefined && plane)_plane.className = fadeIn && clsPS0 || clsPS2;
			container.appendChild(_plane);
			if (plane) {
				setTimeout(function () {
					_plane.className = clsP;
				}, 100);
			}
		}
		setTimeout(function () {
			title.textContent = titleText;
			if (plane)plane.remove();
			plane = _plane;
			locked = false;
		}, 400);
	};
	var setTime = function (h, m, s) {
		sel.hour = timeBox.hour = h;
		sel.minute = timeBox.minute = m;
		sel.second = timeBox.second = s;
	};
	var container = definedDom('div', {
		class: 'anydate-body',
		onmousewheel: function (e) {
			e.stopPropagation();
			e.preventDefault();
			addPlane((e.deltaY > 0) * 2 - 1);
		}
	});
	// 上一个
	var prev = definedDom('div', {class: 'prev', onclick: addPlane.bind(null, -1)});
	// 下一个
	var next = definedDom('div', {class: 'next', onclick: addPlane.bind(null, 1)});
	// 深入
	var title = definedDom('div', {
		class: 'title',
		text: '',
		onclick: function () {
			if (states.next !== 'century') {
				state = states.next;
				addPlane();
			}
		}
	});
	//头部
	var head = definedDom('div', {
		class: 'anydate-head',
		children: [prev, title, next]
	});
	//底部
	var numberOnly = function (e) {
		var keyCode = e.keyCode;
		var ctrlKey = e.ctrlKey;
		var shiftKey = e.shiftKey;
		if ([46, 8, 9, 27, 13, 110, 190].indexOf(keyCode) !== -1 ||
			(keyCode == 65 && ctrlKey === true) || // Ctrl+A
			(keyCode >= 35 && keyCode <= 39)// home, end, left, right
		) {
			return;
		}
		if ((shiftKey || (keyCode < 48 || keyCode > 57)) && (keyCode < 96 || keyCode > 105)) {
			e.preventDefault();
			e.stopPropagation();
		}
	};
	var numberCheck = function () {
		var v = parseInt(this.value) || 0;
		if (v < this.min)v = this.value = this.min;
		if (v > this.max)v = this.value = this.max;
		da[this.name] = v;
	};
	var createTimeInput = function (name, min, max) {
		var i = definedDom({
			tag: 'input', type: 'text',
			onclick: function () {
				this.select()
			},
			onmousewheel: function (e) {
				e.preventDefault();
				e.stopPropagation();
				var x = e.deltaY < 0;
				var v = parseInt(this.value) || 0;
				if (v < this.max && x)v++;
				if (v > this.min && !x)v--;
				if (v != this.value) {
					this.value = v;
					this.onkeyup();
				}
				this.onblur();
			},
			onkeydown: numberOnly,
			onkeyup: numberCheck,
			onblur: function () {
				this.value = (100 + (parseInt(this.value) || 0) + '').substr(1)
			},
			max: max, min: min, name: name
		});
		Object.defineProperty(timeBox, name, {
			get: function () {
				return 1 * i.value
			},
			set: function (v) {
				i.value = v;
				i.onblur();
			}
		});
		return i;
	};
	var timeBox = definedDom('div', {class: 'time-box'});
	var _tb = definedDom([
		, createTimeInput('hour', 0, 23), {tag: 'span', text: ':'},
		createTimeInput('minute', 0, 59), {tag: 'span', text: ':'},
		createTimeInput('second', 0, 59), {
			tag: 'div', class: 'reset-time', text: 'X', onclick: function () {
				timeBox.hour = '00';
				timeBox.minute = '00';
				timeBox.second = '00';
			}
		}
	]);
	timeBox.appendChild(_tb);
	var btnNow = definedDom({
		tag: 'div',
		class: 'today',
		text: 'Now',
		title: '跳转到当前时间',
		onclick: function () {
			if (this.active !== 'today')return;
			cursor.init();
			sel.init();
			var data = new Date();
			if (state === 'date') {
				var y = data.getFullYear();
				var m = data.getMonth();
				var d = data.getDate();
				var x = (y - da.year) || (m - da.month) || 0;
				if (x) {
					x = (x > 0) * 2 - 1;
					da.year = y;
					da.month = m - x;
					da.date = d;
				}
				addPlane(x)
			} else {
				state = 'date';
				addPlane(undefined, 1)
			}
			setTime(data.getHours(), data.getMinutes(), data.getSeconds());
			if (opt.onDatePick)opt.onDatePick(sel);
		}
	});
	var foot = definedDom('div', {
		class: 'anydate-foot',
		children: [timeBox, btnNow]
	});
	var anydateDom = definedDom('div', {
		class: 'anydate',
		children: [head, container, foot]
	});
	this.dom = anydateDom;
	this.close = function () {
		if (plane) {
			plane.remove();
			plane = undefined;
		}
		if (opt.close)opt.close();
		anydateDom.remove();
	};
	this.picked = sel;
	this.setTime = setTime;
	this.open = function (options) {
		opt = options = options || {};
		if (opt.open)opt.open(anydateDom);
		options.i18n = options.i18n || 'zh-cn';
		if (options.max)max.init(options.max);
		if (options.min)min.init(options.min);
		sel.init(options.date);
		if (sel.dateValue < min.dateValue)sel.init(min.dateValue);
		else if (sel.dateValue > max.dateValue)sel.init(max.dateValue);
		da.init(sel.dateValue);
		setTime(0, 0, 0);
		state = 'date';
		addPlane();
		title.textContent = da.year + i18n[options.i18n].year + (da.month + 1) + i18n[options.i18n].month;
		document.body.appendChild(anydateDom);
		return this
	};
};