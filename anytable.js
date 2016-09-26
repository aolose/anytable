/**
 *  Anytable表格
 * @author zwy
 * @class Anytable
 * @licence MIT
 * */
!function () {
	if (!('remove' in Element.prototype)) {
		Element.prototype.remove = function() {
			if (this.parentNode) {
				this.parentNode.removeChild(this);
			}
		};
	}
	// 字符串转uncode 用于筛选时候的正则表达式
	var unicodeStr = function(str) {
		var u='';
		for (var i= 0,l=str.length;i<l;i++){
			u+="\\u" + (0x10000+str[i].charCodeAt(0)).toString(16).substr(1)
		}
		return u;
	};

	var addClass = function(dom,cls){
		if(dom){
			var _cls = dom.className||'';
			var regex = new RegExp(' *'+cls,'g');
			dom.className = _cls.replace(regex,'')+' '+cls;
		}
	};

	var removeClass = function(dom,cls){
		if(dom){
			var _cls = dom.className||'';
			var regex = new RegExp(' *'+cls,'g');
			dom.className = _cls.replace(regex,'')
		}
	};

	var stopEvent = function(e){
		e.preventDefault();
		e.stopPropagation();
	};
	// 设置不可枚举的属性
	var setUnEnumProps = function (obj, key, value) {
		var o = {};
		o[key] = {enumerable: false, writable: true, configurable: true};
		if (undefined !== value)o[key].value = value;
		Object.defineProperties(obj, o)
	};
	// 简单的继承实现
	var extend = function () {
		var a = arguments[0];
		var rule = function(obj,k){
			var v = obj[k];
			return null !== v && undefined !== v
		};
		var length = arguments.length;
		if('function'===typeof arguments[length-1]){
			length--;
			rule = arguments[length];
		}
		for (var i = 1; i < length; i++) {
			var b = arguments[i];
			if (b)for (var k in b) {
				if (b.hasOwnProperty(k)) {
					var c = b[k];
					if (rule(b,k)) {
						if('[object Object]'===Object.prototype.toString.call(c)){
							if('object'!==typeof a[k])a[k]={};
							extend(a[k],c);
						}else a[k] = b[k];
					}
				}
			}
		}
		return a;
	};
	// 基于ID获取样式规则
	var getCSSStyleSheetById = function (id) {
		var styles = document.styleSheets;
		for (var i = 0; i < styles.length; i++) {
			var s = styles[i];
			if (id === s.ownerNode.id) {
				return s
			}
		}
	};

	var translate3D = function(dom,a,b,c){
		if(undefined===dom)return;
		var s={};
		if(dom instanceof Node) s = dom.style;
		else if(dom instanceof CSSStyleDeclaration) s=dom;
		if(a!==0)a+='px';
		if(b!==0)b+='px';
		if(c!==0)c+='px';
		s.transform
			= s.transform
			= s.webkitTransform
			=s.mozTransform
			= s.msTransform
			= s.oTransform
			= 'translate3d('+a+','+b+','+c+')';
	};

	/**
	 * @description 用于创建render组件
	 * @see anyrender.js
	 * */
	window.anyrender={
		extend:extend,
		/**@params name {String}*/
		create:function (name, init,func, extra) {
			var render = function (extra) {
				// 拷贝副本
				eval('var func =' + func.toString());
				var opt={};
				opt=init&&init(opt)||opt;
				var setGet = function (key) {
					Object.defineProperty(func, key, {
						get: function () {
							var _func = extra[key](opt, func);
							if ('function' === typeof _func) {
								return _func;
							}
							return func;
						}
					})
				};
				if (extra)for (var k in extra) {
					if (extra.hasOwnProperty(k)) {
						setGet(k);
					}
				}
				// 塞一个 opt~
				var call=func.call = function () {
					delete func.call;
					var args = arguments;
					var self = args[0];
					var params = [].slice.call(args, 1).concat(opt);
					var r=func.apply(self, params);
					func.call=call;
					return r;
				};
				return func;
			};
			Object.defineProperty(anyrender, name, {
				get: function () {
					return render(extra);
				}
			})
		}
	};

	// 全局类
	window.Anytable = function (selector, options) {
		var hCellSelector = '[class*=anycell__]';
		// copy!
		var _cols = JSON.stringify(options.cols);
		options.cols = extend(JSON.parse(_cols),options.cols);
		var anytable = this, hTable, dragCol,tempData=[];
		var cur,size,total;
		var _sortR=[],sortRules=[];
		var frozenSize=0;
		var frozenCols=[];
		// 全部数据
		setUnEnumProps(anytable, 'data');
		// 展示数据(筛选隐藏等);
		setUnEnumProps(anytable, 'vData');
		// 过滤规则
		setUnEnumProps(anytable, 'filterRules');
		// 生成带载入动画的文字
		var loadingText = function(text){
			if(!text)text=opt.loadingText;
			return definedDom({
				tag:'div',
				class:'mask',
				children:{
					tag:'div',
					class:'anytable-loading',
					children:[
						{tag:'span'},
						{
							tag:'div',
							text:text
						}
					]
				}
			});
		};
		//无图标文字
		var loadedText = function(text){
			return definedDom({
				tag:'div',
				class:'mask',
				children:{
					tag:'div',
					class:'anytable-loading',
					children:
					{
						tag:'p',
						text:text||opt.noDataText
					}
				}
			});
		};

		// 基于当前时间生成唯一ID
		var anyId = 'AT'+(1 * (Date.now() + '' + (1000 * Math.random()).toFixed(0)).substr(-8)).toString(36);
		// 样式ID
		var cssId = 'c_' + anyId;
		// 表格ID
		var tId = 't_' + anyId;
		var style = definedDom('style', {id: cssId});
		anytable.style = {};
		document.head.appendChild(style);
		// 关联样式规则
		anytable.css = getCSSStyleSheetById(cssId);
		var defaultOpt = {
			// 保存
			save:false,//function(opt){},
			freeze:0,
			autoLoad:true,
			// 数据获取装置
			dataGainer:function(url,method,params,done,fail){
				$.ajax({
					url:url,
					type: method,
					contentType: "application/json",
					dataType: "json",
					data:JSON.stringify(params)
				}).done(done).fail(fail)
			},
			url: undefined,
			method: undefined,
			params: undefined,
			cache: false,
			loadingText: '载入中',
			noDataText: '暂无数据',
			loadErrorText: '数据加载出现异常',
			sortBy: [], //desc - 降序 ，asc- 升序  ['xxoo desc 1','ooxx asc 2','oxox asc',...]
			nowrap: false,
			indexColWidth: 30,
			indexCol: false,
			// 底部工具栏
			toolBar:true,
			//分页配置
			paging:{
				remote:false,
				pageSize:[100,200,300,500],
				paramsName:{
					total:'total',				// 总数
					size:'pageSize',			// 每页显示多少
					cur:'currentPage'  // 请求页
				}
			},
			// 行点击事件
			rowClick:false,
			// 是否允许筛选
			allowFilter:false,
			// 点击选中行
			clickCanSelectRow: true,
			checkCol: false,
			multiSelect: false,
			// 表格容器高度
			height: 300,
			// 最小列宽
			colMinWidth: 10,
			// 预设行高
			rowHeight: 20,
			// 拖拽改变列宽
			changeWidth: true,
			// 拖拽改变行高
			dragRowHeight: false,
			// 拖拽改变列位置
			dragColumn: true,
			// 列配置
			cols: [],
			filter:function(d){return true},
			root:'rows',
			// 预设滚动条宽度 当前元素隐藏时候使用
			scrollBarWidth: 20
		};
		var opt = extend({}, defaultOpt, options);
		anytable.options =opt;
		var dom;
		if(selector instanceof Node)dom = selector;
		else if('string'===typeof  selector)dom = document.querySelector(selector);
		else  throw new Error('error selector');
		if(!dom)return;
		// 结果排序
		var sortData = function(data){
			var rs = sortRules;
			var _sk =rs.map(function(r){return r.name+'|'+ r.type+'|'+ r.order}).join('#');
			var sortKey = anytable.sortKey;
			var sortData = anytable.sortData;
			if(!rs.length){return data}
			if(_sk===sortKey&&!opt.sort.remote&&sortData){
				return sortData.concat();
			}else {
				anytable.sortKey = _sk;
				delete  anytable.sortData;
			}
			var _data = data.concat();
			var compare;
			// 优先地方语言比较大小
			try {
				compare = new Intl.Collator(opt.sort&&opt.sort.local||'zh-Hans-CN',{
					numeric:true
				});
			}catch (e){
				compare = {
					compare:function(a,b){
						var r = a-b;
						if(isNaN(r))r=(a>b&&1)||(a<b&&-1)||0;
						return r
					}
				}
			}
			var sortBy = function(a,b){
				for (var i= rs.length-1; i >-1; i--) {
					var r = rs[i], k = r.name, _t, _r;
					var c1 = 'string' !== typeof a[k] ? a[k] : a[k].toLowerCase();
					var c2 = 'string' !== typeof b[k] ? b[k] : b[k].toLowerCase();
					if ('desc' === r.type) {
						_t = c1;
						c1 = c2;
						c2 = _t;
						_t = undefined;
					}
					_r = compare.compare(c1, c2);
					if (_r)return _r;
				}
				return 0;
			};
			if(opt.sort && !opt.sort.remote)_data.sort(sortBy);
			anytable.sortData=_data;
			return _data.concat();
		};
		// todo 过滤
		//var filterDatas = function(datas){
		//
		//};
		// 数据处理器
		// todo 分离过滤 数据方法
		var processDatas = function(){
			delete anytable.sortKey;
			delete anytable.sortData;
			tempData.length=0;
			if(anytable.fData)anytable.fData.length=0;
			var doFilter = function(d){
				var a = opt.filter(d);
				if(a){
					for(var i= 0,l=filterRules.length;i<l;i++){
						if(!filterRules[i].func(d)){
							a=false;
							break;
						}
					}
				}
				return a
			};
			for(var j= 0,d=anytable.data,m=d.length;j<m;j++){
				if(doFilter(d[j])){
					tempData.push(d[j]);
				}
			}
			renderDatas();
		};
		// 整理筛选过滤后需要渲染的数据
		var renderDatas = function(){
			anytable.fData=sortData(tempData);
			if(!opt.url&&!opt.paging.remote){
				anytable.pager.total = anytable.fData.length;
			}
			anytable.pager.cur =anytable.pager.cur||1;
			anytable.vData = anytable.fData;
			var p = anytable.pager;
			var start = p.size* (p.cur-1);
			if(opt.toolBar&&opt.paging&&!(opt.paging.remote&&opt.url)){
				var end = start+ p.size;
				anytable.vData = anytable.fData.slice(start,end);
				start=0;
			}else {
				anytable.vData = anytable.fData;
			}
			for(var i= 0,ds=anytable.fData,l=ds.length;i<l;i++){
				ds[i][anyId].renderedIndex = i+start;
			}
		};
		var ch = 'auto';
		if (/[^0-9 ]$/.test(opt.height)) {
			ch = opt.height;
		} else ch = parseInt(opt.height) + 'px';

		// 侦测可视区域宽度
		var widthDetectDom = definedDom('div', {
			css: {width: '100%'}
		});
		// 拖拽辅助线
		var auxiliaryLine = definedDom('div', {
			css: {
				position: 'absolute',
				top: 0,
				left: 0,
				display: 'none',
				bottom: 0,
				borderLeft: '1px dashed #03A9F4'
			}
		});
		var tbody = definedDom('tbody');
		var table = definedDom('table', {
			children: tbody,
			css: {position: 'relative',css:{marginLeft:'-1px'}}
		});
		var tCanvas = definedDom('div', {
			css: {position: 'relative'},
			children: table
		});
		// 基于左距离获取坐标对应的头部元素
		var detectSideInsertByClientX = function (x, newCol,row) {
			var left = x ;
			var r = row, cs = [].filter.call(r.cells,function(c){return !c.cssRule||'none'!==c.cssRule.style.display}), lf = 0;
			for (var i = 0, l = cs.length; i < l; i++) {
				var c = cs[i], cw = c.offsetWidth;
				lf += cw;
				if (left < lf) {
					if(c===newCol)return;
					var layerX = lf - left;
					var ps = layerX / cw;
					if (ps < 0.4) {
						var cn = c.nextSibling;
						if (cn)r.insertBefore(newCol, cn);
						else r.appendChild(newCol);
					} else if (ps > 0.6) {
						r.insertBefore(newCol, c)
					}
					return c;
				}
			}
		};
		//基于Index移动列
		var moveColumnByCols = function(){
			opt.cols = [].map.call(hTable.querySelectorAll(hCellSelector),function(c){return c.parentNode[anyId]});
			var trackers = opt.cols.map(function(c){
				return c.tracker
			});
			var move = function(r){
				var cells =  [].slice.call(r.cells).sort(function(a,b){
					var tracker1 = a.tracker;
					var tracker2 = b.tracker;
					for(var i=0,l=trackers.length;i<l;i++){
						var tracker = trackers[i];
						if(tracker1===tracker)return -1;
						if(tracker2===tracker)return 1
					}
				});
				r.appendChild(definedDom(cells));
			};
			for (var i = 0, rs = tbody.rows, l = rs.length; i < l; i++) {
				move(rs[i]);
			}
			refreshHeadIndex();
			setFrozen(frozenSize,true);
		};
		// 刷新数据位置
		var refreshDatasPosition = function (i) {
			console.time('refreshDatasPosition');
			if(i<0||!i)i=0;
			var datas = anytable.vData;
			if(!datas[0]){
				tCanvas.style.height=opt.height+'px';
				table.removeAttribute('style');
				return;
			}
			if(i===0)datas[0][anyId].top=0;
			for (var k = i, t, d, l = datas.length; (d = datas[k]) && k < l; k++) {
				if (t) {
					d[anyId].top = t[anyId].top + t[anyId].height;
				} else {
					d[anyId].top = d[anyId].top || 0;
				}
				t = d;
			}
			if(t)tCanvas.style.height = t[anyId].top + t[anyId].height + 'px';
			else {
				console.warn('tCanvas.style.height:',tCanvas.style.height);
			}
			if('function'===typeof opt.onRefreshDatasPosition)opt.onRefreshDatasPosition.call(anytable);
			console.timeEnd('refreshDatasPosition');
		};
		//根据头部距离获取行号
		var getIndexByTop = function (t) {
			var ds = anytable.vData;
			for (var i = 0, l = Math.min(parseInt(t / opt.rowHeight), ds.length); i < l; i++) {
				var d = ds[i][anyId];
				if (t <= d.top + d.height)break;
			}
			return [i, t - (d && d.top || 0)];
		};
		// 创建范围的行
		var createRange = function (a, b) {
			if (a > b) {
				b += a;
				a = b - a;
				b = b - a;
			}
			var start = Math.max(a, 0);
			var d = [].slice.call(anytable.vData, start, b);
			return definedDom({
				children: d.map(function (r, i) {
					return createRow(r, start + i);
				})
			})
		};
		var vTimer = -1;
		var vScrollFunc = function () {
			var
				rs = tbody.rows,
				beginD = getIndexByTop(tableBody.scrollTop),
				endD = getIndexByTop(tableBody.scrollTop + opt.height),
				beginDataIndex = beginD[0],
				endDataIndex = endD[0],
				tableBegin = rs[0]&&rs[0][anyId].pageIndex||0,
				tableEnd = rs[rs.length - 1]&&rs[rs.length - 1][anyId].pageIndex,
				newTableBegin = Math.max(0,beginDataIndex - 10),
				newTableEnd = Math.min(anytable.vData.length,endDataIndex + 10);
			if(tableEnd===undefined)tableEnd=-1;
			if (tableBegin < newTableBegin) {
				for (; rs[0] && (rs[0][anyId].pageIndex < newTableBegin); rs[0].remove()) {
				}
			}
			if (tableEnd > newTableEnd) {
				for (var i = rs.length - 1; i >= 0 && rs[i][anyId].pageIndex >= newTableEnd; rs[i--].remove()) {
				}
			}
			if (tableBegin > newTableBegin) {
				var elms = createRange(newTableBegin, Math.min(tableBegin, newTableEnd));
				if (rs[0])tbody.insertBefore(elms, rs[0]);
				else tbody.appendChild(elms);
			}
			if (tableEnd < newTableEnd) {
				tbody.appendChild(createRange(Math.max(tableEnd + 1, newTableBegin), newTableEnd))
			}
			for (var n = 0, l = rs.length, r; (r = rs[n]) && n < l; n++) {
				if (r[anyId].pageIndex >= beginDataIndex)break;
			}
			if (r){
				translate3D(table,0,tableBody.scrollTop - r.offsetTop - beginD[1],0);
				anytable.hideMsg();
			}
		};
		var tableBody = definedDom('div', {
			children: [tCanvas, widthDetectDom],
			// 水平滚动事件
			onHorizontalScroll: function () {
				var s =this.scrollLeft;
				asyncHT(-s);
				for(var i= 0,l=frozenCols.length;i<l;i++){
					var th = frozenCols[i];
					if(th.cssRule){
						translate3D(th.cssRule.style,s,0,0);
						translate3D(th.dragHelper,s,0,0);
						translate3D(th.thOpt,s,0,0);
					}else {
						translate3D(th,s,0,0);
					}
				}
			},
			// vertical scroll event
			onVerticalScroll: function () {
				clearTimeout(vTimer);
				vTimer = setTimeout(vScrollFunc, 30);
			},
			onscroll: function (e) {
				this._sx = this._sx || 0;
				this._sy = this._sy || 0;
				var x = this.scrollLeft - this._sx;
				this._sx = this.scrollLeft;
				var y = this.scrollTop - this._sy;
				this._sy = this.scrollTop;
				if (x) {
					e.moved = x;
					this.onHorizontalScroll(e);
				}
				if (y) {
					e.moved = y;
					this.onVerticalScroll(e);
				}
			},
			css: {
				width: '100%',
				position: 'relative',
				overflow: 'auto',
				height: ch,
				background:'#fff'
			}
		});
		var tableHead = definedDom('div', {class:'any-head'});
		var optsTimer = -1;
		// 列
		var optCols = definedDom('div');
		var btnSaveOpt = definedDom('div',{
			class:'save-opt',
			onclick:function(){
				opt.save.call(anytable,opt,btnSaveOpt)
			}
		});
		var optColsT = definedDom({tag:'h5',text:'列管理',class:'dis-select'});
		if(opt.save){
			optColsT.appendChild(btnSaveOpt)
		}
		//设置面板
		var optsBoard = definedDom('div',{
			open:function(){
				clearTimeout(optsTimer);
				var nodes =definedDom({children: [].slice.call(arguments)});
				if(thOptOn)thOptOn.className = thOptOn.className.replace(/ +on/,'');
				optsOut.style.height = opt.height+'px';
				if(!optsOut.parentNode){
					container.appendChild(optsOut);
					optsOut.style.top = (tableHead.offsetHeight||20)+'px';
					optsBoard.style.top = -opt.height+'px';
					optsTimer = setTimeout(function(){
						optsBoard.style.top=0+'px'
					},10);
				}
				optsBoard.innerHTML='';
				optsBoard.appendChild(nodes);
			},
			close:function(){
				optsBoard.style.top = -opt.height+'px';
				settingBtn.isOpened=false;
				setTimeout(function(){
					optsOut.remove();
					optCols.innerHTML='';
				},300)
			},
			class:'opt-board',children:[
				optColsT,
				optCols
			]});
		var actLis;
		var outClickListener=function(e){
			if(actLis&&e.target.lis!==actLis){
				actLis.removeAttribute('style');
				var temp = actLis;
				setTimeout(function(){
					temp.remove()
				},300)
			}
			if(e.target.className==='dp-icon')actLis =e.target.lis;
			else actLis=null;
		};
		var selOutClick = function(){
			container.removeEventListener('click',outClickListener);
			container.addEventListener('click',outClickListener);
		};
		var createChoose = function(name,li,width){
			var createLis = function(o){
				if(Array.isArray(o)){
					return  o.map(function(d){
						return d&&definedDom({
								tag:'div',
								onclick: function(e){
									this.parentNode.el.textContent = d.text;
									if(d.func)d.func(e)
								},
								text: d.text
							})
					})
				}
			};
			var lis=definedDom('div',{
				class:'c-lis',
				children:createLis(li)
			});
			return definedDom('div',{
				func:function(){
					setTimeout(function(){
						if(li&&li[0]&&li[0].func){
							li[0].func();
						}
					},100)
				},
				class:'selBox',
				children:[
					{tag:'span',text:name},
					{tag:'div',class:'sel',text:li&&li[0]&&li[0].text||''},
					{tag:'div',class:'dp-icon',onclick:function(){
						this.lis=lis;
						lis.el = this.previousSibling;
						selOutClick();
						this.previousSibling.appendChild(lis);
						setTimeout(function(){
							lis.style.maxHeight= '200px';
						},10);
						setTimeout(function(){
							lis.style.overflow='auto';
						},220)
					}}
				],
				setData:function(d){
					lis.innerHTML='';
					lis.appendChild(definedDom(createLis(d)));
					if(d&&d[0]){
						if(d[0].text){
							this.children[1].textContent=d[0].text;
						}
						if(d[0].func){
							d[0].func();
						}
					}
				},
				css:{width:width&&(width+'px')}
			})
		};

		var createActiveSelDom = function (dom, act, group) {
			if (!dom.style)dom = definedDom(dom);
			var el = definedDom('div', {
				class: 'validBox',
				valid: !!act,
				children: [
					{
						tag: 'input', type: 'checkbox', checked: act, onchange: function () {
						var checked = this.checked;
						if (group && checked) {
							if (group.on && group.on !== this) {
								group.on.checked = false;
								group.on.onchange();
							}
							group.on = this
						}
						this.parentNode.valid = checked;
						dom.style.opacity = checked ? 1 : 0.5;
						if(checked) removeClass(dom,'disable');
						else addClass(dom,'disable');
					}
					},
					dom
				]
			});
			if (group)group.push(el);
			dom.style.opacity = act ? 1 : 0.5;
			if(act) removeClass(dom,'disable');
			else addClass(dom,'disable');
			dom.el = el;
			return el;
		};

		var createLogicTag = function(isUnion){
			return definedDom('div',{
				isUnion:isUnion,
				class:'logicTag '+ (isUnion?'Un':'In'),
				text:isUnion?'∪':'∩',
				title:isUnion?'或关系':'且关系',
				onclick:function(){
					this.isUnion= !this.isUnion;
					this.textContent = this.isUnion?'∪':'∩';
					this.title = this.isUnion?'或关系':'且关系';
					this.className = 'logicTag '+['In','Un'][~~this.isUnion]
				}
			})
		};
		var toggleActDom = function(text,valid,func){
			return definedDom('div',{
				text:text,
				valid:valid,
				class:'tgBox'+(valid?' on':''),
				onclick:function(e){
					var cs = this.className;
					var isOff = -1=== cs.indexOf('on');
					if(isOff){
						addClass(this,'on')
					}else {
						removeClass(this,'on');
					}
					this.valid=!isOff;
					if(func)func.call(this,e,!isOff)
				}
			})
		};
		// filter and heightLight
		var chooseMap = {
			cols:opt.cols.map(function(d){
				if(d.title)return {
					text: d.title,
					func:function(){
						ruleDom.cols.value=d;
						return d.name;
					}
				}
			}),
			type:[
				{text:'数字',func:function(){
					ruleDom.ruleType.setData(chooseMap.numberType);
					ruleDom.type.value = 'val = parseFloat(val);'
				}},
				{text:'文本',func:function(){
					ruleDom.ruleType.setData(chooseMap.textType);
					ruleDom.type.value = 'if(val)val+=\'\';'
				}},
				{text:'日期',func:function(){}}
			],
			textType:[
				{text:'精准',func:function(){
					ruleDom.ruleDetail.innerHTML='';
					var el = definedDom('div',
						{getRule: function () {
							return 'val===\''+this.children[1].value+'\''
						}, children: [
							{tag: 'span', text: '文本：'}, {tag: 'input', type: 'text', css: {width: '89px'}}]
						});
					ruleDom.ruleDetail.appendChild(el);
					ruleDom.ruleDetail.rules=[el.getRule.bind(el)];
				}},
				{text:'模糊',func:function(){
					ruleDom.ruleDetail.innerHTML='';
					var createEl = function(text,logic,func){
						var dom= createActiveSelDom({
							tag:'div',
							css:{float:'left'},
							children:[
								createLogicTag(logic),
								{tag:'span',text:text},
								{tag:'input',type:'text',css:{width:'89px'}}
							]
						},true);
						var cs  = dom.children;
						var cd = cs[1].children;
						dom.getData = function(){
							return [{active:cs[0].checked,isUnion:cd[0].isUnion,value:cd[2].value}]
						};
						dom.getInfo = function(){
							if(cs[0].checked){
								return (cd[0].isUnion?'或':'且')+text+'"'+cd[2].value+'" ';
							}else return''
						};
						dom.getRule=function(){
							if(cs[0].checked){
								return (cd[0].isUnion?'||':'&&')+'new RegExp(\''+func(cd[2])+'\').test(val)';
							}else return''
						};
						return dom
					};
					var el0 =createEl('包含文本：',true,function(v){
						return unicodeStr(v.value)
					});
					var el1 = createEl('开头文本：',true,function(v){
						return '^'+unicodeStr(v.value)
					});
					var el2 = createEl('结束文本：',true,function(v){
						return unicodeStr(v.value)+'$'
					});
					ruleDom.ruleDetail.appendChild(definedDom({children:[el0,el1,el2]}));
					ruleDom.ruleDetail.rules=[el0.getRule,el1.getRule,el2.getRule];
					ruleDom.ruleDetail.infos=[el0.getInfo,el1.getInfo,el2.getInfo];
					ruleDom.ruleDetail.datas=[el0.getData,el1.getData,el2.getData];
				}}
			],
			numberType:[
				{text:'精准',func:function(){
					ruleDom.ruleDetail.innerHTML='';
					ruleDom.ruleDetail.appendChild(definedDom({children:[
						{tag:'span',text:'值：'},{tag:'input',type:'number',css:{width:'89px'}}
					]}))
				}},
				{text:'范围',func:function(){
					ruleDom.ruleDetail.innerHTML='';
					var el0 = definedDom('div',{
						getRule:function(){
							return '>'+(this.children[1].valid?'=':'')+this.children[2].value
						},
						css:{marginTop:'3px',float:'left'},
						children:[
							{tag:'span',text:'大于',class:'tgBox on'},
							toggleActDom('等于',false),
							{tag:'input',type:'number',css:{width:'89px'}}
						]});
					var el1 =definedDom('div',{
						getRule:function(){
							return '>'+(this.children[1].valid?'=':'')+this.children[2].value
						},
						css:{marginTop:'3px',float:'left'},
						children:[
							{tag:'span',text:'小于',class:'tgBox on'},
							toggleActDom('等于',false),
							{tag:'input',type:'number',css:{width:'89px'}}
						]});
					ruleDom.ruleDetail.appendChild(definedDom({children:[el0,el1]}));
					ruleDom.ruleDetail.rules=[el0.getRule.bind(el0),el1.getRule.bind(el1)];
				}}
			],
			source:[
				{text:'显示内容',func:function(){
					ruleDom.source.value = function(c){
						return 'var val = createTd(d,'+JSON.stringify(c)+').textContent;'
					}
				}},
				{text:'原始数据',func:function(){
					ruleDom.source.value = function(c){
						return 'var val = d.'+ c.name+';';
					}
				}}
			],
			execute:[
				{text:'过滤',func:function(){
					ruleDom.execDetail.innerHTML='';
					ruleDom.execDetail.appendChild(definedDom([
						{tag:'div',css:{float:'left'},children:[
							{tag:'span',text:'规则关系：',css:{float:'left'}},
							createLogicTag(false)
						]},
						createActiveSelDom(
							{tag:'div',children:[
								{tag:'span',text:'组关系：',css:{float:'left',paddingLeft:'3px'}},
								createLogicTag(true),
								{tag:'span',text:'组名称：',title:'设置编组，相同组号的规则会放置到同一组当中'},
								{tag:'input',type:'text',css:{width:'50px'}}
							]},false)
					]))
				}},
				{text:'高亮',func:function(){

				}}
			]
		};
		var ruleDom={
			active:createActiveSelDom({
				tag:'span',text:'立即生效',
				onclick:function(){this.previousSibling.click()},
				css:{paddingLeft:'3px'}
			},true),
			// 列
			cols : createChoose('列：',chooseMap.cols),
			// 数据类别
			type : createChoose('数据类型：',chooseMap.type),
			// 规则对象
			source : createChoose('作用对象：',chooseMap.source),
			// 规则
			ruleType : createChoose('筛选方式：'),
			// 执行方式
			execute : createChoose('执行方式：',chooseMap.execute),
			ruleDetail:definedDom('div',{class:'rule-detail'}),
			execDetail:definedDom('div',{class:'rule-detail'})
		};
		var filterRules = [];
		//var heightLightRules = [];
		// 规则构造器
		var buildRule = function(){
			var rs = ruleDom.ruleDetail.rules.map(function(f){return f()}).join('');
			var info = ruleDom.ruleDetail.infos.map(function(f){return f()}).join('');
			var rule = function(){};
			var result ='rule = function(d){'
				+ruleDom.source.value(ruleDom.cols.value)
				+ruleDom.type.value
				+'return '
				+(rs.slice(0,2)==='&&')+rs
				+'}';
			var data ={
				cols:ruleDom.cols.children[1].textContent,
				source:ruleDom.source.children[1].textContent,
				type:ruleDom.type.children[1].textContent,
				ruleType:ruleDom.ruleType.children[1].textContent,
				execute:ruleDom.execute.children[1].textContent,
				ruleDetail:ruleDom.ruleDetail.datas.map(function(f){return f()})
			};
			var str ='列'+ ruleDom.cols.value.title + '的'+ruleDom.source.children[1].textContent+info;
			eval(result);
			console.log(str);
			var key = JSON.stringify(data);
			var o ={
				key:key,
				desc:str,
				func:rule
			};
			for(var i= 0, r,l=filterRules.length;i<l;i++){
				var _r=filterRules[i];
				if(_r.key===key)r=_r;
			}
			if(r)extend(r,o);
			else filterRules.push(o);
			anytable.initView(true);
			return o;
		};
		var newRNavBtn = definedDom('div',{
			class:'btn-r-create',
			text:'生成规则',
			onclick:buildRule
		});
		var newRClear = definedDom('div',{
			class:'btn-r-clear',
			text:'清空'
		});
		var rulePageNav = definedDom('div',{
			class:'rules-page-nav',
			children:[
				{tag:'span',text:'新建规则',class:'on'},
				{tag:'span',text:'规则列表'},
				newRClear,
				newRNavBtn
			]
		});
		var ruleNewPage = definedDom('div',{
			children:[
				ruleDom.cols,
				ruleDom.source,
				ruleDom.type,
				ruleDom.ruleType,
				ruleDom.execute,
				ruleDom.ruleDetail,
				ruleDom.execDetail,
				ruleDom.active
			]
		});
		var numberInput = function(value,func,opt){
			return definedDom(extend({
				min:0,
				tag:'input',type:'number',
				value: value,onblur:func,
				onmousewheel:function(){
					if(this.onblur)this.onblur();
				},
				onmousedown:function(e){
					e.stopPropagation();
				},
				onkeydown:function(e){
					if(e.keyCode===13)if(this.onblur)this.onblur();
				}
			},opt))
		};
		/**@this {Node}*/
		var _fzInput = 	numberInput(frozenSize,function(){
			anytable.freeze(parseInt(this.value)|0);
			this.value = frozenSize;
		},{
			//type:'text',
			onfocus:function(){
				this.select();
			}
		});
		var frozenNumInput =definedDom({
			tag:'div',
			class:'frozen-input dis-select',
			children:[
				{tag:'span',text:'冻结列数'},
				_fzInput
			]
		});
		// setting
		var optsOut = definedDom('div',{class:'opt-out',children:optsBoard});
		var hoverOptCell;
		var refreshOptCols = function(){
			var optCelHoverTimer=-1;
			optCols.innerHTML='';
			optCols.appendChild(frozenNumInput);
			var ths = [].map.call(hTable.querySelectorAll(hCellSelector),function(c){
				return c.parentNode;
			});
			var colTables=[];
			for (var i= 0,cs=ths,l=ths.length;i<l;i++){
				!function(){
					var c = cs[i];
					var sortEls=[];
					var checkBox = definedDom('input',{
						type:'checkbox',
						checked: 'none'!= c.cssRule.style.display,
						onchange:function(){
							c.dragHelper.style.display =
								c.cssRule.style.display = this.checked?'':'none';
							c[anyId].isHidden=!this.checked;
							wInput.onblur();
						}
					});
					/**@this {Node}*/
					var wInput = numberInput(c.offsetWidth,function(){
						var v = parseInt(this.value)||parseInt(c.cssRule.width)||0;
						if(v<opt.colMinWidth)v=opt.colMinWidth;
						if(v>2000)v=2000;
						this.value=v;
						c.cssRule.style.width = v+'px'
					});
					c._wInput = wInput;
					var ableSort = c[anyId].name!=='selectBox';
					if(opt.sort){
						var sort = c[anyId].sort;
						var pInput = ableSort&&numberInput(sort.order,function(){
								if(ableSort&&(sort.type==='asc'||sort.type==='desc')){
									sort.order=this.value;
									sort.run();
								}
							});
						sort._prEl = pInput;
						var typeEl = definedDom('td',{
							class:'td-col-sort',
							text:ableSort&&sort.text||'',
							onclick:function(){
								if(ableSort){
									sort.next();
									sort.value = pInput.value;
									sort.run();
								}
							}
						});
						Object.defineProperty(typeEl,'value',{
							set:function(v){
								typeEl.textContent =v;
							}
						});
						sort._scEl = typeEl;
						sortEls.push(
							{tag:'tr',children:[{tag:'td',text:'排序'},typeEl]},
							{tag:'tr',children:[{tag:'td',text:'优先级'},{tag:'td',children:pInput}]}
						)
					}
					var _table = definedDom('table',{
						class:'col-field dis-select',
						col:c,
						children:[
							{tag:'tr',children:{tag:'td',class:'title',colSpan:2,children:{tag:'label',children:[checkBox, {tag:'span',text: c[anyId].name}]}}},
							{tag:'tr',children:[{tag:'td',text:'列名',css:{minWidth:'50px'}},{tag:'td',text:c[anyId].title||''}]},
							{tag:'tr',children:[{tag:'td',text:'列宽'},{tag:'td',children:wInput}]}
						].concat(sortEls),
						onmousemove:function(e){
							if(hoverOptCell){
								if(this.className.indexOf('disable')!==-1)return
								var fake= hoverOptCell.fake;
								var cx = e.clientX;
								var ow = this.offsetWidth;
								var lx = cx - this.getBoundingClientRect().left;
								var ps = lx/ow;
								if(ps>0.6){
									optCols.insertBefore(fake,this);
									hoverOptCell.moveEl = this;
								}else if(ps<0.4){
									var ns = this.nextSibling;
									if(ns)optCols.insertBefore(fake,ns);
									else optCols.appendChild(fake);
									hoverOptCell.moveEl = this;
								}
							}
						},
						onmousedown:function(){
							if (opt.dragColumn) {
								var self = this;
								var _up = window.onmouseup;
								var colMoveTimer = -1;
								window.onmouseup = function (){
									clearTimeout(optCelHoverTimer);
									if(hoverOptCell){
										colTables.forEach(function(th){
											removeClass(th,'disable')
										});
										var row = c.parentNode;
										var _cells = [].slice.call(row.cells)
										optCols.replaceChild(hoverOptCell,hoverOptCell.fake);
										hoverOptCell.removeAttribute('style');
										removeClass(hoverOptCell,'hover');
										if(hoverOptCell.moveEl){
											var targetEl = hoverOptCell.moveEl.col;
											var nextEl = targetEl.nextSibling;
											var startIndex = _cells.indexOf(c);
											var endIndex = _cells.indexOf(targetEl);
											if(startIndex<endIndex){
												if(nextEl)row.insertBefore(c,nextEl);
												else row.appendChild(c);
											}else{
												row.insertBefore(c,targetEl);
											}
											moveColumnByCols();
										}
										hoverOptCell.fake =undefined;
										hoverOptCell.moveEl =undefined;
										hoverOptCell = undefined;
									}
									optsBoard.onmousemove = undefined;
									if(_up)_up.call(window);
									window.onmouseup = _up;
								};
								optCelHoverTimer = setTimeout(function(){
									clearTimeout(optCelHoverTimer);

									colTables.forEach(function(th){
										if(th===self)return;
										if(th.col.parentNode === c.parentNode){
											removeClass(th,'disable');
										}else{
											addClass(th,'disable');
										}
									});
									hoverOptCell = self;
									hoverOptCell.start = [].indexOf.call(optCols.children,hoverOptCell);
									var fake = self.cloneNode(true);
									self.fake = fake;
									fake.className +=' clone';
									addClass(hoverOptCell,'hover');
									self.parentNode.replaceChild(fake,hoverOptCell);
									self.style.top =fake.offsetTop+'px';
									self.style.left =fake.offsetLeft+'px';
									optCols.appendChild(self);
									optsBoard.onmousemove = function(e){
										clearTimeout(colMoveTimer);
										colMoveTimer = setTimeout(function(){
											var cx = e.clientX;
											var cy = e.clientY;
											var ofs = optsBoard.getBoundingClientRect();
											if(hoverOptCell){
												hoverOptCell.style.left = (cx -ofs.left).toFixed(2)+'px';
												hoverOptCell.style.top = (cy -ofs.top).toFixed(2)+'px';
											}
										},5);
									};
								},300)
							}
						}
					});
					colTables.push(_table);
				}()
			}
			optCols.appendChild(definedDom(colTables));
		};
		var settingBtn = definedDom('div',{
			class:'opt',
			title:'设置',
			onclick:function(){
				clearTimeout(optsTimer);
				if(thOptOn)removeClass(thOptOn,'on');
				optsOut.style.height = opt.height+'px';
				if(!this.isOpened){
					this.isOpened=true;
					optsBoard.open(optColsT,optCols);
					refreshOptCols();
				}else {
					optsBoard.close()
				}
			}
		});
		// 底部工具栏
		var tableFoot = definedDom('div',{
			class:'any-foot dis-select',
			children:settingBtn
		});
		// 总条数
		var totals = definedDom('span',{text:'0',css:{
			margin:'0 2px'
		}});
		// 当前页
		var currentPage;
		var curPage = definedDom('input',{type:'number',min:0,max:999999,
			onkeydown:function(e){
				if(e.keyCode===13)return this.nextSibling.click();
			}});
		var goTo =definedDom({tag:'div',class:'goto',children:[
			{tag:'span',text:'跳转到'},
			curPage,
			{tag:'button',text:'确定',onclick:function(){
				if(curPage.value!==curPNum.textContent)
					anytable.pager.cur=parseInt(curPage.value);
				goTo.parentNode.replaceChild(currentPage,goTo)
			}}
		]});
		var curPNum = definedDom('div',{text:'1',class:'page-num'});
		var totalPNum = definedDom('span',{text:'1'});
		currentPage = definedDom({tag:'span',
			onclick:function(){
				curPage.value = curPNum.textContent;
				setTimeout(function(){curPage.select();},1);
				currentPage.parentNode.replaceChild(goTo,currentPage);
			},
			class:'now',children:[
				{tag:'span',text:'第 '},curPNum,{tag:'span',text:' 页'},
				{tag:'span',text:' / 共 '},totalPNum,{tag:'span',text:' 页'}
			]});
		var btnPrev = definedDom({
			onclick:function(e){
				stopEvent(e);
				anytable.pager.cur--;
			},
			title:'上一页',
			tag:'span',
			class:'page prev',
			html:'<svg height="12px" version="1.1" viewBox="0 0 32 32" width="32px" xmlns="http://www.w3.org/2000/svg"><g><rect  height="32" width="32"/></g><g><polygon points="22,4 10,15.999 22,28  "/></g></svg>'});
		var btnFirst = definedDom({
			onclick:function(e){
				stopEvent(e);
				anytable.pager.cur=1;
			},
			title:'首页',tag:'span',class:'page first',html:'<svg  height="12"  viewBox="0 0 32 32" width="32" ><g><rect height="32" width="32"/></g><g><path d="M20,15.999L32,28V4L20,15.999z M18,28V4L6,15.999L18,28z M0,28h4V4H0V28z"/></g></svg>'});
		var btnNext = definedDom({
			onclick:function(e){
				stopEvent(e);
				anytable.pager.cur++;
			},
			title:'下一页',tag:'span',class:'page next',html:'<svg height="12" version="1.1" viewBox="0 0 32 32" width="32" ><g><rect fill="none" height="32" width="32"/></g><g><polygon points="10,2.001 24,16 10,30  "/></g></svg>'});
		var btnLast = definedDom({
			onclick:function(e){
				stopEvent(e);
				anytable.pager.cur=-1;
			},
			title:'末页',tag:'span',class:'page last',html:'<svg height="12" version="1.1" viewBox="0 0 32 32" width="32" ><g><rect height="32" width="32"/></g><g><path d="M0,28l12-12.001L0,4V28z M14,28l12-12.001L14,4V28z M28,4v24h4V4H28z"/></g></svg>'});
		var createSizeEl = function(d){
			d = parseInt(d);
			if(isNaN(d))return;
			return {tag:'div',class:'size-el',text:d,onclick:function(){
				szIn.value = d;
				anytable.pager.size = d;
				pageSizeShow.replaceChild(sizePNm,pageSizeChoose);
			}}
		};
		var szIn = definedDom({tag:'input',type:'number',
			onfocus:function(){
				lisBox.style.display='';
				removeClass(pageSizeChoose,'show');
				setTimeout(function(){
					addClass(pageSizeChoose,'show');
				},10);
			},
			onblur:function(){
				removeClass(pageSizeChoose,'show');
				setTimeout(function(){lisBox.style.display='none';},300);
			},
			onkeydown:function(e){
				if(13===e.keyCode)this.nextSibling.click();
			}});

		var pSz=[];
		if(opt.paging&&opt.paging.pageSize&&opt.paging.pageSize){
			for(var i= 0,_ps=opt.paging.pageSize,l=_ps.length;i<l;i++){
				var _p = _ps[i];
				if(-1===pSz.indexOf(_p)){
					pSz.push(_p);
				}
			}
			size =_ps[0];
			_ps.length=0;
			[].push.apply(_ps,pSz);
			pSz.sort(function(a,b){return b-a})
		}
		var szLis  =definedDom({tag:'div',class:'lis-box',children:pSz.map(createSizeEl)});
		var lisBox =definedDom({tag:'div',class:'size-lis',children:szLis});
		var pageSizeChoose= definedDom({
			tag:'div',
			class:'p-size-sel',
			setList:function(lis){
				if(undefined===lis)return;
				if(!Array.isArray(lis)){lis=[lis]}
				szLis.innerHTML='';
				szLis.appendChild(definedDom({children:lis.map(createSizeEl)}))
			},
			children:[lisBox,szIn,{tag:'button',text:'确定',onclick:function(){
				if(szIn.value>0&&szIn.value!==anytable.pager.size)anytable.pager.size=szIn.value;
				pageSizeShow.replaceChild(sizePNm,pageSizeChoose);
			}}]
		});
		var sizePNm = definedDom('div',{
			onclick:function(){
				pageSizeShow.replaceChild(pageSizeChoose,sizePNm);
				szIn.value=anytable.pager.size;
				szIn.focus();
				szIn.select();
			},
			text:size||'100'});
		var pageSizeShow = definedDom(
			{
				tag: 'div', class: 'pageSize', children: [
				{tag: 'span', text: '每页'},
				sizePNm,
				{tag: 'span', text: '条'}
			]
			});
		// 页面
		var pagingBar = definedDom('div',{
			css:{
				float:'right',
				position:'relative'
			},
			children:[
				{tag:'div',class:'nav',children:[btnFirst,btnPrev,currentPage,btnNext,btnLast]},
				pageSizeShow,
				{tag:'span',class:'info',children:[
					{tag:'span',text:'共'},
					totals,
					{tag:'span',text:'条'}
				]}
			]
		});
		var container = definedDom('div', {
			class: 'anytable',
			id: tId,
			css: {
				width: opt.width || '100%',
				position: 'relative'
			}, children: [tableHead, tableBody, auxiliaryLine]
		});
		// 降序头部Index
		var refreshHeadIndex= function(){
			var ths = [].slice.call(hTable.querySelectorAll('th'))
			var ls = ths.length;
			ths.forEach(function(th,i){
				th.style.zIndex = ls-i;
			});
		}
		// 同步宽度
		var asyncHW = function () {
			tableHead.style.width = (widthDetectDom.offsetWidth || opt.scrollBarWidth) + 'px';
			[].forEach.call(tableHead.querySelectorAll('[class*=anycell_]'),function(el){
				el.style.height = (el.parentNode.offsetHeight||opt.rowHeight)+'px'
			})
		};
		// 同步头表格位置
		var asyncHT = function (x) {
			hTable.style.marginLeft = x + 'px'
		};

		var thOptOn;
		// 生成头列
		var colsTemp=[];
		var createTh = function (o, index) {
			var tracker = colsTemp.length;
			o.cls = 'anycell__'+tracker;
			o.tracker = tracker;
			var css = {
				position: 'relative'
			};
			var type = typeof o.align;
			if ('string' === type) {
				css.textAlign = o.align;
			} else if ('object' === type) {
				if (o.align.head)css.textAlign = o.align.head;
			}
			var hTitle={
				tag: 'div',
				text: o.title,
				css:{
					width:'100%',
					cursor:'pointer'
				}
			};
			var dragFunc = function(e){if (opt.dragColumn&& !o.frozen) {
				if(e.button===0){
					stopEvent(e);
					var self = this;
					var _up = window.onmouseup;
					var _mv = window.onmouseover;
					var colMoveTimer = -1;
					window.onmouseup = function (e) {
						clearInterval(scrollTimer);
						clearTimeout(hoverTimer);
						clearTimeout(colMoveTimer);
						window.onmouseover = _mv;
						window.onmouseup = _up;
						if (dragCol) {
							if (dragCol && dragCol.remove)dragCol.remove();
							dragCol.row.replaceChild(dragCol.col, dragCol.fake);
							moveColumnByCols(dragCol.row);
							dragCol = undefined;
						}
						if(optsOut.parentNode&&optCols.parentNode)refreshOptCols();
						if (_up)_up.call(window, e);
					};
					// 按住超过300 毫秒进入在拖拽(伪)状态
					hoverTimer = setTimeout(function () {
						var col = self.parentNode;
						var row=col.parentNode;
						var subCols =col.querySelectorAll(hCellSelector);
						var selfRec = self.getBoundingClientRect();
						var boxRec = container.getBoundingClientRect();
						dragCol = col.cloneNode(true);
						dragCol.style.top =selfRec.top-boxRec.top+'px';
						dragCol.cols = subCols;
						addClass(dragCol, 'dragCopy');
						dragCol.row = row;
						dragCol._x = selfRec.left-boxRec.left;
						dragCol.style.left =dragCol._x+'px';
						dragCol._max = row.offsetWidth - col.offsetLeft - col.offsetWidth;
						dragCol._min = - col.offsetLeft;
						dragCol.fake = col.cloneNode(false);
						dragCol.fake.style.width = col.offsetWidth+'px';
						dragCol.fake.style.height = col.offsetHeight+'px';
						var space = self.cloneNode(false);
						dragCol.fake.className += ' fake';
						dragCol.col = col;
						row.replaceChild(dragCol.fake, dragCol.col);
						dragCol.fake.appendChild(space);
						container.appendChild(dragCol);
						dragCol.x = e.clientX;
						window.onmousemove = function (e) {
							clearInterval(scrollTimer);
							e.preventDefault();
							clearTimeout(colMoveTimer);
							colMoveTimer = setTimeout(function () {
								if (dragCol) {
									detectSideInsertByClientX(e.clientX-row.getBoundingClientRect().left, dragCol.fake,row);
									var moved = e.clientX - dragCol.x;
									var maxMove = dragCol._max;
									var minMove = dragCol._min;
									if (moved < minMove)moved = minMove;
									if (moved > maxMove)moved = maxMove;
									dragCol.style.left = dragCol._x + moved + 'px';
									var visibleRange = tableHead.getBoundingClientRect();
									var minX = visibleRange.left;
									var maxX = minX + visibleRange.width;
									if (e.clientX < minX) {
										scrollTimer = setInterval(function () {
											tableBody.scrollLeft--;
										}, 0);
									} else if (e.clientX > maxX) {
										scrollTimer = setInterval(function () {
											tableBody.scrollLeft++;
										}, 0);
									}
								}
							}, 0);
							if (_mv)_mv.call(window, e);
						};
					}, 300)
				}
			}};
			if(o.cols){
				var colSpan=0;
				var _thT = definedDom({tag:'th',children:{
					css:css,
					tag:'div',class:'anycell_h',children:hTitle,
				}});
				var _th = definedDom({
					tag:'th',
					children:{tag:'table',onmousedown: dragFunc,children:[
						{tag:'tr',children:_thT},
						{tag:'tr',children:[o.cols.map(function(c,i){
							var th = createTh(extend({},o,c,{cols:false}),i);
							colSpan+=th.colSpan;
							return th;
						})]}
					]}
				});
				_thT.colSpan=colSpan;
				return _th;
			}else colsTemp.push(o);
			var sort;
			if(opt.sort&&!o.group){
				o.sort= o.sort||{};
				var st_next={
					none:'asc',
					asc:'desc',
					desc:'none'
				};
				var st_text={
					none:'无',
					asc:'升序',
					desc:'降序'
				};
				var _sc='none';
				sort = {
					name: o.name,
					_pr:0,
					get text(){
						return st_text[_sc];
					},
					run:function(){
						var hm=false;
						var exec = function(){
							renderDatas();
							refreshDatasPosition();
							tbody.innerHTML='';
							tableBody.onVerticalScroll();
							if(hm)anytable.hideMsg();
						};
						if(hm=(anytable.fData.length>1000)){
							anytable.showMsg(undefined,true);
							setTimeout(exec,100);
						}else exec();
						return sort
					},
					toString:function(){
						return sort._pr;
					},
					get type(){return _sc},
					set type(v){
						if(v){
							removeClass(sort.el,_sc);
							addClass(sort.el,v);
							_sc=v;
							if(sort._scEl&&optCols.parentNode&&optsBoard.parentNode){
								sort._scEl.value = st_text[v];
							}
							sort.order |= 0;
						}
					},
					next:function(){sort.type=st_next[_sc];return sort},
					get order(){
						return sort._pr;
					},
					set order(t){
						if((_sc==='asc'||_sc==='desc')&&!isNaN(t=parseFloat(t))){
							sort._pr = t;
							sortRules.length=0;
							_sortR.forEach(function(s){
								if(s.type==='desc'|| s.type==='asc')sortRules.push(s);
								else s._pr=0;
							});
							sortRules.sort(function(a,b){return a-b});
							sortRules.forEach(function(s,i){
								s._pr=i+1.1;
								if(s._prEl&&optCols.parentNode&&optsBoard.parentNode)s._prEl.value=i+1.1;
							})
						}
					}
				};
				sort.type= o.sort.type;
				sort.order = o.sort.order;
				o.sort=sort;
				_sortR.push(sort);
			}
			anytable.css.insertRule('#' + tId + ' .'+ o.cls + '{}', index);
			var cssRule = anytable.css.rules[index];
			cssRule.style.width = (o.width||100)+'px';
			cssRule.style.display = o.isHidden?'none':'';
			if(o.name==='selectBox')cssRule.style.padding=0;
			var hoverTimer = -1;
			var scrollTimer = -1;
			var clsN = o.cls + (o.class?' '+ o.class:'');
			var h ={
				tag: 'div',
				class: clsN,
				onclick:function(){
					if(opt.sort&& o.name!=='selectBox'){
						sort.next().order=Date.now();
						sort.run();
					}
				},
				onmousedown: dragFunc,
				children: hTitle
			};
			var thOpt =definedDom( {
				open:function(){
					optsBoard.open(rulePageNav,ruleNewPage);
					settingBtn.isOpened=false;
					addClass(this,'on');
					thOptOn = this;
				},
				close:function(){
					optsBoard.close();
					removeClass(this,'on');
					thOptOn=undefined;
				},
				onclick:function(e){
					e.stopPropagation();
					var cls = this.className;
					var isOn = /on/.test(cls);
					if(isOn){
						this.close();
					}else {
						this.open();
					}
				},
				tag:'div',
				class:'th-opt',
				children:[
					{tag:'div'},
					{tag:'div'},
					{tag:'div'},
					{tag:'div'}
				]
			});
			if ('object' === typeof o.headRender) {
				extend(h, o.headRender)
			}
			h=definedDom(h);
			if(o.sort)o.sort.el = h;
			setUnEnumProps(o, '_c', clsN);
			var dragHelper =definedDom({
				// 拖拽区域
				tag: 'div',
				class: opt.changeWidth ? 'resize' : '',
				onmousedown: function (e) {
					if (opt.changeWidth) {
						e.preventDefault();
						e.stopPropagation();
						this['_x'] = e.clientX;
						this['_w'] = h.offsetWidth;
						auxiliaryLine.style.display = '';
						var clientLeft = container.getBoundingClientRect().left;
						auxiliaryLine.style.left = e.clientX -clientLeft - container.offsetLeft + 'px';
						var self = this;
						var _up = window.onmouseup;
						var _mv = window.onmouseover;
						window.onmousemove = function (e) {
							var w = self._w + e.clientX - self._x;
							if (w >= opt.colMinWidth && e.clientX > 0) {
								auxiliaryLine.style.left = e.clientX -clientLeft - container.offsetLeft + 'px';
								h.style.width = w + 'px';
							}
							if(optsOut.parentNode)
								optsOut.style.top = (tableHead.offsetHeight||20)+'px';
							if (_mv)_mv.call(window, e);
						};
						window.onmouseup = function (e) {
							window.onmouseover = _mv;
							window.onmouseup = _up;
							var th = self.parentNode;
							th.cssRule.style.width = h.offsetWidth + 'px';
							h.style.width = '';
							auxiliaryLine.style.display = 'none';
							delete self._w;
							delete self._x;
							asyncHW();
							if(optsOut.parentNode&&optCols.parentNode&&th._wInput){
								th._wInput.value =h.offsetWidth||parseInt(th.cssRule.style.width)||opt.minWidth;
							}
							if (_up)_up.call(window, e);
						}
					}
				},
				css: {
					width: '8px',
					height: '100%',
					position: 'absolute',
					top: 0,
					right: '-4px',
					zIndex: 10
				}
			});
			var th =definedDom({
				cssRule: cssRule,
				dragHelper:dragHelper,
				thOpt:thOpt,
				tag: 'th',
				title:o.title,
				css: css,
				children: [h, o.title&&opt.allowFilter?thOpt:undefined,dragHelper]
			});
			th[anyId]=o;
			return th;
		};

		// 生成头行
		var createHead = function () {
			var selBox;
			var checkBox = {
				tag: 'input',
				type: 'checkbox'
			};
			if (opt.checkCol) {
				opt.cols.splice(0, 0, {
					width: 24,
					align: 'center',
					name: 'selectBox',
					class:'flex-center',
					headRender: {
						children: {tag:'div',children:extend({}, checkBox, {
							title: '全选',
							disabled: !opt.multiSelect,
							onchange: function (e) {
								if (opt.multiSelect) {
									var self = this;
									for (var i = 0, rs = tbody.rows, l = rs.length; i < l; i++) {
										rs[i][['desSelect', 'select'][~~this.checked]]();
									}
									anytable.fData.forEach(function (d) {
										d[anyId].selected = self.checked;
									})
								}
							}
						})}
					},
					renderer: function (val, item) {
						return definedDom(extend({css:{
							top:(opt.rowHeight-12)/2+'px'
						}}, checkBox, {
							checked: !!item[anyId].selected,
							onchange: function () {
								this.row[['desSelect', 'select'][~~this.checked]]();
							}
						}))
					}
				})
			}
			if (opt.indexCol) {

			}
			var cols = opt.cols.map(function (c, i) {
				var dom = createTh(c, i);
				if (c.name === 'selectBox') {
					selBox = dom.querySelector('input');
				}
				return dom;
			});
			opt.cols=colsTemp;

			var table = definedDom({
				tag: 'table',
				selBox: selBox,
				children: {
					tag: 'thead', children: {
						tag: 'tr',
						children: cols
					}
				}
			});
			return table;
		};
		// 行数据包装器
		var rowDataHandler = function(d,renderedIndex){
			setUnEnumProps(d, anyId, {renderedIndex:renderedIndex,
				height: (d.options && d.options.height) || opt.rowHeight});
			// render 渲染数据(过滤后数据)
			// page 当前页数据
			// all 全部数据
			if (!d[anyId].hasOwnProperty('allIndex'))Object.defineProperties(d[anyId], {
				pageIndex:{get: function () {return anytable.vData.indexOf(d);}},
				allIndex: {get: function () {return anytable.data.indexOf(d);}}
			});
			return d;
		};
		var hoverR, clickR,selectTimer=-1;
		// 创建cell内容
		var createTd = function(d,c,func){
			var val = d[c.name];
			var css = {
				height: d[anyId].height + 'px'
			};
			var type = typeof c.align;
			if ('string' === type) {
				css.textAlign = c.align;
			} else if ('object' === type) {
				if (c.align.cell)css.textAlign = c.align.cell;
			}
			var dom = definedDom({
				key: c.name,
				tag: 'div',
				class: c['_c'],
				css: css
			});
			if ('function' === typeof c.renderer) {
				//val,item,rowIndex,colName
				var result = c.renderer.call(dom, val, d, d[anyId], c.name);
				if (result instanceof Node) {
					func(result);
					dom.appendChild(result);
				} else {
					dom.innerHTML = result;
				}
			} else dom.textContent = val;
			return dom
		};
		// 插入表行
		var createRow = function (d) {
			var selBox;
			var rowLine = opt.dragRowHeight&& definedDom('div',{
					class:'row-line',
					onclick:function(e){stopEvent(e);},
					onmousedown:function(e){
						if(e.button===0){
							stopEvent(e);
							var startY = e.clientY;
							var _up = window.onmouseup;
							var _mv = window.onmousemove;
							var _lv = window.onmouseleave;
							var _h = tr.height;
							var sly = rowLine.style;
							sly.height='100%';
							sly.top='3px';
							window.onmouseleave=window.onmouseup=function(){
								stopEvent(e);
								sly.height='';
								sly.top='';
								window.onmousemove = _mv;
								window.onmouseup=_up;
								window.onmouseleave=_lv;
								refreshDatasPosition(tr[anyId].renderedIndex);
							};
							window.onmousemove = function(e){
								stopEvent(e);
								var moved = e.clientY-startY;
								var h = _h+moved;
								if(h>=opt.rowHeight)tr.height=h;
							}
						}
					}
			});
			var tr = definedDom({
				tag: 'tr',
				data:d,
				class: d[anyId].selected ? ' sel' : '',
				onmouseenter: function () {
					if (hoverR)removeClass(hoverR,'hover');
					hoverR = this;
					addClass(this,'hover');
				},
				onclick: function (e) {
					if(typeof opt.rowClick==='function'){
						opt.rowClick.call(this,d);
					};
					if (opt.clickCanSelectRow && e.target !== this.selBox) {
						var isSelect = this[anyId].selected;
						if (isSelect)this.desSelect();
						else this.select();
					}
				},
				select: function () {
					if(opt.checkCol){
						clearTimeout(selectTimer);
						selectTimer = setTimeout(function(){
							for(var i= 0,ds = anytable.vData,l=ds.length;i<l;i++){
								if(!ds[i][anyId].selected)return;
							}
							hTable.selBox.checked = true;
						},50);
					}
					if (!opt.multiSelect) {
						for (var i= 0,rs = tbody.rows,l = rs.length;i<l;i++){
							var r = rs[i];
							if(r[anyId].selected)r.desSelect();
						}
					}
					clickR = this;
					var isChange = this[anyId].selected !== true;
					this[anyId].selected = true;
					if (this.selBox)this.selBox.checked = true;
					addClass(this,'sel');
					if ('function' === typeof opt.rowSelected) {
						opt.rowSelected.call(this, d, this[anyId])
					}
					if (isChange && 'function' === typeof opt.rowSelectChange) {
						opt.rowSelectChange.call(this, d, this[anyId])
					}
				},
				desSelect: function () {
					var isChange = this[anyId].selected === true;
					delete this[anyId].selected;
					if(opt.checkCol)hTable.selBox.checked = false;
					clickR = undefined;
					if (this.selBox)this.selBox.checked = false;
					removeClass(this,'sel');
					if ('function' === typeof opt.rowDesSelected) {
						opt.rowDesSelected.call(this, d, this[anyId])
					}
					if (isChange && 'function' === typeof opt.rowSelectChange) {
						opt.rowSelectChange.call(this, d, this[anyId])
					}
				},
				children: [rowLine].concat(opt.cols.map(function (c,index) {
					var func = function(r){
						if (c.name === 'selectBox')selBox = r;
					};
					var dom =createTd(d,c,func);
					if(Array.isArray(c.tasks)){
						for(var i= 0,fns =c.tasks,l=fns.length;i<l;i++){
							var fn = fns[i];
							// 任务列队
							fn.call(dom,tr)
						}
					}
					var td = definedDom({
						tag: 'td',
						getValue:function(){
							return d[c.name]
						},
						setValue:function(value,needRender){
							d[c.name]=value;
							if(needRender){
								this.innerHTML='';
								this.appendChild(createTd(d,c,func));
							}
						},
						dom: dom,
						tracker: c.tracker,
						children: dom,
						css:{
							zIndex:c.frozen?opt.cols.length-index:0
						}
					});
					return td
				}))
			});
			tr[anyId]=d[anyId];
			if (selBox) {
				tr.selBox = selBox;
				selBox.row = tr;
			}
			Object.defineProperties(tr, {
				height: {
					get: function () {
						return tr[anyId].height;
					},
					set: function (x) {
						x = parseInt(x);
						tr[anyId]['height'] = x;
						if (x) {
							for (var i = 0, l = tr.cells.length; i < l; i++) {
								tr.cells[i].dom.style.height = x + 'px';
							}
						}
					}
				}
			});
			return tr;
		};
		var viewTimer=-1,maskTimer = -1;
		var setFrozen = function(index,frozen){
			var cs =[].map.call(hTable.querySelectorAll(hCellSelector),function(c){return c.parentNode});
			if('number'===typeof index){
				frozenCols.length=0;
				frozenSize=index;
				for(var n = 0,m=cs.length;n<m;n++){
					var isF = n<index;
					var _t = cs[n];
					setFrozen(_t,isF);
					if(isF)frozenCols.push(_t)
				}
				var extraThs=[];
				[].forEach.call(hTable.querySelectorAll('thead table'),function(t){
					var lastCol = t.querySelector('th:last-child [class*=anycell__]');
					if(lastCol&&-1!==frozenCols.indexOf(lastCol.parentNode)){
						extraThs.push(t.querySelector('tr:first-child>th'))
					}
				});
				opt.freeze=frozenSize=frozenCols.length;
				[].push.apply(frozenCols,extraThs);
				tableBody.onHorizontalScroll();
			}else if(index instanceof Node &&'TH'===index.tagName&&index.cssRule){
				var cIndex = cs.indexOf(index);
				if(frozen===index[anyId].frozen&&index.style.zIndex==cIndex)return;
				index[anyId].frozen=frozen;
				var zIndex = frozen? cs.length-cIndex:0;
				//index.style.zIndex=frozen?zIndex:0;
				index.style.outline=frozen?'none':'';
				index.children[0].style.setProperty(
					'border-right',
					frozen?'rgb(222, 222, 222) solid 1px':'',
					frozen?'important':'');
				var rs = tbody.rows;
				for(var i= 0,l=rs.length;i<l;i++){
					rs[i].cells[cIndex].style.zIndex=zIndex;
				}
				if(!frozen){
					translate3D(index.cssRule.style,0,0,0);
					translate3D(index.dragHelper,0,0,0);
					translate3D(index.thOpt,0,0,0);
				}
			}
		};
		extend(this, {
			id:anyId,
			data:[],
			fData:[],
			vData:[],
			resize:asyncHW,
			head:tableHead,
			body:tableBody,
			foot:tableFoot,
			//todo 销毁
			destory:function(){
				anytable.css.ownerNode.remove();
				anytable.data=undefined;
				anytable.fData=undefined;
				anytable.sortData=undefined;
				anytable.vData=undefined;
				container.remove();
				window.removeEventListener('resize',asyncHW);
				for(var k in anytable)delete  anytable[k];
			},
			pager:{},
			filter:function(func){
				if(func)opt.filter = func;
				this.initView();
			},
			freeze:function(index){
				index = parseInt(index)||0;
				if(index<-1)index=0;
				setFrozen(index,true);
				_fzInput.value=index;
				return anytable
			},
			showMsg:function(text,loadingIcon){
				clearTimeout(maskTimer);
				var mask = container.mask;
				if(mask)mask.remove();
				if (loadingIcon)mask = loadingText(text);
				else  mask = loadedText(text);
				container.mask=mask;
				mask.style.top = (hTable.offsetHeight||20)-1+'px';
				mask.style.bottom = opt.toolBar?(tableFoot.offsetHeight||20)+'px': 0;
				container.appendChild(mask);
				maskTimer = setTimeout(function(){
					addClass(mask,'show');
				},0);
				return anytable
			},
			hideMsg:function(){
				clearTimeout(maskTimer);
				var mask = container.mask;
				if(mask){
					removeClass(mask,'show');
					maskTimer = setTimeout(function(){
						mask.remove();
						delete  container.mask;
					},500)
				}
				return anytable
			},
			row: function (index) {
				return anytable.fData[index]
			},
			addRow: function (datas,index) {
				if(undefined===datas)return;
				index=index||0;
				if(!Array.isArray(datas)&&'object'===typeof datas){
					datas =[datas];
				}
				datas.forEach(function(d){
					rowDataHandler(d);
				});
				var fDatas = anytable.fData;
				var aDatas = anytable.data;
				var target = fDatas[index];
				var aIndex = target&&target[anyId]&&target[anyId].allIndex;
				var vStart,vEnd;
				var rs = tbody.rows;
				if(target){
					var x = Math.ceil(opt.height/opt.rowHeight);
					vStart = getIndexByTop(target[anyId].top)[0]-x;
					vEnd = getIndexByTop(target[anyId].top+opt.height)[0]+x;
					[].splice.apply(aDatas,[aIndex,0].concat(datas))
				}else [].push.apply(aDatas,datas);
				processDatas();
				refreshDatasPosition(index-1);
				var vData = anytable.vData;
				var startIndex = vData[0][anyId].pageIndex;
				if (rs.length) {
					for (var i = 0, _index = startIndex; i < rs.length;) {
						var r = rs[i];
						var pIndex = r[anyId].pageIndex;
						if ((_index > pIndex) ||
							(undefined !== vStart && vStart > pIndex) ||
							(undefined !== vEnd && vEnd <= pIndex)) {
							r.remove();
						} else {
							if (_index < pIndex) {
								tbody.insertBefore(createRow(vData[_index]), r)
							}
							i++;
							_index++;
						}
					}
				}
				tableBody.onVerticalScroll();
				return anytable;
			},
			// todo ----API from mmGrid
			updateRow: function (item, index,extend) {
				if(item===undefined)return;
				if(undefined===index){
					index = anytable.fData.indexOf(item);
					if(index===-1)return;
				}
				if('number'!==typeof index||index<0||index>=anytable.fData.length)
					return;
				var allIndex = anytable.vData[index][anyId].allIndex;
				if('object'===typeof item){
					if(extend)extend(anytable.fData[index],item);
					else anytable.data[allIndex] = rowDataHandler(item);
				}
				for(var i= 0,rs=tbody.rows,l=rs.length;i<l;i++){
					var r=rs[i];
					if(r[anyId].renderedIndex===index)
						tbody.replaceChild(createRow( anytable.data[index],index),r);
				}
				processDatas();
				refreshDatasPosition(index-1);
				return anytable
			},
			// todo ----API from mmGrid
			removeRow: function (index) {
				var i= 0,rs=[].slice.call(tbody.rows),l=rs.length, r,start= 0,allIndex;
				var ds = anytable.data,m=ds.length- 1,_opt;
				if('number'===typeof index){
					if(index<0||index>=anytable.fData.length)return;
					allIndex = anytable.fData[index][anyId].allIndex;
					anytable.data.splice(allIndex,1);
					for(;i<l;i++){
						r=rs[i];
						if(r[anyId].renderedIndex===index)r.remove();
					}
					start = index-1;
				}else if(Array.isArray(index)){
					index = index.sort().reverse();
					for(;i<l;i++){
						r=rs[i];
						if(-1!==index.indexOf(r[anyId].renderedIndex))r.remove();
					}
					for(var n = 0,fD = anytable.fData;n<index.length;n++){
						fD[index[n]]._deleted=true;
					}
					for(;m>-1;m--){
						_opt = ds[m];
						if(_opt._deleted)ds.splice(m,1);
					}
				}else if('function' === typeof index){
					for(var x= 0,fds = anytable.fData,fl=fds.length;x<fl;x++){
						_opt = fds[x];
						if(!index(_opt)){_opt._deleted=true}
					}
					for(;i<l;i++){
						r=rs[i];
						if(!(index(r.data))){
							if(start==0)start= r[anyId].renderedIndex-1;
							r.remove();
						}
					}
					for(;m>-1;m--){
						_opt = ds[m];
						if(_opt._deleted)ds.splice(m,1);
					}
				}
				processDatas();
				refreshDatasPosition(start);
				tableBody.onVerticalScroll();
				return anytable
			},
			// todo function
			select: function (options) {
				if ('number' === typeof options) {
					for (var i = 0, rs = tbody.rows, l = rs.length; i < l; i++) {
						var r = rs[i];
						if (r[anyId].renderedIndex === options)return r.select();
					}
					if (i === l)anytable.vData[anyId].selected = true;
				}
				return anytable;
			},
			deselect: function (options) {
				if ('number' === typeof options) {
					for (var i = 0, rs = tbody.rows, l = rs.length; i < l; i++) {
						var r = rs[i];
						if (r[anyId].renderedIndex === options)return r.desSelect();
					}
					if (i === l)delete anytable.vData[anyId].selected;
				}
				return anytable;
			},
			selectedRows: function (index) {
				if(!anytable.fData)return;
				var _rs=[] ;
				for (var i = 0, rs = anytable.fData, l = rs.length; i < l; i++) {
					var r = rs[i];
					if (r[anyId].selected){
						if(!_rs)_rs= [];
						_rs.push(r);
					}
					if(undefined!==index&&_rs&&_rs.length-1===index)return r;
				}
				return _rs;
			},
			selectedRowsIndex:function(index){
				var rs=[];
				for(var i= 0,ds=anytable.fData,l=ds.length;i<l;i++){
					var d = ds[i][anyId];
					if(d.selected)rs.push(d.renderedIndex);
					if(rs.length-1===index)return rs[index]
				}
				if(undefined!==index)return ;
				return rs;
			},
			rows: function () {
				return anytable.fData;
			},
			initHead:function(){
				tableHead.innerHTML='';
				hTable = createHead();
				refreshHeadIndex();
				tableHead.appendChild(hTable);
				return anytable
			},
			initFoot:function(){
				if(opt.toolBar){
					container.appendChild(tableFoot);
					if(opt.paging){
						tableFoot.appendChild(pagingBar)
					}
				}
				return anytable
			},
			initView:function(resetScroll){
				clearTimeout(viewTimer);
				viewTimer = setTimeout(function(){
					console.time('initView');
					anytable.showMsg(undefined,true);
					processDatas();
					refreshDatasPosition(0);
					var datas = anytable.vData;
					tbody.innerHTML = '';
					var bh = opt.height;
					var length = Math.min(datas.length, parseInt(bh / opt.rowHeight));
					for (var i = 0; i < length; i++)
						tbody.appendChild(createRow(datas[i], i));
					if (table.offsetHeight ) asyncHW();
					anytable.hideMsg();
					if(resetScroll){
						tableBody.scrollTop=0;
					}
					console.timeEnd('initView');
				},5);
				return anytable;
			},
			load:function(datas){
				if(Array.isArray(datas)){
					return this.setData(datas);
				}
				if(opt.url&&opt.dataGainer){
					this.showMsg('Loading',true);
					var params = opt.params;
					var paging = opt.paging;
					var pager = anytable.pager;
					var map = paging&&paging.paramsName;
					var o = {};
					o[map.total] = pager.total;
					o[map.size] = pager.size;
					o[map.cur] = pager.cur;
					if(opt.paging&&opt.paging.remote){
						params =extend({},params,o);
					}
					opt.dataGainer(opt.url,opt.method,params,
						function(data){
							var rows = data&&data[opt.root];
							if(!rows&&Array.isArray(data))rows=data;
							if(!rows||!rows.length){
								anytable.showMsg(opt.noDataText)
							}else {
								anytable.pager.total = data.total;
								anytable.hideMsg();
								anytable.setData(rows);
								tableBody.scrollTop=0;
								tableBody.onHorizontalScroll();
							}
						},
						function(data){
							anytable.showMsg(opt.loadErrorText);
							console.log(
								'\n####Anytable Load Error:####\n',
								'\n\tAPI URL:',opt.url,
								'\n\tMethod:',opt.method,
								'\n\tParams:',params,
								'\n\tResult:',data,
								'\n\n')
						}
					)
				}
				return anytable
			},
			setData:function (datas) {
				console.time('setData');
				if (!Array.isArray(datas))return;
				anytable.data = datas;
				for(var i= 0,l=datas.length;i<l;i++){
					rowDataHandler(datas[i]);
				}
				this.initView();
				console.timeEnd('setData');
				return anytable;
			}
		});
		var disBtn = function(a){
			addClass(a,'dis');
		};
		var activeBtn = function(a){
			removeClass(a,'dis');
		};
		var initPage = function(){
			renderDatas();
			refreshDatasPosition();
			tbody.innerHTML='';
			tableBody.scrollTop=0;
			tableBody.onVerticalScroll();
		};
		Object.defineProperties(anytable.pager,{
			cur:{
				get:function(){
					return cur||0;
				},
				set:function(v){
					var needRefresh = cur&&(v !== cur);
					var m = Math.ceil(total/anytable.pager.size);
					curPage.max = m;
					if(v==-1||v>=m){
						v=m;
						disBtn(btnNext);
						disBtn(btnLast);
					}else {
						activeBtn(btnNext);
						activeBtn(btnLast);
					}
					if(v<=1){
						v=1;
						disBtn(btnFirst);
						disBtn(btnPrev)
					}else {
						activeBtn(btnFirst);
						activeBtn(btnPrev);
					}
					cur=v;
					curPNum.textContent=v;
					if(needRefresh){
						if(opt.paging&&opt.paging.remote&&opt.url){
							anytable.load()
						}else {
							initPage();
						}
					}
				}
			},
			size:{
				/**@return {Number}*/
				get:function(){
					if(!opt.paging){return Infinity}
					return size||100
				},
				set:function(v){
					v=parseInt(v);
					if(v>0){
						size =v;
					}
					sizePNm.textContent = v;
					anytable.pager.cur=anytable.pager.cur||1;

					if(opt.paging&&opt.paging.remote&&opt.url){
						anytable.load()
					}else initPage();
				}
			},
			total:{
				get:function(){
					return total||0
				},
				set:function(v){
					if(v<0)v=0;
					total=v;
					totalPNum.textContent = ''+ Math.ceil(v/anytable.pager.size);
					totals.textContent = v;
				}
			}
		});
		this.initHead();
		this.initFoot();
		this.freeze(opt.freeze);
		dom.appendChild(container);
		if(opt.autoLoad){
			this.load()
		}
		window.addEventListener('resize',asyncHW,true);
	};
}();