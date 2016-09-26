/**
 *  放置各种render组件
 *  @Object anyRender
 * */
!function () {
	var stopEvent = function(e){
		e.preventDefault();
		e.stopPropagation();
	};
	var rd = anyrender.create;

	/**
	 * @description
	 *    下拉组件
	 * @example
	 * 	以下dropdown后面可以任意级联搭配 不分先后顺序
	 *    anyrender.dropdown
	 *    anyrender.dropdown.lazy - 点击后加载请求内容
	 *    anyrender.dropdown.multiple - 多选
	 *    anyrender.dropdown.isolation - 隔离请求
	 *    anyrender.dropdown.textKey('oo')
	 *    anyrender.dropdown.valueKey('xx')
	 *    anyrender.dropdown.list(array)
	 *    anyrender.dropdown.defaultValue(1) - 默认值 当赋值为undefined 时候 使用默认值
	 *    	array - function(cb,val, item, itemOpt, colName)
	 *    		cb(v)
	 *    			回调设置下拉数据	v
	 *    	array - 下拉数据 支持以下三种结构
	 *    		[{a:1,b:2},{a:3,b:4}]  // 需要指明 textKey - 显示值 和 valueKey 实际值
	 *    		{a:2,b:3,d:4}
	 *    		['aa','cc','dd']
	 * */
	rd(
		'dropdown', function(){
			return {
				cache:[],
				key:Math.random(),
				formatDpList : function(list){
				var type = typeof list;
				if(!Array.isArray(list)&&'object'===type){
					list = Object.keys(list).map(function(d){
						return {key:d,value:list[d]}
					})
				}
				return list
			}
			}
		},
		function (val, item, itemOpt, colName, opt) {
			if(val===undefined)val=opt.defaultValue;
			if(opt.isolation)opt =  anyrender.extend({},opt);
			var dom = this;
			var cb = function(v){
				opt.list =opt.formatDpList(v);
				if(typeof opt.list!=='object')return;
				if(anyrender.dropEl&&(anyrender.listEl&&anyrender.dropEl===dpEl||(!opt.isolation))){
					anyrender.listEl.setList(anyrender.dropEl,v,val)
				}
				opt.cache.forEach(function(c){
					var val = c[1][c[2]];
					if(undefined!=val&&''!==val){
						c[0].value=val;
					}
				})
			};
			var _f;
			if(typeof opt.list==='function'){
				var f = opt.list.bind(dom);
				var o = {};
				o[opt.valueKey||'key'] =null;
				o[opt.textKey||'value'] = '数据加载中...';
				o.isLoad=true;
				opt.list = [o];
				_f=function(){
					setTimeout(function(){
						f(cb.bind(dom),val, item, itemOpt, colName);
						opt.lazy=false;
					},5)
				};
				if(!opt.lazy)_f();
				if('function'===typeof opt.reload){
					opt.reload(_f)
				}
			}

			var hideList = function(e){
				if(e&&e.target===anyrender.listEl)return;
				if(anyrender.listEl.parentNode)
					document.body.removeChild(anyrender.listEl)
			};
			var textEl = definedDom('div');
			var dpEl = definedDom('div',{
				key:Math.random(),
				textKey:opt.textKey||'key',
				valueKey:opt.valueKey||'value',
				multiple:opt.multiple,
				onclick:function(e){
					stopEvent(e);
					if(_f&&opt.lazy)_f();
					this.showList();
				},
				sel:[],
				showList:function(){
					var sly=anyrender.listEl.setList(dpEl,opt.list).style;
					var rc=dpEl.getBoundingClientRect();
					sly.left = rc.left-5+'px';
					sly.top = rc.top+dpEl.offsetHeight+'px';
					document.body.appendChild(anyrender.listEl);
				},
				hideList:hideList,
				class:'any-drop-down',
				children:textEl
			});
			dom.dpEl=dpEl;
			opt.cache.push([dpEl,item,colName]);
			Object.defineProperties(dpEl,{
				value:{
					get:function(){
						var v=dpEl._v;
						if(opt.multiple&&!v)v=[];
						return v;
					},
					set:function(v){
						if(v===undefined)return;
						var _v = dpEl.valueKey;
						var _t = dpEl.textKey;
						dpEl.sel.length=0;
						var t=[];
						if(!Array.isArray(v))v=[v];
						if(!opt.multiple)v.length=1;
						for(var i = 0,ls=opt.list,l=ls.length;i<l;i++){
							var d = ls[i];
							if(typeof d!=='object'){
								if(v.indexOf(d)>-1){
									dpEl.sel.push(d);
									t.push(d)
								}
							}else {
								if(v.indexOf(d[_v])>-1){
									dpEl.sel.push(d);
									t.push(d[_t])
								}
							}
						}
						dpEl.text.title=dpEl.text = t.join();
						//var td = dom.parentNode;
						if(!opt.multiple)v=v[0];
						dpEl._v = v;
						item[colName]=v;
					}
				},
				text:{
					get:function(){
						return textEl.textContent;
					},
					set:function(v){
						textEl.textContent =v;
					}
				}
			});
			dpEl.value = val;
			// 下拉单例
			if(!anyrender.listEl){
				anyrender.listEl =definedDom('div',{
					onscroll:function(e){
						stopEvent(e);
					},
					setList:function(dp,lis,val){
						anyrender.dropEl = dp;
						this.className = 'any-drop-list'+(dp.multiple?' multiple':'');
						var td = dp.parentNode;
						var multiple = dp.multiple;
						this.innerHTML='';
						this.appendChild(definedDom(lis.map(function(d){
							var index,text, k,v,cls='',actCls='act';
							if(typeof d!=='object'){
								text = d;
							}else {
								v = dp.textKey;
								k=dp.valueKey;
								text = d[v];
							}
							if(multiple){
								index = dp.sel.indexOf(d);
								if(index!==-1)cls=actCls;
							}else {
								if(text === d&&dp.value===d){
									cls=actCls;
								}else if(dp.value===d[k]){
									cls=actCls;
								}
							}
							return {
								tag:'div',text:text,
								class:cls,
								css:{
									minWidth :td.offsetWidth+'px'
								},
								/**@this {Node}*/
								onclick:function(e){
									stopEvent(e);
									if(d.isLoad)return dp.hideList();
									var _v=[];
									if(multiple){
										index = dp.sel.indexOf(d);
										if(index!==-1){
											this.className='';
											dp.sel.splice(index,1);
										} else{
											dp.sel.push(d);
											this.className=actCls;
										}
										dp.sel.forEach(function(s){
											if(typeof s!=='object'){
												_v.push(s);
											}else {
												_v.push(s[k]);
											}
										});
										dp.value = _v;
									}else{
										if(typeof d!=='object'){
											dp.value=dp.text = d;
										}else {
											dp.value=d[k];
										}
										this.className=actCls;
										dp.hideList();
									}
								}}
						})));
						return this;
					}
				});
				document.addEventListener('click',hideList);
				window.addEventListener('scroll',hideList,true);
			}
			return dpEl;
		}, {
			defaultValue:function(opt,func){
				return function (v){
					opt.defaultValue=v;
					return func
				}
			},
			reload:function(opt,func){
				return function (v){
					opt.reload=v;
					return func;
				}
			},
			lazy:function(opt,func){
				opt.lazy=true;
				return func;
			},
			isolation:function(opt,func){
				opt.isolation=true;
				return func
			},
			multiple:function(opt,func){
				opt.multiple = true;
				return func
			},
			list:function(opt, func){
				return function (list){
					opt.list=opt.formatDpList(list);
					return func;
				}
			},
			valueKey:function(opt,func){
				return function (v){
					opt.valueKey = v;
					return func
				}
			},
			textKey:function(opt,func){
				return function (v){
					opt.textKey = v;
					return func
				}
			}
		}
	);

	/**
	 * @description
	 *    输入框组件
	 *    点击切换到输入框 失去焦点则还原
	 * @example
	 *    anyrender.edit
	 *    anyrender.edit.number
	 *    anyrender.edit.max(10)
	 *    anyrender.edit.date(opt)
	 *    anyrender.able(opt)
	 *    	opt - function 调用 opt.call(item) item为行数据 返回true可编辑
	 *    	opt - Boolean true 可编辑 false 不可编辑
	 * */
	rd('edit',
		function () {
			var es=[];
			es.add = function(){es.push(arguments)};
			return {
				dom: {},
				events: es
			}
		},
		function (val, item, rowIndex, colName, opt) {
			if(val===undefined)val='';
			var dom = this;
			var isDisable = function(){
				var c = opt&&opt.able;
				if(undefined===c)return false;
				if(typeof c==='function'){
					return !c.call(item)
				}
				return !c
			};
			var dv = parseInt(val);
			if(opt._date&&opt._date.opt&&opt._date.opt.format&&dv){
				if(dv>1*new Date(0)){
					val = opt._date.format(opt._date.init(dv),opt._date.opt.format)
				}
			}
			var span = definedDom('span', {
				class: 'any-edit'+(isDisable()?' dis':''),
				text: val
			});
			var ex = anyrender.extend;
			var input = definedDom('input', ex({
				onclick: function (e) {
					e.stopPropagation();
					e.preventDefault();
					if(opt.onclick)opt.onclick.call(input);
				},
				value: val,
				class: 'any-edit',
				type: 'text'
			}, opt.dom));
			for (var i = 0, es = opt.events, l = es.length; i < l; i++) {
				var e = es[i];
				input.addEventListener(e[0], e[1], e[2]);
			}
			var _onblur = input.onblur;
			input.onblur = function (e) {
				if(opt.onblur){
					opt.onblur.call(this,e)
				}else{
					span.textContent = this.value;
					dom.replaceChild(span, input);
					item[colName] = this.value;
				}
				if (_onblur)_onblur.call(this, e);
			};

			span.onclick = function (e) {
				if(isDisable())return;
				e.stopPropagation();
				e.preventDefault();
				dom.replaceChild(input, span);
				opt._input = input;
				opt._span = span;
				opt._replace = function(){
					dom.replaceChild(span, input);
				};
				opt._save = function(v){
					item[colName] = v;
				};
				if(opt.afterRender){
					opt.afterRender.call(input);
				}else {
					input.focus();
					input.select();
				}
			};
			return span;
		}, {
			number: function (opt,func) {
				func._number=true;
				/**@this {Node}*/
				opt.events.add('keydown',function(e){
					var keyCode = e.keyCode;
					var ctrlKey = e.ctrlKey;
					var shiftKey = e.shiftKey;
					var key = e.key;
					var _v = this.value;

					if(_v===''){
						if(key==='-')return;
					}else if(key==='.'&&-1===_v.indexOf('.'))
						return;

					if([46, 8, 9, 27, 13, 110, 190].indexOf(keyCode)!==-1||
						(keyCode == 65 && ctrlKey === true) || // Ctrl+A
						(keyCode == 67 && ctrlKey === true) || // Ctrl+C
						(keyCode == 86 && ctrlKey === true) || // Ctrl+V
						(keyCode == 88 && ctrlKey === true) || // Ctrl+X
						(keyCode >= 35 && keyCode <= 39)// home, end, left, right
					){
						return;
					}
					if((shiftKey|| (keyCode < 48 || keyCode > 57)) && (keyCode < 96 || keyCode > 105)){
						e.preventDefault();
					}
				});
				/**@this {Node}*/
				opt.events.add('paste',function(e){
					e.preventDefault();
					var startPos = this.selectionStart;
					var length = this.selectionEnd-startPos;
					var data = e.clipboardData.getData('text/plain').replace(/[^0-9\.-]/g,'').replace(/\.{2}/g,'');
					var _d = data[0]||'';
					var _dd = data.substr(1).replace(/-/g,'')||'';
					if(this.value[0]==='-'&&_d==='-')_d='';
					var value =parseFloat( this.value.replace(new RegExp('(.{'+startPos+'}).{'+length+'}'),'$1'+_d+_dd));
					if(!isNaN(value))this.value =value ;
					if(func._min)func._min.call(this);
					if(func._max)func._max.call(this);
				})
			},
			max: function (opt, func) {
				if(!func._number)func=func.number;
				return function (v) {
					func._max=function(){
						if(parseFloat(this.value)>=v)this.value=v;
					};
					opt.events.add('input',func._max);
					return func;
				}
			},
			min: function (opt, func) {
				if(!func._number)func=func.number;
				return function (v) {
					func._min=function(){
						if(parseFloat(this.value)<=v)this.value=v;
					};
					opt.events.add('input',func._min);
					return func;
				}
			},
			able:function(opt,func){
				return function (v){
					opt.able = v;
					return func;
				}
			},
			date:function(opt,func){
				var fixTime = function(n){
					return (100+parseInt(n)+'').substr(1);
				};
				var outClick=function(e){
					var target = e.target;
					if(target!==opt._input&&target!==pick.dom&&!pick.dom.contains(target)){
						opt._replace();
						pick.close();
						window.removeEventListener('click',outClick,true);
					}
				};
				var format = function(obj,str){
					return str&&str.replace('YYYY',obj.year)
							.replace('MM',fixTime(obj.month+1))
							.replace('M',obj.month+1)
							.replace('DD',fixTime(obj.date))
							.replace('D',obj.date)
							.replace('hh',fixTime(obj.hour))
							.replace('h',obj.hour)
							.replace('mm',fixTime(obj.minute))
							.replace('m',obj.minute)
							.replace('ss',fixTime(obj.second))
							.replace('s',obj.second)||(1*obj.dateValue+obj.timeValue)
				};
				if(!anyrender.anydate)anyrender.anydate=new Anydate();
				var pick = anyrender.anydate;
				opt._date = pick.picked;
				/**
				 *  _opt ={
				 * 	min:'1900-11-24',
				  * 	max:'2019-11-22',
				 *  	format:'YYY-MM-DD hh:mm:ss'
				 *     save:'format|number',
				 *     pick:func
				 *  }
				 *
				 * */
				return function (_opt) {
					var ex = anyrender.extend;
					_opt=ex({
						format:'YYYY-MM-DD hh:mm:ss',
						save:'format',
						pick:function(sel){
							console.log('after you click the date ',sel)
						}
					},_opt);
					opt._date.opt =_opt;
					opt._date.format = format;
					opt.onclick = opt.afterRender = function(){
						window.addEventListener('click',outClick,true);
						var x = this.getBoundingClientRect(), s = pick.dom.style;
						s.left = x.left+'px';
						s.top = x.top+this.offsetHeight+'px';
						_opt.date = this.value;
						pick.open(_opt);
					};
					_opt.onDatePick = function(sel,noClose){
						var v = format(sel,_opt.format);
						var _v = _opt.save==='number'&&(1*sel.dateValue+sel.timeValue)||v;
						opt._input.value = v;
						opt._span.textContent = v;
						opt._save(_v);
						if(!noClose)pick.close();
						if(_opt.pick)_opt.pick();
					};
					opt.onblur=function(){
						var v = new Date(this.value);
						if(!isNaN(v.valueOf())){
							pick.picked.init(v);
							_opt.onDatePick(pick.picked,true)
						}
					};
					return func;
				}
			}
		}
	)
}();